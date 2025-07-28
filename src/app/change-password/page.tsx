// app/change-password/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

interface AuthUser {
  _id: string;
  email: string;
  username: string;
  role: 'job_seeker' | 'job_poster' | 'admin' | 'job_referrer';
  firstLogin: boolean;
  isSuperAdmin?: boolean;
  onboardingStatus?: 'not_started' | 'in_progress' | 'completed' | undefined;
}

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { user, token, loading: authLoading, isAuthenticated, login } = useAuth() as {
    user: AuthUser | null;
    token: string | null;
    loading: boolean;
    isAuthenticated: boolean;
    login: (token: string, redirectPath?: string) => void;
  };

  // --- Authorization and Redirection for the Page Itself ---
  // This useEffect focuses on initial access and pre-empting the form if not needed.
  useEffect(() => {
    if (authLoading) return; // Wait for authentication state to load

    if (!isAuthenticated || !user) {
      console.log('ChangePasswordPage: Not authenticated or user not loaded. Redirecting to /login.');
      router.push('/login');
      return;
    }

    // If user is authenticated but *not* required to change password, redirect them to dashboard
    if (!user.firstLogin) {
      console.log('ChangePasswordPage: User is NOT firstLogin. Redirecting to dashboard.');
      let redirectPath = '/'; // Default fallback
      switch (user.role) {
        case 'job_poster':
          redirectPath = '/poster/dashboard';
          break;
        case 'job_seeker':
          redirectPath = user.onboardingStatus === 'completed' ? '/seeker/dashboard' : '/seeker/onboarding';
          break;
        case 'admin':
          redirectPath = '/admin/dashboard';
          break;
        case 'job_referrer':
          redirectPath = '/referrer/dashboard';
          break;
        default:
          redirectPath = '/';
      }
      router.push(redirectPath);
      return;
    }
  }, [authLoading, isAuthenticated, user, router]);


  // --- Form Submission Handler ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match.');
      setLoading(false);
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    if (!token) {
      setError('Authentication token not found. Please log in again.');
      setLoading(false);
      router.push('/login');
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: user?.firstLogin ? undefined : currentPassword,
          newPassword
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'Password changed successfully!');
        // IMPORTANT: The `login` function in AuthContext will now handle the redirection
        // based on the `firstLogin` status embedded in the new token.
        if (data.token) {
          console.log('ChangePasswordPage: Calling AuthContext login with new token.');
          login(data.token); // This will update context and trigger redirect
        } else {
          console.warn('ChangePasswordPage: API did not return a new token after password change.');
          // As a fallback, if no token, you might force a refresh or manual redirect,
          // but receiving a new token is the ideal flow.
          // refreshUser(); // If `refreshUser` was exposed by AuthContext
        }
      } else {
        setError(data.error || 'Failed to change password. Please try again.');
      }
    } catch (err: any) {
      console.error('Client-side password change error:', err);
      setError(err.message || 'An unexpected error occurred during password change.');
    } finally {
      setLoading(false);
    }
  };

  // Display a loading spinner or redirecting message
  if (authLoading || (!user && !authLoading) || (user && !user.firstLogin && isAuthenticated)) {
    return (
      <div className="flex h-screen bg-gray-50 justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="ml-4 text-gray-700">Loading or Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 font-inter">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Change Your Password</h2>
        <p className="text-center text-sm text-gray-600 mb-6">
          {user?.firstLogin ? "You must change your password to proceed." : "Update your password."}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!user?.firstLogin && (
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">Current Password</label>
              <input
                type="password"
                id="currentPassword"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required={!user?.firstLogin}
              />
            </div>
          )}

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">New Password</label>
            <input
              type="password"
              id="newPassword"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700">Confirm New Password</label>
            <input
              type="password"
              id="confirmNewPassword"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
            />
          </div>

          {message && <p className="text-green-600 text-sm text-center">{message}</p>}
          {error && <p className="text-red-600 text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={loading}
          >
            {loading ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}