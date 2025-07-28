// models/SavedJob.ts
import mongoose, { Schema, Document } from 'mongoose';

// Define the interface for your SavedJob document
export interface ISavedJob extends Document {
  user: mongoose.Types.ObjectId; // Reference to the User (job_seeker) who saved the job
  job: mongoose.Types.ObjectId; // Reference to the Job that was saved
  savedAt: Date; // Timestamp when the job was saved
}

const SavedJobSchema: Schema<ISavedJob> = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // References your User model
      required: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job', // References your Job model
      required: true,
    },
    savedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// Add a unique compound index to prevent saving the same job multiple times by the same user
SavedJobSchema.index({ user: 1, job: 1 }, { unique: true });

export default (mongoose.models.SavedJob as mongoose.Model<ISavedJob>) ||
  mongoose.model<ISavedJob>('SavedJob', SavedJobSchema);
