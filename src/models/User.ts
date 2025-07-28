// models/User.ts

import mongoose, { Schema, Document, Types } from 'mongoose';

// Define your interfaces
export interface IUserBase {
  username: string;
  email: string;
  password?: string; // Optional for security, managed by auth
  role: 'job_seeker' | 'job_poster' | 'admin' | 'job_referrer'; // ADDED 'job_referrer' here
  isSuperAdmin: boolean;
  firstLogin: boolean;
  createdBy?: Types.ObjectId; // Optional: ID of user who created this user (e.g., admin)
  onboardingStatus: 'pending' | 'completed';
  
  // Add resumeGridFsId here in the base interface
  resumeGridFsId?: Types.ObjectId; 

  candidateDetails?: {
    fullName?: string;
    phone?: string;
    skills?: string[];
    experience?: string;
  };
  jobPosterDetails?: {
    companyName?: string;
    // ... other job poster specific fields
  };
  // Add jobReferrerDetails if you plan to store specific data for referrers
  jobReferrerDetails?: {
    referralCode?: string;
    // Add any other fields specific to job referrers
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
    password: { type: String, required: true, select: false }, // password not returned by default
    role: { type: String, enum: ['job_seeker', 'job_poster', 'admin', 'job_referrer'], default: 'job_seeker' }, // ADDED 'job_referrer' here
    isSuperAdmin: { type: Boolean, default: false },
    firstLogin: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    onboardingStatus: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    
    resumeGridFsId: { type: Schema.Types.ObjectId }, // Define it here

    candidateDetails: {
      fullName: { type: String },
      phone: { type: String },
      skills: [{ type: String }],
      experience: { type: String },
    },
    jobPosterDetails: {
      companyName: { type: String },
      // ...
    },
    // Optional: Add a schema for jobReferrerDetails if needed
    jobReferrerDetails: {
      referralCode: { type: String },
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Add pre-save hook for password hashing (if you have one)
UserSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await (require('bcryptjs').hash)(this.password, 10);
  }
  next();
});

// Create and export the model
const UserModel = mongoose.models.User as mongoose.Model<IUser> ||
                   mongoose.model<IUser>("User", UserSchema);

export default UserModel;
