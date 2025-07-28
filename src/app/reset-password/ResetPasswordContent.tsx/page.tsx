// app/reset-password/ResetPasswordContent.tsx
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiLock, FiCheckCircle, FiXCircle, FiLoader, FiArrowLeft, FiAlertCircle } from 'react-icons/fi';

export default function ResetPasswordContent() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null); // State to track token validity

    const router = useRouter();
    const searchParams = useSearchParams(); // This hook is now inside a component wrapped by Suspense

    useEffect(() => {
        const tokenFromUrl = searchParams.get('token');
        if (tokenFromUrl) {
            setToken(tokenFromUrl);
            setIsTokenValid(true);
        } else {
            setError('Password reset token is missing from the URL.');
            setIsTokenValid(false);
        }
    }, [searchParams]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        setError(null);

        if (!token) {
            setError('Password reset token is missing.');
            setLoading(false);
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, newPassword: password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to reset password.');
            }

            setMessage(data.message || 'Your password has been reset successfully! You can now log in with your new password.');
            setPassword('');
            setConfirmPassword('');
            // Optionally redirect to login page after a short delay
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } catch (err: any) {
            console.error('Reset password error:', err);
            setError(err.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (isTokenValid === null) {
        // Still checking for token in URL, show a simple loading indicator
        return (
            <div className="flex flex-col items-center">
                <FiLoader className="animate-spin text-indigo-600 h-12 w-12" />
                <p className="mt-4 text-gray-700">Checking token...</p>
            </div>
        );
    }

    if (isTokenValid === false) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 10 }}
                className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 w-full max-w-md border border-gray-100 text-center"
            >
                <FiAlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Invalid or Missing Token</h2>
                <p className="text-gray-600 mb-6">
                    The password reset link is invalid or has expired. Please request a new one.
                </p>
                <Link href="/forgot-password" passHref>
                    <motion.a
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-colors font-semibold"
                    >
                        Request New Link
                    </motion.a>
                </Link>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 10 }}
            className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 w-full max-w-md border border-gray-100"
        >
            <div className="flex justify-center mb-6">
                <h1 className="text-4xl font-extrabold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-[#4F39F6] to-[#1A3BAD]">
                    Reset Password
                </h1>
            </div>

            <p className="text-center text-gray-600 mb-8">
                Enter your new password below.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiLock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            required
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-base transition-all duration-200"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            placeholder="Enter new password"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiLock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            required
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-base transition-all duration-200"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={loading}
                            placeholder="Confirm new password"
                        />
                    </div>
                </div>

                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-green-100 border-l-4 border-green-500 rounded-r-lg shadow-sm text-sm text-green-700 font-medium flex items-center"
                        role="alert"
                    >
                        <FiCheckCircle className="h-5 w-5 text-green-500 mr-2" /> {message}
                    </motion.div>
                )}

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-red-100 border-l-4 border-red-500 rounded-r-lg shadow-sm text-sm text-red-700 font-medium flex items-center"
                        role="alert"
                    >
                        <FiXCircle className="h-5 w-5 text-red-500 mr-2" /> {error}
                    </motion.div>
                )}

                <div>
                    <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: 1.02, boxShadow: "0 10px 20px rgba(0, 0, 0, 0.15)" }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-lg font-semibold text-white bg-gradient-to-r from-[#4F39F6] to-[#1A3BAD] hover:from-indigo-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 ${
                            loading ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                    >
                        {loading ? (
                            <>
                                <FiLoader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                                Resetting...
                            </>
                        ) : (
                            'Reset Password'
                        )}
                    </motion.button>
                </div>
            </form>

            <div className="mt-8 text-center">
                <Link href="/login" passHref>
                    <motion.a
                        whileHover={{ x: -3 }}
                        className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                        <FiArrowLeft className="mr-2" /> Back to Login
                    </motion.a>
                </Link>
            </div>
        </motion.div>
    );
}
