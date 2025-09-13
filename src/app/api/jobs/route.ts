// This file contains the Next.js API route for handling job-related requests.
// It includes a GET method for fetching jobs with various filters and a POST
// method for creating new jobs.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Job from "@/models/Job";
import { authMiddleware } from "@/lib/authMiddleware";
import mongoose from "mongoose";
import { getSalaryRange } from "@/lib/constants";

// Import related models for applied/saved filtering
import Application from "@/models/Application";
import User from "@/models/User";

// ------------------------- GET /api/jobs -------------------------
export async function GET(request: NextRequest) {
  console.log("\n--- API: /api/jobs GET - Request received ---");
  await dbConnect();

  const authResult = await authMiddleware(request, [
    "job_poster",
    "admin",
    "job_seeker",
  ]);
  if (!authResult.success || !authResult.user) {
    console.error("Authentication failed:", authResult.message);
    return NextResponse.json(
      { error: authResult.message || "Authentication failed" },
      { status: authResult.status || 401 }
    );
  }

  const user = authResult.user;
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const skip = (page - 1) * limit;

  const searchTerm = searchParams.get("search") || "";
  const locationFilter = searchParams.get("location") || "";
  const minSalary = parseInt(searchParams.get("minSalary") || "", 10);
  const maxSalary = parseInt(searchParams.get("maxSalary") || "", 10);

  const excludeJobId = searchParams.get("excludeJobId");
  const statusFilter = searchParams.get("status");
  const jobTypeFilter = searchParams.get("jobType");
  const skillsFilter = searchParams.get("skills");
  const minOpenings = parseInt(searchParams.get("minOpenings") || "", 10);
  const maxOpenings = parseInt(searchParams.get("maxOpenings") || "", 10);

  const appliedFilter = searchParams.get("appliedFilter");

  let query: any = {};

  // --- Role-based filtering ---
  if (user.role === "job_poster") {
    query.postedBy = new mongoose.Types.ObjectId(user.id);
    if (statusFilter && ["active", "inactive", "closed"].includes(statusFilter)) {
      query.status = statusFilter;
    }
  } else if (user.role === "admin") {
    const adminPostedBy = searchParams.get("postedBy");
    if (adminPostedBy && mongoose.isValidObjectId(adminPostedBy)) {
      query.postedBy = new mongoose.Types.ObjectId(adminPostedBy);
    }
    if (statusFilter && ["active", "inactive", "closed"].includes(statusFilter)) {
      query.status = statusFilter;
    }
  } else if (user.role === "job_seeker") {
    query.status = "active"; // seekers only see active jobs

    // --- Handle applied / saved filters ---
    if (appliedFilter === "applied") {
      console.log("Debug: Filtering by applied jobs for user:", user.id);
      try {
        const appliedJobIds = await Application.find({ applicant: user.id }).distinct("job");
        console.log("Debug: Found applied job IDs:", appliedJobIds.length);
        query._id = { $in: appliedJobIds };
      } catch (e) {
        console.error("Error fetching applied jobs:", e);
        return NextResponse.json({ error: "Error fetching applied jobs" }, { status: 500 });
      }
    }

    if (appliedFilter === "saved") {
      console.log("Debug: Filtering by saved jobs for user:", user.id);
      try {
        const userDoc = await User.findById(user.id).lean();
        const savedJobIds = userDoc?.savedJobs || [];
        console.log("Debug: Found saved job IDs:", savedJobIds.length);
        query._id = { $in: savedJobIds };
      } catch (e) {
        console.error("Error fetching saved jobs:", e);
        return NextResponse.json({ error: "Error fetching saved jobs" }, { status: 500 });
      }
    }
  } else {
    console.error("Forbidden: Insufficient role:", user.role);
    return NextResponse.json(
      { message: "Forbidden: Insufficient role to view jobs." },
      { status: 403 }
    );
  }

  // --- Apply common filters ---
  if (searchTerm) {
    query.$or = [
      { title: { $regex: searchTerm, $options: "i" } },
      { company: { $regex: searchTerm, $options: "i" } },
      { description: { $regex: searchTerm, $options: "i" } },
    ];
  }
  if (locationFilter) query.location = { $regex: locationFilter, $options: "i" };
  if (excludeJobId && mongoose.isValidObjectId(excludeJobId)) {
    query._id = { $ne: new mongoose.Types.ObjectId(excludeJobId) };
  }
  if (jobTypeFilter) query.jobType = jobTypeFilter;
  if (skillsFilter) {
    const skillsArray = skillsFilter.split(",").map((s) => s.trim());
    query.skills = { $in: skillsArray };
  }
  if (!isNaN(minOpenings) && minOpenings >= 0) {
    query.numberOfOpenings = { ...query.numberOfOpenings, $gte: minOpenings };
  }
  if (!isNaN(maxOpenings) && maxOpenings >= 0) {
    query.numberOfOpenings = { ...query.numberOfOpenings, $lte: maxOpenings };
  }

  // --- Salary filter (using salaryMin & salaryMax) ---
  if (!isNaN(minSalary) || !isNaN(maxSalary)) {
    query.$and = query.$and || [];

    // ✅ FIX: The updated logic now correctly checks if the job's salary range is
    // entirely contained within the selected filter range.
    if (!isNaN(maxSalary)) {
      // For a standard range like 10-20 LPA
      query.$and.push({
        salaryMin: { $gte: minSalary },
        salaryMax: { $lte: maxSalary }
      });
    } else {
      // For the open-ended "50+ LPA" case
      query.$and.push({
        salaryMin: { $gte: minSalary },
        salaryMax: null // Ensures only open-ended jobs are returned
      });
    }
  }

  // Final check to see the complete query before execution
  console.log("API: Final query:", JSON.stringify(query, null, 2));

  try {
    const totalJobs = await Job.countDocuments(query);
    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({ jobs, totalJobs, page, limit }, { status: 200 });
  } catch (error) {
    console.error("API: Fetch jobs error:", error);
    return NextResponse.json(
      { error: "Server error fetching jobs." },
      { status: 500 }
    );
  }
}

// ------------------------- POST /api/jobs -------------------------
export async function POST(request: NextRequest) {
  console.log("\n--- API: /api/jobs POST - Request received ---");
  await dbConnect();

  const authResult = await authMiddleware(request, "job_poster");
  if (!authResult.success || !authResult.user) {
    console.error("Authentication failed:", authResult.message);
    return NextResponse.json(
      { error: authResult.message },
      { status: authResult.status }
    );
  }

  const { id: jobPosterId } = authResult.user;

  try {
    const {
      title,
      description,
      location,
      salaryOriginal, // e.g., "20-30 LPA"
      company,
      jobType,
      skills,
      companyLogo,
      numberOfOpenings,
    } = await request.json();

    if (
      !title ||
      !description ||
      !location ||
      !company ||
      !jobType ||
      numberOfOpenings === undefined ||
      numberOfOpenings === null ||
      numberOfOpenings <= 0
    ) {
      console.error("Validation failed: Missing required fields or invalid number of openings.");
      return NextResponse.json(
        {
          error:
            "All required fields must be provided, and Number of Openings must be a positive number.",
        },
        { status: 400 }
      );
    }

    // 🔑 derive salaryMin and salaryMax from salaryOriginal
    // This part depends on the logic in your `getSalaryRange` function.
    let salaryMin: number | null = null;
    let salaryMax: number | null = null;
    if (salaryOriginal) {
      const range = getSalaryRange(salaryOriginal);
      salaryMin = range.min;
      salaryMax = range.max;
    }

    const newJob = new Job({
      title,
      description,
      location,
      salaryOriginal,
      salaryMin,
      salaryMax,
      company,
      jobType,
      skills: skills || [],
      companyLogo: companyLogo || null,
      numberOfOpenings,
      postedBy: new mongoose.Types.ObjectId(jobPosterId),
      status: "active",
    });

    await newJob.save();
    console.log("Successfully created new job with ID:", newJob._id);

    return NextResponse.json(
      { message: "Job posted successfully!", job: newJob.toObject() },
      { status: 201 }
    );
  } catch (error) {
    console.error("API: Create job error:", error);
    if (error instanceof mongoose.Error.ValidationError) {
      const errors = Object.keys(error.errors).map(
        (key) => error.errors[key].message
      );
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Server error posting job." },
      { status: 500 }
    );
  }
}
