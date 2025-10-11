// app/seeker/find-referrer/page.tsx
"use client";

import { useAuth } from "@/app/context/AuthContext";
import { ChatProvider } from "@/app/components/chat/ChatProvider";
import { SeekerChatLayout } from "./SeekerChatLayout"; // We will create this next

export default function FindReferrerPage() {
    const { user, loading: authLoading, isAuthenticated, token } = useAuth();

    if (authLoading || !isAuthenticated || !user || !token || user.role !== "job_seeker") {
        return (
             <div className="flex h-screen bg-white justify-center items-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#2245AE] border-t-transparent" />
             </div>
        );
    }

    return (
        <ChatProvider user={user} token={token}>
            <SeekerChatLayout />
        </ChatProvider>
    );
}