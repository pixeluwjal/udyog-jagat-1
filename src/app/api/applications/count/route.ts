import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Application from '@/models/Application';
import Job from '@/models/Job'; // Import Job model to find jobs by poster
import { authMiddleware } from '@/lib/authMiddleware';
import mongoose from 'mongoose';

// GET /api/applications/count - Fetches the total count of applications for a given job poster.
export async function GET(request: NextRequest) {
    await dbConnect();
    console.log('\n--- API: /api/applications/count GET - Request received ---');

    const authResult = await authMiddleware(request, 'job_poster');
    if (!authResult.success || !authResult.user) {
        console.warn(`API: Fetch applications count failed auth: ${authResult.message}`);
        return NextResponse.json({ error: authResult.message || 'Authentication failed' }, { status: authResult.status || 401 });
    }

    const jobPosterId = authResult.user.id;

    try {
        // Find all jobs posted by the authenticated user
        const jobs = await Job.find({ postedBy: new mongoose.Types.ObjectId(jobPosterId) }).select('_id');
        const jobIds = jobs.map(job => job._id);

        // Count the number of applications that refer to these job IDs
        const applicationsCount = await Application.countDocuments({
            job: { $in: jobIds }
        });

        console.log(`API: Successfully fetched total applications count (${applicationsCount}) for job poster ${jobPosterId}`);

        return NextResponse.json({ count: applicationsCount }, { status: 200 });

    } catch (error: unknown) {
        console.error('API: Fetch applications count error:', error);
        let errorMessage = 'Server error fetching application count.';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
