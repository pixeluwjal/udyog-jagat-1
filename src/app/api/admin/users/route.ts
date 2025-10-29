import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import ReferralCodeModel, { IReferralCode } from '@/models/ReferralCode';
import jwt from 'jsonwebtoken';
import { headers } from 'next/headers';

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

export async function GET(request: NextRequest) {
    await dbConnect();
    console.log('\n--- API: /api/admin/users GET - Request received ---');

    const { error: authError } = await verifyAdmin(headers());
    if (authError) {
        return NextResponse.json({ error: authError }, { status: 401 });
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const searchQuery = searchParams.get('search') || '';
        const createdById = searchParams.get('createdBy');
        const statusFilter = searchParams.get('status') || 'all';
        const rolesParam = searchParams.get('roles');
        const allUsers = searchParams.get('all'); // Check if we want all users including admins

        const query: any = {};
        const now = new Date();

        if (rolesParam) {
            const rolesArray = rolesParam.split(',');
            query.role = { $in: rolesArray };
        }

        // FIX: Include super admins in the query by not filtering them out
        if (createdById) {
            if (rolesParam || (!rolesParam && !allUsers && query.role?.['$ne'] !== 'admin')) {
                query.createdBy = createdById;
            }
        } else if (!rolesParam && !allUsers && query.role?.['$ne'] !== 'admin') {
            // Only apply this filter if we're not specifically asking for all users
            query.role = { $ne: 'admin' };
        }
        
        // Apply search query to the database fetch for better performance
        if (searchQuery) {
            const searchRegex = new RegExp(searchQuery, 'i');
            query.$or = [
                { email: searchRegex },
                { username: searchRegex },
            ];
        }

        console.log('🟡 Database query:', query);

        // FIX: Include isSuperAdmin field in the select
        const users = await User.find(query).select('_id username email role status firstLogin isSuperAdmin createdAt lastActive').lean();
        console.log(`API: Fetched ${users.length} users with initial query filters.`);
        
        // Debug: Log the raw data from database
        console.log('🔍 Raw users data from DB:', users.map(user => ({
            email: user.email,
            role: user.role,
            isSuperAdmin: user.isSuperAdmin,
            hasIsSuperAdmin: 'isSuperAdmin' in user
        })));

        // Dynamically update status for job seekers based on referral code expiration
        const usersWithDynamicStatus = await Promise.all(users.map(async (user: any) => {
            let userStatus = user.status || 'active'; // Default to active

            // Check only for job seekers
            if (user.role === 'job_seeker') {
                const codeDocument: IReferralCode | null = await ReferralCodeModel.findOne({ candidateEmail: user.email });
                if (codeDocument && codeDocument.expiresAt < now) {
                    userStatus = 'inactive';
                }
            }
            
            // Return user object with the dynamically updated status
            return { 
                ...user, 
                status: userStatus,
                // Ensure isSuperAdmin is properly included
                isSuperAdmin: user.isSuperAdmin || false
            };
        }));

        // Filter based on the dynamic status before returning the final list
        const filteredUsers = usersWithDynamicStatus.filter(user => {
            return statusFilter === 'all' || user.status === statusFilter;
        });

        console.log(`API: Successfully retrieved ${filteredUsers.length} users after processing.`);
        
        // Final debug log
        console.log('✅ Final users data being returned:', filteredUsers.map(user => ({
            email: user.email,
            role: user.role,
            isSuperAdmin: user.isSuperAdmin
        })));
        
        return NextResponse.json({ users: filteredUsers }, { status: 200 });

    } catch (error: any) {
        console.error('API: Error fetching users:', error);
        return NextResponse.json({ error: 'Failed to fetch users', details: error.message }, { status: 500 });
    }
}
