import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User, { IUser } from '@/models/User';
import ReferralCodeModel, { IReferralCode } from '@/models/ReferralCode';
import jwt from 'jsonwebtoken';
import { DecodedToken } from '@/lib/authMiddleware';
import sendEmail from '@/lib/emailservice';
import bcrypt from 'bcryptjs';

interface GenerateCodeRequest {
    candidateEmail: string;
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
    console.log('\n--- API: /api/admin/generate-referral-code POST - Request received ---');

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        console.warn('API: Referral code generation failed: No token provided or invalid format.');
        return NextResponse.json(
            { error: 'Unauthorized - No token provided' },
            { status: 401 }
        );
    }

    const token = authHeader.split(' ')[1];
    let decodedToken: DecodedToken;

    try {
        if (!process.env.JWT_SECRET) {
            console.error('API: JWT_SECRET is not defined in environment variables. Server configuration error.');
            return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
        }
        decodedToken = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

        if (decodedToken.role !== 'admin') {
            console.warn(`API: Generate referral code failed: User ${decodedToken.id} (Role: ${decodedToken.role}) is not an admin.`);
            return NextResponse.json(
                { error: 'Forbidden - Only administrators can generate referral codes.' },
                { status: 403 }
            );
        }
        console.log('API: Admin user authenticated for referral code generation:', decodedToken.id);

    } catch (error: unknown) {
        console.warn('API: Generate referral code failed: Invalid token.', error);
        let errorMessage = 'Unauthorized - Invalid token.';
        if (error instanceof Error) {
            errorMessage = `Unauthorized - Invalid token: ${error.message}`;
        }
        return NextResponse.json(
            { error: errorMessage },
            { status: 401 }
        );
    }

    try {
        const { candidateEmail }: GenerateCodeRequest = await request.json();
        console.log(`API: Admin attempting to generate referral code for: ${candidateEmail}`);

        if (!candidateEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateEmail)) {
            return NextResponse.json({ error: 'Valid candidate email is required.' }, { status: 400 });
        }

        let user = await User.findOne({ email: candidateEmail });
        let generatedCode = await generateUniqueCode();
        let isNewUser = false;
        let temporaryPassword = '';

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 60);

        if (!user) {
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
                createdBy: decodedToken.id,
                onboardingStatus: 'pending',
            });
            await user.save();
            console.log(`API: Created new job_seeker user ${candidateEmail}.`);
        } else {
            console.log(`API: User ${candidateEmail} already exists. Generating code for existing user.`);
            if (!user.firstLogin && user.onboardingStatus !== 'completed') {
                user.firstLogin = true;
                user.onboardingStatus = 'pending';
                await user.save();
            }
        }

        const newReferralCode = new ReferralCodeModel({
            code: generatedCode,
            candidateEmail,
            expiresAt,
            generatedByAdminId: decodedToken.id,
            isUsed: false,
        });
        await newReferralCode.save();
        console.log(`API: Saved new referral code ${generatedCode} to ReferralCode collection.`);

        const loginUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/login`;
        const portalName = process.env.NEXT_PUBLIC_PORTAL_NAME || 'Job Portal'; // Use an env var for portal name
        const teamName = process.env.EMAIL_FROM?.split('<')[0].trim() || 'Job Portal'; // Use env var for team name

        // Format date for email body: 26-Sep-2025
        const formattedExpiryDateForEmail = expiresAt.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).replace(/ /g, '-'); // Replace spaces with hyphens
    const formattedExpiryDate = expiresAt.toDateString(); // e.g., "Fri Sep 26 2025"
        const username = candidateEmail;
        const emailSubject = 'Your Udyog Jagat Portal Access Code!';
        const emailText = `Hello ${username},\n\nAn administrator has generated an exclusive access code for you to log in to Udyog Jagat Portal.\n\nYour Access Code: ${generatedCode}\n\nThis code is valid for 60 days from now (${formattedExpiryDate}) and one time use only.\n\nPlease use it to log in and complete your profile here: ${loginUrl}\n\n${isNewUser ? `Your temporary password is: ${temporaryPassword} (You will be prompted to change this on first login.)\n\n` : ''}We look forward to having you!\n\nUdyog Jagat Team`;

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Your Udyog Jagat Portal Access Code!</title>
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
            background-color: #2563eb;
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
            color: #2563eb;
            text-align: center;
            margin: 20px 0;
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
        <h1>Udyog Jagat Portal Access</h1>
    </div>
    <div class="content">
        <p>Hello <strong>${username}</strong>,</p>
        
        <p>An administrator has generated an exclusive access code for you to log in to Udyog Jagat Portal.</p>
        
        <div class="code">${generatedCode}</div>
        
        <p>This code is valid for 60 days from now (<strong>${formattedExpiryDate}</strong>) and one time use only.</p>
        
        <p>Please use it to <a href="${loginUrl}">log in</a> and complete your profile.</p>
        
        ${isNewUser ? `<p>Your temporary password is: <strong>${temporaryPassword}</strong> (You will be prompted to change this on first login.)</p>` : ''}
        
        <p>We look forward to having you!</p>
        
        <div class="footer">
            <p>Udyog Jagat Team</p>
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