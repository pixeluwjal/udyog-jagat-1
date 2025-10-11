import { Socket } from 'socket.io';

export interface User {
  _id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  isOnline?: boolean;
  lastSeen?: Date;
}

export interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  type: 'text' | 'file';
  status: 'sent' | 'delivered' | 'read';
}

export interface MessageData {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'file';
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
}

export interface SocketUser {
  _id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
}

export interface AuthenticatedSocket extends Socket {
  userId: string;
  user: SocketUser;
}