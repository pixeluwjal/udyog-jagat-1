// app/api/referrer/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ReferrerModel from '@/models/Referrer';
import { authMiddleware } from '@/lib/authMiddleware';

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();

    // Use your custom auth middleware
    const authResult = await authMiddleware(request);

    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: authResult.status });
    }

    const userId = authResult.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const {
      fullName,
      mobileNumber,
      personalEmail,
      residentialAddress,
      companyName,
      workLocation,
      designation
    } = body;

    console.log('🔄 Updating referrer profile for user:', userId);
    console.log('📝 Update data:', body);

    // Validate required fields
    if (!fullName || !mobileNumber || !personalEmail || !companyName || !designation) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Update the referrer profile
    const updatedReferrer = await ReferrerModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          'referrerDetails.fullName': fullName,
          'referrerDetails.mobileNumber': mobileNumber,
          'referrerDetails.personalEmail': personalEmail,
          'referrerDetails.residentialAddress': residentialAddress,
          'workDetails.companyName': companyName,
          'workDetails.workLocation': workLocation,
          'workDetails.designation': designation
        }
      },
      { 
        new: true,
        runValidators: true 
      }
    ).select('-password'); // Exclude password from response

    if (!updatedReferrer) {
      return NextResponse.json(
        { error: 'Referrer not found' },
        { status: 404 }
      );
    }

    console.log('✅ Profile updated successfully:', updatedReferrer._id);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: updatedReferrer._id,
        username: updatedReferrer.username,
        email: updatedReferrer.email,
        referrerDetails: updatedReferrer.referrerDetails,
        workDetails: updatedReferrer.workDetails,
        role: updatedReferrer.role
      }
    });

  } catch (error: any) {
    console.error('❌ Profile update error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// GET method to fetch current profile
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Use your custom auth middleware
    const authResult = await authMiddleware(request);

    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: authResult.status });
    }

    const userId = authResult.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    // Fetch the referrer profile
    const referrer = await ReferrerModel.findById(userId)
      .select('-password')
      .lean();

    if (!referrer) {
      return NextResponse.json(
        { error: 'Referrer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        ...referrer,
        _id: referrer._id.toString()
      }
    });

  } catch (error: any) {
    console.error('❌ Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}