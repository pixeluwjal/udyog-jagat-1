// src/app/login/page.tsx
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMail, FiLock, FiLoader, FiAlertCircle, FiCheckCircle, FiUsers } from 'react-icons/fi';

// Define the interface for your User object (same as in AuthContext.tsx)
interface User {
    _id: string;
    email: string;
    username: string;
    role: 'admin' | 'job_poster' | 'job_seeker' | 'job_referrer';
    isSuperAdmin: boolean;
    firstLogin: boolean;
    createdAt: string;
    updatedAt: string;
    onboardingStatus?: 'pending' | 'in_progress' | 'completed';
    // Referrer specific fields
    referralCode?: string;
    milanShakaBhaga?: string;
    valayaNagar?: string;
    khandaBhaga?: string;
    referrerDetails?: any;
    workDetails?: any;
    jobReferrerDetails?: any;
}

// Define the interface for the expected API response data on successful login
interface LoginApiResponse {
    token?: string;
    user?: User;
    error?: string;
}

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data: LoginApiResponse = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed. Please check your credentials.');
            }

            if (!data.token) {
                throw new Error('Login successful but no token received.');
            }
            const { token, user } = data;

            console.log('Login Page: API Response - received token (first few chars):', token.substring(0, 20) + '...');
            await login(token);

            setMessage('Login successful! Redirecting...');

            if (user) {
                // Handle redirection based on user role and status
                if (user.firstLogin) {
                    router.push('/change-password');
                } else if (user.role === 'job_seeker' && user.onboardingStatus !== 'completed') {
                    router.push('/seeker/onboarding');
                } else if (user.role === 'admin') {
                    router.push('/admin/dashboard');
                } else if (user.role === 'job_poster') {
                    router.push('/poster/dashboard');
                } else if (user.role === 'job_referrer') {
                    router.push('/referrer/dashboard');
                } else {
                    router.push('/');
                }
            } else {
                router.push('/');
            }

        } catch (err: any) {
            if (err instanceof Error) {
                setError(err.message);
                console.error('Login error:', err.message);
            } else {
                setError('An unexpected login error occurred.');
                console.error('Login unknown error:', err);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-sky-100 py-12 px-4 sm:px-6 lg:px-8 font-inter">
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 10 }}
                className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-2xl border border-[#EBF2FE] transform transition-all duration-300 hover:scale-105"
            >
                <div>
                    <h2 className="mt-6 text-center text-4xl font-extrabold text-gray-900 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-[#1758F1] to-[#1C3990]">
                        Udyog Jagat!
                    </h2>
                    <p className="mt-2 text-center text-base text-gray-600">
                        Sign in to your account to continue
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm space-y-4">
                        <div>
                            <label htmlFor="email-address" className="sr-only">
                                Email address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiMail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="appearance-none rounded-xl relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1758F1] focus:border-[#1758F1] sm:text-sm transition duration-200"
                                    placeholder="Email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiLock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    className="appearance-none rounded-xl relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1758F1] focus:border-[#1758F1] sm:text-sm transition duration-200"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="text-sm">
                            <Link href="/forgot-password" passHref>
                                <span className="font-medium text-[#1758F1] hover:text-[#1C3990] cursor-pointer transition-colors duration-200">
                                    Forgot your password?
                                </span>
                            </Link>
                        </div>
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="p-3 bg-red-100 border-l-4 border-red-500 rounded-r-lg shadow-sm text-sm text-red-700 font-medium flex items-center"
                                role="alert"
                            >
                                <FiAlertCircle className="h-5 w-5 text-red-500 mr-2" /> {error}
                            </motion.div>
                        )}
                        {message && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="p-3 bg-green-100 border-l-4 border-green-500 rounded-r-lg shadow-sm text-sm text-green-700 font-medium flex items-center"
                                role="alert"
                            >
                                <FiCheckCircle className="h-5 w-5 text-green-500 mr-2" /> {message}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div>
                        <motion.button
                            type="submit"
                            disabled={loading}
                            whileHover={{ scale: 1.02, boxShadow: "0 10px 20px rgba(0, 0, 0, 0.15)" }}
                            whileTap={{ scale: 0.98 }}
                            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-[#1758F1] to-[#1C3990] hover:from-[#1A61F3] hover:to-[#1F41B2] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1758F1] shadow-lg transition-all duration-200 ${
                                loading ? 'opacity-70 cursor-not-allowed' : ''
                            }`}
                        >
                            {loading ? (
                                <span className="flex items-center">
                                    <FiLoader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                                    Signing in...
                                </span>
                            ) : (
                                'Sign In'
                            )}
                        </motion.button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}