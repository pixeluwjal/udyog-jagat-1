// app/api/chat/ensure-user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { StreamChat } from 'stream-chat';

export async function POST(request: NextRequest) {
  try {
    const { userId, name, role } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Initialize Stream Chat server client
    const serverClient = StreamChat.getInstance(
      process.env.NEXT_PUBLIC_STREAM_KEY!,
      process.env.STREAM_SECRET!
    );

    // Map our roles to Stream Chat compatible roles
    const getStreamRole = (role: string) => {
      switch (role) {
        case 'job_referrer':
          return 'user'; // Use 'user' role for referrers
        case 'job_seeker':
          return 'user'; // Use 'user' role for seekers
        case 'admin':
          return 'admin'; // Use 'admin' role for admins
        case 'job_poster':
          return 'user'; // Use 'user' role for job posters
        default:
          return 'user'; // Default to 'user' role
      }
    };

    const streamRole = getStreamRole(role);

    // Create or update user in Stream Chat
    await serverClient.upsertUser({
      id: userId,
      name: name || 'User',
      role: streamRole,
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=165BF8&color=fff`,
    });

    return NextResponse.json({ 
      success: true,
      message: 'User ensured in Stream Chat'
    });
  } catch (error: any) {
    console.error('Ensure user error:', error);
    
    // More detailed error information
    const errorMessage = error.response?.data?.message || error.message || 'Failed to ensure user in Stream Chat';
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: error.response?.data
      },
      { status: 500 }
    );
  }
}