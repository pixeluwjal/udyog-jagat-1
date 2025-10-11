// types/chat.ts
export interface ChatUser {
  _id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  position?: string;
  profileImage?: string;
  isOnline?: boolean;
  lastSeen?: Date;
  displayName?: string;
}

export interface Message {
  _id?: string;
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  type: "text" | "file";
  status: "sent" | "delivered" | "read";
}

export type UserRole = "job_seeker" | "job_referrer";