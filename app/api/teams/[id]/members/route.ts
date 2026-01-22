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

// POST /api/teams/[id]/members - Add member to team
export async function POST(
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

        const body = await request.json();
        const { email, role = 'member' } = body;

        if (!email) {
            return NextResponse.json(
                { success: false, error: 'Email is required' },
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

        // Check permission - owner, admin, or member if allowed
        const currentMember = team.members?.find(
            (m: { userId: ObjectId }) => m.userId.toString() === user.userId
        );
        const canInvite =
            team.ownerId.toString() === user.userId ||
            currentMember?.role === 'admin' ||
            (team.settings?.allowMemberInvites && currentMember);

        if (!canInvite && user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        // Find user by email
        const targetUser = await db.collection('users').findOne({ email: email.toLowerCase() });

        if (!targetUser) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        // Check if already a member
        const alreadyMember = team.members?.some(
            (m: { userId: ObjectId }) => m.userId.toString() === targetUser._id.toString()
        );

        if (alreadyMember) {
            return NextResponse.json(
                { success: false, error: 'User is already a member' },
                { status: 400 }
            );
        }

        // Add member
        const newMember = {
            userId: targetUser._id,
            role: ['owner', 'admin', 'member', 'viewer'].includes(role) ? role : 'member',
            joinedAt: new Date(),
        };

        await db.collection('teams').updateOne(
            { _id: new ObjectId(id) },
            {
                $push: { members: newMember },
                $set: { updatedAt: new Date() },
            }
        );

        return NextResponse.json({
            success: true,
            data: {
                ...newMember,
                userId: newMember.userId.toString(),
                user: {
                    _id: targetUser._id.toString(),
                    name: targetUser.name,
                    email: targetUser.email,
                },
            },
        });
    } catch (error) {
        console.error('Error adding team member:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to add team member' },
            { status: 500 }
        );
    }
}

// DELETE /api/teams/[id]/members - Remove member from team
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

        const { searchParams } = new URL(request.url);
        const memberUserId = searchParams.get('userId');

        if (!memberUserId || !ObjectId.isValid(memberUserId)) {
            return NextResponse.json(
                { success: false, error: 'Valid user ID is required' },
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

        // Cannot remove owner
        if (team.ownerId.toString() === memberUserId) {
            return NextResponse.json(
                { success: false, error: 'Cannot remove team owner' },
                { status: 400 }
            );
        }

        // Check permission
        const currentMember = team.members?.find(
            (m: { userId: ObjectId }) => m.userId.toString() === user.userId
        );
        const canRemove =
            team.ownerId.toString() === user.userId ||
            currentMember?.role === 'admin' ||
            memberUserId === user.userId; // Can leave team

        if (!canRemove && user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        // Remove member
        await db.collection('teams').updateOne(
            { _id: new ObjectId(id) },
            {
                $pull: { members: { userId: new ObjectId(memberUserId) } },
                $set: { updatedAt: new Date() },
            }
        );

        return NextResponse.json({
            success: true,
            message: 'Member removed successfully',
        });
    } catch (error) {
        console.error('Error removing team member:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to remove team member' },
            { status: 500 }
        );
    }
}

// PUT /api/teams/[id]/members - Update member role
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

        const body = await request.json();
        const { userId: memberUserId, role } = body;

        if (!memberUserId || !ObjectId.isValid(memberUserId)) {
            return NextResponse.json(
                { success: false, error: 'Valid user ID is required' },
                { status: 400 }
            );
        }

        if (!['admin', 'member', 'viewer'].includes(role)) {
            return NextResponse.json(
                { success: false, error: 'Invalid role' },
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

        // Only owner/admin can change roles
        const currentMember = team.members?.find(
            (m: { userId: ObjectId }) => m.userId.toString() === user.userId
        );
        const canChangeRole =
            team.ownerId.toString() === user.userId || currentMember?.role === 'admin';

        if (!canChangeRole && user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        // Cannot change owner's role
        if (team.ownerId.toString() === memberUserId) {
            return NextResponse.json(
                { success: false, error: 'Cannot change owner role' },
                { status: 400 }
            );
        }

        // Update member role
        await db.collection('teams').updateOne(
            { _id: new ObjectId(id), 'members.userId': new ObjectId(memberUserId) },
            {
                $set: {
                    'members.$.role': role,
                    updatedAt: new Date(),
                },
            }
        );

        return NextResponse.json({
            success: true,
            message: 'Member role updated successfully',
        });
    } catch (error) {
        console.error('Error updating member role:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update member role' },
            { status: 500 }
        );
    }
}
