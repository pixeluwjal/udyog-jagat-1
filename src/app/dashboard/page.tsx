// src/app/dashboard/page.tsx
'use client'; // This directive is essential for client-side components in Next.js

import { useAuth } from '../context/AuthContext'; // Path to your AuthContext
import { useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter hook

export default function UserDashboardPage() {
  const { user, loading, isAuthenticated } = useAuth(); // user can be User | null
  const router = useRouter(); // Initialize the router instance

  // This useEffect primarily logs the authentication state.
  // The main redirection logic for authentication and firstLogin handling
  // is robustly managed within your AuthContext's useEffect.
  useEffect(() => {
    if (!loading) { // Ensure the authentication state has been fully determined
      if (!isAuthenticated) {
        console.warn('DashboardPage: User not authenticated. AuthContext should have redirected to /login.');
      } else if (user?.firstLogin) { // Use optional chaining for user?.firstLogin
        console.warn('DashboardPage: User is still firstLogin. AuthContext should have redirected to /change-password.');
      } else {
        // If authenticated and not firstLogin, proceed to render the dashboard
        console.log('DashboardPage: User is authenticated and not firstLogin. Rendering dashboard for role:', user?.role); // Use optional chaining for user?.role
      }
    }
  }, [loading, isAuthenticated, user]); // Dependencies ensure this effect re-runs when these values change

  // --- Conditional Rendering based on Auth State ---

  // 1. Show a loading message while authentication state is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-700">Loading user dashboard...</p>
      </div>
    );
  }

  // 2. If not authenticated OR if it's the first login,
  //    display a message and rely on AuthContext to perform the redirect.
  //    This acts as a robust fallback.
  if (!isAuthenticated || user?.firstLogin) { // Use optional chaining for user?.firstLogin
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-red-600">
        <p>Access Denied or Password Change Required. Please wait for redirection...</p>
      </div>
    );
  }

  // --- Final Type Guard ---
  // At this point, we are certain that isAuthenticated is true and user.firstLogin is false.
  // This 'if (user)' check explicitly tells TypeScript that 'user' is now of type 'User'.
  if (user) {
    // 3. Ensure this dashboard is only for 'job_seeker' or 'job_referrer' roles.
    //    If the user's role doesn't match, display an unauthorized message and
    //    expect AuthContext to redirect them to their correct dashboard.
    if (user.role !== 'job_seeker' && user.role !== 'job_referrer') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 text-red-600">
                <p>Unauthorized access for this role. Redirecting to your specific dashboard...</p>
            </div>
        );
    }

    // --- Render Dashboard Content (User is authenticated, not firstLogin, and has correct role) ---
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to Your Dashboard, {user.username}! {/* user is now definitively not null */}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Role: {user.role} {/* user is now definitively not null */}
          </p>
          <p className="mt-2 text-center text-sm text-gray-600">
            Email: {user.email} {/* user is now definitively not null */}
          </p>
          <div className="mt-8">
            <button
              onClick={() => {
                // Example: navigate to job listings
                router.push('/jobs'); // `router` is now correctly initialized
              }}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Explore Jobs
            </button>
          </div>
          {/* Add more general user dashboard content here */}
        </div>
      </div>
    );
  }

  // Fallback for unexpected states where user is null despite checks (should ideally not be reached)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 text-red-600">
      <p>An unexpected error occurred. User data is missing.</p>
    </div>
  );
}