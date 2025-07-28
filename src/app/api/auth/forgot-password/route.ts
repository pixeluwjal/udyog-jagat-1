// app/api/auth/forgot-password/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import PasswordResetToken from '@/models/PasswordResetToken'; // Import the new model
import sendEmail from '@/lib/emailservice'; // Assuming you have this service
import crypto from 'crypto'; // Node.js built-in module for cryptographic functions

export async function POST(request: Request) {
    await dbConnect();
    console.log('\n--- API: /api/auth/forgot-password POST - Request received ---');

    try {
        const { email } = await request.json();
        console.log(`API: Forgot password request for email: ${email}`);

        if (!email) {
            return NextResponse.json({ message: 'Email is required.' }, { status: 400 });
        }

        const user = await User.findOne({ email });

        // IMPORTANT SECURITY NOTE: Always respond with a generic message
        // to prevent email enumeration attacks (revealing if an email exists).
        if (!user) {
            console.log(`API: User with email ${email} not found. Sending generic success message.`);
            return NextResponse.json(
                { message: 'If an account with that email exists, a password reset link has been sent.' },
                { status: 200 }
            );
        }

        // Delete any existing password reset tokens for this user
        await PasswordResetToken.deleteMany({ userId: user._id });
        console.log(`API: Deleted existing password reset tokens for user ${user._id}.`);

        // Generate a new unique token
        const resetToken = crypto.randomBytes(32).toString('hex'); // Generate a random hex string
        const expiresAt = new Date(Date.now() + 3600000); // Token valid for 1 hour (3600000 ms)

        const newPasswordResetToken = new PasswordResetToken({
            userId: user._id,
            token: resetToken,
            expiresAt,
        });
        await newPasswordResetToken.save();
        console.log(`API: New password reset token generated and saved for user ${user._id}.`);

        // Construct the reset link using request.nextUrl.origin for dynamic base URL
        const { origin } = new URL(request.url); // Extract origin from the request URL
        const resetLink = `${origin}/reset-password?token=${resetToken}`;
        
        const portalName = process.env.NEXT_PUBLIC_PORTAL_NAME || 'Job Portal';
        const teamName = process.env.EMAIL_FROM?.split('<')[0].trim() || 'Job Portal Team';

        const emailSubject = `Password Reset Request for Your ${portalName} Account`;
        const emailText = `Hello ${user.username || user.email},\n\nYou have requested to reset the password for your ${portalName} account. Please click on the link below to reset your password:\n\n${resetLink}\n\nThis link is valid for 1 hour. If you did not request a password reset, please ignore this email.\n\nThank you,\nThe ${teamName}`;
        const emailHtml = `
            <p>Hello <strong>${user.username || user.email}</strong>,</p>
            <p>You have requested to reset the password for your ${portalName} account. Please click on the link below to reset your password:</p>
            <p><a href="${resetLink}" style="color: #1a73e8; text-decoration: none;">Reset Your Password</a></p>
            <p>This link is valid for <strong>1 hour</strong>. If you did not request a password reset, please ignore this email.</p>
            <p>Thank you,</p>
            <p>The ${teamName}</p>
        `;

        // Send the email
        try {
            await sendEmail({
                to: user.email,
                subject: emailSubject,
                text: emailText,
                html: emailHtml,
            });
            console.log(`API: Password reset email sent successfully to ${user.email}.`);
        } catch (emailError: any) {
            console.error(`API: Failed to send password reset email to ${user.email}:`, emailError);
            // Log the error but still send generic success to frontend
        }

        return NextResponse.json(
            { message: 'If an account with that email exists, a password reset link has been sent.' },
            { status: 200 }
        );

    } catch (error: unknown) {
        console.error('API: Forgot password general error:', error);
        let errorMessage = 'An unexpected server error occurred.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json({ message: errorMessage }, { status: 500 });
    }
}
