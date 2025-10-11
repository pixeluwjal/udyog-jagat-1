// app/api/seekers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { authMiddleware } from '@/lib/authMiddleware';

export async function GET(request: NextRequest) {
    await dbConnect();
    console.log('\n--- API: /api/seekers GET - Request received ---');

    // Only referrers and admins can view seekers
    const authResult = await authMiddleware(request, ['job_referrer', 'admin']);
    if (!authResult.success || !authResult.user) {
        console.warn(`API: Fetch seekers list failed auth: ${authResult.message}`);
        return NextResponse.json({ error: authResult.message || 'Authentication failed' }, { status: authResult.status || 401 });
    }

    try {
        // Find all users with the 'job_seeker' role
        const seekers = await User.find({ role: 'job_seeker' })
            .select('_id username email firstName lastName phone currentPosition experience skills profileImage isOnline lastSeen candidateDetails')
            .lean();

        console.log(`API: Found ${seekers.length} seekers`);

        if (!seekers || seekers.length === 0) {
            console.log('API: No seekers found in the database.');
            return NextResponse.json({ message: 'No seekers found.' }, { status: 404 });
        }

        // Transform the data to ensure all fields are present
        const transformedSeekers = seekers.map(seeker => ({
            _id: seeker._id.toString(),
            username: seeker.username || '',
            email: seeker.email || '',
            firstName: seeker.firstName || seeker.candidateDetails?.fullName || '',
            lastName: seeker.lastName || '',
            phone: seeker.phone || seeker.candidateDetails?.phone || '',
            currentPosition: seeker.candidateDetails?.experience || '',
            experience: seeker.candidateDetails?.experience || '',
            skills: seeker.candidateDetails?.skills || [],
            profileImage: seeker.profileImage || '',
            isOnline: seeker.isOnline || false,
            lastSeen: seeker.lastSeen || null
        }));

        console.log('API: Successfully fetched seekers with transformed data');
        return NextResponse.json({ 
            message: 'Seekers fetched successfully.',
            seekers: transformedSeekers
        }, { status: 200 });
        
    } catch (error: unknown) {
        console.error('API: Fetch seekers list error:', error);
        let errorMessage = 'Server error fetching seekers list.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}