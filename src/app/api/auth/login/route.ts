import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User, { IUser } from '@/models/User';
import ReferralCodeModel, { IReferralCode } from '@/models/ReferralCode';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
    await dbConnect();
    console.log('\n--- API: /api/auth/login - Request received ---');

    try {
        // The request body now only needs email and password
        const { email, password: rawPassword } = await request.json();
        const password = rawPassword ? String(rawPassword).trim() : '';

        console.log(`API: Attempting login for email: ${email}`);

        // 1. Find user by email and explicitly select password, status, and firstLogin
        const user: (IUser & { password?: string }) | null = await User.findOne({ email }).select('+password +status +firstLogin +role');
        if (!user) {
            console.warn(`API: Login failed for email ${email}: User not found.`);
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // 2. Compare provided password with hashed password
        const isMatch = await bcrypt.compare(password, user.password || '');
        if (!isMatch) {
            console.warn(`API: Login failed for email ${email}: Incorrect password.`);
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Check if user account is inactive
        if (user.status === 'inactive') {
            console.warn(`API: Login failed for email ${email}: User account is inactive.`);
            return NextResponse.json({ error: 'Your account is inactive. Please contact support.' }, { status: 403 });
        }

        const now = new Date();

        // --- CORRECTED LOGIC: Check referral code only for 'job_seeker' role ---
        if (user.role === 'job_seeker') {
            if (user.firstLogin) {
                console.log(`API: User ${email} is a first-time job seeker. Automatically validating referral code...`);

                // Find an unused, unexpired referral code for this specific candidate email
                const codeDocument: IReferralCode | null = await ReferralCodeModel.findOne({
                    candidateEmail: email,
                    isUsed: false,
                    expiresAt: { $gte: now },
                });
                
                // If a valid code is not found, block the login
                if (!codeDocument) {
                    console.warn(`API: First-time login blocked for ${email}: No valid, unused referral code found.`);
                    return NextResponse.json({ error: 'A valid referral code is required for your first login.' }, { status: 400 });
                }

                // If a valid code is found, mark it as used and update user's firstLogin status
                codeDocument.isUsed = true;
                codeDocument.usedBy = user._id; // Link to the user who used it
                codeDocument.usedAt = now;
                await codeDocument.save();
                
                // CRITICAL FIX: Keep user.firstLogin = true. It will be set to false after password change.
                await user.save();
                
                console.log(`API: First-time login for ${user.email} successful. Referral code ${codeDocument.code} marked as used.`);
            } else {
                // This is a returning user. Check the validity of their original referral code.
                console.log(`API: User ${email} is a returning job seeker. Checking their linked referral code for expiration...`);

                const codeDocument: IReferralCode | null = await ReferralCodeModel.findOne({ usedBy: user._id });

                if (codeDocument) {
                    if (codeDocument.expiresAt < now) {
                        console.warn(`API: Login failed for ${email}: Linked referral code ${codeDocument.code} has expired.`);
                        return NextResponse.json({ error: 'Your referral code has expired, and access is now revoked.' }, { status: 400 });
                    }
                    console.log(`API: User's linked referral code ${codeDocument.code} is still valid. Login proceeding.`);
                } else {
                    console.log(`API: User ${email} is a job seeker without a linked referral code. Login proceeding.`);
                }
            }
        } else {
            console.log(`API: User ${email} is not a job seeker (Role: ${user.role}). Bypassing referral code check.`);
        }

        // 3. Generate JWT Token
        if (!process.env.JWT_SECRET) {
            console.error('API: JWT_SECRET is not defined in environment variables. Server configuration error.');
            return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
        }

        const token = jwt.sign(
            {
                id: user._id.toString(),
                email: user.email,
                username: user.username,
                role: user.role,
                firstLogin: user.firstLogin,
                isSuperAdmin: user.isSuperAdmin,
                onboardingStatus: user.onboardingStatus,
                status: user.status || 'active', // Include status, default to 'active' if not present
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' } // Token expires in 1 day
        );
        console.log(`API: Token generated for user: ${user.email}`);

        // 4. Prepare User Object for Response (exclude password)
        const responseUser = {
            _id: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role,
            firstLogin: user.firstLogin,
            isSuperAdmin: user.isSuperAdmin,
            onboardingStatus: user.onboardingStatus,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            status: user.status || 'active', // Ensure status is included in the response, default if missing
        };
        console.log(`API: Login successful for user: ${user.email}, firstLogin: ${user.firstLogin}, onboardingStatus: ${user.onboardingStatus}, status: ${user.status}`);

        // 5. Return success response with token and user data
        return NextResponse.json(
            { message: 'Login successful', token, user: responseUser },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('API: Login error:', error);
        let errorMessage = 'Server error during login.';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
