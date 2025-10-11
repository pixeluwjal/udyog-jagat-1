// app/api/chat/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/stream-chat";

export async function POST(request: NextRequest) {
  try {
    const { users } = await request.json();

    if (!users || !Array.isArray(users)) {
      return NextResponse.json({ error: "Users array is required" }, { status: 400 });
    }

    console.log('🔧 Creating/updating users in Stream:', users);

    // Upsert users in Stream Chat
    const response = await serverClient.upsertUsers(users);

    console.log('✅ Users created/updated in Stream:', Object.keys(response.users));

    return NextResponse.json({ 
      success: true,
      users: response.users 
    });

  } catch (error: any) {
    console.error("❌ Error creating users in Stream:", error);
    return NextResponse.json({ 
      error: "Failed to create users: " + error.message 
    }, { status: 500 });
  }
}