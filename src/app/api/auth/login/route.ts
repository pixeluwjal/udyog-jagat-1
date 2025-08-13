import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User, { IUser } from '@/models/User';
import ReferralCodeModel, { IReferralCode } from '@/models/ReferralCode';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  await dbConnect();
  try {
    const { email, password } = await request.json();
    const rawPassword = password?.toString().trim();

    if (!email || !rawPassword) {
      return NextResponse.json({ error: 'Email and password/referral code are required' }, { status: 400 });
    }

    // 1️⃣ Find user by email
    const user: (IUser & { password?: string }) | null = await User.findOne({ email }).select('+password');
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    let isAuthenticated = false;

    // 2️⃣ Check password first
    if (user.password) {
      const match = await bcrypt.compare(rawPassword, user.password);
      if (match) isAuthenticated = true;
    }

    // 3️⃣ If password failed, check referral code
    if (!isAuthenticated) {
      const referral: IReferralCode | null = await ReferralCodeModel.findOne({
        candidateEmail: email,
        code: rawPassword
      });
      if (referral) {
        isAuthenticated = true;
      }
    }

    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Invalid credentials or referral code' }, { status: 401 });
    }

    // 4️⃣ Generate JWT
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET not defined');
    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        firstLogin: user.firstLogin,
        onboardingStatus: user.onboardingStatus,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // 5️⃣ Response
    return NextResponse.json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        firstLogin: user.firstLogin,
        onboardingStatus: user.onboardingStatus,
      }
    }, { status: 200 });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
