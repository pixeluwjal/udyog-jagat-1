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
  const locationFilter = searchParams.get('location') || '';
  const minSalary = parseInt(searchParams.get('minSalary') || '0', 10);
  const excludeJobId = searchParams.get('excludeJobId');
  const statusFilter = searchParams.get('status'); // Keep this for admin/poster
  const jobTypeFilter = searchParams.get('jobType');
  const skillsFilter = searchParams.get('skills');

  let query: any = {};

  // Role-based filtering
  if (user.role === 'job_poster') {
    query.postedBy = new mongoose.Types.ObjectId(user.id);
    // Job posters can still filter their own jobs by status
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
    // query.status = 'active'; // <-- REMOVED: Job seekers now see all jobs regardless of status
    console.log(`API: Job Seeker viewing all jobs (status filter removed for this role).`);
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

  // --- DIAGNOSTIC LOGGING START ---
  console.log('API: Final job query being executed:', JSON.stringify(query, null, 2));
  // --- DIAGNOSTIC LOGGING END ---

  try {
    const totalJobs = await Job.countDocuments(query);
    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
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

// POST /api/jobs (remains unchanged from previous version)
export async function POST(request: NextRequest) {
  await dbConnect();
  console.log('\n--- API: /api/jobs POST - Request received ---');

  const authResult = await authMiddleware(request, 'job_poster');
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const { id: jobPosterId, email: jobPosterEmail } = authResult.user;

  try {
    const { title, description, location, salary, company, jobType, skills, companyLogo } = await request.json();

    if (!title || !description || !location || !salary || !company || !jobType) {
      return NextResponse.json({ error: 'All required fields must be provided.' }, { status: 400 });
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
      postedBy: new mongoose.Types.ObjectId(jobPosterId),
    });

    await newJob.save();

    return NextResponse.json(
      { message: 'Job posted successfully!', job: newJob.toObject() },
      { status: 201 }
    );
  } catch (error) {
    console.error('API: Create job error:', error);
    return NextResponse.json({ error: 'Server error posting job.' }, { status: 500 });
  }
}