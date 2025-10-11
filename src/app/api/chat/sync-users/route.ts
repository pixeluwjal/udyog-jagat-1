// app/api/chat/sync-users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authMiddleware } from "@/lib/authMiddleware";
import { serverClient } from "@/lib/stream-chat";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);

    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: authResult.status || 401 });
    }

    const { userIds } = await request.json();

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: "User IDs array required" }, { status: 400 });
    }

    console.log('🔧 Syncing users to Stream Chat:', userIds);

    try {
      // Create proper user objects for Stream Chat
      const users = userIds.map(userId => ({
        id: userId,
        name: 'User', // In production, fetch actual user data from your database
        role: 'user',
        // Add any additional user properties you need
      }));

      const response = await serverClient.upsertUsers(users);
      
      const createdUsers = Object.keys(response.users);
      console.log('✅ Users synced to Stream Chat:', createdUsers);

      return NextResponse.json({
        success: true,
        syncedUsers: createdUsers,
        total: createdUsers.length
      });

    } catch (error: any) {
      console.error("❌ Stream Chat sync error:", error);
      return NextResponse.json({ 
        error: "Failed to sync users: " + error.message,
        details: "Make sure Stream Chat is properly configured with your API key and secret"
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("❌ Sync users API error:", error);
    return NextResponse.json({ 
      error: "Failed to sync users: " + error.message 
    }, { status: 500 });
  }
}