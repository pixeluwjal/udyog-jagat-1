import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMessage extends Document {
  _id: string;
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  content: string;
  type: 'text' | 'image' | 'file';
  status: 'sent' | 'delivered' | 'read';
  timestamp: Date;
  readAt?: Date;
  deliveredAt?: Date;
  
  // For file messages
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema({
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text'
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  readAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  
  // For file messages
  fileUrl: {
    type: String,
    trim: true
  },
  fileName: {
    type: String,
    trim: true
  },
  fileSize: {
    type: Number
  },
  mimeType: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for better query performance
MessageSchema.index({ senderId: 1, receiverId: 1 });
MessageSchema.index({ receiverId: 1, senderId: 1 });
MessageSchema.index({ timestamp: -1 });
MessageSchema.index({ status: 1 });
MessageSchema.index({ createdAt: -1 });

// Compound index for conversation queries
MessageSchema.index({ 
  senderId: 1, 
  receiverId: 1, 
  timestamp: -1 
});

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);