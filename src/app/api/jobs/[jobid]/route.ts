// app/api/jobs/[jobid]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Job from '@/models/Job'; // Assuming you have a Job model
import { authMiddleware } from '@/lib/authMiddleware';
import mongoose from 'mongoose';

export async function GET(request: NextRequest, { params }: { params: { jobid: string } }) {
  await dbConnect();
  console.log('\n--- API: /api/jobs/[jobid] GET - Request received ---');

  // Authenticate and authorize: only job_seeker can view job details
  const authResult = await authMiddleware(request, 'job_seeker');
  if (!authResult.success) {
    console.warn(`API: Fetch job by ID failed auth: ${authResult.message}`);
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const jobId = params.jobid;
  console.log(`API: Attempting to fetch job with ID: ${jobId}`);

  try {
    if (!jobId || !mongoose.isValidObjectId(jobId)) {
      console.warn(`API: Invalid Job ID provided: ${jobId}`);
      return NextResponse.json({ error: 'Invalid Job ID.' }, { status: 400 });
    }

    const job = await Job.findById(jobId).lean(); // Use .lean() for plain JS objects

    if (!job) {
      console.warn(`API: Job with ID ${jobId} not found.`);
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }

    console.log(`API: Successfully fetched job with ID: ${jobId}`);
    return NextResponse.json({ job }, { status: 200 });

  } catch (error: unknown) {
    console.error('API: Fetch job by ID error:', error);
    let errorMessage = 'Server error fetching job details.';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
