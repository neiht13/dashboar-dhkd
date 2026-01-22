import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'
);

async function getUserFromToken(request: NextRequest) {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as { userId: string; email: string; role: string };
    } catch {
        return null;
    }
}

// GET /api/teams - Get user's teams
export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromToken(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const db = await getDb();

        const teams = await db
            .collection('teams')
            .aggregate([
                {
                    $match: {
                        $or: [
                            { ownerId: new ObjectId(user.userId) },
                            { 'members.userId': new ObjectId(user.userId) },
                        ],
                        isActive: true,
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'ownerId',
                        foreignField: '_id',
                        as: 'owner',
                    },
                },
                {
                    $addFields: {
                        owner: { $arrayElemAt: ['$owner', 0] },
                        memberCount: { $size: '$members' },
                    },
                },
                {
                    $project: {
                        'owner.password': 0,
                    },
                },
            ])
            .toArray();

        return NextResponse.json({
            success: true,
            data: teams.map((team) => ({
                ...team,
                _id: team._id.toString(),
                ownerId: team.ownerId?.toString(),
                owner: team.owner
                    ? {
                          _id: team.owner._id?.toString(),
                          name: team.owner.name,
                          email: team.owner.email,
                      }
                    : null,
                members: team.members?.map((m: { userId: ObjectId; role: string; joinedAt: Date }) => ({
                    ...m,
                    userId: m.userId?.toString(),
                })),
                dashboards: team.dashboards?.map((d: ObjectId) => d.toString()),
            })),
        });
    } catch (error) {
        console.error('Error fetching teams:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch teams' },
            { status: 500 }
        );
    }
}

// POST /api/teams - Create new team
export async function POST(request: NextRequest) {
    try {
        const user = await getUserFromToken(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { name, description, avatar, settings } = body;

        if (!name) {
            return NextResponse.json(
                { success: false, error: 'Team name is required' },
                { status: 400 }
            );
        }

        const db = await getDb();

        const team = {
            name,
            description: description || '',
            avatar,
            members: [
                {
                    userId: new ObjectId(user.userId),
                    role: 'owner',
                    joinedAt: new Date(),
                },
            ],
            ownerId: new ObjectId(user.userId),
            settings: {
                defaultDashboardPermission: settings?.defaultDashboardPermission || 'view',
                allowMemberInvites: settings?.allowMemberInvites ?? false,
                requireApproval: settings?.requireApproval ?? true,
            },
            dashboards: [],
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await db.collection('teams').insertOne(team);

        return NextResponse.json({
            success: true,
            data: {
                ...team,
                _id: result.insertedId.toString(),
                ownerId: user.userId,
                members: team.members.map((m) => ({
                    ...m,
                    userId: m.userId.toString(),
                })),
            },
        });
    } catch (error) {
        console.error('Error creating team:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create team' },
            { status: 500 }
        );
    }
}
