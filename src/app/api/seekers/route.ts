// app/api/seekers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import UserModel from '@/models/User';
import dbConnect from '@/lib/dbConnect';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting seekers API...');
    
    await dbConnect();
    console.log('✅ Database connected');

    // Get job seekers (users with role 'job_seeker')
    const seekers = await UserModel.find(
      { 
        role: 'job_seeker',
        status: 'active'
      },
      {
        username: 1,
        email: 1,
        role: 1,
        candidateDetails: 1,
        onboardingStatus: 1
      }
    ).lean();

    console.log(`✅ Found ${seekers.length} job seekers`);

    // Only create Stream users if we have seekers
    if (seekers.length > 0) {
      try {
        const { default: StreamChat } = await import('stream-chat');
        const streamClient = StreamChat.getInstance(
          process.env.NEXT_PUBLIC_STREAM_KEY!,
          process.env.STREAM_SECRET!
        );

        for (const seeker of seekers) {
          try {
            // Create or update user in Stream Chat
            await streamClient.upsertUser({
              id: seeker._id.toString(),
              name: seeker.candidateDetails?.fullName || seeker.username,
              role: 'seeker',
              image: `https://ui-avatars.com/api/?name=${encodeURIComponent(seeker.candidateDetails?.fullName || seeker.username)}&background=10B981&color=fff`,
            });
            console.log(`✅ Created Stream user for: ${seeker.candidateDetails?.fullName || seeker.username}`);
          } catch (error) {
            console.error(`❌ Failed to upsert Stream user for seeker ${seeker._id}:`, error);
          }
        }
      } catch (streamError) {
        console.error('❌ Stream Chat initialization failed:', streamError);
        // Continue without Stream - don't break the API
      }
    }

    return NextResponse.json({ 
      success: true,
      seekers: seekers.map(seeker => ({
        ...seeker,
        _id: seeker._id.toString()
      }))
    });

  } catch (error: any) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch job seekers' 
      },
      { status: 500 }
    );
  }
}