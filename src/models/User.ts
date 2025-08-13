// models/User.ts

import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs'; // Moved bcrypt import to the top

// Define your interfaces
export interface IUserBase {
    username: string;
    email: string;
    password?: string; // Optional for security, managed by auth
    role: 'job_seeker' | 'job_poster' | 'admin' | 'job_referrer';
    isSuperAdmin: boolean;
    firstLogin: boolean;
    createdBy?: Types.ObjectId; // Optional: ID of user who created this user (e.g., admin)
    // FIX: Updated onboardingStatus to match AuthContext
    onboardingStatus: 'not_started' | 'in_progress' | 'completed';
    status: 'active' | 'inactive';

    // NEW: Additional fields for Milan/Shaka/Bhaga, Valaya/Nagar, Khanda/Bhaga
    milanShakaBhaga?: string;
    valayaNagar?: string;
    khandaBhaga?: string;

    // FIX: Changed resume field to an object to store ID and fileName
    resume?: {
        resumeId: string;
        fileName: string;
    };

    candidateDetails?: {
        fullName?: string;
        phone?: string;
        skills?: string[];
        experience?: string;
    };
    jobPosterDetails?: {
        companyName?: string;
    };
    jobReferrerDetails?: {
        referralCode?: string;
    };
}

export interface IUser extends IUserBase, Document {
    // Mongoose adds _id, createdAt, updatedAt automatically with timestamps: true
}

// Define your Mongoose Schema
const UserSchema: Schema<IUser> = new Schema(
    {
        username: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true },
        // FIX: Made password optional in schema to match interface, since it's not always sent.
        password: { type: String, required: false, select: false },
        role: { type: String, enum: ['job_seeker', 'job_poster', 'admin', 'job_referrer'], default: 'job_seeker' },
        isSuperAdmin: { type: Boolean, default: false },
        firstLogin: { type: Boolean, default: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
        // FIX: Updated onboardingStatus to match AuthContext
        onboardingStatus: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
            required: true
        },
        // FIX: Updated resume field to a nested object
        resume: {
            resumeId: { type: String },
            fileName: { type: String },
        },
        milanShakaBhaga: { type: String },
        valayaNagar: { type: String },
        khandaBhaga: { type: String },
        candidateDetails: {
            fullName: { type: String },
            phone: { type: String },
            skills: [{ type: String }],
            experience: { type: String },
        },
        jobPosterDetails: {
            companyName: { type: String },
        },
        jobReferrerDetails: {
            referralCode: { type: String },
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt fields
    }
);

UserSchema.pre('save', async function (next) {
    // FIX: Added null check for password and used imported bcrypt
    if (this.isModified('password') && this.password) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Create and export the model
const UserModel = mongoose.models.User as mongoose.Model<IUser> ||
                   mongoose.model<IUser>("User", UserSchema);

export default UserModel;
