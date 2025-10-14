// app/change-password/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiLock,
  FiKey,
  FiCheckCircle,
  FiXCircle,
  FiLoader,
  FiShield,
  FiEye,
  FiEyeOff
} from 'react-icons/fi';

// Brand colors
const primaryBlue = "#165BF8";
const darkBlue = "#1C3991";

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.6, 
      ease: [0.16, 1, 0.3, 1],
      delay: 0.1
    } 
  },
};

const cardAnimation = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { 
      duration: 0.7, 
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.1
    }
  }
};

const pulseEffect = {
  scale: [1, 1.05, 1],
  opacity: [1, 0.8, 1],
  transition: { 
    duration: 1.5, 
    repeat: Infinity, 
    ease: "easeInOut" 
  }
};

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
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();
  const { user, token, loading: authLoading, isAuthenticated, login } = useAuth() as {
    user: AuthUser | null;
    token: string | null;
    loading: boolean;
    isAuthenticated: boolean;
    login: (token: string, redirectPath?: string) => void;
  };

  // Authorization and Redirection
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    if (!user.firstLogin) {
      let redirectPath = '/';
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

// In your change-password page, update the handleSubmit function:
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
      if (data.token) {
        login(data.token);
        
        // Add delay to ensure token is processed, then redirect
        setTimeout(() => {
          if (user?.role === 'job_referrer' && user?.firstLogin) {
            // Redirect referrers to onboarding after first password change
            router.push('/referrer/onboarding');
          } else {
            // For other users, let the AuthContext handle redirection
            // The firstLogin flag is now false, so AuthContext will redirect appropriately
          }
        }, 1000);
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
  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, color: 'bg-gray-200', text: '' };
    if (password.length < 8) return { strength: 25, color: 'bg-red-500', text: 'Weak' };
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const strength = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length * 25;
    
    let color = 'bg-red-500';
    let text = 'Weak';
    if (strength >= 75) {
      color = 'bg-green-500';
      text = 'Strong';
    } else if (strength >= 50) {
      color = 'bg-yellow-500';
      text = 'Medium';
    }
    
    return { strength, color, text };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  if (authLoading || (!user && !authLoading) || (user && !user.firstLogin && isAuthenticated)) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] justify-center items-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center"
        >
          <motion.div
            animate={pulseEffect}
            className="rounded-full p-6 bg-gradient-to-br from-[#165BF8] to-[#1C3991] shadow-2xl"
          >
            <FiLoader className="text-white h-12 w-12 animate-spin" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-xl font-semibold text-[#1C3991]"
          >
            Loading or Redirecting...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] overflow-hidden font-inter">
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-md mx-auto">
            {/* Header Section */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="text-center mb-8"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#165BF8] to-[#1C3991] rounded-3xl shadow-2xl mb-6"
              >
                <FiShield className="h-10 w-10 text-white" />
              </motion.div>
              <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent mb-4">
                {user?.firstLogin ? "Welcome!" : "Update Password"}
              </h1>
              <p className="text-lg text-[#165BF8] font-medium">
                {user?.firstLogin 
                  ? "Set up your secure password to get started" 
                  : "Update your password to keep your account secure"
                }
              </p>
            </motion.div>

            {/* Main Form Card */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={cardAnimation}
              className="bg-white rounded-3xl shadow-2xl border border-[#165BF8]/10 overflow-hidden"
            >
              <div className="p-8 border-b border-[#165BF8]/10">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-[#165BF8] to-[#1C3991] text-white shadow-lg">
                    <FiKey className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-[#1C3991]">Security Settings</h2>
                    <p className="text-[#165BF8] font-medium">Create a strong, secure password</p>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl shadow-sm text-red-700 font-medium flex items-center space-x-3 mb-6"
                    >
                      <FiXCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                      <span className="font-semibold">{error}</span>
                    </motion.div>
                  )}
                  {message && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="p-4 bg-green-50 border-l-4 border-green-500 rounded-xl shadow-sm text-green-700 font-medium flex items-center space-x-3 mb-6"
                    >
                      <FiCheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                      <span className="font-semibold">{message}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Current Password (only for non-first login) */}
                  {!user?.firstLogin && (
                    <motion.div variants={cardAnimation}>
                      <label className="block text-sm font-bold text-[#1C3991] mb-3 uppercase tracking-wide">
                        <FiLock className="inline-block mr-2 text-[#165BF8]" /> Current Password
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <FiLock className="h-5 w-5 text-[#165BF8]/70" />
                        </div>
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="block w-full pl-12 pr-12 py-3.5 text-lg border-2 border-[#165BF8]/20 rounded-2xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] text-[#1C3991] bg-white transition-all duration-300 group-hover:border-[#165BF8]/40"
                          placeholder="Enter current password"
                          required={!user?.firstLogin}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#165BF8]/70 hover:text-[#165BF8] transition-colors duration-200"
                        >
                          {showCurrentPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* New Password */}
                  <motion.div variants={cardAnimation}>
                    <label className="block text-sm font-bold text-[#1C3991] mb-3 uppercase tracking-wide">
                      <FiKey className="inline-block mr-2 text-[#165BF8]" /> New Password
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiKey className="h-5 w-5 text-[#165BF8]/70" />
                      </div>
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="block w-full pl-12 pr-12 py-3.5 text-lg border-2 border-[#165BF8]/20 rounded-2xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] text-[#1C3991] bg-white transition-all duration-300 group-hover:border-[#165BF8]/40"
                        placeholder="Enter new password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#165BF8]/70 hover:text-[#165BF8] transition-colors duration-200"
                      >
                        {showNewPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {newPassword && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 space-y-2"
                      >
                        <div className="flex justify-between text-sm">
                          <span className="text-[#1C3991] font-medium">Password Strength:</span>
                          <span className={`font-bold ${
                            passwordStrength.text === 'Weak' ? 'text-red-500' :
                            passwordStrength.text === 'Medium' ? 'text-yellow-500' :
                            'text-green-500'
                          }`}>
                            {passwordStrength.text}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                            style={{ width: `${passwordStrength.strength}%` }}
                          ></div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Confirm New Password */}
                  <motion.div variants={cardAnimation}>
                    <label className="block text-sm font-bold text-[#1C3991] mb-3 uppercase tracking-wide">
                      <FiLock className="inline-block mr-2 text-[#165BF8]" /> Confirm New Password
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiLock className="h-5 w-5 text-[#165BF8]/70" />
                      </div>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="block w-full pl-12 pr-12 py-3.5 text-lg border-2 border-[#165BF8]/20 rounded-2xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] text-[#1C3991] bg-white transition-all duration-300 group-hover:border-[#165BF8]/40"
                        placeholder="Confirm new password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#165BF8]/70 hover:text-[#165BF8] transition-colors duration-200"
                      >
                        {showConfirmPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                      </button>
                    </div>

                    {/* Password Match Indicator */}
                    {confirmNewPassword && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-2 flex items-center space-x-2"
                      >
                        {newPassword === confirmNewPassword ? (
                          <>
                            <FiCheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-green-600 text-sm font-medium">Passwords match</span>
                          </>
                        ) : (
                          <>
                            <FiXCircle className="h-4 w-4 text-red-500" />
                            <span className="text-red-600 text-sm font-medium">Passwords do not match</span>
                          </>
                        )}
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Password Requirements */}
                  <motion.div variants={cardAnimation} className="bg-[#165BF8]/5 rounded-2xl p-4 border border-[#165BF8]/10">
                    <h3 className="text-sm font-bold text-[#1C3991] mb-2">Password Requirements:</h3>
                    <ul className="text-sm text-[#165BF8] space-y-1">
                      <li className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${newPassword.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        At least 8 characters long
                      </li>
                      <li className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${/[A-Z]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        Contains uppercase letters
                      </li>
                      <li className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${/[a-z]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        Contains lowercase letters
                      </li>
                      <li className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${/\d/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        Contains numbers
                      </li>
                      <li className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        Contains special characters
                      </li>
                    </ul>
                  </motion.div>

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    variants={cardAnimation}
                    whileHover={{ scale: 1.02, boxShadow: "0 15px 30px rgba(22, 91, 248, 0.3)" }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      w-full flex justify-center items-center py-4 px-6 rounded-2xl shadow-xl text-lg font-black text-white
                      bg-gradient-to-r from-[#165BF8] to-[#1C3991]
                      hover:from-[#1a65ff] hover:to-[#2242a8]
                      focus:outline-none focus:ring-4 focus:ring-[#165BF8]/30
                      transition-all duration-300
                      ${loading ? "opacity-70 cursor-not-allowed" : ""}
                    `}
                  >
                    {loading ? (
                      <>
                        <FiLoader className="animate-spin mr-3 h-6 w-6" />
                        Updating Password...
                      </>
                    ) : (
                      <>
                        <FiShield className="mr-3 h-6 w-6" />
                        {user?.firstLogin ? "Set Password & Continue" : "Update Password"}
                      </>
                    )}
                  </motion.button>
                </form>
              </div>
            </motion.div>

            {/* Security Note */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              transition={{ delay: 0.3 }}
              className="text-center mt-6"
            >
              <p className="text-sm text-[#165BF8] font-medium">
                🔒 Your security is our priority. Use a strong, unique password.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}