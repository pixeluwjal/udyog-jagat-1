// app/api/applications/my-applications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Application from '@/models/Application'; // Assuming your Application model path
import SavedJob from '@/models/SavedJob';     // Assuming your SavedJob model path
import { authMiddleware } from '@/lib/authMiddleware';
import mongoose from 'mongoose';

// GET /api/applications/my-applications - Fetch all applications and saved jobs for the authenticated job seeker
export async function GET(request: NextRequest) {
    await dbConnect();
    console.log('\n--- API: /api/applications/my-applications GET - Request received ---');

    const authResult = await authMiddleware(request, 'job_seeker');
    if (!authResult.success || !authResult.user) {
        console.warn(`API: Fetch my applications failed auth: ${authResult.message}`);
        return NextResponse.json({ error: authResult.message || 'Authentication failed' }, { status: authResult.status || 401 });
    }

    const jobSeekerId = authResult.user.id;

    try {
        // Fetch applications for the job seeker
        const applications = await Application.find({ applicant: new mongoose.Types.ObjectId(jobSeekerId) })
            .populate({
                path: 'job',
                select: '_id title description location salary company jobType createdAt' // Select relevant job fields
            })
            .lean(); // Return plain JavaScript objects

        // Fetch saved jobs for the job seeker
        const savedJobs = await SavedJob.find({ user: new mongoose.Types.ObjectId(jobSeekerId) })
            .populate({
                path: 'job',
                select: '_id title description location salary company jobType createdAt' // Select relevant job fields
            })
            .lean(); // Return plain JavaScript objects

        console.log(`API: Successfully fetched ${applications.length} applications and ${savedJobs.length} saved jobs for job seeker ${jobSeekerId}`);

        return NextResponse.json({ applications, savedJobs }, { status: 200 });

    } catch (error: unknown) {
        console.error('API: Fetch my applications error:', error);
        let errorMessage = 'Server error fetching user applications and saved jobs.';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
