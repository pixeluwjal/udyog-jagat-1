// app/admin/create-user/page.tsx
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar'; // Import the Sidebar component
import { motion, AnimatePresence } from 'framer-motion'; // Import motion and AnimatePresence
import {
    FiMail, FiUser, FiBriefcase, FiLink, FiShield,
    FiXCircle, FiCheckCircle, FiLoader, FiChevronLeft, FiMenu // Import FiMenu for hamburger
} from 'react-icons/fi'; // Import icons

export default function CreateUserPage() {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'job_poster' | 'job_seeker' | 'job_referrer' | 'admin'>('job_seeker');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // State to manage mobile sidebar visibility
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    const { user: currentUser, loading: authLoading, isAuthenticated, token, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (authLoading) return;

        if (!isAuthenticated || !currentUser) {
            console.warn('CreateUserPage: Not authenticated or user missing. Redirecting to /login.');
            router.push('/login');
            return;
        }

        if (currentUser.firstLogin) {
            console.warn('CreateUserPage: User is firstLogin. Redirecting to /change-password.');
            router.push('/change-password');
            return;
        }

        if (currentUser.role !== 'admin') {
            console.warn(`CreateUserPage: User role is ${currentUser.role}, not admin. Redirecting to appropriate dashboard.`);
            if (currentUser.role === 'job_poster') router.push('/poster/dashboard');
            else if (currentUser.role === 'job_seeker') router.push('/seeker/dashboard');
            else router.push('/'); // Fallback for other roles
            return;
        }
    }, [authLoading, isAuthenticated, currentUser, router]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setIsLoading(true);

        if (!token) {
            setError('Authentication token missing. Please log in again.');
            setIsLoading(false);
            return;
        }

        if (!email || !role) {
            setError('Please provide an email and select a role.');
            setIsLoading(false);
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Invalid email format.');
            setIsLoading(false);
            return;
        }

        try {
            const payload = {
                email,
                role,
            };

            const response = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create user');
            }

            setMessage(data.message || 'User created successfully! A temporary password has been sent to their email.');
            setEmail('');
            setRole('job_seeker'); // Reset role to default
            console.log('User created:', data.user);

        } catch (err: any) {
            console.error('Create user error:', err);
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    // Framer Motion Variants
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
    };

    const itemVariants = {
        hidden: { opacity: 0, scale: 0.9 },
        visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
    };

    const pulseEffect = {
        scale: [1, 1.05, 1],
        opacity: [1, 0.7, 1],
        transition: { duration: 0.8, repeat: Infinity, ease: "easeInOut" },
    };

    if (authLoading || !isAuthenticated || !currentUser || currentUser.firstLogin || currentUser.role !== 'admin') {
        return (
            <div className="flex h-screen bg-gradient-to-br from-blue-50 to-[#E8EFFF] justify-center items-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center"
                >
                    <motion.div
                        animate={pulseEffect}
                        className="rounded-full p-3 bg-[#D6D9F6]" // Light blue/purple for spinner background
                    >
                        <FiLoader className="text-[#4F39F6] h-10 w-10" /> {/* Vibrant blue/purple for spinner icon */}
                    </motion.div>
                    <p className="mt-4 text-lg font-medium text-gray-700">Loading admin panel...</p>
                </motion.div>
            </div>
        );
    }

    const roleOptions = [
        { value: 'job_seeker', label: 'Job Seeker', icon: <FiUser className="h-8 w-8 text-[#4F39F6]" /> }, // Vibrant blue/purple
        { value: 'job_poster', label: 'Job Poster', icon: <FiBriefcase className="h-8 w-8 text-green-500" /> }, // Green is fine
        { value: 'job_referrer', label: 'Referrer', icon: <FiLink className="h-8 w-8 text-[#1A3BAD]" /> }, // Darker blue
        { value: 'admin', label: 'Admin', icon: <FiShield className="h-8 w-8 text-red-500" /> }, // Red is fine
    ];

    return (
        <div className="flex h-screen bg-gradient-to-br from-blue-50 to-[#E8EFFF] overflow-hidden font-inter">
            <Sidebar userRole={currentUser.role} onLogout={logout} isSidebarOpen={mobileSidebarOpen} setIsOpen={setMobileSidebarOpen} />

            <div className="flex-1 flex flex-col overflow-y-auto">
                {/* Mobile header with hamburger icon */}
                <div className="md:hidden bg-white/95 backdrop-blur-md shadow-lg p-4 flex items-center justify-between z-10 sticky top-0">
                    <button
                        onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                        className="p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#4F39F6]" // Vibrant blue/purple focus ring
                        aria-label="Toggle sidebar"
                    >
                        <FiMenu className="h-6 w-6" />
                    </button>
                    <h1 className="text-2xl font-extrabold bg-gradient-to-r from-[#4F39F6] to-[#1A3BAD] bg-clip-text text-transparent absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        Create User
                    </h1>
                    {/* Empty div for spacing to push title to center if needed, or remove if not desired */}
                    <div className="w-10"></div> {/* Adjust width as needed */}
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={containerVariants}
                        className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-8 transform hover:shadow-2xl transition-all duration-300 ease-out"
                    >
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-[#4F39F6] to-[#1A3BAD]"> {/* Vibrant to darker blue gradient */}
                                Create New User
                            </h2>
                            <Link href="/admin/dashboard" passHref>
                                <motion.button
                                    whileHover={{ scale: 1.05, boxShadow: "0 4px 15px rgba(79, 57, 246, 0.3)" }} // Shadow using primary color
                                    whileTap={{ scale: 0.95 }}
                                    className="flex items-center px-4 py-2 bg-[#D6D9F6] text-[#1A3BAD] rounded-lg hover:bg-[#C2C6F0] transition-colors text-sm font-medium shadow-sm" // Light blue/purple button
                                >
                                    <FiChevronLeft className="mr-2 w-5 h-5" /> Back to Dashboard
                                </motion.button>
                            </Link>
                        </div>

                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <motion.div variants={itemVariants}>
                                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FiMail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4F39F6] focus:border-[#4F39F6] sm:text-base transition-all duration-200" // Vibrant blue/purple focus
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={isLoading}
                                        placeholder="user@example.com"
                                    />
                                </div>
                            </motion.div>

                            <motion.div variants={itemVariants}>
                                <label htmlFor="role" className="block text-sm font-semibold text-gray-700 mb-2">
                                    User Role
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {roleOptions.map((option) => (
                                        <motion.div key={option.value} whileTap={{ scale: 0.98 }}>
                                            <input
                                                type="radio"
                                                id={`role-${option.value}`}
                                                name="role"
                                                value={option.value}
                                                checked={role === option.value}
                                                onChange={() => setRole(option.value as any)}
                                                className="hidden peer"
                                                disabled={isLoading}
                                            />
                                            <label
                                                htmlFor={`role-${option.value}`}
                                                className={`flex flex-col items-center justify-center p-4 md:p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 h-full
                                                ${role === option.value
                                                    ? 'border-[#4F39F6] bg-[#F0F2FF] shadow-md text-[#1A3BAD]' // Selected state: vibrant border, light blue background, darker blue text
                                                    : 'border-gray-300 bg-white text-gray-700 hover:border-[#4F39F6] hover:shadow-sm' // Hover: vibrant blue/purple border
                                                }
                                                ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`
                                                }
                                            >
                                                {option.icon}
                                                <span className="text-sm md:text-base font-bold mt-2 text-center">{option.label}</span>
                                            </label>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>

                            <motion.p variants={itemVariants} className="text-sm text-gray-500 text-center mt-4">
                                A temporary password will be auto-generated and sent to the user's email.
                            </motion.p>

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
                                        <FiXCircle className="h-5 w-5 text-red-500 mr-2" /> {error}
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

                            <motion.div variants={itemVariants}>
                                <motion.button
                                    type="submit"
                                    disabled={isLoading}
                                    whileHover={{ scale: 1.02, boxShadow: "0 10px 20px rgba(0, 0, 0, 0.15)" }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-lg font-semibold text-white bg-gradient-to-r from-[#4F39F6] to-[#1A3BAD] hover:from-[#5A45F8] hover:to-[#2B49C0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4F39F6] transition-all duration-200 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`} // Gradient from vibrant to darker blue
                                >
                                    {isLoading ? (
                                        <>
                                            <FiLoader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                                            Creating User...
                                        </>
                                    ) : (
                                        'Create User'
                                    )}
                                </motion.button>
                            </motion.div>
                        </form>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}