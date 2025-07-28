// app/api/auth/reset-password/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import PasswordResetToken from '@/models/PasswordResetToken';
import bcrypt from 'bcryptjs'; // For hashing new password

export async function POST(request: Request) {
    await dbConnect();
    console.log('\n--- API: /api/auth/reset-password POST - Request received ---');

    try {
        const { token, newPassword } = await request.json();
        console.log(`API: Password reset request received for token: ${token ? 'present' : 'missing'}`);

        if (!token || !newPassword) {
            return NextResponse.json({ message: 'Token and new password are required.' }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return NextResponse.json({ message: 'Password must be at least 8 characters long.' }, { status: 400 });
        }

        // Find the password reset token
        const resetTokenDoc = await PasswordResetToken.findOne({ token });

        if (!resetTokenDoc) {
            console.warn(`API: Password reset token not found or already used: ${token}`);
            return NextResponse.json({ message: 'Invalid or expired password reset token.' }, { status: 400 });
        }

        // Check if the token has expired
        if (resetTokenDoc.expiresAt < new Date()) {
            console.warn(`API: Password reset token expired for user ${resetTokenDoc.userId}.`);
            await PasswordResetToken.deleteOne({ _id: resetTokenDoc._id }); // Clean up expired token
            return NextResponse.json({ message: 'Password reset token has expired. Please request a new one.' }, { status: 400 });
        }

        // Find the user associated with the token
        const user = await User.findById(resetTokenDoc.userId);

        if (!user) {
            console.error(`API: User not found for reset token userId: ${resetTokenDoc.userId}.`);
            await PasswordResetToken.deleteOne({ _id: resetTokenDoc._id }); // Invalidate token if user not found
            return NextResponse.json({ message: 'User not found for this token.' }, { status: 404 });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user's password and reset firstLogin flag if applicable
        user.password = hashedPassword;
        user.firstLogin = false; // Ensure firstLogin is false after password reset
        await user.save();
        console.log(`API: Password successfully reset for user ${user._id}.`);

        // Delete the used password reset token to prevent reuse
        await PasswordResetToken.deleteOne({ _id: resetTokenDoc._id });
        console.log(`API: Password reset token deleted after successful use.`);

        return NextResponse.json({ message: 'Password has been reset successfully.' }, { status: 200 });

    } catch (error: unknown) {
        console.error('API: Reset password general error:', error);
        let errorMessage = 'An unexpected server error occurred during password reset.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json({ message: errorMessage }, { status: 500 });
    }
}
