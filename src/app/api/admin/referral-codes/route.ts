// app/api/admin/referral-codes/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ReferralCodeModel from '@/models/ReferralCode';
import User from '@/models/User'; // Import User model to populate
import jwt from 'jsonwebtoken';
import { headers } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

async function verifyAdmin(requestHeaders: Headers): Promise<{ user: any | null, error: string | null }> {
    const authorization = requestHeaders.get('authorization');
    if (!authorization) {
        return { user: null, error: 'Authorization header missing' };
    }

    const token = authorization.split(' ')[1];
    if (!token) {
        return { user: null, error: 'Token missing' };
    }

    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            return { user: null, error: 'Unauthorized: Not an admin' };
        }
        return { user: decoded, error: null };
    } catch (err) {
        console.error('JWT verification error:', err);
        return { user: null, error: 'Invalid or expired token' };
    }
}

export async function GET(request: Request) {
    await dbConnect();

    const { user: adminUser, error: authError } = await verifyAdmin(headers());
    if (authError) {
        return NextResponse.json({ error: authError }, { status: 401 });
    }

    try {
        // Parse URL parameters for status filter
        const { searchParams } = new URL(request.url);
        const statusFilter = searchParams.get('status'); // 'all', 'used', 'expired', 'not_expired_unused'

        const query: any = { generatedByAdminId: adminUser.id };
        const now = new Date();

        if (statusFilter === 'used') {
            query.isUsed = true;
        } else if (statusFilter === 'expired') {
            query.expiresAt = { $lt: now }; // Less than current date
            query.isUsed = false; // Only unused codes that are expired
        } else if (statusFilter === 'not_expired_unused') {
            query.expiresAt = { $gte: now }; // Greater than or equal to current date
            query.isUsed = false;
        }
        // If statusFilter is 'all' or null, no additional filters are applied

        const referralCodes = await ReferralCodeModel.find(query)
            .populate({
                path: 'generatedByAdminId',
                select: 'username' // Only select the username of the admin
            })
            .sort({ createdAt: -1 })
            .lean();

        // Map and clean up populated data for the client
        const transformedCodes = referralCodes.map(code => {
            const referrerUsername = (code.generatedByAdminId as any)?.username || 'Unknown Admin';
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
                ...code,
                generatedByAdminUsername: referrerUsername, // Add this new field
                status: status // Add the calculated status
            };
        });

        return NextResponse.json({ referralCodes: transformedCodes }, { status: 200 });
    } catch (error: any) {
        console.error('Error fetching referral codes:', error);
        return NextResponse.json({ error: 'Failed to fetch referral codes', details: error.message }, { status: 500 });
    }
}