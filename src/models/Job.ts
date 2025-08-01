// models/Job.ts
import mongoose, { Schema, Document } from 'mongoose';

// Define the interface for a Job document
export interface IJob extends Document {
    title: string;
    description: string;
    location: string;
    salary: number;
    status: 'active' | 'inactive' | 'closed'; // Added status
    numberOfOpenings: number; // NEW: Number of openings for this position
    postedBy: mongoose.Schema.Types.ObjectId; // Reference to the User model's _id
    createdAt: Date;
    updatedAt: Date;

    // --- NEW FIELDS ADDED ---
    company: string; // The company name
    jobType: 'Full-time' | 'Part-time' | 'Contract' | 'Temporary' | 'Internship'; // Type of job
    skills?: string[]; // Array of required skills
    companyLogo?: string; // URL or path to company logo (optional)
    // --- END NEW FIELDS ---
}

// Define the Job Schema
const JobSchema: Schema<IJob> = new Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    location: { type: String, required: true, trim: true },
    salary: { type: Number, required: true, min: 0 },
    status: { // Added status to schema
        type: String,
        enum: ['active', 'inactive', 'closed'],
        default: 'active',
    },
    numberOfOpenings: { // NEW: Number of openings field added to schema
        type: Number,
        required: true,
        min: 0, // Allow 0, as it will decrement to 0 and then deactivate
        default: 1, // Default to at least one opening
    },
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // This references your 'User' model
        required: true,
    },
    // --- NEW SCHEMA FIELDS ADDED ---
    company: { type: String, required: true, trim: true },
    jobType: {
        type: String,
        enum: ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship'],
        default: 'Full-time',
        required: true,
    },
    skills: [{ type: String, trim: true }], // Array of strings
    companyLogo: { type: String, trim: true }, // Optional string for URL/path
    // --- END NEW SCHEMA FIELDS ---
}, { timestamps: true }); // Mongoose will automatically add createdAt and updatedAt

// Check if the model already exists to prevent OverwriteModelError
const Job = mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);

export default Job;
