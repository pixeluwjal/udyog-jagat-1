import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs'; // Add bcrypt import

export interface IReferrer {
    username: string;
    email: string;
    password?: string;
    role: 'job_referrer';
    isSuperAdmin: boolean;
    firstLogin: boolean;
    createdBy: Types.ObjectId;
    onboardingStatus: 'not_started' | 'in_progress' | 'completed';
    status: 'active' | 'inactive';
    milanShakaBhaga: string;
    valayaNagar: string;
    khandaBhaga: string;
    referralCode?: string;
    
    // Referrer Personal Details (Captured during onboarding)
    referrerDetails: {
        fullName: string;
        mobileNumber: string;
        personalEmail: string;
        residentialAddress: string;
    };
    
    // Referrer Work Details (Captured during onboarding)
    workDetails: {
        companyName: string;
        workLocation: string;
        designation: string;
    };
    
    jobReferrerDetails?: {
        referralCode?: string;
        totalReferrals?: number;
        successfulReferrals?: number;
        commissionEarned?: number;
    };
}

export interface IReferrerDocument extends IReferrer, Document {}

const ReferrerSchema: Schema<IReferrerDocument> = new Schema(
    {
        username: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: false, select: false },
        role: { type: String, enum: ['job_referrer'], default: 'job_referrer' },
        isSuperAdmin: { type: Boolean, default: false },
        firstLogin: { type: Boolean, default: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        onboardingStatus: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
            required: true
        },
        milanShakaBhaga: { type: String, required: true },
        valayaNagar: { type: String, required: true },
        khandaBhaga: { type: String, required: true },
        referralCode: { type: String },
        
        // Referrer Personal Details
        referrerDetails: {
            fullName: { type: String, required: false },
            mobileNumber: { type: String, required: false },
            personalEmail: { type: String, required: false },
            residentialAddress: { type: String, required: false }
        },
        
        // Referrer Work Details
        workDetails: {
            companyName: { type: String, required: false },
            workLocation: { type: String, required: false },
            designation: { type: String, required: false }
        },
        
        jobReferrerDetails: {
            referralCode: { type: String },
            totalReferrals: { type: Number, default: 0 },
            successfulReferrals: { type: Number, default: 0 },
            commissionEarned: { type: Number, default: 0 }
        },
    },
    {
        timestamps: true,
    }
);

// Add password hashing pre-save hook - THIS IS CRITICAL
ReferrerSchema.pre('save', async function (next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password') || !this.password) return next();
    
    try {
        // Hash the password with salt rounds
        const hashedPassword = await bcrypt.hash(this.password, 10);
        this.password = hashedPassword;
        next();
    } catch (error: any) {
        next(error);
    }
});

// Generate referral code in a separate pre-save hook
ReferrerSchema.pre('save', async function (next) {
    // Generate referral code if not exists
    if (!this.referralCode) {
        this.referralCode = `REF${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }
    if (!this.jobReferrerDetails?.referralCode && this.referralCode) {
        this.jobReferrerDetails = {
            referralCode: this.referralCode,
            totalReferrals: 0,
            successfulReferrals: 0,
            commissionEarned: 0
        };
    }
    next();
});

const ReferrerModel = mongoose.models.Referrer as mongoose.Model<IReferrerDocument> ||
                      mongoose.model<IReferrerDocument>("Referrer", ReferrerSchema);

export default ReferrerModel;