// hooks/useStreamChat.ts
import { useState, useEffect, useRef } from 'react';
import { StreamChat } from 'stream-chat';

// Global instance to prevent recreation on hot reload
let chatClient: any = null;

export const useStreamChat = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const isConnecting = useRef(false);

  const getClient = () => {
    if (!chatClient) {
      chatClient = StreamChat.getInstance(process.env.NEXT_PUBLIC_STREAM_KEY!);
      
      // Add connection event listeners
      chatClient.on('connection.changed', (event: any) => {
        console.log('🔌 Connection changed:', event);
        if (event.online) {
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      });

      chatClient.on('connection.recovered', () => {
        console.log('✅ Connection recovered');
        setIsConnected(true);
      });

      chatClient.on('error', (error: any) => {
        console.error('❌ Stream Chat error:', error);
        setConnectionError('Chat connection error');
      });
    }
    return chatClient;
  };

  const generateStreamToken = async (userId: string) => {
    try {
      const response = await fetch('/api/chat/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate chat token');
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('Token generation error:', error);
      throw error;
    }
  };

  const connectUser = async (userId: string, userData: any) => {
    if (isConnecting.current) {
      console.log('🔄 Connection already in progress...');
      return;
    }

    try {
      isConnecting.current = true;
      setConnectionError('');

      const client = getClient();
      
      // Disconnect if already connected to a different user
      if (client.userID && client.userID !== userId) {
        await client.disconnectUser();
        console.log('🔄 Disconnected previous user');
      }

      // If already connected to the same user, just return
      if (client.userID === userId && client.connectionId) {
        console.log('✅ Already connected to same user');
        setIsConnected(true);
        return;
      }

      console.log('🟡 Generating token for user:', userId);
      const streamToken = await generateStreamToken(userId);
      
      console.log('🟡 Connecting user to Stream...');
      await client.connectUser(
        {
          id: userId,
          name: userData.candidateDetails?.fullName || userData.username,
          image: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.candidateDetails?.fullName || userData.username)}&background=165BF8&color=fff`,
        },
        streamToken
      );

      console.log('✅ User connected to Stream:', userId, 'Connection ID:', client.connectionId);
      setIsConnected(true);
      
    } catch (error) {
      console.error('❌ Failed to connect user:', error);
      setConnectionError('Unable to connect to chat service. Please try again later.');
      setIsConnected(false);
    } finally {
      isConnecting.current = false;
    }
  };

  const disconnectUser = async () => {
    try {
      const client = getClient();
      if (client.userID) {
        await client.disconnectUser();
        console.log('✅ User disconnected from Stream');
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Error disconnecting user:', error);
    }
  };

  const startChannel = async (channelId: string) => {
    try {
      const client = getClient();
      
      if (!client.userID) {
        throw new Error('User not connected to Stream');
      }

      console.log('🟡 Starting channel:', channelId);
      
      // Get or create the channel
      const channel = client.channel('messaging', channelId);
      
      // Watch the channel (this subscribes to real-time updates)
      await channel.watch();
      console.log('✅ Channel watching started successfully');
      
      // Query the channel to get current state
      const channelState = await channel.query();
      console.log('📊 Channel state:', {
        id: channelState.channel.id,
        members: channelState.members.map((m: any) => ({
          id: m.user_id,
          name: m.user?.name,
          online: m.user?.online
        })),
        messages: channelState.messages.length
      });
      
      return channel;
    } catch (error) {
      console.error('❌ Failed to start channel:', error);
      throw error;
    }
  };

  // Check if user is member of a channel
  const isUserMemberOfChannel = async (channelId: string, userId: string) => {
    try {
      const client = getClient();
      const channel = client.channel('messaging', channelId);
      const state = await channel.query();
      return state.members.some((member: any) => member.user_id === userId);
    } catch (error) {
      console.error('Error checking channel membership:', error);
      return false;
    }
  };

  return {
    chatClient: getClient(),
    isConnected,
    connectionError,
    connectUser,
    disconnectUser,
    startChannel,
    isUserMemberOfChannel,
    setConnectionError
  };
};