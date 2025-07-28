// models/ReferralCode.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReferralCode extends Document {
    code: string;
    candidateEmail: string;
    expiresAt: Date;
    generatedByAdminId: Types.ObjectId; // Link to the admin who generated it
    isUsed: boolean;
    usedBy?: Types.ObjectId; // Link to the user who used this code
    usedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ReferralCodeSchema: Schema<IReferralCode> = new Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            minlength: 8, // Enforce a minimum length for codes
        },
        candidateEmail: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        generatedByAdminId: {
            type: Schema.Types.ObjectId,
            ref: 'User', // References your User model
            required: true,
        },
        isUsed: {
            type: Boolean,
            default: false,
        },
        usedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        usedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt
    }
);

// Add an index for faster lookup by admin and expiration
ReferralCodeSchema.index({ generatedByAdminId: 1, expiresAt: 1 });
ReferralCodeSchema.index({ code: 1, isUsed: 1 }); // For quick lookup during usage

const ReferralCodeModel = mongoose.models.ReferralCode as mongoose.Model<IReferralCode> ||
                          mongoose.model<IReferralCode>('ReferralCode', ReferralCodeSchema);

export default ReferralCodeModel;