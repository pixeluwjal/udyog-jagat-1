import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Job from '@/models/Job';
import { authMiddleware } from '@/lib/authMiddleware';
import mongoose from 'mongoose';

// GET /api/jobs
export async function GET(request: NextRequest) {
    await dbConnect();
    console.log('\n--- API: /api/jobs GET - Request received ---');

    const authResult = await authMiddleware(request, ['job_poster', 'admin', 'job_seeker']);
    if (!authResult.success || !authResult.user) {
        console.warn(`API: Fetch jobs failed auth or user data missing: ${authResult.message}`);
        return NextResponse.json(
            { error: authResult.message || 'Authentication failed' },
            { status: authResult.status || 401 }
        );
    }

    const user = authResult.user;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const searchTerm = searchParams.get('search') || '';
    const locationFilter = searchParams.get('location') || '';
    const minSalary = parseInt(searchParams.get('minSalary') || '', 10);
    const maxSalary = parseInt(searchParams.get('maxSalary') || '', 10);

    const excludeJobId = searchParams.get('excludeJobId');
    const statusFilter = searchParams.get('status');
    const jobTypeFilter = searchParams.get('jobType');
    const skillsFilter = searchParams.get('skills');
    const minOpenings = parseInt(searchParams.get('minOpenings') || '', 10);
    const maxOpenings = parseInt(searchParams.get('maxOpenings') || '', 10);

    let query: any = {};

    // --- Role-based filtering ---
    if (user.role === 'job_poster') {
        query.postedBy = new mongoose.Types.ObjectId(user.id);
        if (statusFilter && ['active', 'inactive', 'closed'].includes(statusFilter)) {
            query.status = statusFilter;
        }
        console.log(`API: Job Poster ${user.id} viewing their own jobs.`);
    } else if (user.role === 'admin') {
        const adminPostedBy = searchParams.get('postedBy');
        if (adminPostedBy && mongoose.isValidObjectId(adminPostedBy)) {
            query.postedBy = new mongoose.Types.ObjectId(adminPostedBy);
        }
        if (statusFilter && ['active', 'inactive', 'closed'].includes(statusFilter)) {
            query.status = statusFilter;
        }
        console.log(`API: Admin viewing jobs.`);
    } else if (user.role === 'job_seeker') {
        query.status = 'active'; // default for seekers
        if (statusFilter && ['active', 'inactive', 'closed'].includes(statusFilter)) {
            query.status = statusFilter;
        }
        console.log(`API: Job Seeker viewing jobs.`);
    } else {
        console.warn(`API: Unauthorized role '${user.role}' attempting to view jobs.`);
        return NextResponse.json(
            { message: 'Forbidden: Insufficient role to view jobs.' },
            { status: 403 }
        );
    }

    // --- Apply filters ---
    // Search ONLY on job role (title)
    if (searchTerm) {
        query.title = { $regex: searchTerm, $options: 'i' };
    }

    // Location
    if (locationFilter) {
        query.location = { $regex: locationFilter, $options: 'i' };
    }

    // Salary
    if (!isNaN(minSalary) || !isNaN(maxSalary)) {
        query.salary = {};
        if (!isNaN(minSalary)) query.salary.$gte = minSalary;
        if (!isNaN(maxSalary)) query.salary.$lte = maxSalary;
    }

    // Exclude a job
    if (excludeJobId && mongoose.isValidObjectId(excludeJobId)) {
        query._id = { $ne: new mongoose.Types.ObjectId(excludeJobId) };
    }

    // Job type
    if (jobTypeFilter) {
        query.jobType = jobTypeFilter;
    }

    // Skills
    if (skillsFilter) {
        const skillsArray = skillsFilter.split(',').map(skill => skill.trim());
        query.skills = { $in: skillsArray };
    }

    // Openings
    if (!isNaN(minOpenings) && minOpenings >= 0) {
        query.numberOfOpenings = { ...query.numberOfOpenings, $gte: minOpenings };
    }
    if (!isNaN(maxOpenings) && maxOpenings >= 0) {
        query.numberOfOpenings = { ...query.numberOfOpenings, $lte: maxOpenings };
    }

    console.log('API: Final job query being executed:', JSON.stringify(query, null, 2));

    try {
        const totalJobs = await Job.countDocuments(query);
        const jobs = await Job.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        console.log(`API: Found ${totalJobs} total jobs matching query.`);
        console.log(`API: Returning ${jobs.length} jobs for page ${page}.`);

        return NextResponse.json({ jobs, totalJobs, page, limit }, { status: 200 });
    } catch (error) {
        console.error('API: Fetch jobs error:', error);
        return NextResponse.json({ error: 'Server error fetching jobs.' }, { status: 500 });
    }
}

// POST /api/jobs
export async function POST(request: NextRequest) {
    await dbConnect();
    console.log('\n--- API: /api/jobs POST - Request received ---');

    const authResult = await authMiddleware(request, 'job_poster');
    if (!authResult.success || !authResult.user) {
        return NextResponse.json({ error: authResult.message }, { status: authResult.status });
    }

    const { id: jobPosterId } = authResult.user;

    try {
        const { title, description, location, salary, company, jobType, skills, companyLogo, numberOfOpenings } = await request.json();

        if (!title || !description || !location || !company || !jobType || numberOfOpenings === undefined || numberOfOpenings === null || numberOfOpenings <= 0) {
            return NextResponse.json(
                { error: 'All required fields must be provided, and Number of Openings must be a positive number.' },
                { status: 400 }
            );
        }

        const newJob = new Job({
            title,
            description,
            location,
            salary,
            company,
            jobType,
            skills: skills || [],
            companyLogo: companyLogo || null,
            numberOfOpenings,
            postedBy: new mongoose.Types.ObjectId(jobPosterId),
            status: 'active',
        });

        await newJob.save();

        return NextResponse.json(
            { message: 'Job posted successfully!', job: newJob.toObject() },
            { status: 201 }
        );
    } catch (error) {
        console.error('API: Create job error:', error);
        if (error instanceof mongoose.Error.ValidationError) {
            const errors = Object.keys(error.errors).map(key => error.errors[key].message);
            return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
        }
        return NextResponse.json({ error: 'Server error posting job.' }, { status: 500 });
    }
}
