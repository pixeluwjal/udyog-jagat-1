// app/referrer/generate/page.tsx
'use client';

import { useState, FormEvent, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiMail,
    FiCode,
    FiCalendar,
    FiCopy,
    FiCheckCircle,
    FiXCircle,
    FiLoader,
    FiChevronLeft,
    FiClipboard,
    FiFilter,
    FiUser,
    FiSend,
    FiTag,
    FiMenu,
} from 'react-icons/fi';

// Define an interface for the Referral Code object
interface ReferralCode {
    _id: string;
    code: string;
    candidateEmail: string;
    expiresAt: string; // ISO string
    isUsed: boolean;
    createdAt: string; // ISO string
    generatedByAdminUsername: string; // This will be the referrer's username
    status: string; // This comes from your API based on isUsed and expiresAt
}

// Framer Motion Variants for animations
const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const itemFadeIn = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.3, ease: "easeOut" },
    },
};

const pulseEffect = {
    scale: [1, 1.05, 1],
    opacity: [1, 0.7, 1],
    transition: { duration: 0.8, repeat: Infinity, ease: "easeInOut" },
};

export default function GenerateReferralPage() {
    const [email, setEmail] = useState('');
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<string | null>(null); // This is formatted date
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const [generatedReferrals, setGeneratedReferrals] = useState<ReferralCode[]>([]);
    const [loadingReferrals, setLoadingReferrals] = useState(true);
    const [referralsError, setReferralsError] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for sidebar visibility

    const { user: currentUser, loading: authLoading, isAuthenticated, token, logout } = useAuth();
    const router = useRouter();

    // Helper function to format date to DD/MM/YYYY
    const formatDate = (isoString: string): string => {
        if (!isoString) return "";
        const date = new Date(isoString);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const fetchReferralCodes = useCallback(async () => {
        setLoadingReferrals(true);
        setReferralsError(null);

        if (!token) {
            setReferralsError("Authentication token missing. Cannot fetch referral codes.");
            setLoadingReferrals(false);
            return;
        }

        try {
            // IMPORTANT: Changed API endpoint to referrer-specific one
            const response = await fetch(`/api/referrer/referral-codes?status=${filterStatus}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch referral codes.");
            }

            setGeneratedReferrals(data.referralCodes);
        } catch (err: any) {
            console.error("Failed to fetch referral codes:", err);
            setReferralsError(err.message || "An error occurred while fetching codes.");
        } finally {
            setLoadingReferrals(false);
        }
    }, [token, filterStatus]);

    useEffect(() => {
        if (authLoading) return;

        if (!isAuthenticated || !currentUser) {
            console.warn('GenerateReferralPage (Referrer): Not authenticated or user missing. Redirecting to /login.');
            router.push('/login');
            return;
        }

        if (currentUser.firstLogin) {
            console.warn('GenerateReferralPage (Referrer): User is firstLogin. Redirecting to /change-password.');
            router.push('/change-password');
            return;
        }

        // IMPORTANT: Changed authorization to 'job_referrer' role
        if (currentUser.role !== 'job_referrer') {
            console.warn(`GenerateReferralPage (Referrer): User role is ${currentUser.role}, not a job_referrer. Redirecting.`);
            if (currentUser.role === 'admin') router.push('/admin/dashboard');
            else if (currentUser.role === 'job_poster') router.push('/poster/dashboard');
            else if (currentUser.role === 'job_seeker') router.push('/seeker/dashboard');
            else router.push('/'); // Fallback for other unexpected roles
            return;
        }
        
        // If we reach here, user is an authenticated job_referrer and not firstLogin.
        fetchReferralCodes();
    }, [authLoading, isAuthenticated, currentUser, router, fetchReferralCodes]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setGeneratedCode(null);
        setExpiresAt(null);
        setLoading(true);

        if (!token) {
            setError('Authentication token missing. Please log in again.');
            setLoading(false);
            return;
        }

        if (!email) {
            setError('Please provide an email address.');
            setLoading(false);
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Invalid email format.');
            setLoading(false);
            return;
        }

        try {
            // IMPORTANT: Changed API endpoint to a referrer-specific one.
            const response = await fetch('/api/referrer/generate-referral-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ candidateEmail: email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate referral code');
            }

            setMessage(data.message || 'Referral code generated successfully!');
            setGeneratedCode(data.code);
            setExpiresAt(formatDate(data.expiresAt)); // Use the new format
            setEmail(''); // Clear email field after success
            console.log('Referral Code Generated:', data);

            fetchReferralCodes(); // Refresh the list after generating a new code

        } catch (err: any) {
            console.error('Generate referral code error:', err);
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code)
            .then(() => {
                setCopySuccess("Code copied to clipboard!");
                setTimeout(() => setCopySuccess(null), 2000);
            })
            .catch((err) => {
                console.error("Failed to copy text: ", err);
                // Fallback for older browsers
                const el = document.createElement("textarea");
                el.value = code;
                document.body.appendChild(el);
                el.select();
                document.execCommand("copy");
                document.body.removeChild(el);
                setCopySuccess("Code copied (fallback)!");
                setTimeout(() => setCopySuccess(null), 2000);
            });
    };

    if (authLoading || !isAuthenticated || !currentUser || currentUser.firstLogin || currentUser.role !== 'job_referrer') {
        return (
            <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 justify-center items-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center"
                >
                    <motion.div
                        animate={pulseEffect}
                        className="rounded-full p-3 bg-indigo-200"
                    >
                        <FiLoader className="text-indigo-600 h-10 w-10" />
                    </motion.div>
                    <p className="mt-4 text-lg font-medium text-gray-700">
                        Loading referrer panel...
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden font-inter">
            {/* Sidebar for larger screens, and conditionally rendered for mobile */}
            <Sidebar
                userRole={currentUser.role}
                onLogout={logout}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />

            <div className="flex-1 flex flex-col overflow-y-auto">
                {/* Mobile header */}
                <div className="md:hidden bg-white/95 backdrop-blur-md shadow-lg p-4 flex justify-between items-center z-10 sticky top-0">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <FiMenu className="h-6 w-6" />
                    </motion.button>
                    <h1 className="text-2xl font-extrabold bg-gradient-to-r from-[#4F39F6] to-[#1A3BAD] bg-clip-text text-transparent absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        Generate Referral
                    </h1>
                    {/* Placeholder for alignment if needed, or remove if not necessary */}
                    <div className="w-6 h-6"></div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-4xl mx-auto space-y-10">
                        {/* Generate Code Section */}
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={fadeIn}
                            className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-8 transform hover:shadow-2xl transition-all duration-300 ease-out"
                        >
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-[#4F39F6] to-[#1A3BAD]">
                                    Generate Access Code
                                </h2>
                                <Link href="/referrer/dashboard" passHref>
                                    <motion.button
                                        whileHover={{
                                            scale: 1.05,
                                            boxShadow: "0 4px 15px rgba(99, 102, 241, 0.3)",
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                        className="flex items-center px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm font-medium shadow-sm"
                                    >
                                        <FiChevronLeft className="mr-2 w-5 h-5" /> Back to Dashboard
                                    </motion.button>
                                </Link>
                            </div>

                            <form className="space-y-6" onSubmit={handleSubmit}>
                                <div>
                                    <label
                                        htmlFor="email"
                                        className="block text-sm font-semibold text-gray-700 mb-2"
                                    >
                                        Candidate Email
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FiMail className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="off"
                                            required
                                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-base transition-all duration-200"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            disabled={loading}
                                            placeholder="Enter candidate email here"
                                        />
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
                                            <FiXCircle className="h-5 w-5 text-red-500 mr-2" />{" "}
                                            {error}
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
                                            <FiCheckCircle className="h-5 w-5 text-green-500 mr-2" />{" "}
                                            {message}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <AnimatePresence>
                                    {generatedCode && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.4, ease: "easeOut" }}
                                            className="bg-indigo-50 border border-indigo-200 text-indigo-800 p-5 rounded-xl shadow-md flex flex-col md:flex-row items-center justify-between gap-4"
                                        >
                                            <div className="flex items-center flex-grow">
                                                <FiCode className="h-8 w-8 text-indigo-500 mr-4 shrink-0" />
                                                <div className="flex-grow">
                                                    <p className="text-sm text-indigo-600 font-medium mb-1">
                                                        Generated Access Code:
                                                    </p>
                                                    <code className="font-mono text-xl md:text-2xl break-all text-indigo-800 bg-indigo-100 px-3 py-1 rounded-md inline-block">
                                                        {generatedCode}
                                                    </code>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center md:items-end space-y-2 md:space-y-0 md:ml-4">
                                                <motion.button
                                                    type="button"
                                                    onClick={() => handleCopyCode(generatedCode)}
                                                    whileHover={{
                                                        scale: 1.05,
                                                        backgroundColor: "#c7d2fe",
                                                    }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className="flex items-center px-4 py-2 bg-indigo-200 rounded-full text-indigo-700 hover:bg-indigo-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-sm font-medium shadow-sm"
                                                    title="Copy code to clipboard"
                                                >
                                                    <FiCopy className="w-4 h-4 mr-2" /> Copy Code
                                                </motion.button>
                                                <p className="text-xs text-indigo-600 mt-2 flex items-center">
                                                    <FiCalendar className="mr-1" /> Expires:{" "}
                                                    <span className="font-semibold ml-1">
                                                        {expiresAt}
                                                    </span>
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <AnimatePresence>
                                    {copySuccess && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 20 }}
                                            transition={{ duration: 0.3 }}
                                            className="fixed bottom-4 left-1/2 -translate-x-1/2 p-3 bg-green-600 text-white rounded-lg shadow-xl text-sm flex items-center space-x-2 z-50"
                                        >
                                            <FiClipboard className="w-5 h-5" />
                                            <span>{copySuccess}</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div>
                                    <motion.button
                                        type="submit"
                                        disabled={loading}
                                        whileHover={{
                                            scale: 1.02,
                                            boxShadow: "0 10px 20px rgba(0, 0, 0, 0.15)",
                                        }}
                                        whileTap={{ scale: 0.98 }}
                                        className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-lg font-semibold text-white bg-gradient-to-r from-[#4F39F6] to-[#1A3BAD] hover:from-indigo-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 ${
                                            loading ? "opacity-70 cursor-not-allowed" : ""
                                        }`}
                                    >
                                        {loading ? (
                                            <>
                                                <FiLoader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <FiSend className="-ml-1 mr-3 h-5 w-5" />
                                                Generate & Email Code
                                            </>
                                        )}
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                        
                        {/* Existing Referral Codes Section */}
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={fadeIn}
                            className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-8 transform hover:shadow-2xl transition-all duration-300 ease-out"
                        >
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-[#4F39F6] to-[#1A3BAD]">
                                    Your Generated Access Codes
                                </h2>
                                <div className="relative w-full md:w-auto">
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="block appearance-none w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 pr-10 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-blue-500 transition-colors shadow-sm cursor-pointer"
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="used">Already Used</option>
                                        <option value="expired">Unused & Expired</option>
                                        <option value="not_expired_unused">Unused & Valid</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                        <FiFilter className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>

                            {loadingReferrals ? (
                                <div className="flex justify-center items-center py-8">
                                    <FiLoader className="animate-spin text-blue-500 h-8 w-8" />
                                    <p className="ml-3 text-gray-600 text-lg">Loading codes...</p>
                                </div>
                            ) : referralsError ? (
                                <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-lg shadow-sm flex items-center">
                                    <FiXCircle className="h-5 w-5 text-red-500 mr-2" />
                                    <span>Error loading codes: {referralsError}</span>
                                </div>
                            ) : generatedReferrals.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 text-lg">
                                    No access codes found for the selected filter.
                                </div>
                            ) : (
                                <motion.div
                                    initial="hidden"
                                    animate="visible"
                                    variants={{
                                        visible: {
                                            transition: { staggerChildren: 0.08 },
                                        },
                                    }}
                                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                                >
                                    {generatedReferrals.map((referral) => (
                                        <motion.div
                                            key={referral._id}
                                            variants={itemFadeIn}
                                            className="bg-white border border-gray-200 rounded-xl shadow-md p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-200 ease-out transform hover:-translate-y-1 hover:border-blue-300"
                                        >
                                            <div className="flex-grow">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center">
                                                        <FiCode className="text-blue-600 mr-3 h-7 w-7" />
                                                        <h3 className="font-extrabold text-xl text-gray-800">
                                                            Code:
                                                        </h3>
                                                    </div>
                                                    <button
                                                        onClick={() => handleCopyCode(referral.code)}
                                                        className="p-2 rounded-full text-gray-500 bg-gray-50 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                        title="Copy code"
                                                    >
                                                        <FiCopy className="w-5 h-5" />
                                                    </button>
                                                </div>
                                                <code className="font-mono text-xl text-blue-800 break-all bg-blue-50 p-3 rounded-lg border border-blue-100 block mb-4 font-semibold select-all">
                                                    {referral.code}
                                                </code>
                                                <div className="space-y-2 text-gray-700 text-sm">
                                                    <p className="flex items-center">
                                                        <FiMail className="mr-2 text-gray-500 text-base" />{" "}
                                                        For:{" "}
                                                        <span className="font-medium ml-1 text-gray-900">
                                                            {referral.candidateEmail}
                                                        </span>
                                                    </p>
                                                    <p className="flex items-center">
                                                        <FiUser className="mr-2 text-gray-500 text-base" />{" "}
                                                        Referrer:{" "}
                                                        <span className="font-medium ml-1 text-gray-900">
                                                            {referral.generatedByAdminUsername}
                                                        </span>
                                                    </p>
                                                    <p className="flex items-center">
                                                        <FiCalendar className="mr-2 text-gray-500 text-base" />{" "}
                                                        Expires:{" "}
                                                        <span className="font-medium ml-1">
                                                            {formatDate(referral.expiresAt)}
                                                        </span>
                                                    </p>
                                                    <p className="flex items-center text-xs text-gray-500 pt-2">
                                                        Generated:{" "}
                                                        <span className="font-medium ml-1">
                                                            {formatDate(referral.createdAt)}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div
                                                className={`mt-5 px-4 py-1.5 text-sm font-bold rounded-full text-center tracking-wide flex items-center justify-center gap-2
                                              ${
                                                referral.status ===
                                                "Already Used"
                                                  ? "bg-green-100 text-green-800 border border-green-200"
                                                  : referral.status ===
                                                    "Unused and Expired"
                                                  ? "bg-red-100 text-red-800 border border-red-200"
                                                  : "bg-orange-100 text-orange-800 border border-orange-200"
                                              }`}
                                            >
                                                <FiTag className="h-4 w-4" /> Status: {referral.status}
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
