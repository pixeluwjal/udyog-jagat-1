// app/api/referrer/generate-referral-code/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User, { IUser } from '@/models/User';
import ReferralCodeModel, { IReferralCode } from '@/models/ReferralCode';
import jwt from 'jsonwebtoken';
import { headers } from 'next/headers'; // Use headers from next/headers for server components/APIs
import sendEmail from '@/lib/emailservice';
import crypto from 'crypto'; // Node.js built-in module for cryptographic functions
import bcrypt from 'bcryptjs'; // For hashing temporary password

// Define a type for the decoded JWT token for better type safety
interface DecodedToken {
    id: string;
    email: string;
    role: string;
    // Add any other properties that might be in your JWT payload
}

interface GenerateCodeRequest {
    candidateEmail: string;
}

const JWT_SECRET = process.env.JWT_SECRET;

async function verifyReferrer(requestHeaders: Headers): Promise<{ user: DecodedToken | null, error: string | null }> {
    const authorization = requestHeaders.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
        return { user: null, error: 'Unauthorized - No token provided or invalid format.' };
    }

    const token = authorization.split(' ')[1];
    if (!token) {
        return { user: null, error: 'Unauthorized - Token missing.' };
    }

    if (!JWT_SECRET) {
        console.error('API: JWT_SECRET is not defined in environment variables. Server configuration error.');
        return { user: null, error: 'Server configuration error: JWT secret missing.' };
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
        // IMPORTANT: Check for 'job_referrer' role
        if (decoded.role !== 'job_referrer') {
            return { user: null, error: 'Forbidden - Only job referrers can generate referral codes.' };
        }
        return { user: decoded, error: null };
    } catch (err: unknown) {
        let errorMessage = 'Unauthorized - Invalid token.';
        if (err instanceof Error) {
            errorMessage = `Unauthorized - Invalid token: ${err.message}`;
        }
        return { user: null, error: errorMessage };
    }
}

async function generateUniqueCode(length: number = 8): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    let codeExists = true;
    let attempts = 0;
    const maxAttempts = 10;

    while (codeExists && attempts < maxAttempts) {
        result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        const existingCode = await ReferralCodeModel.findOne({ code: result });
        codeExists = !!existingCode;
        attempts++;
    }

    if (codeExists) {
        throw new Error('Failed to generate a unique referral code after multiple attempts.');
    }
    return result;
}

export async function POST(request: Request) {
    await dbConnect();
    console.log('\n--- API: /api/referrer/generate-referral-code POST - Request received ---');

    const { user: referrerUser, error: authError } = await verifyReferrer(headers());
    if (authError) {
        console.warn(`API: Referral code generation failed: ${authError}`);
        return NextResponse.json({ error: authError }, { status: 401 });
    }

    if (!referrerUser?.id) {
        console.error('API: Referrer user ID is missing after authentication.');
        return NextResponse.json({ error: 'Referrer user ID not available.' }, { status: 500 });
    }

    try {
        const { candidateEmail }: GenerateCodeRequest = await request.json();
        console.log(`API: Referrer ${referrerUser.id} attempting to generate referral code for: ${candidateEmail}`);

        if (!candidateEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateEmail)) {
            return NextResponse.json({ error: 'Valid candidate email is required.' }, { status: 400 });
        }

        let user = await User.findOne({ email: candidateEmail });
        let generatedCode = await generateUniqueCode();
        let isNewUser = false;
        let temporaryPassword = '';

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 60); // Code valid for 60 days

        if (!user) {
            isNewUser = true;
            const username = candidateEmail.split('@')[0];
            temporaryPassword = Math.random().toString(36).substring(2, 10);

            user = new User({
                username,
                email: candidateEmail,
                password: temporaryPassword, // Store hashed temporary password
                role: 'job_seeker',
                firstLogin: true,
                isSuperAdmin: false,
                createdBy: referrerUser.id, // Referrer generates this user
                onboardingStatus: 'pending',
            });
            await user.save();
            console.log(`API: Created new job_seeker user ${candidateEmail} by referrer ${referrerUser.id}.`);
        } else {
            console.log(`API: User ${candidateEmail} already exists. Generating code for existing user.`);
            // If user exists but hasn't completed onboarding, reset firstLogin and onboardingStatus
            if (!user.firstLogin && user.onboardingStatus !== 'completed') {
                user.firstLogin = true;
                user.onboardingStatus = 'pending';
                await user.save();
                console.log(`API: Reset firstLogin and onboardingStatus for existing user ${user._id}.`);
            }
        }

        const newReferralCode = new ReferralCodeModel({
            code: generatedCode,
            candidateEmail,
            expiresAt,
            generatedByAdminId: referrerUser.id, // Store the referrer's ID here
            isUsed: false,
        });
        await newReferralCode.save();
        console.log(`API: Saved new referral code ${generatedCode} to ReferralCode collection for referrer ${referrerUser.id}.`);

        const loginUrl = `${new URL(request.url).origin}/login`; // Use request.url.origin
        const portalName = 'UDYOG JAGAT';
        const teamName = process.env.EMAIL_FROM?.split('<')[0].trim() || 'Job Portal Team';

        // Format date for email body: e.g., "26-Sep-2025"
        const formattedExpiryDateForEmail = expiresAt.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).replace(/ /g, '-'); // Replace spaces with hyphens

        const emailSubject = `Your ${portalName} Portal Access Code!`;
        const emailText = `Hello ${user.username || user.email},\n\nYour referrer has generated an exclusive access code for you to log in to ${portalName}.\n\nYour Access Code: ${generatedCode}\n\nThis code is valid until ${formattedExpiryDateForEmail} and is for one-time use only.\n\nPlease use it to log in and complete your profile here: ${loginUrl}\n\n${isNewUser ? `Your temporary password is: ${temporaryPassword} (You will be prompted to change this on first login.)\n\n` : ''}We look forward to having you!\n\n${teamName}`;

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Your ${portalName} Portal Access Code!</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #1758F1; /* Primary blue */
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            padding: 20px;
            background-color: #f9fafb;
            border-radius: 0 0 8px 8px;
        }
        .code {
            font-size: 24px;
            font-weight: bold;
            color: #1758F1; /* Primary blue */
            text-align: center;
            margin: 20px 0;
            padding: 15px;
            background-color: #e0f2fe; /* Light blue background for code */
            border-radius: 8px;
            border: 1px dashed #90cdf4;
        }
        .button {
            display: inline-block;
            background-color: #1758F1; /* Primary blue */
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            text-decoration: none;
            margin-top: 15px;
        }
        .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${portalName} Portal Access</h1>
    </div>
    <div class="content">
        <p>Hello <strong>${user.email}</strong>,</p>
        
        <p>Your referrer has generated an exclusive access code for you to log in to ${portalName}.</p>
        
        <div class="code">${generatedCode}</div>
        
        <p>This code is valid until <strong>${formattedExpiryDateForEmail}</strong> and is for one-time use only.</p>
        
        <p>Please use it to <a href="${loginUrl}" class="button">log in</a> and complete your profile.</p>
        
        ${isNewUser ? `<p>Your temporary password is: <strong>${temporaryPassword}</strong> (You will be prompted to change this on first login.)</p>` : ''}
        
        <p>We look forward to having you!</p>
        
        <div class="footer">
            <p>${teamName}</p>
        </div>
    </div>
</body>
</html>
        `;

        try {
            await sendEmail({
                to: candidateEmail,
                subject: emailSubject,
                text: emailText,
                html: emailHtml,
            });
            console.log('API: Referral code email sent successfully to:', candidateEmail);
        } catch (emailError: any) {
            console.error('API: Failed to send referral code email to %s:', candidateEmail, emailError);
            // Log the error but do not throw, as the code generation itself was successful.
        }

        return NextResponse.json(
            {
                message: `Referral code generated and email sent successfully to ${candidateEmail}!`,
                code: generatedCode,
                expiresAt,
                isNewUser,
            },
            { status: 201 }
        );

    } catch (error: unknown) {
        console.error('API: Generate referral code error:', error);
        let errorMessage = 'Server error generating referral code.';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
