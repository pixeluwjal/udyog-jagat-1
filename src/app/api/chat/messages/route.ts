// app/api/chat/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authMiddleware } from "@/lib/authMiddleware";
import { serverClient } from "@/lib/stream-chat";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);

    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: authResult.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const receiverId = searchParams.get("receiverId");

    if (!receiverId) {
      return NextResponse.json({ error: "Receiver ID required" }, { status: 400 });
    }

    console.log('🔧 Fetching messages between:', authResult.user!._id, 'and', receiverId);

    try {
      // Ensure both users exist in Stream Chat
      const currentUser = {
        id: authResult.user!._id,
        name: authResult.user!.username || 'User',
        role: 'user'
      };

      const receiverUser = {
        id: receiverId,
        name: 'Job Seeker', // You might want to fetch actual user data
        role: 'user'
      };

      await serverClient.upsertUsers([currentUser, receiverUser]);
      console.log('✅ Users ensured in Stream Chat');

      // Create channel with created_by_id for server-side auth
      const channel = serverClient.channel("messaging", {
        members: [authResult.user!._id, receiverId],
        created_by_id: authResult.user!._id, // ✅ FIX: Add created_by_id
      });

      await channel.watch();
      
      const messagesResponse = await channel.query({
        messages: { limit: 50 }
      });

      console.log('✅ Found', messagesResponse.messages.length, 'messages');

      return NextResponse.json({ 
        messages: messagesResponse.messages.map((msg: any) => ({
          id: msg.id,
          content: msg.text,
          senderId: msg.user.id,
          timestamp: msg.created_at,
          type: "text"
        }))
      });

    } catch (streamError: any) {
      console.error("❌ Stream Chat channel error:", streamError);
      
      return NextResponse.json({ 
        error: "Stream Chat error: " + streamError.message 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("❌ Messages API error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch messages: " + error.message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);

    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: authResult.status || 401 });
    }

    const { receiverId, content } = await request.json();

    if (!receiverId || !content) {
      return NextResponse.json({ error: "Receiver ID and content required" }, { status: 400 });
    }

    console.log('🔧 Sending message from:', authResult.user!._id, 'to:', receiverId);

    try {
      // Ensure both users exist first
      const currentUser = {
        id: authResult.user!._id,
        name: authResult.user!.username || 'User',
        role: 'user'
      };

      const receiverUser = {
        id: receiverId,
        name: 'Job Seeker',
        role: 'user'
      };

      await serverClient.upsertUsers([currentUser, receiverUser]);

      // Create channel with created_by_id
      const channel = serverClient.channel("messaging", {
        members: [authResult.user!._id, receiverId],
        created_by_id: authResult.user!._id, // ✅ FIX: Add created_by_id
      });

      await channel.watch();
      
      // Send message
      const response = await channel.sendMessage({
        text: content,
      });

      console.log('✅ Message sent successfully:', response.message.id);

      return NextResponse.json({
        _id: response.message.id,
        id: response.message.id,
        senderId: authResult.user!._id,
        receiverId,
        content,
        timestamp: response.message.created_at,
        type: "text",
        status: "sent"
      });

    } catch (streamError: any) {
      console.error("❌ Stream Chat send error:", streamError);
      
      return NextResponse.json({ 
        error: "Stream Chat error: " + streamError.message 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("❌ Send message API error:", error);
    return NextResponse.json({ 
      error: "Failed to send message: " + error.message 
    }, { status: 500 });
  }
}