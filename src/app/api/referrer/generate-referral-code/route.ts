// app/api/referrer/generate-referral-code/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User, { IUser } from '@/models/User';
import ReferralCodeModel, { IReferralCode } from '@/models/ReferralCode';
import jwt from 'jsonwebtoken';
import { headers } from 'next/headers';
import sendEmail from '@/lib/emailservice';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

interface DecodedToken {
  id: string;
  email: string;
  role: string;
}

interface GenerateCodeRequest {
  candidateEmail: string;
}

const JWT_SECRET = process.env.JWT_SECRET;

// Helper to verify the referrer token
async function verifyReferrer(requestHeaders: Headers): Promise<{ user: DecodedToken | null; error: string | null }> {
  const authorization = requestHeaders.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return { user: null, error: 'Unauthorized - No token provided or invalid format.' };
  }

  const token = authorization.split(' ')[1];
  if (!token) return { user: null, error: 'Unauthorized - Token missing.' };
  if (!JWT_SECRET) return { user: null, error: 'Server configuration error: JWT_SECRET missing.' };

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    if (decoded.role !== 'job_referrer') {
      return { user: null, error: 'Forbidden - Only job referrers can generate referral codes.' };
    }
    return { user: decoded, error: null };
  } catch (err: any) {
    return { user: null, error: `Unauthorized - Invalid token: ${err.message}` };
  }
}

// Generate a random unique code
async function generateUniqueCode(length = 8): Promise<string> {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const exists = await ReferralCodeModel.findOne({ code: result });
    if (!exists) return result;
    attempts++;
  }
  throw new Error('Failed to generate unique referral code.');
}

export async function POST(request: Request) {
  try {
    await dbConnect();

    // 1️⃣ Verify referrer token
    const { user: referrerUser, error: authError } = await verifyReferrer(headers());
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }
    if (!referrerUser?.id) {
      return NextResponse.json({ error: 'Referrer user ID not available.' }, { status: 500 });
    }

    // 2️⃣ Get candidate email
    const body: GenerateCodeRequest = await request.json();
    const { candidateEmail } = body;
    if (!candidateEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateEmail)) {
      return NextResponse.json({ error: 'Valid candidate email is required.' }, { status: 400 });
    }

    // 3️⃣ Check if user exists
    let user = await User.findOne({ email: candidateEmail });
    const generatedCode = await generateUniqueCode();
    let isNewUser = false;
    let temporaryPassword = '';

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60); // 60 days validity

    if (!user) {
      // Create new user
      isNewUser = true;
      const username = candidateEmail.split('@')[0];
      temporaryPassword = Math.random().toString(36).substring(2, 10);

      user = new User({
        username,
        email: candidateEmail,
        password: temporaryPassword,
        role: 'job_seeker',
        firstLogin: true,
        isSuperAdmin: false,
        createdBy: referrerUser.id,
        onboardingStatus: 'not_started', // ✅ Valid enum
        status: 'active',
      });
      await user.save();
    } else {
      // Existing user
      if (!user.firstLogin && user.onboardingStatus !== 'completed') {
        user.firstLogin = true;
        user.onboardingStatus = 'not_started';
        await user.save();
      }
    }

    // 4️⃣ Create referral code
    const newReferralCode = new ReferralCodeModel({
      code: generatedCode,
      candidateEmail,
      expiresAt,
      generatedByAdminId: referrerUser.id,
      isUsed: false,
    });
    await newReferralCode.save();

    // 5️⃣ Send email
    const loginUrl = `${new URL(request.url).origin}/login`;
    const portalName = 'UDYOG JAGAT';
    const teamName = process.env.EMAIL_FROM?.split('<')[0].trim() || 'Job Portal Team';

    const formattedExpiryDate = expiresAt.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).replace(/ /g, '-');

    const emailSubject = `Your ${portalName} Portal Access Code!`;
    const emailText = `Hello ${user.username || user.email},

Your referrer has generated an exclusive access code for you to log in to ${portalName}.

Your Access Code: ${generatedCode}

This code is valid until ${formattedExpiryDate} and is for one-time use only.

Please use it to log in and complete your profile here: ${loginUrl}

${isNewUser ? `Your temporary password is: ${temporaryPassword}` : ''}

${teamName}`;

    const emailHtml = `<p>${emailText.replace(/\n/g, '<br/>')}</p>`;

    try {
      await sendEmail({
        to: candidateEmail,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
      });
    } catch (emailError: any) {
      console.error('Failed to send referral email:', emailError);
    }

    // 6️⃣ Return JSON response
    return NextResponse.json({
      message: `Referral code generated successfully for ${candidateEmail}`,
      code: generatedCode,
      expiresAt,
      isNewUser,
      temporaryPassword: isNewUser ? temporaryPassword : undefined,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error generating referral code:', error);
    return NextResponse.json({ error: error.message || 'Server error generating referral code.' }, { status: 500 });
  }
}
