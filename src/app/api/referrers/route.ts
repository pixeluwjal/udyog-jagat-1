// app/api/referrers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User, { IUser } from '@/models/User';
import { authMiddleware } from '@/lib/authMiddleware';

// GET /api/referrers
// This route allows an authorized user (e.g., a job seeker) to list all users with the 'job_referrer' role.
export async function GET(request: NextRequest) {
    await dbConnect();
    console.log('\n--- API: /api/referrers GET - Request received ---');

    // Authenticate and authorize: only job seekers and admins can view this list
    const authResult = await authMiddleware(request, ['job_seeker', 'admin']);
    if (!authResult.success || !authResult.user) {
        console.warn(`API: Fetch referrers list failed auth: ${authResult.message}`);
        return NextResponse.json({ error: authResult.message || 'Authentication failed' }, { status: authResult.status || 401 });
    }

    try {
        // Find all users with the 'job_referrer' role
        const referrers = await User.find({ role: 'job_referrer' })
                                    .select('_id username email firstName lastName phone') // Select only public, non-sensitive fields
                                    .lean();

        if (!referrers || referrers.length === 0) {
            console.log('API: No referrers found in the database.');
            return NextResponse.json({ message: 'No referrers found.' }, { status: 404 });
        }

        console.log(`API: Successfully fetched ${referrers.length} referrers.`);
        return NextResponse.json({ 
            message: 'Referrers fetched successfully.',
            referrers 
        }, { status: 200 });
        
    } catch (error: unknown) {
        console.error('API: Fetch referrers list error:', error);
        let errorMessage = 'Server error fetching referrers list.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
