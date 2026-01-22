import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITeamMember {
    userId: mongoose.Types.ObjectId;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    joinedAt: Date;
}

export interface ITeam extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    avatar?: string;
    members: ITeamMember[];
    ownerId: mongoose.Types.ObjectId;
    settings: {
        defaultDashboardPermission: 'view' | 'edit';
        allowMemberInvites: boolean;
        requireApproval: boolean;
    };
    dashboards: mongoose.Types.ObjectId[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const TeamMemberSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    role: {
        type: String,
        enum: ['owner', 'admin', 'member', 'viewer'],
        default: 'member',
    },
    joinedAt: {
        type: Date,
        default: Date.now,
    },
}, { _id: false });

const TeamSchema = new Schema<ITeam>(
    {
        name: {
            type: String,
            required: [true, 'Team name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        description: {
            type: String,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },
        avatar: String,
        members: [TeamMemberSchema],
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        settings: {
            defaultDashboardPermission: {
                type: String,
                enum: ['view', 'edit'],
                default: 'view',
            },
            allowMemberInvites: {
                type: Boolean,
                default: false,
            },
            requireApproval: {
                type: Boolean,
                default: true,
            },
        },
        dashboards: [{
            type: Schema.Types.ObjectId,
            ref: 'Dashboard',
        }],
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
TeamSchema.index({ ownerId: 1 });
TeamSchema.index({ 'members.userId': 1 });
TeamSchema.index({ name: 'text', description: 'text' });

// Virtual for member count
TeamSchema.virtual('memberCount').get(function() {
    return this.members.length;
});

const Team: Model<ITeam> = 
    mongoose.models.Team || 
    mongoose.model<ITeam>('Team', TeamSchema);

export default Team;
