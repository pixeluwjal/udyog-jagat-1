// models/Application.ts
import mongoose, { Schema, Document } from 'mongoose';

// Define the interface for your Application document
export interface IApplication extends Document {
    job: mongoose.Types.ObjectId; // Reference to the Job being applied for
    applicant: mongoose.Types.ObjectId; // Reference to the User (job_seeker) applying
    resumePath?: string; // Snapshot of the resume path at the time of application
    // NEW: Updated status enum
    status: 'Received' | 'Interview Scheduled' | 'Rejected' | 'Hired'; // Application status
    appliedAt: Date; // Timestamp of application
}

const ApplicationSchema: Schema<IApplication> = new Schema(
    {
        job: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Job', // References your Job model
            required: true,
        },
        applicant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // References your User model
            required: true,
        },
        resumePath: {
            type: String,
            required: false, // Resume might be optional in some cases, but generally required for job seekers
        },
        status: {
            type: String,
            // NEW: Updated enum values for job interview statuses
            enum: ['Received', 'Interview Scheduled', 'Rejected', 'Hired'],
            default: 'Received', // NEW: Default status is 'Received'
            required: true,
        },
        appliedAt: {
            type: Date,
            default: Date.now,
            required: true,
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt automatically
    }
);

// Add a unique compound index to prevent duplicate applications for the same job by the same applicant
ApplicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

export default (mongoose.models.Application as mongoose.Model<IApplication>) ||
    mongoose.model<IApplication>('Application', ApplicationSchema);
