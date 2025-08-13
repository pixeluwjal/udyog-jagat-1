import mongoose, { Schema, Document } from 'mongoose';

// Define the interface for a single chat message
export interface IMessage {
    senderId: string;
    text: string;
    timestamp: Date;
}

// Define the interface for the entire chat document
export interface IChat extends Document {
    chatId: string;
    messages: IMessage[];
}

const MessageSchema: Schema = new Schema({
    senderId: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const ChatSchema: Schema = new Schema({
    chatId: { type: String, required: true, unique: true },
    messages: [MessageSchema]
});

// Use existing model or create a new one
const Chat = mongoose.models.Chat || mongoose.model<IChat>('Chat', ChatSchema);

export default Chat;
