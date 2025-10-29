// app/api/profile/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import ReferrerModel from '@/models/Referrer'; // Import the Referrer model
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Helper function to verify token
const verifyToken = (req: Request) => {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
        return { error: 'Authorization header missing', status: 401 };
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return { error: 'Token missing', status: 401 };
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id?: string; userId?: string; _id?: string; email: string; username: string; role: string; iat: number; exp: number };

        const userIdFromToken = decoded.id || decoded.userId || decoded._id;

        console.log('Server-side: Token decoded successfully.');
        console.log('Server-side: Extracted User ID from token:', userIdFromToken);
        console.log('Server-side: User role from token:', decoded.role);

        if (!userIdFromToken) {
            console.error("Server-side: User ID (id, userId, or _id) is missing in the decoded token payload.");
            return { error: 'User ID missing in token', status: 403 };
        }

        if (decoded.exp < Date.now() / 1000) {
            return { error: 'Token expired', status: 403 };
        }

        return { decodedUserId: userIdFromToken, userRole: decoded.role, status: 200 };
    } catch (err) {
        console.error('Server-side: Token verification failed:', err);
        return { error: 'Invalid or expired token', status: 403 };
    }
};

export async function GET(req: Request) {
    await dbConnect();

    const tokenVerification = verifyToken(req);
    if (tokenVerification.error) {
        return NextResponse.json({ error: tokenVerification.error }, { status: tokenVerification.status });
    }
    const { decodedUserId, userRole } = tokenVerification;

    try {
        // Choose the correct model based on user role
        let user;
        if (userRole === 'job_referrer') {
            user = await ReferrerModel.findById(decodedUserId).select('-password');
        } else {
            user = await User.findById(decodedUserId).select('-password');
        }
        
        if (!user) {
            console.warn(`Server-side: User with ID ${decodedUserId} not found in DB.`);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        console.log(`Server-side: Profile data fetched for user: ${user.username}`);
        return NextResponse.json({ user }, { status: 200 });
    } catch (error) {
        console.error('Server-side: Error fetching user profile:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    await dbConnect();

    const tokenVerification = verifyToken(req);
    if (tokenVerification.error) {
        return NextResponse.json({ error: tokenVerification.error }, { status: tokenVerification.status });
    }
    const { decodedUserId, userRole } = tokenVerification;

    try {
        const body = await req.json();

        console.log('Server-side: Received update data:', body);
        console.log('Server-side: User role:', userRole);

        // FIXED: Updated allowedFields to include all possible fields
        const allowedFields = [
            'username', 
            'milan', 
            'valaya', 
            'khanda', 
            'vibhaaga'
        ];

        // Add referrer-specific fields if user is a referrer
        if (userRole === 'job_referrer') {
            allowedFields.push('referrerDetails', 'workDetails');
        }

        const updateData: { [key: string]: any } = {};
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        }

        // Handle nested referrer details
        if (userRole === 'job_referrer') {
            if (body.fullName || body.mobileNumber || body.personalEmail || body.residentialAddress) {
                updateData.referrerDetails = {
                    ...(body.fullName && { fullName: body.fullName }),
                    ...(body.mobileNumber && { mobileNumber: body.mobileNumber }),
                    ...(body.personalEmail && { personalEmail: body.personalEmail }),
                    ...(body.residentialAddress && { residentialAddress: body.residentialAddress })
                };
            }

            // Handle nested work details
            if (body.companyName || body.workLocation || body.designation) {
                updateData.workDetails = {
                    ...(body.companyName && { companyName: body.companyName }),
                    ...(body.workLocation && { workLocation: body.workLocation }),
                    ...(body.designation && { designation: body.designation })
                };
            }
        }

        if (body.email) {
            const currentUser = userRole === 'job_referrer' 
                ? await ReferrerModel.findById(decodedUserId).select('email')
                : await User.findById(decodedUserId).select('email');
                
            if (currentUser && body.email !== currentUser.email) {
                return NextResponse.json({ error: "Email cannot be changed directly via profile update." }, { status: 400 });
            }
        }

        if (body.role) {
            return NextResponse.json({ error: "User role cannot be changed directly." }, { status: 400 });
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No valid fields provided for update.' }, { status: 400 });
        }

        console.log(`Server-side: Attempting to update user ${decodedUserId} with data:`, updateData);

        // Choose the correct model based on user role
        let updatedUser;
        if (userRole === 'job_referrer') {
            updatedUser = await ReferrerModel.findByIdAndUpdate(
                decodedUserId,
                { $set: updateData },
                { new: true, runValidators: true }
            ).select('-password');
        } else {
            updatedUser = await User.findByIdAndUpdate(
                decodedUserId,
                { $set: updateData },
                { new: true, runValidators: true }
            ).select('-password');
        }

        if (!updatedUser) {
            console.error(`Server-side: Failed to find and update user with ID ${decodedUserId}.`);
            return NextResponse.json({ error: 'User not found or update failed.' }, { status: 404 });
        }

        console.log(`Server-side: Profile updated successfully for user: ${updatedUser.username}`);
        return NextResponse.json({ 
            message: 'Profile updated successfully', 
            user: updatedUser 
        }, { status: 200 });

    } catch (error: any) {
        console.error('Server-side: Error updating user profile:', error);
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map((err: any) => err.message);
            return NextResponse.json({ error: errors.join(', ') }, { status: 400 });
        }
        if (error.code === 11000) {
            return NextResponse.json({ error: 'Username is already taken. Please choose a different one.' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Internal server error during profile update.' }, { status: 500 });
    }
}