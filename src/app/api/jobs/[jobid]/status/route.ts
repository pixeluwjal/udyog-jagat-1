// app/api/jobs/[jobid]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Job from '@/models/Job';
import { authMiddleware } from '@/lib/authMiddleware';
import mongoose from 'mongoose';

// PATCH /api/jobs/[jobid]/status
// This endpoint is used to toggle a job's status between 'active' and 'inactive'.
export async function PATCH(request: NextRequest, { params }: { params: { jobid: string } }) {
    await dbConnect();
    console.log(`\n--- API: /api/jobs/${params.jobid}/status PATCH - Request received ---`);

    // 1. Authenticate and authorize the user.
    const authResult = await authMiddleware(request, ['job_poster']);
    if (!authResult.success || !authResult.user) {
        console.warn(`API: Toggle job status failed auth: ${authResult.message}`);
        return NextResponse.json({ error: authResult.message }, { status: authResult.status });
    }

    const { id: userId } = authResult.user;
    // The key in params is 'jobid', so we need to destructure it correctly.
    const { jobid } = params;
    const jobId = jobid;

    // 2. Validate the request body.
    let newStatus: 'active' | 'inactive';
    try {
        const { status } = await request.json();
        if (status !== 'active' && status !== 'inactive') {
            return NextResponse.json({ error: 'Invalid status provided.' }, { status: 400 });
        }
        newStatus = status;
    } catch (error) {
        console.error('API: Invalid request body for status update:', error);
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    // --- START FINAL DEBUGGING ---
    console.log(`Debug: Authenticated User ID: ${userId}`);
    console.log(`Debug: Job ID from URL: ${jobId}`);
    console.log(`Debug: New status requested: ${newStatus}`);

    try {
        // First, let's find the job by ID alone to verify its existence and owner.
        const jobToInspect = await Job.findById(jobId).lean();
        if (jobToInspect) {
            console.log('--- Debug: Found job in database ---');
            console.log(`Job's _id: ${jobToInspect._id}`);
            console.log(`Job's postedBy: ${jobToInspect.postedBy}`);
            console.log(`Does job's postedBy match authenticated user? ${jobToInspect.postedBy.toString() === userId}`);
        } else {
            console.log(`Debug: No job found with ID: ${jobId}`);
        }
    } catch (error) {
        console.error(`Debug: Error finding job for inspection:`, error);
    }
    // --- END FINAL DEBUGGING ---

    // 3. Find the job and check ownership.
    try {
        const query = {
            _id: new mongoose.Types.ObjectId(jobId),
            postedBy: new mongoose.Types.ObjectId(userId)
        };
        
        const updatedJob = await Job.findOneAndUpdate(
            query,
            { status: newStatus },
            { new: true, runValidators: true }
        ).lean();

        if (!updatedJob) {
            console.warn(`API: Job not found or user is not the owner. Query:`, query);
            return NextResponse.json({ error: 'Job not found or unauthorized to update.' }, { status: 404 });
        }

        console.log(`API: Job ${jobId} status updated to ${newStatus} by user ${userId}.`);
        return NextResponse.json({ message: `Job status updated to ${newStatus}.`, job: updatedJob }, { status: 200 });

    } catch (error) {
        console.error('API: Error updating job status:', error);
        if (error instanceof mongoose.Error.ValidationError && error.errors) {
            const errors = Object.values(error.errors).map((e: any) => e.message);
            return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
        }
        return NextResponse.json({ error: 'Server error updating job status.' }, { status: 500 });
    }
}
