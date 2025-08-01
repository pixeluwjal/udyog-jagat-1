// app/api/applications/[applicationId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Application from '@/models/Application'; // Assuming your Application model path
import Job from '@/models/Job'; // Import the Job model
import { authMiddleware } from '@/lib/authMiddleware';
import mongoose from 'mongoose';

// GET /api/applications/[applicationId] - Fetch a single application by ID
export async function GET(request: NextRequest, { params }: { params: { applicationId: string } }) {
    await dbConnect();
    console.log('\n--- API: /api/applications/[applicationId] GET - Request received ---');

    const authResult = await authMiddleware(request, ['job_seeker', 'admin', 'job_poster']);
    if (!authResult.success || !authResult.user) {
        console.warn(`API: Fetch single application failed auth or user data missing: ${authResult.message}`);
        return NextResponse.json({ error: authResult.message || 'Authentication failed' }, { status: authResult.status || 401 });
    }

    const { applicationId } = params;
    const authenticatedUser = authResult.user;

    try {
        if (!applicationId || !mongoose.isValidObjectId(applicationId)) {
            console.warn(`API: Invalid Application ID provided: ${applicationId}`);
            return NextResponse.json({ error: 'Invalid Application ID.' }, { status: 400 });
        }

        const application = await Application.findById(applicationId)
            .populate({
                path: 'job',
                select: '_id title company location salary jobType postedBy' // Populate job details, including postedBy
            })
            .populate({
                path: 'applicant',
                select: '_id email firstName lastName' // Populate applicant details
            })
            .lean(); // Return plain JavaScript object

        if (!application) {
            console.warn(`API: Application with ID ${applicationId} not found.`);
            return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
        }

        // Authorization check:
        // Job seeker can only view their own applications.
        // Job poster can only view applications for jobs they posted.
        // Admin can view any application.
        if (authenticatedUser.role === 'job_seeker' && application.applicant._id.toString() !== authenticatedUser.id) {
            console.warn(`API: Job seeker ${authenticatedUser.id} attempted to view application ${applicationId} not belonging to them.`);
            return NextResponse.json({ error: 'Forbidden: You are not authorized to view this application.' }, { status: 403 });
        }
        if (authenticatedUser.role === 'job_poster' && (application.job as any).postedBy.toString() !== authenticatedUser.id) {
             console.warn(`API: Job poster ${authenticatedUser.id} attempted to view application ${applicationId} for a job not posted by them.`);
             return NextResponse.json({ error: 'Forbidden: You are not authorized to view this application.' }, { status: 403 });
        }


        console.log(`API: Successfully fetched application with ID: ${applicationId}`);
        return NextResponse.json({ application }, { status: 200 });

    } catch (error: unknown) {
        console.error('API: Fetch single application error:', error);
        let errorMessage = 'Server error fetching application details.';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

// PATCH /api/applications/[applicationId] - Update application status
export async function PATCH(request: NextRequest, { params }: { params: { applicationId: string } }) {
    await dbConnect();
    console.log('\n--- API: /api/applications/[applicationId] PATCH - Request received ---');

    // Authenticate and authorize: only job_poster or admin can update application status
    const authResult = await authMiddleware(request, ['job_poster', 'admin']);
    if (!authResult.success || !authResult.user) {
        console.warn(`API: Application PATCH failed auth: ${authResult.message}`);
        return NextResponse.json({ error: authResult.message }, { status: authResult.status });
    }

    const { applicationId } = params;
    const { status: newStatus } = await request.json();
    const authenticatedUser = authResult.user;

    console.log(`API: Attempting to update application ${applicationId} to status: ${newStatus}`);

    try {
        if (!applicationId || !mongoose.isValidObjectId(applicationId)) {
            console.warn(`API: Invalid Application ID provided: ${applicationId}`);
            return NextResponse.json({ error: 'Invalid Application ID.' }, { status: 400 });
        }

        // Validate new status against the allowed enum values
        const allowedStatuses = ['Received', 'Interview Scheduled', 'Rejected', 'Hired'];
        if (!newStatus || !allowedStatuses.includes(newStatus)) {
            console.warn(`API: Invalid new status provided: ${newStatus}`);
            return NextResponse.json({ error: `Invalid status provided. Must be one of: ${allowedStatuses.join(', ')}` }, { status: 400 });
        }

        // Find the application and populate the job to access its details
        const application = await Application.findById(applicationId).populate('job');

        if (!application) {
            console.warn(`API: Application with ID ${applicationId} not found.`);
            return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
        }

        // Authorization check for job_poster: ensure they only manage applications for their own jobs
        if (authenticatedUser.role === 'job_poster' && (application.job as any).postedBy.toString() !== authenticatedUser.id) {
            console.warn(`API: Job poster ${authenticatedUser.id} attempted to update application ${applicationId} for a job not posted by them.`);
            return NextResponse.json({ error: 'Forbidden: You can only manage applications for your own jobs.' }, { status: 403 });
        }

        const oldStatus = application.status;

        // --- Core Logic: Decrement openings and deactivate job on 'Hired' status ---
        if (newStatus === 'Hired' && oldStatus !== 'Hired') {
            const job = application.job as any; // Cast to any to access numberOfOpenings directly

            if (job.numberOfOpenings > 0) {
                job.numberOfOpenings -= 1;
                console.log(`API: Decremented openings for Job ${job._id}. New openings: ${job.numberOfOpenings}`);

                if (job.numberOfOpenings === 0) {
                    job.status = 'closed';
                    console.log(`API: Job ${job._id} status set to 'closed' as openings reached zero.`);
                }
                await job.save(); // Save the updated job document
            } else {
                console.warn(`API: Attempted to hire for Job ${job._id} but no openings left. Job status: ${job.status}`);
                // Optionally, prevent hiring if no openings are left, or allow but don't decrement
                // For now, we'll allow it but log a warning and don't decrement below zero.
            }
        }
        // --- End Core Logic ---

        application.status = newStatus; // Update the application's status
        await application.save(); // Save the updated application document

        console.log(`API: Successfully updated application ${applicationId} status from '${oldStatus}' to '${newStatus}'.`);
        return NextResponse.json({ message: 'Application status updated successfully.', application: application.toObject() }, { status: 200 });

    } catch (error: unknown) {
        console.error('API: Update application status error:', error);
        let errorMessage = 'Server error updating application status.';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}


// DELETE /api/applications/[applicationId] - Withdraw/Delete an application
export async function DELETE(request: NextRequest, { params }: { params: { applicationId: string } }) {
    await dbConnect();
    console.log('\n--- API: /api/applications/[applicationId] DELETE - Request received ---');

    const authResult = await authMiddleware(request, ['job_seeker', 'admin']);
    if (!authResult.success || !authResult.user) {
        console.warn(`API: Application DELETE failed auth: ${authResult.message}`);
        return NextResponse.json({ error: authResult.message }, { status: authResult.status });
    }

    const { applicationId } = params;
    const authenticatedUser = authResult.user;

    try {
        if (!applicationId || !mongoose.isValidObjectId(applicationId)) {
            console.warn(`API: Invalid Application ID provided for DELETE: ${applicationId}`);
            return NextResponse.json({ error: 'Invalid Application ID.' }, { status: 400 });
        }

        const application = await Application.findById(applicationId);

        if (!application) {
            console.warn(`API: Application with ID ${applicationId} not found for DELETE.`);
            return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
        }

        // Authorization check for job_seeker: ensure they only delete their own applications
        if (authenticatedUser.role === 'job_seeker' && application.applicant.toString() !== authenticatedUser.id) {
            console.warn(`API: Job seeker ${authenticatedUser.id} attempted to delete application ${applicationId} not belonging to them.`);
            return NextResponse.json({ error: 'Forbidden: You can only withdraw your own applications.' }, { status: 403 });
        }

        await Application.deleteOne({ _id: applicationId }); // Use deleteOne for clarity

        console.log(`API: Successfully deleted application with ID: ${applicationId}`);
        return NextResponse.json({ message: 'Application withdrawn successfully!' }, { status: 200 });

    } catch (error: unknown) {
        console.error('API: Delete application error:', error);
        let errorMessage = 'Server error withdrawing application.';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
