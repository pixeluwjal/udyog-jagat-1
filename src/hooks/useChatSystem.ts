// hooks/useChatSystem.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";

export interface ChatMessage {
  _id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  status: 'sent' | 'delivered' | 'read';
  timestamp: Date;
  readAt?: Date;
}

export interface ChatUser {
  _id: string;
  username: string;
  email: string;
  role: string;
  candidateDetails?: {
    fullName?: string;
    phone?: string;
    skills?: string[];
    experience?: string;
  };
  jobReferrerDetails?: {
    referralCode?: string;
  };
}

export interface ChatConversation {
  user: ChatUser;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

export const useChatSystem = () => {
  const { user: currentUser, token } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    if (!token || !currentUser) return;

    try {
      const response = await fetch(`/api/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  }, [token, currentUser]);

  // Fetch messages for a specific user
  const fetchMessages = useCallback(async (userId: string) => {
    if (!token || !currentUser) return;

    try {
      const response = await fetch(`/api/chat/messages/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, [token, currentUser]);

  // Send a message
  const sendMessage = useCallback(async (content: string, receiverId: string) => {
    if (!token || !currentUser || !content.trim()) return;

    setIsSending(true);
    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiverId,
          content: content.trim(),
          type: 'text'
        }),
      });

      if (response.ok) {
        const newMessage = await response.json();
        setMessages(prev => [...prev, newMessage]);
        
        // Update conversations list
        await fetchConversations();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to send message:", error);
      return false;
    } finally {
      setIsSending(false);
    }
  }, [token, currentUser, fetchConversations]);

  // Select a user to chat with
  const selectUser = useCallback(async (user: ChatUser) => {
    setSelectedUser(user);
    await fetchMessages(user._id);
    
    // Mark messages as read
    if (messages.some(msg => msg.receiverId === currentUser?._id && msg.status !== 'read')) {
      await markAsRead(user._id);
    }
  }, [fetchMessages, currentUser?._id, messages]);

  // Mark messages as read
  const markAsRead = useCallback(async (userId: string) => {
    if (!token) return;

    try {
      await fetch('/api/chat/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });
      
      // Update local state
      setMessages(prev => 
        prev.map(msg => 
          msg.senderId === userId && msg.status !== 'read' 
            ? { ...msg, status: 'read', readAt: new Date() }
            : msg
        )
      );
      
      // Update conversations
      setConversations(prev =>
        prev.map(conv =>
          conv.user._id === userId
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  }, [token]);

  // Initialize
  useEffect(() => {
    if (currentUser && token) {
      fetchConversations();
      setIsLoading(false);
    }
  }, [currentUser, token, fetchConversations]);

  return {
    conversations,
    messages,
    selectedUser,
    isLoading,
    isSending,
    selectUser,
    sendMessage,
    fetchConversations,
    currentUser,
  };
};