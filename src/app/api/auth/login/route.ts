// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User, { IUser } from '@/models/User';
import ReferralCodeModel, { IReferralCode } from '@/models/ReferralCode'; // Import ReferralCode model
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
    await dbConnect();
    console.log('\n--- API: /api/auth/login - Request received ---');

    try {
        const { email, password: rawPassword } = await request.json();
        const password = rawPassword ? String(rawPassword).trim() : '';

        console.log(`API: Attempting login for email: ${email}`);
        console.log(`API: Provided password (raw - trimmed): '${password}'`);

        // 1. Find user by email and explicitly select password
        const user: (IUser & { password?: string }) | null = await User.findOne({ email }).select('+password');
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

        // NEW LOGIC: Automatically find and update referral code based on the logged-in user's email
        try {
            const now = new Date();
            // Find an unused, unexpired referral code specifically generated for this candidate email
            // We'll find one and update it. If multiple exist, the first one found will be used.
            // You might want to sort by createdAt to update the oldest one first, but findOne is simpler.
            const referralCodeDoc: IReferralCode | null = await ReferralCodeModel.findOne({
                candidateEmail: email,
                isUsed: false, // Must be unused
                expiresAt: { $gte: now } // Must not be expired
            });

            if (referralCodeDoc) {
                // Mark the referral code as used by this user
                referralCodeDoc.isUsed = true;
                referralCodeDoc.usedBy = user._id; // Link to the user who used it
                referralCodeDoc.usedAt = now;
                await referralCodeDoc.save();
                console.log(`API: Referral code ${referralCodeDoc.code} for user ${user.email} marked as used.`);

                // Optional: If using the code implies onboarding completion, update user status
                // if (user.onboardingStatus === 'pending') {
                //     user.onboardingStatus = 'completed';
                //     await user.save();
                //     console.log(`API: User ${user.email} onboarding status updated to 'completed' after code usage.`);
                // }
            } else {
                console.log(`API: No valid, unused, unexpired referral code found for ${user.email}.`);
            }
        } catch (referralUpdateError) {
            console.error(`API: Error updating referral code for user ${user.email}:`, referralUpdateError);
            // Do not block login due to referral code update failure, but log it.
        }

        // 3. Generate JWT Token (rest of your existing logic)
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
        };
        console.log(`API: Login successful for user: ${user.email}, firstLogin: ${user.firstLogin}, onboardingStatus: ${user.onboardingStatus}`);

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