// lib/middlewares/authMiddleware.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// Define the roles type
type UserRole = 'job_seeker' | 'job_poster' | 'admin' | 'job_referrer';

// Interface for the decoded JWT payload - MUST match what you sign in your JWTs
export interface DecodedToken {
  id: string; // User ID (typically _id from MongoDB)
  email: string;
  username: string;
  role: UserRole;
  firstLogin: boolean; // Crucial for redirection - ensure this is always present in JWT
  isSuperAdmin: boolean; // Added for completeness if present in JWT
  onboardingStatus: 'not_started' | 'in_progress' | 'completed'; // Ensure this is the correct type and always present in JWT
  iat?: number; // Issued at (optional)
  exp?: number; // Expiration time (optional)
}

// Define the structure of the `AuthResult` object returned by the middleware
export interface AuthResult {
  success: boolean;
  message?: string;
  status?: number;
  user?: DecodedToken & { _id: string }; // Combine DecodedToken with _id
}

// Define the type for the required roles array
export type RequiredRoles = UserRole | UserRole[];

export async function authMiddleware(
  req: NextRequest,
  requiredRoles?: RequiredRoles // Make requiredRoles optional here
): Promise<AuthResult> {
  const token = req.headers.get('authorization')?.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return { success: false, message: 'Authentication token is required.', status: 401 };
  }

  try {
    // Cast to DecodedToken to ensure type safety for decoded payload
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    // --- FOR DEBUGGING ONLY: Log decoded token payload ---
    // console.log('DEBUG: authMiddleware - Decoded Token Payload:', decoded);

    // Role-based authorization
    if (requiredRoles) {
      const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
      if (!rolesArray.includes(decoded.role)) {
        console.warn(`API: Auth failed for role. Required: ${rolesArray.join(', ')}. Your role: ${decoded.role}.`);
        return {
          success: false,
          message: `Forbidden - Requires ${rolesArray.join(' or ')} role. Your role is ${decoded.role}.`,
          status: 403,
        };
      }
    }

    // Return success with decoded user data, mapping `id` to `_id`
    const userWithMongoId = {
        ...decoded,
        _id: decoded.id, // This is the crucial fix
    };

    return { success: true, user: userWithMongoId };

  } catch (error: any) {
    if (error instanceof jwt.TokenExpiredError) {
      return { success: false, message: 'Authentication token has expired.', status: 401 };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { success: false, message: 'Invalid authentication token.', status: 401 };
    }
    console.error('Authentication Middleware Error:', error);
    return { success: false, message: 'Authentication failed.', status: 500 };
  }
}
