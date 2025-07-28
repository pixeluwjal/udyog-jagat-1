// app/api/applications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Application from '@/models/Application'; // Assuming this path is correct
import User from '@/models/User';               // Assuming this path is correct
import Job from '@/models/Job';                 // Assuming this path is correct
import SavedJob from '@/models/SavedJob';       // <--- NEW: Import SavedJob model
import mongoose from 'mongoose';
import { authMiddleware } from '@/lib/authMiddleware'; // Corrected import path

export async function POST(request: NextRequest) {
    await dbConnect();
    console.log('\n--- API: /api/applications POST - Request received ---');

    // Authenticate and authorize: only job_seeker can create applications
    const authResult = await authMiddleware(request, 'job_seeker');
    if (!authResult.success) {
        console.warn(`API: Application POST failed auth: ${authResult.message}`);
        return NextResponse.json({ error: authResult.message }, { status: authResult.status });
    }

    // Ensure authenticatedUser is not undefined after successful auth
    const authenticatedUser = authResult.user;
    if (!authenticatedUser) {
        console.error('API: Auth successful but user object is missing for POST.');
        return NextResponse.json({ error: 'Authentication error: User data missing.' }, { status: 500 });
    }
    const { id: applicantIdFromToken } = authenticatedUser;

    try {
        const { jobId } = await request.json();

        if (!jobId || !mongoose.isValidObjectId(jobId)) {
            console.warn(`API: Invalid Job ID provided: ${jobId}`);
            return NextResponse.json({ error: 'Valid Job ID is required' }, { status: 400 });
        }

        const job = await Job.findById(jobId);
        if (!job) {
            console.warn(`API: Job not found for ID: ${jobId}`);
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        const existingApplication = await Application.findOne({
            job: jobId,
            applicant: applicantIdFromToken,
        });

        if (existingApplication) {
            console.warn(`API: User ${applicantIdFromToken} already applied to job ${jobId}.`);
            return NextResponse.json({ error: 'Already applied' }, { status: 409 });
        }

        const applicant = await User.findById(applicantIdFromToken);

        // --- START FIX for resume check ---
        // Check for resumeGridFsId instead of resumePath
        if (!applicant?.resumeGridFsId) {
            console.warn(`API: Applicant ${applicantIdFromToken} attempting to apply without a resume.`);
            return NextResponse.json(
                { error: 'Resume required', redirect: '/seeker/profile' },
                { status: 400 }
            );
        }
        // --- END FIX for resume check ---

        const newApplication = new Application({
            job: jobId,
            applicant: applicantIdFromToken,
            // --- START FIX for resumePath assignment ---
            // Store the GridFS ID (converted to string) in the resumePath field
            // This assumes Application model still has 'resumePath: String'
            // Ideally, update Application model to have 'resumeGridFsId: ObjectId'
            resumePath: applicant.resumeGridFsId.toString(),
            // --- END FIX for resumePath assignment ---
            status: 'pending',
            appliedAt: new Date(),
        });

        await newApplication.save();
        console.log(`API: New application created for Job ${jobId} by Applicant ${applicantIdFromToken}.`);

        // --- NEW LOGIC START ---
        // If the job was saved, unsave it now that the user has applied
        const unsaveResult = await SavedJob.deleteOne({ user: applicantIdFromToken, job: jobId });
        if (unsaveResult.deletedCount > 0) {
            console.log(`API: Job ${jobId} was unsaved from ${authenticatedUser.email}'s saved list due to application.`);
        } else {
            console.log(`API: Job ${jobId} was not found in ${authenticatedUser.email}'s saved list (no action needed).`);
        }
        // --- NEW LOGIC END ---

        return NextResponse.json(
            {
                success: true,
                application: newApplication.toObject(),
                message: 'Application submitted'
            },
            { status: 201 }
        );

    } catch (error: any) {
        console.error('API: Application POST error:', error);
        return NextResponse.json(
            { error: error.message || 'Server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    await dbConnect();

    // Allow 'admin', 'job_poster', and 'job_seeker' to access this GET endpoint
    const authResult = await authMiddleware(request, ['admin', 'job_poster', 'job_seeker']);

    if (!authResult.success) {
        console.warn(`API: Application GET failed auth: ${authResult.message}`);
        return NextResponse.json({ error: authResult.message }, { status: authResult.status });
    }

    // Ensure authenticatedUser is not undefined after successful auth
    const authenticatedUser = authResult.user;
    if (!authenticatedUser) {
        console.error('API: Auth successful but user object is missing for GET.');
        return NextResponse.json({ error: 'Authentication error: User data missing.' }, { status: 500 });
    }
    const { id: authenticatedUserId, role } = authenticatedUser;
    const { searchParams } = new URL(request.url);

    try {
        let query: any = {};

        // 1. Determine the base applicant/job filter based on role
        if (role === 'job_seeker') {
            // A job seeker can ONLY view their own applications.
            query.applicant = new mongoose.Types.ObjectId(authenticatedUserId);
            console.log(`API: Job Seeker ${authenticatedUserId} fetching their own applications.`);
        } else if (role === 'job_poster') {
            // A job poster can view applications for jobs they posted
            const postedJobs = await Job.find({ postedBy: authenticatedUserId }).select('_id');
            const postedJobIds = postedJobs.map(j => j._id);
            console.log(`API: Job Poster ${authenticatedUserId} has posted ${postedJobIds.length} jobs.`);

            if (postedJobIds.length === 0) {
                console.log(`API: Job Poster ${authenticatedUserId} has no posted jobs, returning 0 applications.`);
                return NextResponse.json({ success: true, applications: [], count: 0 }, { status: 200 });
            }
            query.job = { $in: postedJobIds };

            // Job posters CAN filter by applicantId if it's for an applicant to their jobs
            const applicantIdParam = searchParams.get('applicantId');
            if (applicantIdParam && mongoose.isValidObjectId(applicantIdParam)) {
                query.applicant = new mongoose.Types.ObjectId(applicantIdParam);
                console.log(`API: Job Poster filtering applications by applicant ID: ${applicantIdParam}`);
            }
        } else if (role === 'admin') {
            // Admins can view all applications or filter by specific job/applicant IDs
            console.log(`API: Admin fetching applications.`);
            const applicantIdParam = searchParams.get('applicantId');
            if (applicantIdParam && mongoose.isValidObjectId(applicantIdParam)) {
                query.applicant = new mongoose.Types.ObjectId(applicantIdParam);
                console.log(`API: Admin filtering applications by applicant ID: ${applicantIdParam}`);
            }
        } else {
            console.warn(`API: Unauthorized role '${role}' attempting to access applications GET.`);
            return NextResponse.json({ error: 'Unauthorized role for this action' }, { status: 403 });
        }

        // 2. Apply additional filters from query parameters (jobIds and status apply to all roles)
        const jobIdsParam = searchParams.get('jobIds');
        if (jobIdsParam) {
            const incomingJobIds = jobIdsParam.split(',')
                .filter(id => mongoose.isValidObjectId(id))
                .map(id => new mongoose.Types.ObjectId(id));

            if (incomingJobIds.length === 0) {
                return NextResponse.json({ success: true, applications: [], count: 0 }, { status: 200 });
            }

            // If there's an existing job filter (e.g., for job_poster), intersect them
            if (query.job && query.job.$in) {
                const existingJobIds = query.job.$in.map((id: mongoose.Types.ObjectId) => id.toString());
                const filteredIncomingIds = incomingJobIds.filter(id => existingJobIds.includes(id.toString()));
                if (filteredIncomingIds.length === 0) {
                    return NextResponse.json({ success: true, applications: [], count: 0 }, { status: 200 });
                }
                query.job.$in = filteredIncomingIds;
            } else {
                // Otherwise, just apply the incoming jobIds filter
                query.job = { $in: incomingJobIds };
            }
            console.log(`API: Applying jobIds filter: ${jobIdsParam}`);
        }

        const statusFilter = searchParams.get('status');
        if (statusFilter && ['pending', 'reviewed', 'interview', 'accepted', 'rejected'].includes(statusFilter)) {
            query.status = statusFilter;
            console.log(`API: Applying status filter: ${statusFilter}`);
        }

        // Pagination
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const skip = (page - 1) * limit;

        const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
        const sortBy = searchParams.get('sortBy') || 'appliedAt';

        const applications = await Application.find(query)
            .populate('job', '_id title company location salary')
            .populate('applicant', 'username email candidateDetails.fullName candidateDetails.phone candidateDetails.skills candidateDetails.experience resumeGridFsId')
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(limit)
            .lean();

        const totalApplications = await Application.countDocuments(query);

        return NextResponse.json(
            {
                success: true,
                applications,
                totalApplications,
                page,
                limit
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('API: Fetch applications GET error:', error);
        return NextResponse.json(
            { error: error.message || 'Server error' },
            { status: 500 }
        );
    }
}