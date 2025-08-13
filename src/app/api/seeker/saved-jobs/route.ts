// app/api/seeker/saved-jobs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SavedJob from '@/models/SavedJob';
import Job from '@/models/Job';
import Application from '@/models/Application';
import { authMiddleware } from '@/lib/authMiddleware';
import mongoose from 'mongoose';

// GET /api/seeker/saved-jobs
export async function GET(request: NextRequest) {
    await dbConnect();
    console.log('\n--- API: /api/seeker/saved-jobs GET - Request received ---');

    const authResult = await authMiddleware(request, 'job_seeker');
    if (!authResult.success) {
        console.warn(`API: Fetch saved jobs failed auth: ${authResult.message}`);
        return NextResponse.json({ error: authResult.message }, { status: authResult.status });
    }

    const { id: userId, email: userEmail } = authResult.user!;

    try {
        console.log(`API: Fetching saved jobs for job seeker ID: ${userId} (${userEmail}).`);

        const savedJobs = await SavedJob.find({ user: userId })
            .populate('job')
            .sort({ savedAt: -1 })
            .lean();

        const validSavedJobs = savedJobs.filter(savedJob => savedJob.job !== null);

        console.log(`API: Found ${validSavedJobs.length} valid saved jobs for ${userEmail}.`);
        return NextResponse.json({ savedJobs: validSavedJobs }, { status: 200 });
    } catch (error: unknown) {
        console.error('API: Fetch saved jobs error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Server error fetching saved jobs.' },
            { status: 500 }
        );
    }
}

// POST /api/seeker/saved-jobs
export async function POST(request: NextRequest) {
    await dbConnect();
    console.log('\n--- API: /api/seeker/saved-jobs POST - Request received ---');

    const authResult = await authMiddleware(request, 'job_seeker');
    if (!authResult.success) {
        console.warn(`API: Save job failed auth: ${authResult.message}`);
        return NextResponse.json({ error: authResult.message }, { status: authResult.status });
    }

    const { id: userId, email: userEmail } = authResult.user!;

    try {
        const { jobId } = await request.json();
        console.log(`API: Job Seeker ${userEmail} attempting to save job ID: ${jobId}.`);

        if (!jobId || !mongoose.isValidObjectId(jobId)) {
            return NextResponse.json({ error: 'Valid Job ID is required.' }, { status: 400 });
        }

        const jobExists = await Job.findById(jobId);
        if (!jobExists) {
            console.warn(`API: Save job failed: Job with ID ${jobId} not found.`);
            return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
        }

        const hasApplied = await Application.findOne({ applicant: userId, job: jobId });
        if (hasApplied) {
            return NextResponse.json({ error: 'You cannot save a job you have already applied for.' }, { status: 409 });
        }

        const existingSavedJob = await SavedJob.findOne({ user: userId, job: jobId });
        if (existingSavedJob) {
            return NextResponse.json({ error: 'This job is already saved.' }, { status: 409 });
        }

        const newSavedJob = await SavedJob.create({
            user: userId,
            job: jobId,
        });

        console.log(`API: Job ${jobId} saved successfully by ${userEmail}.`);
        return NextResponse.json(
            { message: 'Job saved successfully!', savedJob: newSavedJob.toObject() },
            { status: 201 }
        );
    } catch (error: unknown) {
        console.error('API: Save job error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Server error saving job.' },
            { status: 500 }
        );
    }
}

// DELETE /api/seeker/saved-jobs
// DELETE /api/saved-jobs
export async function DELETE(request: NextRequest) {
    await dbConnect();
    console.log('\n--- API: /api/seeker/saved-jobs DELETE - Request received ---');

    // Auth check
    const authResult = await authMiddleware(request, 'job_seeker');
    if (!authResult.success) {
        console.warn(`API: Unsave job failed auth: ${authResult.message}`);
        return NextResponse.json({ error: authResult.message }, { status: authResult.status });
    }
    const { id: userId, email: userEmail } = authResult.user!;

    try {
        // Get jobId from query string
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('jobId');

        if (!jobId || !mongoose.isValidObjectId(jobId)) {
            return NextResponse.json({ error: 'Valid SavedJob ID is required.' }, { status: 400 });
        }

        console.log(`API: Job Seeker ${userEmail} attempting to unsave job ID: ${jobId}`);

        // Try deleting by either Job _id or SavedJob _id
        const deleteResult = await SavedJob.deleteOne({
            user: userId,
            $or: [
                { job: jobId }, // If frontend sends the job _id
                { _id: jobId }  // If frontend sends the saved job _id
            ]
        });

        if (deleteResult.deletedCount === 0) {
            console.warn(`API: Unsave failed: Job ${jobId} not found in saved list for ${userEmail}`);
            return NextResponse.json({ error: 'Job not found in saved list.' }, { status: 404 });
        }

        console.log(`API: Job ${jobId} unsaved successfully by ${userEmail}`);
        return NextResponse.json({ message: 'Job unsaved successfully.' }, { status: 200 });
    } catch (error) {
        console.error('API: Unsave job error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Server error unsaving job.' },
            { status: 500 }
        );
    }
}

