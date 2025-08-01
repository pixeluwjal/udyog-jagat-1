// app/api/jobs/[jobid]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Job from '@/models/Job';
import { authMiddleware } from '@/lib/authMiddleware';
import mongoose from 'mongoose';

// GET /api/jobs/[jobid] - Fetch a single job by ID
export async function GET(request: NextRequest, { params }: { params: { jobid: string } }) {
    await dbConnect();
    console.log('\n--- API: /api/jobs/[jobid] GET - Request received ---');

    const authResult = await authMiddleware(request, ['job_poster', 'admin', 'job_seeker']);
    if (!authResult.success || !authResult.user) {
        console.warn(`API: Fetch single job failed auth or user data missing: ${authResult.message}`);
        return NextResponse.json({ error: authResult.message || 'Authentication failed' }, { status: authResult.status || 401 });
    }

    const { jobid } = params;
    const authenticatedUser = authResult.user;

    try {
        if (!jobid || !mongoose.isValidObjectId(jobid)) {
            console.warn(`API: Invalid Job ID provided: ${jobid}`);
            return NextResponse.json({ error: 'Invalid Job ID.' }, { status: 400 });
        }

        const job = await Job.findById(jobid).lean(); // Use .lean() for plain JavaScript objects

        if (!job) {
            console.warn(`API: Job with ID ${jobid} not found.`);
            return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
        }

        // Authorization check: Job poster can only view their own jobs. Admin can view any.
        // Job seekers can also view jobs (assuming they are active, though this API doesn't filter by status yet)
        if (authenticatedUser.role === 'job_poster' && job.postedBy.toString() !== authenticatedUser.id) {
            console.warn(`API: Job poster ${authenticatedUser.id} attempted to view job ${jobid} not posted by them.`);
            return NextResponse.json({ error: 'Forbidden: You are not authorized to view this job.' }, { status: 403 });
        }

        console.log(`API: Successfully fetched job with ID: ${jobid}`);
        // Return the job object directly, matching the frontend's expectation of data.job
        return NextResponse.json({ job }, { status: 200 });

    } catch (error: unknown) {
        console.error('API: Fetch single job error:', error);
        let errorMessage = 'Server error fetching job details.';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}


// PATCH /api/jobs/[jobid] - Update a job post
export async function PATCH(request: NextRequest, { params }: { params: { jobid: string } }) {
    await dbConnect();
    console.log('\n--- API: /api/jobs/[jobid] PATCH - Request received ---');

    // Authenticate and authorize: only job_poster or admin can edit jobs
    const authResult = await authMiddleware(request, ['job_poster', 'admin']);
    if (!authResult.success || !authResult.user) {
        console.warn(`API: Job PATCH failed auth: ${authResult.message}`);
        return NextResponse.json({ error: authResult.message }, { status: authResult.status });
    }

    const { jobid } = params;
    const authenticatedUser = authResult.user;

    try {
        if (!jobid || !mongoose.isValidObjectId(jobid)) {
            console.warn(`API: Invalid Job ID provided for PATCH: ${jobid}`);
            return NextResponse.json({ error: 'Invalid Job ID.' }, { status: 400 });
        }

        const updates = await request.json();

        // Find the job to ensure it exists and for authorization check
        const job = await Job.findById(jobid);

        if (!job) {
            console.warn(`API: Job with ID ${jobid} not found for PATCH.`);
            return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
        }

        // Authorization check for job_poster: ensure they only edit their own jobs
        if (authenticatedUser.role === 'job_poster' && job.postedBy.toString() !== authenticatedUser.id) {
            console.warn(`API: Job poster ${authenticatedUser.id} attempted to edit job ${jobid} not posted by them.`);
            return NextResponse.json({ error: 'Forbidden: You can only edit your own jobs.' }, { status: 403 });
        }

        // DEBUG: Log initial state before applying updates
        console.log(`DEBUG: PATCH Job ${jobid} - Initial job status: ${job.status}, openings: ${job.numberOfOpenings}`);
        console.log(`DEBUG: PATCH Job ${jobid} - Received updates:`, updates);


        // Apply updates to the job document
        Object.keys(updates).forEach(key => {
            // Only update fields that are part of the Job schema and are allowed to be modified
            if (job.schema.paths[key] && key !== '_id' && key !== 'postedBy' && key !== 'createdAt' && key !== 'updatedAt') {
                (job as any)[key] = updates[key];
            }
        });

        // Specific validation for numberOfOpenings if present in updates
        if (updates.numberOfOpenings !== undefined && (updates.numberOfOpenings < 0 || isNaN(updates.numberOfOpenings))) {
            return NextResponse.json({ error: 'Number of Openings must be a non-negative number.' }, { status: 400 });
        }

        // If numberOfOpenings is updated to 0, set status to 'closed'
        if (updates.numberOfOpenings === 0) {
            job.status = 'closed';
            console.log(`API: Job ${jobid} status set to 'closed' as openings reached zero.`);
        } else if (updates.numberOfOpenings > 0 && job.status === 'closed') {
            // If openings become > 0 again, and it was closed, reactivate it.
            // This handles cases where a job was closed due to 0 openings but is now reopened.
            job.status = 'active';
            console.log(`API: Job ${jobid} status set to 'active' as openings became positive.`);
        }


        await job.save(); // Save the updated job document

        console.log(`API: Successfully updated job with ID: ${jobid}`);
        return NextResponse.json({ message: 'Job updated successfully!', job: job.toObject() }, { status: 200 });

    } catch (error: unknown) {
        console.error('API: Update job error:', error);
        let errorMessage = 'Server error updating job.';
        if (error instanceof mongoose.Error.ValidationError) {
            const errors = Object.keys(error.errors).map(key => error.errors[key].message);
            return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
        } else if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
