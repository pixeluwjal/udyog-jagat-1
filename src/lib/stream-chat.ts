// lib/stream-chat.ts
import { StreamChat } from 'stream-chat';

export const serverClient = StreamChat.getInstance(
  process.env.NEXT_PUBLIC_STREAM_KEY!,
  process.env.STREAM_SECRET!
);

// Add error handling for server client
serverClient.on('error', (error) => {
  console.error('Stream Chat Server Client Error:', error);
});

export const createUserToken = (userId: string) => {
  return serverClient.createToken(userId);
};