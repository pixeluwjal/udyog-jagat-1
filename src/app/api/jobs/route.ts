// app/api/jobs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Job from '@/models/Job'; // Assuming this path is correct for your Job model
import { authMiddleware } from '@/lib/authMiddleware'; // Corrected import path
import mongoose from 'mongoose';

// GET /api/jobs
export async function GET(request: NextRequest) {
    await dbConnect();
    console.log('\n--- API: /api/jobs GET - Request received ---');

    const authResult = await authMiddleware(request, ['job_poster', 'admin', 'job_seeker']);
    if (!authResult.success || !authResult.user) {
        console.warn(`API: Fetch jobs failed auth or user data missing: ${authResult.message}`);
        return NextResponse.json({ error: authResult.message || 'Authentication failed' }, { status: authResult.status || 401 });
    }

    const user = authResult.user;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const searchTerm = searchParams.get('search') || '';
    const locationFilter = searchParams.get('location') || ''; // Not used in frontend yet, but kept
    const minSalary = parseInt(searchParams.get('minSalary') || '0', 10); // Not used in frontend yet, but kept
    const excludeJobId = searchParams.get('excludeJobId'); // Not used in frontend yet, but kept

    // NEW: Get filter parameters for status and openings from frontend
    const statusFilter = searchParams.get('status');
    const jobTypeFilter = searchParams.get('jobType'); // Not used in frontend yet, but kept
    const skillsFilter = searchParams.get('skills'); // Not used in frontend yet, but kept
    const minOpenings = parseInt(searchParams.get('minOpenings') || '', 10); // Parse as number, default to NaN if empty
    const maxOpenings = parseInt(searchParams.get('maxOpenings') || '', 10); // Parse as number, default to NaN if empty


    let query: any = {};

    // Role-based filtering
    if (user.role === 'job_poster') {
        query.postedBy = new mongoose.Types.ObjectId(user.id);
        // Job posters can filter their own jobs by status
        if (statusFilter && ['active', 'inactive', 'closed'].includes(statusFilter)) {
            query.status = statusFilter;
        }
        console.log(`API: Job Poster ${user.id} viewing their own jobs.`);
    } else if (user.role === 'admin') {
        const adminPostedBy = searchParams.get('postedBy');
        if (adminPostedBy && mongoose.isValidObjectId(adminPostedBy)) {
            query.postedBy = new mongoose.Types.ObjectId(adminPostedBy);
        }
        // Admins can filter by any status
        if (statusFilter && ['active', 'inactive', 'closed'].includes(statusFilter)) {
            query.status = statusFilter;
        }
        console.log(`API: Admin viewing jobs.`);
    } else if (user.role === 'job_seeker') {
        // Job seekers currently see all jobs regardless of status, unless a specific status filter is applied.
        // If you want them to only see 'active' jobs by default, uncomment the line below.
        // query.status = 'active';
        console.log(`API: Job Seeker viewing jobs.`);
    } else {
        console.warn(`API: Unauthorized role '${user.role}' attempting to view jobs.`);
        return NextResponse.json({ message: 'Forbidden: Insufficient role to view jobs.' }, { status: 403 });
    }

    // Apply general search/filter terms (these apply to all roles that reach here)
    if (searchTerm) {
        query.title = { $regex: searchTerm, $options: 'i' };
    }
    if (locationFilter) {
        query.location = { $regex: locationFilter, $options: 'i'};
    }
    if (minSalary) {
        query.salary = { $gte: minSalary };
    }
    if (excludeJobId && mongoose.isValidObjectId(excludeJobId)) {
        query._id = { $ne: new mongoose.Types.ObjectId(excludeJobId) };
    }
    if (jobTypeFilter) {
        query.jobType = jobTypeFilter;
    }
    if (skillsFilter) {
        const skillsArray = skillsFilter.split(',').map(skill => skill.trim());
        query.skills = { $in: skillsArray };
    }

    // NEW: Apply numberOfOpenings filters
    if (!isNaN(minOpenings) && minOpenings >= 0) { // Check if it's a valid number and non-negative
        query.numberOfOpenings = { ...query.numberOfOpenings, $gte: minOpenings };
    }
    if (!isNaN(maxOpenings) && maxOpenings >= 0) { // Check if it's a valid number and non-negative
        query.numberOfOpenings = { ...query.numberOfOpenings, $lte: maxOpenings };
    }


    // --- DIAGNOSTIC LOGGING START ---
    console.log('API: Final job query being executed:', JSON.stringify(query, null, 2));
    // --- DIAGNOSTIC LOGGING END ---

    try {
        const totalJobs = await Job.countDocuments(query);
        const jobs = await Job.find(query)
            .sort({ createdAt: -1 }) // Already sorted by recent first
            .skip(skip)
            .limit(limit)
            .lean();

        // --- DIAGNOSTIC LOGGING START ---
        console.log(`API: Found ${totalJobs} total jobs matching query.`);
        console.log(`API: Returning ${jobs.length} jobs for page ${page}.`);
        // --- DIAGNOSTIC LOGGING END ---

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

    const { id: jobPosterId, email: jobPosterEmail } = authResult.user;

    try {
        // Destructure numberOfOpenings from the request body
        const { title, description, location, salary, company, jobType, skills, companyLogo, numberOfOpenings } = await request.json();

        // Validate all required fields, including numberOfOpenings
        if (!title || !description || !location || !salary || !company || !jobType || numberOfOpenings === undefined || numberOfOpenings === null || numberOfOpenings <= 0) {
            return NextResponse.json({ error: 'All required fields must be provided, and Number of Openings must be a positive number.' }, { status: 400 });
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
            numberOfOpenings, // Store the number of openings
            postedBy: new mongoose.Types.ObjectId(jobPosterId),
            status: 'active', // Default status for a new job post
        });

        await newJob.save();

        return NextResponse.json(
            { message: 'Job posted successfully!', job: newJob.toObject() },
            { status: 201 }
        );
    } catch (error) {
        console.error('API: Create job error:', error);
        // More specific error handling for Mongoose validation errors
        if (error instanceof mongoose.Error.ValidationError) {
            const errors = Object.keys(error.errors).map(key => error.errors[key].message);
            return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
        }
        return NextResponse.json({ error: 'Server error posting job.' }, { status: 500 });
    }
}
