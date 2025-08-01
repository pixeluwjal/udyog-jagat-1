import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect'; // Assuming you have a dbConnect utility
import UserModel from '@/models/User'; // Your Mongoose User model
import jwt from 'jsonwebtoken'; // For token verification
import { headers } from 'next/headers'; // To access request headers

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'; // Use an environment variable!

// Utility to verify admin status
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
        // Ensure the user role from token is 'admin'
        if (decoded.role !== 'admin') {
            return { user: null, error: 'Unauthorized: Not an admin' };
        }
        return { user: decoded, error: null };
    } catch (err) {
        console.error('JWT verification error:', err);
        return { user: null, error: 'Invalid or expired token' };
    }
}

/**
 * GET /api/admin/users/[id]
 * Fetches a single user's data by ID.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
    await dbConnect();

    const { user: adminUser, error: authError } = await verifyAdmin(headers());
    if (authError) {
        return NextResponse.json({ error: authError }, { status: 401 });
    }

    const { id } = params;

    try {
        // Fetch the user. Password will be excluded by schema's select: false.
        // All other fields will be included by default.
        const user = await UserModel.findById(id);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ user }, { status: 200 });
    } catch (error: any) {
        console.error(`Error fetching user with ID ${id}:`, error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}

/**
 * PUT /api/admin/users/[id]
 * Updates a single user's data by ID.
 */
export async function PUT(request: Request, { params }: { params: { id: string } }) {
    await dbConnect();

    const { user: adminUser, error: authError } = await verifyAdmin(headers());
    if (authError) {
        return NextResponse.json({ error: authError }, { status: 401 });
    }

    const { id } = params;
    const updates = await request.json();

    try {
        // Find the user first to get their existing email, firstLogin, isSuperAdmin, onboardingStatus
        // as these are no longer sent from the client-side form for editing
        const existingUser = await UserModel.findById(id).select('email firstLogin isSuperAdmin onboardingStatus role');
        if (!existingUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // NEW: Conditional validation for 'admin' and 'job_referrer' roles
        if (updates.role === 'admin' || updates.role === 'job_referrer') {
            if (!updates.milanShakaBhaga || !updates.valayaNagar || !updates.khandaBhaga) {
                return NextResponse.json(
                    { error: "Milan/Shaka/Bhaga, Valaya/Nagar, and Khanda/Bhaga are required for Admin and Referrer roles." },
                    { status: 400 }
                );
            }
        }

        // Prepare updates, explicitly listing only allowed editable fields
        const allowedUpdates: any = {
            username: updates.username,
            role: updates.role,
            status: updates.status,
            // NEW: Include the new fields from the updates payload
            milanShakaBhaga: updates.milanShakaBhaga,
            valayaNagar: updates.valayaNagar,
            khandaBhaga: updates.khandaBhaga,
        };

        // Initialize $unset object
        const unsetFields: { [key: string]: number } = {};

        // Conditionally add nested fields if they exist and are for the correct role
        // Also handle clearing previous role-specific details if the role changes.
        if (updates.role === 'job_seeker') {
            allowedUpdates.candidateDetails = updates.candidateDetails || {};
            if (allowedUpdates.candidateDetails.skills && typeof allowedUpdates.candidateDetails.skills === 'string') {
                allowedUpdates.candidateDetails.skills = allowedUpdates.candidateDetails.skills.split(',').map((s: string) => s.trim());
            }
            // If role changes from job_poster, clear jobPosterDetails
            if (existingUser.role === 'job_poster') {
                unsetFields.jobPosterDetails = 1;
            }
        } else if (updates.role === 'job_poster') {
            allowedUpdates.jobPosterDetails = updates.jobPosterDetails || {};
            // If role changes from job_seeker, clear candidateDetails
            if (existingUser.role === 'job_seeker') {
                unsetFields.candidateDetails = 1;
            }
        } else { // Admin or Job Referrer role
            // Clear both if role changes from job_seeker or job_poster
            if (existingUser.role === 'job_seeker') {
                unsetFields.candidateDetails = 1;
            }
            if (existingUser.role === 'job_poster') {
                unsetFields.jobPosterDetails = 1;
            }
        }

        // Do not allow direct update of resumeGridFsId via this route
        if (updates.resumeGridFsId) {
            delete updates.resumeGridFsId;
        }

        // Build the final update payload for Mongoose
        const finalUpdatePayload: any = { $set: allowedUpdates };
        if (Object.keys(unsetFields).length > 0) {
            finalUpdatePayload.$unset = unsetFields;
        }

        const updatedUser = await UserModel.findByIdAndUpdate(
            id,
            finalUpdatePayload,
            { new: true, runValidators: true, select: '-password' } // Return the updated document and run schema validators
        );

        if (!updatedUser) {
            return NextResponse.json({ error: 'User not found or no changes applied' }, { status: 404 });
        }

        return NextResponse.json({ message: 'User updated successfully', user: updatedUser }, { status: 200 });
    } catch (error: any) {
        console.error(`Error updating user with ID ${id}:`, error);
        if (error.name === 'ValidationError') {
            return NextResponse.json({ error: error.message, details: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/users/[id]
 * Deletes a single user by ID.
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    await dbConnect();

    const { user: adminUser, error: authError } = await verifyAdmin(headers());
    if (authError) {
        return NextResponse.json({ error: authError }, { status: 401 });
    }

    const { id } = params;

    try {
        const userToDelete = await UserModel.findById(id).select('role');
        if (!userToDelete) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // IMPORTANT: Prevent an admin from deleting their OWN account
        if (adminUser && adminUser.id === id) {
            return NextResponse.json({ error: 'Cannot delete your own admin account.' }, { status: 403 });
        }

        const deletedUser = await UserModel.findByIdAndDelete(id);

        if (!deletedUser) {
            return NextResponse.json({ error: 'User not found or already deleted' }, { status: 404 });
        }

        return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
    } catch (error: any) {
        console.error(`Error deleting user with ID ${id}:`, error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
