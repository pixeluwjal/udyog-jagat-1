// app/api/resumes/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';
import { authMiddleware } from '@/lib/authMiddleware';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } } // Keep this typing
) {
  await dbConnect();

  const authResult = await authMiddleware(request, ['job_poster', 'admin']); 

  if (!authResult.success) {
    console.warn(`API: Resume GET failed auth: ${authResult.message}`);
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  // --- MODIFIED LINE HERE ---
  // Access directly instead of destructuring, for testing if it's a linter quirk
  const id = context.params.id; 
  console.log(`API: Attempting to fetch resume with ID: ${id}`); // ADD THIS LOG

  if (!id || !mongoose.isValidObjectId(id)) {
    console.warn(`API: Invalid resume ID provided: ${id}`);
    return NextResponse.json({ error: 'Valid Resume ID is required' }, { status: 400 });
  }

  const db = mongoose.connection.db!; 
  const gfs = new mongoose.mongo.GridFSBucket(db, {
    bucketName: 'resumes', // Ensure this matches your actual GridFS bucket name
  });

  try {
    const _id = new mongoose.Types.ObjectId(id); 
    const files = await gfs.find({ _id }).toArray();

    if (!files || files.length === 0) {
      console.warn(`API: No file found for resume ID: ${_id}`);
      return NextResponse.json({ error: 'Resume file not found' }, { status: 404 });
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