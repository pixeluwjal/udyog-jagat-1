// app/api/chat/token/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createUserToken } from "@/lib/stream-chat";
import { authMiddleware } from "@/lib/authMiddleware";

export async function GET(request: NextRequest) {
  try {
    console.log('🔐 Token API: Starting authentication...');
    
    // Use auth middleware
    const authResult = await authMiddleware(request);

    if (!authResult.success) {
      console.log('❌ Token API: Auth failed -', authResult.message);
      return NextResponse.json({ 
        error: authResult.message 
      }, { status: authResult.status || 401 });
    }

    const userId = authResult.user?._id;
    
    if (!userId) {
      console.log('❌ Token API: No user ID found');
      return NextResponse.json({ 
        error: "User ID not found" 
      }, { status: 401 });
    }

    console.log('✅ Token API: Generating token for user:', userId);

    // Generate Stream Chat token
    const token = createUserToken(userId);
    
    console.log('✅ Token API: Successfully generated token');
    
    return NextResponse.json({ 
      token,
      apiKey: process.env.NEXT_PUBLIC_STREAM_KEY
    });

  } catch (error: any) {
    console.error("❌ Token API: Token generation error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to generate token" 
    }, { status: 500 });
  }
}