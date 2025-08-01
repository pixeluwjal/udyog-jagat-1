import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
import { DecodedToken } from '@/lib/authMiddleware';

export async function GET(request: NextRequest) {
  await dbConnect();
  console.log('\n--- API: /api/admin/users GET - Request received ---');

  // 1. Authenticate and Authorize Admin
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    console.warn('API: Fetch users failed: No token provided or invalid format.');
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

    // Only admins (including super admins) can fetch users
    if (decodedToken.role !== 'admin') {
      console.warn(`API: Fetch users failed: User ${decodedToken.id} (Role: ${decodedToken.role}) is not an admin.`);
      return NextResponse.json(
        { error: 'Forbidden - Only administrators can fetch users.' },
        { status: 403 }
      );
    }
    console.log('API: Admin user authenticated for fetching users:', decodedToken.id);

  } catch (error: unknown) {
    console.warn('API: Fetch users failed: Invalid token.', error);
    let errorMessage = 'Unauthorized - Invalid token.';
    if (error instanceof Error) {
        errorMessage = `Unauthorized - Invalid token: ${error.message}`;
    }
    return NextResponse.json(
      { error: errorMessage },
      { status: 401 }
    );
  }

  // 2. Extract Query Parameters
  const searchParams = request.nextUrl.searchParams;
  const searchQuery = searchParams.get('search');
  const createdById = searchParams.get('createdBy');
  const statusFilter = searchParams.get('status'); // Get status filter

  // 3. Build Query Object for Mongoose
  const query: any = {};

  // Apply status filter - FIXED: Using 'status' field instead of 'isActive'
  if (statusFilter === 'active') {
    query.status = 'active';
    console.log('API: Applying status filter: Active users.');
  } else if (statusFilter === 'inactive') {
    query.status = 'inactive';
    console.log('API: Applying status filter: Inactive users.');
  } else {
    // If no specific status filter is provided, fetch all users
    // If you want to default to 'active' users, change this line:
    // query.status = 'active';
    console.log('API: No status filter provided. Fetching all users.');
  }

  if (createdById) {
    // If a specific createdBy ID is requested
    if (!decodedToken.isSuperAdmin && createdById !== decodedToken.id) {
      // Regular admin trying to view users not created by themselves
      console.warn(`API: Regular admin ${decodedToken.id} attempted to fetch users created by ${createdById}. Forbidden.`);
      return NextResponse.json({ error: 'Forbidden - You can only view users you have created.' }, { status: 403 });
    }
    query.createdBy = createdById;
    console.log(`API: Applying createdBy filter: ${createdById}`);
  } else {
    // If no specific createdBy ID is requested, apply existing role logic
    // The 'all' parameter from the frontend will override this if present.
    // Ensure that if 'all' is true, this role filter is NOT applied.
    if (!decodedToken.isSuperAdmin && !request.nextUrl.searchParams.get('all')) {
      query.role = { $ne: 'admin' }; // Exclude admin users unless 'all' is explicitly requested by a super admin
    }
  }

  if (searchQuery) {
    // Use regex for case-insensitive search on email or username
    const searchRegex = new RegExp(searchQuery, 'i');
    query.$or = [
      { email: searchRegex },
      { username: searchRegex },
    ];
    console.log(`API: Applying search filter: ${searchQuery}`);
  }

  try {
    // 4. Fetch Users based on the constructed query
    const users = await User.find(query).select('-password'); // Exclude password from results
    console.log(`API: Fetched ${users.length} users.`);

    return NextResponse.json(
      { message: 'Users fetched successfully', users },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('API: Error fetching users:', error);
    let errorMessage = 'Server error fetching users.';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
