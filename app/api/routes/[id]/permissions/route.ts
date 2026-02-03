"use server";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getCurrentUserFromToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

interface RouteContext {
    params: Promise<{ id: string }>;
}

// GET /api/routes/[id]/permissions - Get all permissions for a route
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const { searchParams } = new URL(request.url);
        const token = searchParams.get("token");

        const db = await getDb();
        let query: any = {};
        if (ObjectId.isValid(id)) {
            query = { _id: new ObjectId(id) };
        } else {
            query = { slug: id };
        }

        const route = await db.collection("routes").findOne(query);

        if (!route) {
            return NextResponse.json(
                { success: false, error: "Route not found" },
                { status: 404 }
            );
        }

        // 1. Check Public Token Access (No Login Required)
        if (token && route.isPublic && route.publicToken === token) {
            return NextResponse.json({
                success: true,
                data: {
                    dashboardId: route._id.toString(),
                    dashboardSlug: route.slug,
                    dashboardName: route.name,
                    isPublic: true,
                    access: "view",
                    owner: { name: "Organizer" } // Minimal info
                },
            });
        }

        // 2. Check Authenticated Access
        const user = await getCurrentUserFromToken(request);
        if (!user) {
            // If strictly relying on token and it failed or wasn't provided:
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Populate owner info
        const owner = await db.collection("users").findOne(
            { _id: route.ownerId },
            { projection: { _id: 1, name: 1, email: 1, avatar: 1 } }
        );

        const isOwner = route.ownerId.toString() === user.userId;
        const isAdmin = user.role === "admin";

        // Check explicit share
        const isSharedUser = (route.sharedWith || []).some(
            (s: { userId: ObjectId }) => s.userId.toString() === user.userId
        );
        const isSharedTeam = false; // TODO: Implement team check if needed, requiring complex lookup

        // If NOT owner/admin AND NOT shared, return Forbidden
        if (!isOwner && !isAdmin && !isSharedUser) {
            return NextResponse.json(
                { success: false, error: "Forbidden" },
                { status: 403 }
            );
        }

        // If just a shared user (not owner/admin), return limited info? 
        // Or should we return full permissions list only to Owner/Admin?
        // Let's restrict full permission list to Owner/Admin.
        if (!isOwner && !isAdmin) {
            return NextResponse.json({
                success: true,
                data: {
                    dashboardId: route._id.toString(),
                    dashboardSlug: route.slug,
                    dashboardName: route.name,
                    owner,
                    isPublic: route.isPublic || false,
                    access: "view", // Calculated permission
                },
            });
        }

        // --- FULL DETAIL FOR OWNER/ADMIN ---

        // Populate user info for sharedWith
        const userIds = (route.sharedWith || []).map(
            (s: { userId: ObjectId }) => s.userId
        );
        const users = await db
            .collection("users")
            .find({ _id: { $in: userIds } })
            .project({ _id: 1, name: 1, email: 1, avatar: 1 })
            .toArray();

        const userMap = new Map(users.map((u) => [u._id.toString(), u]));

        const sharedWithUsers = (route.sharedWith || []).map(
            (s: { userId: ObjectId; permission: string; addedAt: Date; addedBy?: ObjectId }) => ({
                ...s,
                user: userMap.get(s.userId.toString()) || null,
            })
        );

        // Populate team info for sharedWithTeams
        const teamIds = (route.sharedWithTeams || []).map(
            (s: { teamId: ObjectId }) => s.teamId
        );
        const teams = await db
            .collection("teams")
            .find({ _id: { $in: teamIds } })
            .project({ _id: 1, name: 1, description: 1, avatar: 1, members: 1 })
            .toArray();

        const teamMap = new Map(teams.map((t) => [t._id.toString(), t]));

        const sharedWithTeams = (route.sharedWithTeams || []).map(
            (s: { teamId: ObjectId; permission: string; addedAt: Date; addedBy?: ObjectId }) => ({
                ...s,
                team: teamMap.get(s.teamId.toString()) || null,
            })
        );

        return NextResponse.json({
            success: true,
            data: {
                dashboardId: route._id.toString(),
                dashboardSlug: route.slug,
                dashboardName: route.name,
                owner,
                sharedWithUsers,
                sharedWithTeams,
                isPublic: route.isPublic || false,
                publicToken: route.publicToken || null,
                publicPermission: route.publicPermission || null,
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

// POST /api/routes/[id]/permissions - Add permission (user or team)
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

        const db = await getDb();

        let query: any = {};
        if (ObjectId.isValid(id)) {
            query = { _id: new ObjectId(id) };
        } else {
            query = { slug: id };
        }

        const route = await db.collection("routes").findOne(query);

        if (!route) {
            return NextResponse.json(
                { success: false, error: "Route not found" },
                { status: 404 }
            );
        }

        // Only owner or admin can modify permissions
        const isOwner = route.ownerId.toString() === user.userId;
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
            const existingShare = (route.sharedWith || []).find(
                (s: { userId: ObjectId }) => s.userId.toString() === targetId
            );

            if (existingShare) {
                await db.collection("routes").updateOne(
                    { _id: route._id, "sharedWith.userId": targetObjectId } as any,
                    {
                        $set: {
                            "sharedWith.$.permission": permission,
                            "sharedWith.$.addedBy": currentUserObjectId,
                        },
                    } as any
                );
            } else {
                await db.collection("routes").updateOne(
                    { _id: route._id },
                    {
                        $push: {
                            sharedWith: {
                                userId: targetObjectId,
                                permission,
                                addedAt: new Date(),
                                addedBy: currentUserObjectId,
                            },
                        } as any,
                    }
                );
            }
            return NextResponse.json({ success: true, message: "Permission updated" });
        } else {
            // Team
            const existingShare = (route.sharedWithTeams || []).find(
                (s: { teamId: ObjectId }) => s.teamId.toString() === targetId
            );

            if (existingShare) {
                await db.collection("routes").updateOne(
                    { _id: route._id, "sharedWithTeams.teamId": targetObjectId } as any,
                    {
                        $set: {
                            "sharedWithTeams.$.permission": permission,
                            "sharedWithTeams.$.addedBy": currentUserObjectId,
                        },
                    } as any
                );
            } else {
                await db.collection("routes").updateOne(
                    { _id: route._id },
                    {
                        $push: {
                            sharedWithTeams: {
                                teamId: targetObjectId,
                                permission,
                                addedAt: new Date(),
                                addedBy: currentUserObjectId,
                            },
                        } as any,
                    }
                );
            }
            return NextResponse.json({ success: true, message: "Permission updated" });
        }
    } catch (error) {
        console.error("Error adding permission:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE /api/routes/[id]/permissions
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const user = await getCurrentUserFromToken(request);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await context.params;
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type");
        const targetId = searchParams.get("targetId");

        const db = await getDb();
        let query: any = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { slug: id };
        const route = await db.collection("routes").findOne(query);

        if (!route) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const isOwner = route.ownerId.toString() === user.userId;
        const isAdmin = user.role === "admin";

        if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        if (type === "user") {
            await db.collection("routes").updateOne(
                { _id: route._id },
                { $pull: { sharedWith: { userId: new ObjectId(targetId!) } } as any }
            );
        } else if (type === "team") {
            await db.collection("routes").updateOne(
                { _id: route._id },
                { $pull: { sharedWithTeams: { teamId: new ObjectId(targetId!) } } as any }
            );
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

// PATCH /api/routes/[id]/permissions - Update public settings
export async function PATCH(request: NextRequest, context: RouteContext) {
    try {
        const user = await getCurrentUserFromToken(request);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await context.params;
        const body = await request.json();
        const { isPublic, action } = body;

        const db = await getDb();
        let query: any = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { slug: id };
        const route = await db.collection("routes").findOne(query);

        if (!route) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const isOwner = route.ownerId.toString() === user.userId;
        const isAdmin = user.role === "admin";
        if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        if (action === 'regenerateToken') {
            const newToken = `pub_route_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
            await db.collection("routes").updateOne(
                { _id: route._id },
                { $set: { publicToken: newToken } }
            );
            return NextResponse.json({ success: true, data: { publicToken: newToken } });
        }

        const updateData: any = { isPublic };
        if (isPublic && !route.publicToken) {
            updateData.publicToken = `pub_route_${Date.now().toString(36)}`;
        }

        await db.collection("routes").updateOne({ _id: route._id }, { $set: updateData });

        return NextResponse.json({ success: true, data: updateData });
    } catch (err) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
