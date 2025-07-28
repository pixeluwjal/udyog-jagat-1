// src/types/populated-models.d.ts

import { Document, Types } from 'mongoose'; // Import Types for ObjectId

// Interface for a Job document when it's populated within an Application
// It will contain its _id and the postedBy field
export interface IJobPopulatedForApplication extends Document {
  _id: Types.ObjectId;
  // This 'postedBy' will be the ObjectId of the User who posted the job
  // If you further populate 'postedBy', it would be a IUser (User document)
  postedBy: Types.ObjectId; // It's an ObjectId reference in the Job model
}

// Interface for an Application document where the 'job' field is populated
export interface IApplicationPopulated extends Document {
  _id: Types.ObjectId;
  job: IJobPopulatedForApplication; // The job field is now the populated Job document
  applicant: Types.ObjectId; // Assuming applicant is not populated in this context
  status: 'pending' | 'reviewed' | 'interview' | 'accepted' | 'rejected';
  appliedAt: Date;
  resumePath?: string;
}

// You might also have an interface for the full User document if needed elsewhere
// interface IUser extends Document {
//   _id: Types.ObjectId;
//   username: string;
//   email: string;
//   role: string;
//   // ... other user fields
// }