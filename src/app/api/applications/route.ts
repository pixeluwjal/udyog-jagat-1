// app/api/applications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Application from '@/models/Application';
import User from '@/models/User';
import Job from '@/models/Job';
import SavedJob from '@/models/SavedJob';
import mongoose from 'mongoose';
import { authMiddleware } from '@/lib/authMiddleware';

export async function POST(request: NextRequest) {
    await dbConnect();
    console.log('\n--- API: /api/applications POST - Request received ---');

    // Authenticate and authorize: only job_seeker can create applications
    const authResult = await authMiddleware(request, 'job_seeker');
    if (!authResult.success) {
        console.warn(`API: Application POST failed auth: ${authResult.message}`);
        return NextResponse.json({ error: authResult.message }, { status: authResult.status });
    }

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

        // Check if the user has already applied
        const existingApplication = await Application.findOne({
            job: jobId,
            applicant: applicantIdFromToken,
        });

        if (existingApplication) {
            console.warn(`API: User ${applicantIdFromToken} already applied to job ${jobId}.`);
            return NextResponse.json({ error: 'Already applied' }, { status: 409 });
        }

        const applicant = await User.findById(applicantIdFromToken);

        // CORRECTED: Check for resume.resumeId
        if (!applicant?.resume?.resumeId) {
            console.warn(`API: Applicant ${applicantIdFromToken} attempting to apply without a resume.`);
            return NextResponse.json(
                { error: 'Resume required', redirect: '/seeker/profile' },
                { status: 400 }
            );
        }

        const newApplication = new Application({
            job: jobId,
            applicant: applicantIdFromToken,
            resumePath: applicant.resume.resumeId, // CORRECTED: Use resume.resumeId
            status: 'Received',
            appliedAt: new Date(),
        });

        await newApplication.save();
        console.log(`API: New application created for Job ${jobId} by Applicant ${applicantIdFromToken}.`);

        // If the job was saved, unsave it now that the user has applied
        const unsaveResult = await SavedJob.deleteOne({ user: applicantIdFromToken, job: jobId });
        if (unsaveResult.deletedCount > 0) {
            console.log(`API: Job ${jobId} was unsaved from ${authenticatedUser.email}'s saved list due to application.`);
        } else {
            console.log(`API: Job ${jobId} was not found in ${authenticatedUser.email}'s saved list (no action needed).`);
        }

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

// GET /api/applications
export async function GET(request: NextRequest) {
    await dbConnect();
    console.log('\n--- API: /api/applications GET - Request received ---');

    const authResult = await authMiddleware(request, ['admin', 'job_poster', 'job_seeker']);

    if (!authResult.success) {
        console.warn(`API: Application GET failed auth: ${authResult.message}`);
        return NextResponse.json({ error: authResult.message }, { status: authResult.status });
    }

    const authenticatedUser = authResult.user;
    if (!authenticatedUser) {
        console.error('API: Auth successful but user object is missing for GET.');
        return NextResponse.json({ error: 'Authentication error: User data missing.' }, { status: 500 });
    }
    const { id: authenticatedUserId, role } = authenticatedUser;
    const { searchParams } = new URL(request.url);

    try {
        let matchQuery: any = {};

        if (role === 'job_seeker') {
            matchQuery['applicant._id'] = new mongoose.Types.ObjectId(authenticatedUserId);
            console.log(`API: Job Seeker ${authenticatedUserId} fetching their own applications.`);
        } else if (role === 'job_poster') {
            const postedJobs = await Job.find({ postedBy: authenticatedUserId }).select('_id');
            const postedJobIds = postedJobs.map(j => j._id);
            console.log(`API: Job Poster ${authenticatedUserId} has posted ${postedJobIds.length} jobs.`);

            if (postedJobIds.length === 0) {
                console.log(`API: Job Poster ${authenticatedUserId} has no posted jobs, returning 0 applications.`);
                return NextResponse.json({ success: true, applications: [], totalApplications: 0, page: 1, limit: 10 }, { status: 200 });
            }
            matchQuery['job._id'] = { $in: postedJobIds };

            const applicantIdParam = searchParams.get('applicantId');
            if (applicantIdParam && mongoose.isValidObjectId(applicantIdParam)) {
                matchQuery['applicant._id'] = new mongoose.Types.ObjectId(applicantIdParam);
                console.log(`API: Job Poster filtering applications by applicant ID: ${applicantIdParam}`);
            }
        } else if (role === 'admin') {
            console.log(`API: Admin fetching applications.`);
            const applicantIdParam = searchParams.get('applicantId');
            if (applicantIdParam && mongoose.isValidObjectId(applicantIdParam)) {
                matchQuery['applicant._id'] = new mongoose.Types.ObjectId(applicantIdParam);
                console.log(`API: Admin filtering applications by applicant ID: ${applicantIdParam}`);
            }
        } else {
            console.warn(`API: Unauthorized role '${role}' attempting to access applications GET.`);
            return NextResponse.json({ error: 'Unauthorized role for this action' }, { status: 403 });
        }

        const jobIdsParam = searchParams.get('jobIds');
        if (jobIdsParam) {
            const incomingJobIds = jobIdsParam.split(',')
                .filter(id => mongoose.isValidObjectId(id))
                .map(id => new mongoose.Types.ObjectId(id));

            if (incomingJobIds.length === 0) {
                return NextResponse.json({ success: true, applications: [], totalApplications: 0, page: 1, limit: 10 }, { status: 200 });
            }

            if (matchQuery['job._id'] && matchQuery['job._id'].$in) {
                const existingJobIds = matchQuery['job._id'].$in.map((id: mongoose.Types.ObjectId) => id.toString());
                const filteredIncomingIds = incomingJobIds.filter(id => existingJobIds.includes(id.toString()));
                if (filteredIncomingIds.length === 0) {
                    return NextResponse.json({ success: true, applications: [], totalApplications: 0, page: 1, limit: 10 }, { status: 200 });
                }
                matchQuery['job._id'].$in = filteredIncomingIds;
            } else {
                matchQuery['job._id'] = { $in: incomingJobIds };
            }
            console.log(`API: Applying jobIds filter: ${jobIdsParam}`);
        }

        const statusFilter = searchParams.get('status');
        const allowedApplicationStatuses = ['Received', 'Interview Scheduled', 'Rejected', 'Hired'];
        if (statusFilter && allowedApplicationStatuses.includes(statusFilter)) {
            matchQuery.status = statusFilter;
            console.log(`API: Applying status filter: ${statusFilter}`);
        }

        const searchTerm = searchParams.get('search');
        if (searchTerm) {
            const searchRegex = new RegExp(searchTerm, 'i');
            matchQuery.$or = [
                { 'job.title': searchRegex },
                { 'applicant.username': searchRegex },
                { 'applicant.email': searchRegex },
                { 'applicant.candidateDetails.fullName': searchRegex },
            ];
            console.log(`API: Applying search term: ${searchTerm}`);
        }

        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const skip = (page - 1) * limit;

        const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
        const sortBy = searchParams.get('sortBy') || 'appliedAt';

        const pipeline: any[] = [
            {
                $lookup: {
                    from: 'jobs',
                    localField: 'job',
                    foreignField: '_id',
                    as: 'job'
                }
            },
            { $unwind: '$job' },

            {
                $lookup: {
                    from: 'users',
                    localField: 'applicant',
                    foreignField: '_id',
                    as: 'applicant'
                }
            },
            { $unwind: '$applicant' },

            { $match: matchQuery },

            { $sort: { [sortBy]: sortOrder } },

            {
                $facet: {
                    applications: [
                        { $skip: skip },
                        { $limit: limit }
                    ],
                    totalCount: [
                        { $count: 'count' }
                    ]
                }
            },
            {
                $project: {
                    applications: 1,
                    totalApplications: { $arrayElemAt: ['$totalCount.count', 0] }
                }
            }
        ];

        const [result] = await Application.aggregate(pipeline);

        const applications = result?.applications || [];
        const totalApplications = result?.totalApplications || 0;

        console.log(`API: Found ${totalApplications} total applications matching query.`);
        console.log(`API: Returning ${applications.length} applications for page ${page}.`);

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