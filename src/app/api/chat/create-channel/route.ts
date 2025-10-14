// app/api/chat/create-channel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { StreamChat } from 'stream-chat';

export async function POST(request: NextRequest) {
  try {
    const { userId1, userId2, userName1, userName2 } = await request.json();

    if (!userId1 || !userId2) {
      return NextResponse.json({ error: 'Both user IDs are required' }, { status: 400 });
    }

    console.log('🟡 Creating channel between:', userId1, 'and', userId2);

    // Initialize Stream Chat server client
    const serverClient = StreamChat.getInstance(
      process.env.NEXT_PUBLIC_STREAM_KEY!,
      process.env.STREAM_SECRET!
    );

    // Ensure both users exist in Stream Chat
    try {
      await serverClient.upsertUsers([
        {
          id: userId1,
          name: userName1 || 'User 1',
          role: 'user',
          image: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName1 || 'User1')}&background=165BF8&color=fff`,
        },
        {
          id: userId2,
          name: userName2 || 'User 2',
          role: 'user',
          image: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName2 || 'User2')}&background=10B981&color=fff`,
        }
      ]);
      console.log('✅ Users upserted successfully');
    } catch (upsertError) {
      console.error('❌ User upsert error:', upsertError);
    }

    // Create consistent channel ID (alphabetically sorted to ensure same channel for both users)
    const sortedUserIds = [userId1, userId2].sort();
    const channelId = `chat-${sortedUserIds[0]}-${sortedUserIds[1]}`;

    console.log('🟡 Creating channel with ID:', channelId);

    // Create the channel
    const channel = serverClient.channel('messaging', channelId, {
      name: `Chat between ${userName1} and ${userName2}`,
      members: [userId1, userId2],
      created_by_id: userId1,
    });

    try {
      // Create the channel on Stream
      await channel.create();
      console.log('✅ Channel created successfully');

      // Query the channel to verify it was created with both members
      const channelState = await channel.query();
      console.log('✅ Channel state:', {
        id: channelState.channel.id,
        members: channelState.members.map(m => ({ id: m.user_id, role: m.role })),
        memberCount: channelState.members.length
      });

      return NextResponse.json({ 
        success: true,
        channelId: channelId,
        message: 'Channel created successfully'
      });

    } catch (createError: any) {
      console.error('❌ Channel creation error:', createError);
      
      // If channel already exists, return the existing channel ID
      if (createError.message?.includes('channel already exists')) {
        console.log('🔄 Channel already exists, returning existing channel ID');
        return NextResponse.json({ 
          success: true,
          channelId: channelId,
          message: 'Channel already exists'
        });
      }
      
      throw createError;
    }

  } catch (error: any) {
    console.error('❌ Create channel error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to create channel',
        details: error.response?.data
      },
      { status: 500 }
    );
  }
}