"use server";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getCurrentUserFromToken } from "@/lib/auth";

// GET /api/users/search - Search users and teams for permission sharing
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUserFromToken(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const query = searchParams.get("q") || "";
        const type = searchParams.get("type") || "all"; // all, user, team
        const excludeIds = searchParams.get("exclude")?.split(",").filter(Boolean) || [];
        const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

        if (query.length < 2) {
            return NextResponse.json({
                success: true,
                data: {
                    users: [],
                    teams: [],
                },
            });
        }

        const db = await getDb();
        const results: {
            users: Array<{
                _id: string;
                name: string;
                email: string;
                avatar?: string;
                role: string;
            }>;
            teams: Array<{
                _id: string;
                name: string;
                description?: string;
                avatar?: string;
                memberCount: number;
            }>;
        } = {
            users: [],
            teams: [],
        };

        // Search users
        if (type === "all" || type === "user") {
            const userQuery: Record<string, unknown> = {
                isActive: { $ne: false },
                $or: [
                    { name: { $regex: query, $options: "i" } },
                    { email: { $regex: query, $options: "i" } },
                ],
            };

            // Exclude current user and excluded IDs
            const excludeUserIds = [...excludeIds, user.userId];
            if (excludeUserIds.length > 0) {
                userQuery._id = {
                    $nin: excludeUserIds.map((id) => {
                        try {
                            const { ObjectId } = require("mongodb");
                            return new ObjectId(id);
                        } catch {
                            return null;
                        }
                    }).filter(Boolean)
                };
            }

            const users = await db
                .collection("users")
                .find(userQuery)
                .project({ _id: 1, name: 1, email: 1, avatar: 1, role: 1 })
                .limit(limit)
                .toArray();

            results.users = users.map((u) => ({
                _id: u._id.toString(),
                name: u.name,
                email: u.email,
                avatar: u.avatar,
                role: u.role,
            }));
        }

        // Search teams
        if (type === "all" || type === "team") {
            const teamQuery: Record<string, unknown> = {
                isActive: { $ne: false },
                $or: [
                    { name: { $regex: query, $options: "i" } },
                    { description: { $regex: query, $options: "i" } },
                ],
            };

            // Only show teams the user is a member of or owns
            const { ObjectId } = require("mongodb");
            const userObjectId = new ObjectId(user.userId);
            teamQuery.$and = [
                teamQuery.$or ? { $or: teamQuery.$or } : {},
                {
                    $or: [
                        { ownerId: userObjectId },
                        { "members.userId": userObjectId },
                    ],
                },
            ];
            delete teamQuery.$or;

            // Exclude specified team IDs
            if (excludeIds.length > 0) {
                teamQuery._id = {
                    $nin: excludeIds.map((id) => {
                        try {
                            return new ObjectId(id);
                        } catch {
                            return null;
                        }
                    }).filter(Boolean)
                };
            }

            const teams = await db
                .collection("teams")
                .find(teamQuery)
                .project({ _id: 1, name: 1, description: 1, avatar: 1, members: 1 })
                .limit(limit)
                .toArray();

            results.teams = teams.map((t) => ({
                _id: t._id.toString(),
                name: t.name,
                description: t.description,
                avatar: t.avatar,
                memberCount: t.members?.length || 0,
            }));
        }

        return NextResponse.json({
            success: true,
            data: results,
        });
    } catch (error) {
        console.error("Error searching users/teams:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
