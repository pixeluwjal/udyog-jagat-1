// app/api/referrer/referral-codes/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ReferralCodeModel from '@/models/ReferralCode';
import User from '@/models/User'; // Import User model to populate
import jwt from 'jsonwebtoken';
import { headers } from 'next/headers';

// Define a type for the decoded JWT token for better type safety
interface DecodedToken {
    id: string;
    email: string;
    role: string;
    // Add any other properties that might be in your JWT payload
}

const JWT_SECRET = process.env.JWT_SECRET; // JWT_SECRET should always be defined in production

async function verifyReferrer(requestHeaders: Headers): Promise<{ user: DecodedToken | null, error: string | null }> {
    const authorization = requestHeaders.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
        console.warn('API: Referral codes fetch failed: No token provided or invalid format.');
        return { user: null, error: 'Unauthorized - No token provided or invalid format.' };
    }

    const token = authorization.split(' ')[1];
    if (!token) {
        console.warn('API: Referral codes fetch failed: Token missing after Bearer.');
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
            console.warn(`API: Fetch referral codes failed: User ${decoded.id} (Role: ${decoded.role}) is not a job_referrer.`);
            return { user: null, error: 'Forbidden - Only job referrers can view their referral codes.' };
        }
        console.log('API: Job Referrer authenticated for fetching referral codes:', decoded.id);
        return { user: decoded, error: null };
    } catch (err: unknown) {
        console.warn('API: Fetch referral codes failed: Invalid token.', err);
        let errorMessage = 'Unauthorized - Invalid token.';
        if (err instanceof Error) {
            errorMessage = `Unauthorized - Invalid token: ${err.message}`;
        }
        return { user: null, error: errorMessage };
    }
}

export async function GET(request: Request) {
    await dbConnect();
    console.log('\n--- API: /api/referrer/referral-codes GET - Request received ---');

    const { user: referrerUser, error: authError } = await verifyReferrer(headers());
    if (authError) {
        return NextResponse.json({ error: authError }, { status: 401 });
    }

    try {
        // Parse URL parameters for status filter
        const { searchParams } = new URL(request.url);
        const statusFilter = searchParams.get('status'); // 'all', 'used', 'expired', 'not_expired_unused'

        // IMPORTANT: Filter by the current referrer's ID
        const query: any = { generatedByAdminId: referrerUser?.id };
        const now = new Date();

        if (statusFilter === 'used') {
            query.isUsed = true;
        } else if (statusFilter === 'expired') {
            query.expiresAt = { $lt: now }; // Less than current date (past)
            query.isUsed = false; // Only unused codes that are expired
        } else if (statusFilter === 'not_expired_unused') {
            query.expiresAt = { $gte: now }; // Greater than or equal to current date (future or present)
            query.isUsed = false;
        }
        // If statusFilter is 'all' or null, no additional filters are applied besides generatedByAdminId

        const referralCodes = await ReferralCodeModel.find(query)
            .populate({
                path: 'generatedByAdminId', // This field still points to the User who generated it
                select: 'username' // Select the username of the referrer
            })
            .sort({ createdAt: -1 }) // Sort by creation date, newest first
            .lean(); // Use .lean() for better performance as we are not modifying the documents

        // Map and clean up populated data for the client, adding derived status
        const transformedCodes = referralCodes.map(code => {
            // Ensure generatedByAdminId is handled correctly when populated or not
            const referrerUsername = (code.generatedByAdminId as any)?.username || 'Unknown Referrer';
            const isExpired = new Date(code.expiresAt) < now;
            let status = '';

            if (code.isUsed) {
                status = 'Already Used';
            } else if (isExpired) {
                status = 'Unused and Expired';
            } else {
                status = 'Unused and Not Expired';
            }

            return {
                ...code, // Spread the original code properties
                _id: code._id.toString(), // Convert ObjectId to string for client-side use
                generatedByAdminId: (code.generatedByAdminId as any)?._id?.toString() || null, // Convert populated ID to string
                generatedByAdminUsername: referrerUsername, // Add this new field
                status: status, // Add the calculated status
                createdAt: code.createdAt.toISOString(), // Convert Date to ISO string
                updatedAt: code.updatedAt.toISOString(), // Convert Date to ISO string
                expiresAt: code.expiresAt.toISOString(), // Convert Date to ISO string
            };
        });

        console.log(`API: Successfully fetched ${transformedCodes.length} referral codes for referrer ${referrerUser?.id}.`);
        return NextResponse.json({ referralCodes: transformedCodes }, { status: 200 });
    } catch (error: unknown) {
        console.error('API: Error fetching referrer referral codes:', error);
        let errorMessage = 'Failed to fetch referral codes.';
        if (error instanceof Error) {
            errorMessage = `Failed to fetch referral codes: ${error.message}`;
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
