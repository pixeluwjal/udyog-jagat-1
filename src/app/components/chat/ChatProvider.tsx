// app/components/chat/ChatProvider.tsx
"use client";

import { useEffect, useState } from "react";
import { StreamChat } from "stream-chat";
import { Chat, LoadingIndicator } from "stream-chat-react";
import { ChatUser } from "@/types/chat";

interface ChatProviderProps {
  user: ChatUser;
  token: string;
}

export const ChatProvider = ({ user, token, children }: { children: React.ReactNode } & ChatProviderProps) => {
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);

  useEffect(() => {
    const initClient = async () => {
      try {
        const response = await fetch("/api/chat/token", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to get chat token");
        const data = await response.json();
        const { token: streamToken, apiKey } = data;

        const client = StreamChat.getInstance(apiKey);

        // Disconnect any previous user before connecting the new one
        if (client.userID) {
            await client.disconnectUser();
        }

        await client.connectUser(
          {
            id: user._id,
            name: `${user.firstName} ${user.lastName}`.trim() || user.username,
            image: user.profileImage,
          },
          streamToken
        );

        setChatClient(client);
      } catch (error) {
        console.error("❌ Chat Provider Error:", error);
      }
    };

    if (user?._id && token) {
      initClient();
    }

    // Cleanup on component unmount
    return () => {
      if (chatClient) {
        chatClient.disconnectUser();
      }
    };
  }, [user, token]); // Rerun if user or token changes

  if (!chatClient) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <LoadingIndicator size={40} />
        </div>
    );
  }

  return (
    <Chat client={chatClient} theme="messaging light">
      {children}
    </Chat>
  );
};