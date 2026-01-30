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
        const route = await db.collection("routes").findOne(query); // Changed collection to 'routes'

        if (!route) {
            return NextResponse.json(
                { success: false, error: "Route not found" },
                { status: 404 }
            );
        }

        // Only owner or admin can view permissions
        const isOwner = route.ownerId.toString() === user.userId;
        const isAdmin = user.role === "admin";
        if (!isOwner && !isAdmin) {
            return NextResponse.json(
                { success: false, error: "Forbidden" },
                { status: 403 }
            );
        }

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

        // Get owner info
        const owner = await db.collection("users").findOne(
            { _id: route.ownerId },
            { projection: { _id: 1, name: 1, email: 1, avatar: 1 } }
        );

        return NextResponse.json({
            success: true,
            data: {
                dashboardId: route._id.toString(), // Keep 'dashboardId' key for compatibility with PermissionManager props
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
                { $pull: { sharedWith: { userId: new ObjectId(targetId!) } } }
            );
        } else if (type === "team") {
            await db.collection("routes").updateOne(
                { _id: route._id },
                { $pull: { sharedWithTeams: { teamId: new ObjectId(targetId!) } } }
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
        const { isPublic } = body;

        const db = await getDb();
        let query: any = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { slug: id };
        const route = await db.collection("routes").findOne(query);

        if (!route) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const isOwner = route.ownerId.toString() === user.userId;
        const isAdmin = user.role === "admin";
        if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
