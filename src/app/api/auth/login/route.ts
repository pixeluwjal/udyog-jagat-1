// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User, { IUser } from '@/models/User';
import Referrer, { IReferrer } from '@/models/Referrer';
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

    // 1️⃣ Find user by email in BOTH collections
    let user: (IUser & { password?: string }) | (IReferrer & { password?: string }) | null = null;
    
    // Check User collection first
    user = await User.findOne({ email }).select('+password');
    
    // If not found in User collection, check Referrer collection
    if (!user) {
      user = await Referrer.findOne({ email }).select('+password');
    }

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    let isAuthenticated = false;

    // 2️⃣ Check password first
    if (user.password) {
      const match = await bcrypt.compare(rawPassword, user.password);
      if (match) isAuthenticated = true;
    }

    // 3️⃣ If password failed, check referral code (only for regular users, not referrers)
    if (!isAuthenticated && 'role' in user && user.role !== 'job_referrer') {
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

    // 4️⃣ Generate JWT - include additional fields for referrers
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET not defined');
    
    const tokenPayload: any = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      firstLogin: user.firstLogin,
      onboardingStatus: user.onboardingStatus,
    };

    // Add referrer-specific fields if the user is a referrer
    if (user.role === 'job_referrer') {
      const referrerUser = user as IReferrer;
      tokenPayload.isReferrer = true;
      tokenPayload.referralCode = referrerUser.referralCode;
      tokenPayload.milanShakaBhaga = referrerUser.milanShakaBhaga;
      tokenPayload.valayaNagar = referrerUser.valayaNagar;
      tokenPayload.khandaBhaga = referrerUser.khandaBhaga;
      
      // Add referrer details if available
      if (referrerUser.referrerDetails) {
        tokenPayload.referrerDetails = referrerUser.referrerDetails;
      }
      if (referrerUser.workDetails) {
        tokenPayload.workDetails = referrerUser.workDetails;
      }
    }

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1d' });

    // 5️⃣ Response - include referrer-specific fields
    const userResponse: any = {
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      firstLogin: user.firstLogin,
      onboardingStatus: user.onboardingStatus,
    };

    // Add referrer-specific fields to response
    if (user.role === 'job_referrer') {
      const referrerUser = user as IReferrer;
      userResponse.referralCode = referrerUser.referralCode;
      userResponse.milanShakaBhaga = referrerUser.milanShakaBhaga;
      userResponse.valayaNagar = referrerUser.valayaNagar;
      userResponse.khandaBhaga = referrerUser.khandaBhaga;
      
      // Add referrer details if available
      if (referrerUser.referrerDetails) {
        userResponse.referrerDetails = referrerUser.referrerDetails;
      }
      if (referrerUser.workDetails) {
        userResponse.workDetails = referrerUser.workDetails;
      }
      if (referrerUser.jobReferrerDetails) {
        userResponse.jobReferrerDetails = referrerUser.jobReferrerDetails;
      }
    }

    return NextResponse.json({
      message: 'Login successful',
      token,
      user: userResponse
    }, { status: 200 });

  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}