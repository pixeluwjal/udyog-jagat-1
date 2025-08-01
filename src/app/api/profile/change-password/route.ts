// app/api/profile/change-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DecodedToken } from '@/lib/authMiddleware'; // Assuming authMiddleware defines DecodedToken

export async function PUT(request: NextRequest) {
    await dbConnect();
    console.log('\n--- API: /api/profile/change-password PUT - Request received ---');

    // 1. Authenticate User
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        console.warn('API: Change password failed: No token provided or invalid format.');
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
        console.log('API: User authenticated for password change:', decodedToken.id);

    } catch (error: unknown) {
        console.warn('API: Change password failed: Invalid token.', error);
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
        const { currentPassword, newPassword } = await request.json();

        // 2. Validate input
        if (!currentPassword || !newPassword) {
            console.warn('API: Change password failed: Missing current or new password.');
            return NextResponse.json({ error: 'Current password and new password are required.' }, { status: 400 });
        }

        if (newPassword.length < 6) {
            console.warn('API: Change password failed: New password too short.');
            return NextResponse.json({ error: 'New password must be at least 6 characters long.' }, { status: 400 });
        }

        // 3. Find user by ID and explicitly select password
        const user = await User.findById(decodedToken.id).select('+password');
        if (!user) {
            console.warn(`API: Change password failed: User ${decodedToken.id} not found.`);
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        // 4. Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password || '');
        if (!isMatch) {
            console.warn(`API: Change password failed for user ${decodedToken.id}: Incorrect current password.`);
            return NextResponse.json({ error: 'Incorrect current password.' }, { status: 401 });
        }

        // 5. Hash new password and update
        user.password = newPassword; // Mongoose pre-save hook will hash this
        user.firstLogin = false; // Mark firstLogin as false after password change
        await user.save(); // This will trigger the pre-save hook to hash the new password

        console.log(`API: Password successfully changed for user: ${decodedToken.id}`);
        return NextResponse.json({ message: 'Password changed successfully.' }, { status: 200 });

    } catch (error: any) {
        console.error('API: Change password error:', error);
        let errorMessage = 'Server error during password change.';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
