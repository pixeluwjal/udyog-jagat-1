// app/api/resumes/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';
import { authMiddleware } from '@/lib/authMiddleware';
import User, { IUser } from '@/models/User';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  await dbConnect();
  
  const authResult = await authMiddleware(request, ['job_poster', 'admin', 'job_seeker']); 

  if (!authResult.success) {
    console.warn(`API: Resume GET failed auth: ${authResult.message}`);
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const authenticatedUser = authResult.user;
  // FIX: Destructure id directly from context.params to address the Next.js warning
  const { id: resumeId } = context.params; 
  console.log(`API: Attempting to fetch resume with ID: ${resumeId}`);

  if (!resumeId || !mongoose.isValidObjectId(resumeId)) {
    console.warn(`API: Invalid resume ID provided: ${resumeId}`);
    return NextResponse.json({ error: 'Valid Resume ID is required' }, { status: 400 });
  }

  const db = mongoose.connection.db!; 
  const gfs = new mongoose.mongo.GridFSBucket(db, {
    bucketName: 'resumes',
  });

  try {
    const _id = new mongoose.Types.ObjectId(resumeId); 
    const files = await gfs.find({ _id }).toArray();

    if (!files || files.length === 0) {
      console.warn(`API: No file found for resume ID: ${_id}`);
      return NextResponse.json({ error: 'Resume file not found' }, { status: 404 });
    }

    // FIX: Re-implement correct security logic.
    // 1. First, check if the authenticated user is a job poster or admin.
    //    These roles can view any resume.
    const isAuthorizedRole = authenticatedUser!.role === 'job_poster' || authenticatedUser!.role === 'admin';
    
    if (!isAuthorizedRole) {
      // 2. If the user is not an admin or poster, they must be a job seeker.
      //    Check if the requested resumeId belongs to them.
      const user = await User.findById(authenticatedUser!._id);
      
      // We check if the user exists and if their resumeId matches the requested ID.
      // Note: We don't need to check user.resume because the `resumeId` comes from the `resume` object.
      if (!user || user.resume?.resumeId !== resumeId) {
        console.warn(`API: User ${authenticatedUser!._id} attempted to access resume ${resumeId} which is not their own.`);
        return NextResponse.json({ error: 'Forbidden - You do not have permission to view this resume.' }, { status: 403 });
      }
    }

    const file = files[0];

    const downloadStream = gfs.openDownloadStream(_id);

    const webReadableStream = new ReadableStream({
      start(controller) {
        downloadStream.on('data', (chunk) => {
          controller.enqueue(chunk);
        });
        downloadStream.on('end', () => {
          controller.close();
        });
        downloadStream.on('error', (err) => {
          console.error('GridFS download stream error:', err);
          controller.error(err);
        });
      },
    });

    return new NextResponse(webReadableStream, {
      headers: {
        'Content-Type': file.contentType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${file.filename}"`,
        'Content-Length': file.length.toString(),
      },
      status: 200,
    });

  } catch (error: any) {
    console.error('API: Error fetching resume:', error);
    return NextResponse.json(
      { error: error.message || 'Server error while fetching resume' },
      { status: 500 }
    );
  }
}
