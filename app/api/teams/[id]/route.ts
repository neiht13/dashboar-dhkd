import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'
);

async function getUserFromToken(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as { userId: string; email: string; role: string };
    } catch {
        return null;
    }
}

function checkTeamPermission(
    team: { ownerId: ObjectId; members: Array<{ userId: ObjectId; role: string }> },
    userId: string,
    requiredRoles: string[]
): boolean {
    if (team.ownerId.toString() === userId) return true;

    const member = team.members.find((m) => m.userId.toString() === userId);
    if (!member) return false;

    return requiredRoles.includes(member.role);
}

// GET /api/teams/[id] - Get team details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getUserFromToken(request);

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: 'Invalid team ID' },
                { status: 400 }
            );
        }

        const db = await getDb();

        const team = await db
            .collection('teams')
            .aggregate([
                { $match: { _id: new ObjectId(id), isActive: true } },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'members.userId',
                        foreignField: '_id',
                        as: 'memberDetails',
                    },
                },
                {
                    $lookup: {
                        from: 'dashboards',
                        localField: 'dashboards',
                        foreignField: '_id',
                        as: 'dashboardDetails',
                    },
                },
            ])
            .toArray();

        if (!team.length) {
            return NextResponse.json(
                { success: false, error: 'Team not found' },
                { status: 404 }
            );
        }

        const teamData = team[0];

        // Check if user is member
        const isMember =
            teamData.ownerId.toString() === user.userId ||
            teamData.members?.some((m: { userId: ObjectId }) => m.userId.toString() === user.userId);

        if (!isMember && user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                ...teamData,
                _id: teamData._id.toString(),
                ownerId: teamData.ownerId?.toString(),
                members: teamData.members?.map((m: { userId: ObjectId; role: string; joinedAt: Date }) => {
                    const memberDetail = teamData.memberDetails?.find(
                        (u: { _id: ObjectId }) => u._id.toString() === m.userId.toString()
                    );
                    return {
                        ...m,
                        userId: m.userId?.toString(),
                        user: memberDetail
                            ? {
                                _id: memberDetail._id?.toString(),
                                name: memberDetail.name,
                                email: memberDetail.email,
                            }
                            : null,
                    };
                }),
                dashboards: teamData.dashboardDetails?.map((d: { _id: ObjectId; name: string }) => ({
                    _id: d._id.toString(),
                    name: d.name,
                })),
            },
        });
    } catch (error) {
        console.error('Error fetching team:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch team' },
            { status: 500 }
        );
    }
}

// PUT /api/teams/[id] - Update team
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getUserFromToken(request);

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: 'Invalid team ID' },
                { status: 400 }
            );
        }

        const db = await getDb();
        const team = await db.collection('teams').findOne({ _id: new ObjectId(id), isActive: true });

        if (!team) {
            return NextResponse.json(
                { success: false, error: 'Team not found' },
                { status: 404 }
            );
        }

        // Only owner/admin can update team
        if (!checkTeamPermission(team, user.userId, ['owner', 'admin'])) {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { name, description, avatar, settings } = body;

        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (avatar !== undefined) updateData.avatar = avatar;
        if (settings !== undefined) updateData.settings = { ...team.settings, ...settings };

        await db.collection('teams').updateOne({ _id: new ObjectId(id) }, { $set: updateData });

        return NextResponse.json({
            success: true,
            message: 'Team updated successfully',
        });
    } catch (error) {
        console.error('Error updating team:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update team' },
            { status: 500 }
        );
    }
}

// DELETE /api/teams/[id] - Delete team (soft delete)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getUserFromToken(request);

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: 'Invalid team ID' },
                { status: 400 }
            );
        }

        const db = await getDb();
        const team = await db.collection('teams').findOne({ _id: new ObjectId(id), isActive: true });

        if (!team) {
            return NextResponse.json(
                { success: false, error: 'Team not found' },
                { status: 404 }
            );
        }

        // Only owner can delete team
        if (team.ownerId.toString() !== user.userId && user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Only team owner can delete the team' },
                { status: 403 }
            );
        }

        // Soft delete
        await db
            .collection('teams')
            .updateOne({ _id: new ObjectId(id) }, { $set: { isActive: false, updatedAt: new Date() } });

        return NextResponse.json({
            success: true,
            message: 'Team deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting team:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete team' },
            { status: 500 }
        );
    }
}
