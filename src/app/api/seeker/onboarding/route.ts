import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { GridFSBucket } from "mongodb";
import mongoose from "mongoose";
import { Readable } from "stream";

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    // Get Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not defined");
    }

    // Verify JWT token
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    // Get form data
    const formData = await request.formData();
    const fullName = formData.get("fullName")?.toString();
    const phone = formData.get("phone")?.toString();
    const skills = formData.get("skills")?.toString();
    const experience = formData.get("experience")?.toString();
    const resumeFile = formData.get("resume") as File | null;

    if (!fullName || !phone || !skills || !experience || !resumeFile) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (resumeFile.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    const MAX_FILE_SIZE_MB = 10;
    if (resumeFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `Resume exceeds ${MAX_FILE_SIZE_MB}MB` }, { status: 400 });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Upload resume to GridFS
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: "resumes" });
    const buffer = Buffer.from(await resumeFile.arrayBuffer());
    const readableStream = new Readable();
    readableStream._read = () => {};
    readableStream.push(buffer);
    readableStream.push(null);

    const uploadStream = bucket.openUploadStream(
      `${userId}_${Date.now()}_${resumeFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      {
        contentType: resumeFile.type,
        metadata: { userId, originalName: resumeFile.name, uploadDate: new Date() },
      }
    );

    const fileId = uploadStream.id;

    await new Promise((resolve, reject) => {
      readableStream.pipe(uploadStream)
        .on("error", reject)
        .on("finish", resolve);
    });

    // Update user
    user.candidateDetails = {
      fullName,
      phone,
      skills: skills.split(",").map(s => s.trim()).filter(s => s),
      experience,
    };
    user.resume = {
      resumeId: fileId.toString(),
      fileName: resumeFile.name,
    };
    user.onboardingStatus = "completed";
    user.firstLogin = false;

    await user.save();

    return NextResponse.json({ message: "Onboarding completed successfully", user });

  } catch (err: any) {
    console.error("Onboarding error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
