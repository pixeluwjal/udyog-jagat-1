"use client";

import { useAuth } from "@/app/context/AuthContext";
import { ChatProvider } from "@/app/components/chat/ChatProvider";
import { ReferrerChatLayout } from "./ReferrerChatLayout";
import { FiMessageSquare } from "react-icons/fi"; // Import the icon

export default function ReferrerMessagesPage() {
  const { user, loading: authLoading, isAuthenticated, token } = useAuth();

  // The conditional logic remains the same.
  if (authLoading || !isAuthenticated || !user || !token || user.role !== "job_referrer") {
    // This is the new, redesigned loading/authentication screen.
    return (
      <div className="flex h-screen bg-[#F7F9FC] justify-center items-center font-sans">
        <div className="flex flex-col items-center space-y-6 text-center">
          
          {/* New Pulsating Icon Animation */}
          <div className="relative flex items-center justify-center w-24 h-24">
            {/* Pulsating rings - these create the ripple effect */}
            <div className="absolute w-full h-full rounded-full bg-blue-500/10 animate-ping"></div>
            <div 
              className="absolute w-full h-full rounded-full bg-blue-500/10 animate-ping" 
              style={{ animationDelay: '0.5s' }}
            ></div>
            
            {/* Central Icon */}
            <div className="relative w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <FiMessageSquare className="w-10 h-10 text-[#2245AE]" />
            </div>
          </div>
          
          {/* Updated Loading Text */}
          <div className="space-y-1">
            <p className="text-gray-800 font-bold text-xl tracking-wide">
              Connecting to Your Messages
            </p>
            <p className="text-gray-500 text-sm">
              Please wait while we secure your connection...
            </p>
          </div>

        </div>
      </div>
    );
  }

  // The main component remains unchanged.
  return (
    <ChatProvider user={user} token={token}>
      <div className="min-h-screen">
        <ReferrerChatLayout />
      </div>
    </ChatProvider>
  );
}