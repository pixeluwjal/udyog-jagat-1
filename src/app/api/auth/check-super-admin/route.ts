// app/api/auth/check-super-admin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import Referrer from '@/models/Referrer';
import { authMiddleware } from '@/lib/authMiddleware';

export async function GET(request: NextRequest) {
  await dbConnect();

  const authResult = await authMiddleware(request);

  if (!authResult.success) {
    console.log('Auth failed:', authResult.message);
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const userId = authResult.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'User ID not found after authentication.' }, { status: 404 });
  }

  try {
    console.log('Checking super admin for user:', userId);
    
    // Check both collections without select and lean
    let user = await User.findById(userId);
    
    if (!user) {
      user = await Referrer.findById(userId);
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found in database.' }, { status: 404 });
    }

    console.log(`[API /auth/check-super-admin] User ${user._id}: role: ${user.role}, isSuperAdmin: ${user.isSuperAdmin}`);

    // Check if user is super admin
    const isSuperAdmin = user.role === 'admin' && user.isSuperAdmin === true;

    // Convert to plain object and remove password
    const userObj = user.toObject();
    delete userObj.password;

    return NextResponse.json({ 
      isSuperAdmin: isSuperAdmin,
      role: isSuperAdmin ? 'super_admin' : user.role,
      user: {
        ...userObj,
        role: isSuperAdmin ? 'super_admin' : user.role
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('API: /api/auth/check-super-admin GET error:', error);
    return NextResponse.json({ error: error.message || 'Server error checking super admin status.' }, { status: 500 });
  }
}