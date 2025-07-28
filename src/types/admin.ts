// types/admin.ts

// For Create User Request
export interface CreateUserRequest {
  name: string;
  email: string;
  password?: string; // Password is sent plain to API, hashed by backend
  role: 'job_seeker' | 'job_poster' | 'job_referrer' | 'admin';
  isSuperAdmin?: boolean; // Optional, only relevant if creating an admin
}

// For Email Service Options (used by lib/emailservice.ts)
export interface EmailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// For Auth Middleware Result (used in API routes)
// Assuming this is in src/types/admin.ts (or wherever you define AuthResult)

export interface AuthResult {
  success: boolean;
  message?: string; // For error messages, if 'error' was changed to 'message'
  error?: string;   // Keep this if you're still using 'error' for messages
  status?: number;  // HTTP status code
  id?: string;      // <--- ADD THIS LINE! This is the user's ID from the token
  userId?: string;  // Keep this if other parts of your app explicitly use 'userId' as well
  role?: string;
  firstLogin?: boolean;
  // Add any other properties that your decoded JWT token might contain
  // that you want to include in AuthResult (e.g., email, username)
}