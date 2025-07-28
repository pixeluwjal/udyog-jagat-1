// app/api/user/profile/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
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
        // Attempt to decode the token.
        // **CRITICAL CHANGE HERE: Added 'id?: string;' to the type**
        const decoded = jwt.verify(token, JWT_SECRET) as { id?: string; userId?: string; _id?: string; email: string; username: string; role: string; iat: number; exp: number };

        // **CRITICAL CHANGE HERE: Prioritize 'decoded.id'**
        const userIdFromToken = decoded.id || decoded.userId || decoded._id;

        console.log('Server-side: Token decoded successfully.');
        console.log('Server-side: Decoded payload:', decoded); // Log the full decoded payload
        console.log('Server-side: Extracted User ID from token:', userIdFromToken); // Log the extracted ID

        if (!userIdFromToken) {
            console.error("Server-side: User ID (id, userId, or _id) is missing in the decoded token payload.");
            return { error: 'User ID missing in token', status: 403 };
        }

        // Check if token is expired
        if (decoded.exp < Date.now() / 1000) {
            return { error: 'Token expired', status: 403 };
        }

        // Return the extracted userIdFromToken
        return { decodedUserId: userIdFromToken, status: 200 };
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
    const { decodedUserId } = tokenVerification;

    try {
        const user = await User.findById(decodedUserId).select('-password');
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
    const { decodedUserId } = tokenVerification;

    try {
        const body = await req.json();

        const allowedFields = ['username'];

        const updateData: { [key: string]: any } = {};
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        }

        if (body.email) {
            const currentUser = await User.findById(decodedUserId).select('email');
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

        const updatedUser = await User.findByIdAndUpdate(
            decodedUserId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            console.error(`Server-side: Failed to find and update user with ID ${decodedUserId}.`);
            return NextResponse.json({ error: 'User not found or update failed.' }, { status: 404 });
        }

        console.log(`Server-side: Profile updated successfully for user: ${updatedUser.username}`);
        return NextResponse.json({ message: 'Profile updated successfully', user: updatedUser }, { status: 200 });

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