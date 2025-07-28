// app/api/auth/change-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User'; // fixed import
import { authMiddleware } from '@/lib/authMiddleware';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  await dbConnect();

  const authResult = await authMiddleware(request);

  if (!authResult.success) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const userId = authResult.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'User ID not found after authentication.' }, { status: 401 });
  }

  const { currentPassword, newPassword } = await request.json();

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters long.' }, { status: 400 });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Only check currentPassword if not firstLogin
    if (!user.firstLogin) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required.' }, { status: 400 });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return NextResponse.json({ error: 'Invalid current password.' }, { status: 401 });
      }
    }

    // ✅ Just assign plain new password — pre-save hook will hash it
    user.password = newPassword;

    if (user.firstLogin) {
      user.firstLogin = false;
    }

    await user.save();

    const payload = {
      id: user._id,
      email: user.email,
      username: user.username,
      role: user.role,
      firstLogin: user.firstLogin,
      isSuperAdmin: user.isSuperAdmin,
      onboardingStatus: user.onboardingStatus,
    };

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not defined');

    const newToken = jwt.sign(payload, secret, { expiresIn: '1h' });

    return NextResponse.json({ message: 'Password changed successfully', token: newToken }, { status: 200 });
  } catch (error: any) {
    console.error('API: /api/auth/change-password POST error:', error);
    return NextResponse.json({ error: error.message || 'Server error changing password.' }, { status: 500 });
  }
}
