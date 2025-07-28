// app/api/seeker/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Application from '@/models/Application'; // Assuming this path is correct for your Application model
import SavedJob from '@/models/SavedJob';     // Import the SavedJob model to count saved jobs
import { authMiddleware } from '@/lib/authMiddleware'; // Corrected import path

export async function GET(request: NextRequest) {
  await dbConnect();
  console.log('\n--- API: /api/seeker/stats GET - Request received ---');

  // Authenticate and authorize: only job_seeker can access their own stats
  const authResult = await authMiddleware(request, 'job_seeker');
  if (!authResult.success) {
    console.warn(`API: Fetch seeker stats failed auth: ${authResult.message}`);
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  // --- FIX START ---
  // Access user data from authResult.user
  const authenticatedUser = authResult.user;
  if (!authenticatedUser) {
    console.error('API: Authenticated user data is unexpectedly null after successful auth.');
    return NextResponse.json({ error: 'Authentication data missing.' }, { status: 500 });
  }
  const { id: userId, email: userEmail } = authenticatedUser; // Get the job seeker's ID from the token
  // --- FIX END ---

  try {
    console.log(`API: Fetching stats for job seeker ID: ${userId} (${userEmail}).`);

    // 1. Count applied jobs
    const appliedJobsCount = await Application.countDocuments({ applicant: userId });
    console.log(`API: Found ${appliedJobsCount} applied jobs for ${userEmail}.`);

    // 2. Count upcoming interviews
    const interviewsCount = await Application.countDocuments({
      applicant: userId,
      status: 'interview', // Assuming 'interview' is the status for upcoming interviews
    });
    console.log(`API: Found ${interviewsCount} interviews for ${userEmail}.`);

    // 3. Count saved jobs
    // Now actually fetching from the SavedJob model
    const savedJobsCount = await SavedJob.countDocuments({ user: userId });
    console.log(`API: Found ${savedJobsCount} saved jobs for ${userEmail}.`);


    return NextResponse.json(
      {
        appliedJobs: appliedJobsCount,
        interviews: interviewsCount,
        savedJobs: savedJobsCount,
      },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error('API: Fetch seeker stats error:', error);
    let errorMessage = 'Server error fetching seeker dashboard stats.';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}