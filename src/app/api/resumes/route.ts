// app/api/resumes/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';
import { authMiddleware } from '@/lib/authMiddleware';
import { Readable } from 'stream';
import { User as UserModel, IUser } from '@/models/User';

// Helper function to convert a web stream to a Node.js Readable stream
function webStreamToNodeStream(webStream: ReadableStream): Readable {
  const nodeStream = new Readable({
    read() {},
  });

  const reader = webStream.getReader();

  function push() {
    reader.read().then(({ done, value }) => {
      if (done) {
        nodeStream.push(null);
        return;
      }
      nodeStream.push(value);
      push();
    }).catch(err => {
      nodeStream.emit('error', err);
    });
  }

  push();
  return nodeStream;
}

// Get or create the User model to prevent errors in Next.js environment
const User = mongoose.models.User || mongoose.model<IUser>('User', UserModel.schema);

/**
 * GET /api/resumes
 * Fetches the current user's resume metadata (ID and file name).
 * This endpoint is used to display the current resume file name on the profile page.
 */
export async function GET(request: NextRequest) {
  await dbConnect();
  const authResult = await authMiddleware(request, ['job_seeker']);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }
  const authenticatedUser = authResult.user;

  if (!authenticatedUser || !authenticatedUser._id) {
    console.warn(`API: Authenticated user object is missing or has no ID.`);
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 401 });
  }

  const user = await User.findById(authenticatedUser._id);

  if (!user || !user.resume) {
    return NextResponse.json({ message: 'No resume found for this user.' }, { status: 404 });
  }

  return NextResponse.json({
    fileName: user.resume.fileName,
    resumeId: user.resume.resumeId,
  }, { status: 200 });
}

/**
 * POST /api/resumes
 * Uploads a new resume file for the authenticated user.
 * It replaces any existing resume.
 */
export async function POST(request: NextRequest) {
  await dbConnect();

  const authResult = await authMiddleware(request, ['job_seeker']);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }
  const authenticatedUser = authResult.user as IUser;

  if (!authenticatedUser || !authenticatedUser._id) {
    console.warn(`API: Authenticated user object is missing or has no ID.`);
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 401 });
  }

  const user = await User.findById(authenticatedUser._id);
  if (!user) {
    console.warn(`API: User not found for ID: ${authenticatedUser._id}`);
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Ensure DB and GFS are ready before proceeding
  const db = mongoose.connection.db;
  if (!db) {
    console.error('Database connection not available.');
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }
  
  const gfs = new mongoose.mongo.GridFSBucket(db, {
    bucketName: 'resumes',
  });

  try {
    const formData = await request.formData();
    const file = formData.get('resume') as File;

    if (!file) {
      return NextResponse.json({ error: 'No resume file provided.' }, { status: 400 });
    }

    const { name, type } = file;
    const fileStream = webStreamToNodeStream(file.stream());
    
    if (user.resume?.resumeId) {
        try {
            await gfs.delete(new mongoose.Types.ObjectId(user.resume.resumeId));
        } catch (error) {
            console.warn(`Could not delete old resume with ID: ${user.resume.resumeId}`, error);
        }
    }

    const uploadStream = gfs.openUploadStream(name, {
      contentType: type,
    });
    const resumeId = uploadStream.id;

    await new Promise<void>((resolve, reject) => {
      fileStream.pipe(uploadStream)
        .on('finish', () => {
          console.log(`Resume successfully uploaded with ID: ${resumeId}`);
          resolve();
        })
        .on('error', (err) => {
          console.error('GridFS upload error:', err);
          reject(err);
        });
    });

    user.resume = { resumeId: resumeId.toString(), fileName: name };
    await user.save();

    return NextResponse.json({
      message: 'Resume uploaded successfully.',
      resumeId: resumeId.toString(),
      fileName: name,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error uploading resume:', error);
    return NextResponse.json(
      { error: error.message || 'Server error while uploading resume' },
      { status: 500 }
    );
  }
}
