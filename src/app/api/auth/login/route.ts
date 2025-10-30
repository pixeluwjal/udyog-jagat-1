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

    console.log('🔍 DEBUG LOGIN - User found:', {
      email: user.email,
      role: user.role,
      status: (user as any).status,
      userData: user
    });

    // 🔴 CRITICAL: Check if job seeker is inactive
    if (user.role === 'job_seeker') {
      const jobSeeker = user as IUser;
      
      // Check if seeker is inactive
      if (jobSeeker.status === 'inactive') {
        console.log('🚫 BLOCKED: Inactive job seeker trying to login:', user.email);
        return NextResponse.json({ 
          error: 'Your account has been deactivated. Please contact support.' 
        }, { status: 403 });
      }

      // 🔴 CRITICAL: Check ALL access codes for this email - if ANY are valid, allow login
      const accessCodes = await ReferralCodeModel.find({
        candidateEmail: email
      });

      if (accessCodes.length > 0) {
        const now = new Date();
        
        // Check if ANY access code is still valid (not expired)
        const hasValidAccessCode = accessCodes.some(code => 
          new Date(code.expiresAt) >= now
        );

        console.log('🔍 ACCESS CODE STATUS CHECK:', {
          email: user.email,
          totalAccessCodes: accessCodes.length,
          accessCodes: accessCodes.map(code => ({
            code: code.code,
            isUsed: code.isUsed,
            expiresAt: code.expiresAt,
            isExpired: new Date(code.expiresAt) < now,
            status: new Date(code.expiresAt) >= now ? 'active' : 'expired'
          })),
          hasValidAccessCode: hasValidAccessCode,
          currentTime: now
        });

        // 🚫 BLOCK LOGIN only if ALL access codes are expired
        if (!hasValidAccessCode) {
          console.log('🚫 BLOCKED: Job seeker with ALL expired access codes trying to login:', user.email);
          return NextResponse.json({ 
            error: 'All your access codes have expired. Your account is no longer accessible. Please contact support for a new access code.' 
          }, { status: 403 });
        } else {
          console.log('✅ ALLOWED: Job seeker has at least one valid access code:', user.email);
        }
      } else {
        console.log('🔍 ACCESS CODE STATUS CHECK: No access codes found for:', user.email);
      }
    }

    let isAuthenticated = false;

    // 2️⃣ Check password first
    if (user.password) {
      const match = await bcrypt.compare(rawPassword, user.password);
      if (match) isAuthenticated = true;
    }

    // 3️⃣ If password failed, check referral code (only for regular users, not referrers)
    if (!isAuthenticated && user.role !== 'job_referrer') {
      const referral: IReferralCode | null = await ReferralCodeModel.findOne({
        candidateEmail: email,
        code: rawPassword
      });
      
      if (referral) {
        // Check if access code is expired
        const now = new Date();
        if (new Date(referral.expiresAt) < now) {
          return NextResponse.json({ 
            error: 'This access code has expired. Please request a new one.' 
          }, { status: 401 });
        }

        // Mark the access code as used
        referral.isUsed = true;
        referral.usedAt = new Date();
        await referral.save();

        isAuthenticated = true;
        console.log('✅ Access code used successfully:', referral.code);
      }
    }

    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Invalid credentials or access code' }, { status: 401 });
    }

    // 4️⃣ Generate JWT - include additional fields for referrers
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET not defined');
    
    const tokenPayload: any = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      firstLogin: user.firstLogin,
      onboardingStatus: user.onboardingStatus,
      status: (user as any).status,
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

    // 🔍 Add access code status info for job seekers
    if (user.role === 'job_seeker') {
      const accessCodes = await ReferralCodeModel.find({
        candidateEmail: email
      });
      
      if (accessCodes.length > 0) {
        const now = new Date();
        const validAccessCodes = accessCodes.filter(code => 
          new Date(code.expiresAt) >= now
        );
        const hasValidAccessCode = validAccessCodes.length > 0;
        
        tokenPayload.accessCodesCount = accessCodes.length;
        tokenPayload.validAccessCodesCount = validAccessCodes.length;
        tokenPayload.hasValidAccessCode = hasValidAccessCode;
        tokenPayload.accessCodeStatus = hasValidAccessCode ? 'active' : 'expired';
        
        // Include the first valid access code info (if any)
        if (validAccessCodes.length > 0) {
          const firstValidCode = validAccessCodes[0];
          tokenPayload.accessCode = firstValidCode.code;
          tokenPayload.accessCodeGeneratedBy = firstValidCode.generatedByAdminUsername;
          tokenPayload.accessCodeExpiresAt = firstValidCode.expiresAt;
        }
      } else {
        tokenPayload.accessCodesCount = 0;
        tokenPayload.validAccessCodesCount = 0;
        tokenPayload.hasValidAccessCode = false;
        tokenPayload.accessCodeStatus = 'no_access_code';
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
      status: (user as any).status,
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

    // 🔍 Add access code status info to response for job seekers
    if (user.role === 'job_seeker') {
      const accessCodes = await ReferralCodeModel.find({
        candidateEmail: email
      });
      
      if (accessCodes.length > 0) {
        const now = new Date();
        const validAccessCodes = accessCodes.filter(code => 
          new Date(code.expiresAt) >= now
        );
        const hasValidAccessCode = validAccessCodes.length > 0;
        
        userResponse.accessCodesCount = accessCodes.length;
        userResponse.validAccessCodesCount = validAccessCodes.length;
        userResponse.hasValidAccessCode = hasValidAccessCode;
        userResponse.accessCodeStatus = hasValidAccessCode ? 'active' : 'expired';
        
        // Include the first valid access code info (if any)
        if (validAccessCodes.length > 0) {
          const firstValidCode = validAccessCodes[0];
          userResponse.accessCode = firstValidCode.code;
          userResponse.accessCodeGeneratedBy = firstValidCode.generatedByAdminUsername;
          userResponse.accessCodeExpiresAt = firstValidCode.expiresAt;
        }
      } else {
        userResponse.accessCodesCount = 0;
        userResponse.validAccessCodesCount = 0;
        userResponse.hasValidAccessCode = false;
        userResponse.accessCodeStatus = 'no_access_code';
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