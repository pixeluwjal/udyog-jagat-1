// models/PasswordResetToken.ts
import mongoose, { Document, Schema } from 'mongoose';

// Define the interface for a PasswordResetToken document
export interface IPasswordResetToken extends Document {
    userId: mongoose.Types.ObjectId;
    token: string;
    expiresAt: Date;
    createdAt: Date;
}

// Define the Mongoose schema for PasswordResetToken
const PasswordResetTokenSchema: Schema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User', // Reference to the User model
    },
    token: {
        type: String,
        required: true,
        unique: true, // Ensure tokens are unique
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '1h', // Token will automatically expire and be deleted after 1 hour
        // This 'expires' feature requires MongoDB to be running with TTL index support
    },
});

// Create a TTL index on the 'createdAt' field for automatic deletion after 'expires' duration
// This ensures that expired tokens are automatically cleaned up from the database.
// The 'expires' option in the schema (e.g., expires: '1h') works in conjunction with this index.
PasswordResetTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 }); // 3600 seconds = 1 hour

// Export the model. If it already exists, use the existing one.
const PasswordResetToken = mongoose.models.PasswordResetToken || mongoose.model<IPasswordResetToken>('PasswordResetToken', PasswordResetTokenSchema);

export default PasswordResetToken;
