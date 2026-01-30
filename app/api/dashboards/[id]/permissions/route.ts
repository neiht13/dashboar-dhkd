"use server";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getCurrentUserFromToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

interface RouteContext {
    params: Promise<{ id: string }>;
}

// GET /api/dashboards/[id]/permissions - Get all permissions for a dashboard
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const user = await getCurrentUserFromToken(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await context.params;
        let query: any = {};
        if (ObjectId.isValid(id)) {
            query = { _id: new ObjectId(id) };
        } else {
            query = { slug: id };
        }

        const db = await getDb();
        const dashboard = await db.collection("dashboards").findOne(query);

        if (!dashboard) {
            return NextResponse.json(
                { success: false, error: "Dashboard not found" },
                { status: 404 }
            );
        }

        // Only owner or admin can view permissions
        const isOwner = dashboard.ownerId.toString() === user.userId;
        const isAdmin = user.role === "admin";
        if (!isOwner && !isAdmin) {
            return NextResponse.json(
                { success: false, error: "Forbidden" },
                { status: 403 }
            );
        }

        // Populate user info for sharedWith
        const userIds = (dashboard.sharedWith || []).map(
            (s: { userId: ObjectId }) => s.userId
        );
        const users = await db
            .collection("users")
            .find({ _id: { $in: userIds } })
            .project({ _id: 1, name: 1, email: 1, avatar: 1 })
            .toArray();

        const userMap = new Map(users.map((u) => [u._id.toString(), u]));

        const sharedWithUsers = (dashboard.sharedWith || []).map(
            (s: { userId: ObjectId; permission: string; addedAt: Date; addedBy?: ObjectId }) => ({
                ...s,
                user: userMap.get(s.userId.toString()) || null,
            })
        );

        // Populate team info for sharedWithTeams
        const teamIds = (dashboard.sharedWithTeams || []).map(
            (s: { teamId: ObjectId }) => s.teamId
        );
        const teams = await db
            .collection("teams")
            .find({ _id: { $in: teamIds } })
            .project({ _id: 1, name: 1, description: 1, avatar: 1, members: 1 })
            .toArray();

        const teamMap = new Map(teams.map((t) => [t._id.toString(), t]));

        const sharedWithTeams = (dashboard.sharedWithTeams || []).map(
            (s: { teamId: ObjectId; permission: string; addedAt: Date; addedBy?: ObjectId }) => ({
                ...s,
                team: teamMap.get(s.teamId.toString()) || null,
            })
        );

        // Get owner info
        const owner = await db.collection("users").findOne(
            { _id: dashboard.ownerId },
            { projection: { _id: 1, name: 1, email: 1, avatar: 1 } }
        );

        return NextResponse.json({
            success: true,
            data: {
                dashboardId: dashboard._id.toString(),
                dashboardSlug: dashboard.slug,
                dashboardName: dashboard.name,
                owner,
                sharedWithUsers,
                sharedWithTeams,
                isPublic: dashboard.isPublic || false,
                publicToken: dashboard.publicToken || null,
                publicPermission: dashboard.publicPermission || null,
            },
        });
    } catch (error) {
        console.error("Error fetching permissions:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}

// POST /api/dashboards/[id]/permissions - Add permission (user or team)
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const user = await getCurrentUserFromToken(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await context.params;
        const body = await request.json();
        const { type, targetId, permission } = body;

        if (!type || !targetId || !permission) {
            return NextResponse.json(
                { success: false, error: "Missing required fields: type, targetId, permission" },
                { status: 400 }
            );
        }

        if (!["user", "team"].includes(type)) {
            return NextResponse.json(
                { success: false, error: "Type must be 'user' or 'team'" },
                { status: 400 }
            );
        }

        if (!["view", "edit"].includes(permission)) {
            return NextResponse.json(
                { success: false, error: "Permission must be 'view' or 'edit'" },
                { status: 400 }
            );
        }

        if (!ObjectId.isValid(targetId)) {
            return NextResponse.json(
                { success: false, error: "Invalid target ID" },
                { status: 400 }
            );
        }

        const db = await getDb();

        let query: any = {};
        if (ObjectId.isValid(id)) {
            query = { _id: new ObjectId(id) };
        } else {
            query = { slug: id };
        }

        const dashboard = await db.collection("dashboards").findOne(query);

        if (!dashboard) {
            return NextResponse.json(
                { success: false, error: "Dashboard not found" },
                { status: 404 }
            );
        }

        // Only owner or admin can modify permissions
        const isOwner = dashboard.ownerId.toString() === user.userId;
        const isAdmin = user.role === "admin";
        if (!isOwner && !isAdmin) {
            return NextResponse.json(
                { success: false, error: "Forbidden" },
                { status: 403 }
            );
        }

        const targetObjectId = new ObjectId(targetId);
        const currentUserObjectId = new ObjectId(user.userId);

        if (type === "user") {
            // Check if user exists
            const targetUser = await db.collection("users").findOne({
                _id: targetObjectId,
            });

            if (!targetUser) {
                return NextResponse.json(
                    { success: false, error: "User not found" },
                    { status: 404 }
                );
            }

            // Check if already shared
            const existingShare = (dashboard.sharedWith || []).find(
                (s: { userId: ObjectId }) => s.userId.toString() === targetId
            );

            if (existingShare) {
                // Update existing permission
                await db.collection("dashboards").updateOne(
                    { _id: dashboard._id, "sharedWith.userId": targetObjectId },
                    {
                        $set: {
                            "sharedWith.$.permission": permission,
                            "sharedWith.$.addedBy": currentUserObjectId,
                        },
                    }
                );
            } else {
                // Add new permission
                await db.collection("dashboards").updateOne(
                    { _id: dashboard._id },
                    {
                        $push: {
                            sharedWith: {
                                userId: targetObjectId,
                                permission,
                                addedAt: new Date(),
                                addedBy: currentUserObjectId,
                            },
                        },
                    }
                );
            }

            return NextResponse.json({
                success: true,
                message: `Permission ${existingShare ? "updated" : "added"} for user`,
                data: {
                    type: "user",
                    targetId,
                    permission,
                    user: {
                        _id: targetUser._id,
                        name: targetUser.name,
                        email: targetUser.email,
                    },
                },
            });
        } else {
            // Team permission
            const targetTeam = await db.collection("teams").findOne({
                _id: targetObjectId,
            });

            if (!targetTeam) {
                return NextResponse.json(
                    { success: false, error: "Team not found" },
                    { status: 404 }
                );
            }

            // Check if already shared
            const existingShare = (dashboard.sharedWithTeams || []).find(
                (s: { teamId: ObjectId }) => s.teamId.toString() === targetId
            );

            if (existingShare) {
                // Update existing permission
                await db.collection("dashboards").updateOne(
                    { _id: dashboard._id, "sharedWithTeams.teamId": targetObjectId },
                    {
                        $set: {
                            "sharedWithTeams.$.permission": permission,
                            "sharedWithTeams.$.addedBy": currentUserObjectId,
                        },
                    }
                );
            } else {
                // Add new permission
                await db.collection("dashboards").updateOne(
                    { _id: dashboard._id },
                    {
                        $push: {
                            sharedWithTeams: {
                                teamId: targetObjectId,
                                permission,
                                addedAt: new Date(),
                                addedBy: currentUserObjectId,
                            },
                        },
                    }
                );
            }

            return NextResponse.json({
                success: true,
                message: `Permission ${existingShare ? "updated" : "added"} for team`,
                data: {
                    type: "team",
                    targetId,
                    permission,
                    team: {
                        _id: targetTeam._id,
                        name: targetTeam.name,
                        memberCount: targetTeam.members?.length || 0,
                    },
                },
            });
        }
    } catch (error) {
        console.error("Error adding permission:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE /api/dashboards/[id]/permissions - Remove permission
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const user = await getCurrentUserFromToken(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await context.params;
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type");
        const targetId = searchParams.get("targetId");

        if (!type || !targetId) {
            return NextResponse.json(
                { success: false, error: "Missing required params: type, targetId" },
                { status: 400 }
            );
        }

        if (!ObjectId.isValid(targetId)) {
            return NextResponse.json(
                { success: false, error: "Invalid target ID" },
                { status: 400 }
            );
        }

        const db = await getDb();

        let query: any = {};
        if (ObjectId.isValid(id)) {
            query = { _id: new ObjectId(id) };
        } else {
            query = { slug: id };
        }

        const dashboard = await db.collection("dashboards").findOne(query);

        if (!dashboard) {
            return NextResponse.json(
                { success: false, error: "Dashboard not found" },
                { status: 404 }
            );
        }

        // Only owner or admin can modify permissions
        const isOwner = dashboard.ownerId.toString() === user.userId;
        const isAdmin = user.role === "admin";
        if (!isOwner && !isAdmin) {
            return NextResponse.json(
                { success: false, error: "Forbidden" },
                { status: 403 }
            );
        }

        const targetObjectId = new ObjectId(targetId);

        if (type === "user") {
            await db.collection("dashboards").updateOne(
                { _id: dashboard._id },
                {
                    $pull: {
                        sharedWith: { userId: targetObjectId },
                    },
                }
            );
        } else if (type === "team") {
            await db.collection("dashboards").updateOne(
                { _id: dashboard._id },
                {
                    $pull: {
                        sharedWithTeams: { teamId: targetObjectId },
                    },
                }
            );
        } else {
            return NextResponse.json(
                { success: false, error: "Type must be 'user' or 'team'" },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Permission removed for ${type}`,
        });
    } catch (error) {
        console.error("Error removing permission:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH /api/dashboards/[id]/permissions - Update public settings
export async function PATCH(request: NextRequest, context: RouteContext) {
    try {
        const user = await getCurrentUserFromToken(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await context.params;
        const body = await request.json();
        const { isPublic, publicPermission } = body;

        const db = await getDb();

        let query: any = {};
        if (ObjectId.isValid(id)) {
            query = { _id: new ObjectId(id) };
        } else {
            query = { slug: id };
        }

        const dashboard = await db.collection("dashboards").findOne(query);

        if (!dashboard) {
            return NextResponse.json(
                { success: false, error: "Dashboard not found" },
                { status: 404 }
            );
        }

        // Only owner or admin can modify public settings
        const isOwner = dashboard.ownerId.toString() === user.userId;
        const isAdmin = user.role === "admin";
        if (!isOwner && !isAdmin) {
            return NextResponse.json(
                { success: false, error: "Forbidden" },
                { status: 403 }
            );
        }

        const updateData: Record<string, unknown> = {};

        if (typeof isPublic === "boolean") {
            updateData.isPublic = isPublic;
            if (isPublic && !dashboard.publicToken) {
                // Generate a unique public token
                updateData.publicToken = `pub_${id}_${Date.now().toString(36)}`;
            }
        }

        if (publicPermission && ["view", "edit"].includes(publicPermission)) {
            updateData.publicPermission = publicPermission;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { success: false, error: "No valid fields to update" },
                { status: 400 }
            );
        }

        await db.collection("dashboards").updateOne(
            { _id: dashboard._id },
            { $set: updateData }
        );

        return NextResponse.json({
            success: true,
            message: "Public settings updated",
            data: updateData,
        });
    } catch (error) {
        console.error("Error updating public settings:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
