import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IConversation extends Document {
  _id: string;
  participants: Types.ObjectId[];
  lastMessage?: Types.ObjectId;
  unreadCount: number;
  lastMessageAt: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema: Schema = new Schema({
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  unreadCount: {
    type: Number,
    default: 0
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure unique participants combination
ConversationSchema.index({ participants: 1 }, { unique: true });

// Index for better query performance
ConversationSchema.index({ lastMessageAt: -1 });
ConversationSchema.index({ 'participants._id': 1 });

export default mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);