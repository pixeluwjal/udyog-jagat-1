// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { authMiddleware, DecodedToken } from '@/lib/authMiddleware';

export async function GET(request: NextRequest) {
  await dbConnect();

  const authResult = await authMiddleware(request);

  if (!authResult.success) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const userId = authResult.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'User ID not found after authentication.' }, { status: 404 });
  }

  try {
    // Correct way to pass readPreference to findById when using .lean()
    const user = await User.findById(
      userId,
      null, // projection (select) can be null or an object, we use .select() chaining instead
      { readPreference: 'primary' } // Options object for findById
    )
      .select('-password')
      .lean(); // Return a plain JavaScript object

    if (!user) {
      return NextResponse.json({ error: 'User not found in database.' }, { status: 404 });
    }

    console.log(`[API /auth/me] User ${user._id}: firstLogin from DB: ${user.firstLogin}`);

    return NextResponse.json({ user: user }, { status: 200 });

  } catch (error: any) {
    console.error('API: /api/auth/me GET error:', error);
    return NextResponse.json({ error: error.message || 'Server error fetching user data.' }, { status: 500 });
  }
}