import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ReferralCodeModel from '@/models/ReferralCode';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verifies the JWT from the request headers and checks if the user is an admin.
 * @param requestHeaders The headers object from the incoming request.
 * @returns An object containing the decoded user payload or an error message.
 */
async function verifyAdmin(requestHeaders: Headers): Promise<{ user: any | null, error: string | null }> {
    const authorization = requestHeaders.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
        return { user: null, error: 'Authorization header missing or invalid format' };
    }

    const token = authorization.split(' ')[1];
    if (!token) {
        return { user: null, error: 'Token missing' };
    }

    try {
        if (!JWT_SECRET) {
            throw new Error('JWT_SECRET environment variable is not defined.');
        }
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
    console.log('\n--- API: /api/admin/referral-codes GET - Request received ---');

    const { error: authError } = await verifyAdmin(headers());
    if (authError) {
        return NextResponse.json({ error: authError }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const statusFilter = searchParams.get('status');
        const generatedByAdminIdFilter = searchParams.get('generatedByAdminId');
        
        const query: any = {};
        const now = new Date();

        if (generatedByAdminIdFilter && generatedByAdminIdFilter !== 'all') {
            query.generatedByAdminId = generatedByAdminIdFilter;
        }

        // CORRECTED: Apply status filter logic to the Mongoose query
        if (statusFilter === 'used and valid') {
            query.isUsed = true;
            query.expiresAt = { $gte: now };
        } else if (statusFilter === 'used and expired') {
            query.isUsed = true;
            query.expiresAt = { $lt: now };
        } else if (statusFilter === 'unused and expired') {
            query.isUsed = false;
            query.expiresAt = { $lt: now };
        } else if (statusFilter === 'unused and valid') {
            query.isUsed = false;
            query.expiresAt = { $gte: now };
        }

        const referralCodes = await ReferralCodeModel.find(query)
            .populate({
                path: 'generatedByAdminId',
                select: 'username'
            })
            .sort({ createdAt: -1 })
            .lean();

        const transformedCodes = referralCodes.map(code => {
            const referrerUsername = (code.generatedByAdminId as any)?.username || 'Unknown Admin';
            const isExpired = new Date(code.expiresAt) < now;
            let status = '';

            if (code.isUsed) {
                status = isExpired ? 'used and expired' : 'used and valid';
            } else {
                status = isExpired ? 'unused and expired' : 'unused and valid';
            }

            return {
                ...code,
                generatedByAdminUsername: referrerUsername,
                status: status
            };
        });

        return NextResponse.json({ referralCodes: transformedCodes }, { status: 200 });
    } catch (error: any) {
        console.error('Error fetching referral codes:', error);
        return NextResponse.json({ error: 'Failed to fetch referral codes', details: error.message }, { status: 500 });
    }
}
