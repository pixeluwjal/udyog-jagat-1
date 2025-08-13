'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
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
    FiFilter,
    FiUser,
    FiTag,
    FiMenu,
    FiClipboard,
    FiMessageSquare,
} from 'react-icons/fi';
import ChatModal from '../../seeker/find-referrer/ChatModal';

interface RecentReferral {
    id: string;
    candidateName: string;
    candidateEmail: string;
    referredOn: string;
    referralCode: string;
}

interface ReferralSummary {
    totalReferrals: number;
    recentReferrals: RecentReferral[];
}

interface ReferralCode {
    _id: string;
    code: string;
    candidateEmail: string;
    candidateName: string;
    expiresAt: string;
    isUsed: boolean;
    createdAt: string;
    generatedByAdminUsername: string;
    status: string;
    // New fields for the chat feature
    seekerId?: string;
}

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

export default function ReferrerDashboardPage() {
    const { user: currentUser, loading: authLoading, isAuthenticated, logout, token } = useAuth();
    const router = useRouter();

    const [referralSummary, setReferralSummary] = useState<ReferralSummary | null>(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [dataError, setDataError] = useState<string | null>(null);

    const [generatedReferrals, setGeneratedReferrals] = useState<ReferralCode[]>([]);
    const [loadingReferrals, setLoadingReferrals] = useState(true);
    const [referralsError, setReferralsError] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    // New state for the chat modal
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatPartner, setChatPartner] = useState<ReferralCode | null>(null);

    const formatDate = (isoString: string): string => {
        if (!isoString) return "";
        const date = new Date(isoString);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const fetchReferralSummaryData = useCallback(async (referrerId: string, authToken: string) => {
        setDataLoading(true);
        setDataError(null);
        console.log(`Fetching referrer dashboard summary data for ID: ${referrerId}`);

        try {
            const response = await fetch(`/api/referrer/dashboard-summary?userId=${referrerId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch referral summary data');
            }

            const data: ReferralSummary = await response.json();
            setReferralSummary(data);
            console.log('Referral summary data fetched successfully:', data);

        } catch (error: any) {
            console.error('Error fetching referral summary data:', error);
            setDataError(error.message || 'An unexpected error occurred while loading summary data.');
        } finally {
            setDataLoading(false);
        }
    }, []);

    const fetchGeneratedReferralCodes = useCallback(async () => {
        setLoadingReferrals(true);
        setReferralsError(null);

        if (!token) {
            setReferralsError("Authentication token missing. Cannot fetch referral codes.");
            setLoadingReferrals(false);
            return;
        }

        try {
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
            console.error("Failed to fetch generated referral codes:", err);
            setReferralsError(err.message || "An error occurred while fetching codes.");
        } finally {
            setLoadingReferrals(false);
        }
    }, [token, filterStatus]);

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code)
            .then(() => {
                setCopySuccess("Code copied to clipboard!");
                setTimeout(() => setCopySuccess(null), 2000);
            })
            .catch((err) => {
                console.error("Failed to copy text: ", err);
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

    // New function to open the chat modal
    const handleOpenChat = (referral: ReferralCode) => {
        if (!referral.seekerId) {
            setReferralsError('Cannot open chat: Seeker ID not found for this referral.');
            return;
        }
        setChatPartner(referral);
        setIsChatOpen(true);
    };

    const handleCloseChat = () => {
        setIsChatOpen(false);
        setChatPartner(null);
    };

    useEffect(() => {
        if (authLoading) return;

        if (!isAuthenticated || !currentUser) {
            console.warn('ReferrerDashboardPage: Not authenticated or user missing. Redirecting to /login.');
            router.push('/login');
            return;
        }

        if (currentUser.firstLogin) {
            console.warn('ReferrerDashboardPage: User is firstLogin. Redirecting to /change-password.');
            router.push('/change-password');
            return;
        }

        if (currentUser.role !== 'job_referrer') {
            console.warn(`ReferrerDashboardPage: User role is ${currentUser.role}, not job_referrer. Redirecting.`);
            if (currentUser.role === 'admin') router.push('/admin/dashboard');
            else if (currentUser.role === 'job_poster') router.push('/poster/dashboard');
            else if (currentUser.role === 'job_seeker') router.push('/seeker/dashboard');
            else router.push('/');
            return;
        }

        if (currentUser._id && token) {
            fetchReferralSummaryData(currentUser._id, token);
            fetchGeneratedReferralCodes();
        } else if (currentUser._id && !token) {
            console.error("ReferrerDashboardPage: Authentication token is missing, cannot fetch data.");
            setDataError("Authentication error: Please log in again.");
            setReferralsError("Authentication error: Please log in again.");
            setDataLoading(false);
            setLoadingReferrals(false);
        } else {
            console.error("ReferrerDashboardPage: User ID is missing, cannot fetch data.");
            setDataError("User ID not available to fetch dashboard data.");
            setReferralsError("User ID not available to fetch referral codes.");
            setDataLoading(false);
            setLoadingReferrals(false);
        }
    }, [authLoading, isAuthenticated, currentUser, router, fetchReferralSummaryData, fetchGeneratedReferralCodes, token]);

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
                        Loading referrer dashboard...
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden font-inter">
            <Sidebar
                userRole={currentUser.role}
                onLogout={logout}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />

            <div className="flex-1 flex flex-col overflow-y-auto">
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
                        Referrer Dashboard
                    </h1>
                    <div className="w-6 h-6"></div>
                </div>

                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-7xl mx-auto space-y-10">
                        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-[#4F39F6] to-[#1A3BAD]">
                            Welcome, {currentUser.username || 'Referrer'}!
                        </h1>
                        <p className="text-gray-600 text-lg">
                            Here's an overview of your generated Referral codes and referral activity.
                        </p>

                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={fadeIn}
                            className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-8 transform hover:shadow-2xl transition-all duration-300 ease-out"
                        >
                            <h2 className="text-2xl font-extrabold text-gray-800 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#4F39F6] to-[#1A3BAD]">
                                Referral Summary
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="bg-indigo-50 p-6 rounded-xl shadow-md border border-indigo-100 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-semibold text-indigo-800 mb-2">Total Codes Generated</h3>
                                        {dataLoading ? (
                                            <div className="h-8 w-24 bg-indigo-200 animate-pulse rounded-md"></div>
                                        ) : dataError ? (
                                            <p className="text-red-500 text-sm">{dataError}</p>
                                        ) : (
                                            <p className="text-4xl font-bold text-indigo-600">{referralSummary?.totalReferrals ?? 'N/A'}</p>
                                        )}
                                    </div>
                                    <FiCode className="w-12 h-12 text-indigo-400 opacity-70" />
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={fadeIn}
                            className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-8 transform hover:shadow-2xl transition-all duration-300 ease-out"
                        >
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-[#4F39F6] to-[#1A3BAD]">
                                    Your Generated Referral Codes
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
                                    No Referral codes found for the selected filter.
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
                                                    referral.status === "Already Used"
                                                        ? "bg-green-100 text-green-800 border border-green-200"
                                                        : referral.status === "Unused and Expired"
                                                        ? "bg-red-100 text-red-800 border border-red-200"
                                                        : "bg-orange-100 text-orange-800 border border-orange-200"
                                                }`}
                                            >
                                                <FiTag className="h-4 w-4" /> Status: {referral.status}
                                            </div>
                                            {referral.isUsed && referral.seekerId && (
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => handleOpenChat(referral)}
                                                    className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
                                                >
                                                    <FiMessageSquare className="h-4 w-4" /> Chat with Candidate
                                                </motion.button>
                                            )}
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </motion.div>
                    </div>
                </main>
            </div>
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
            <ChatModal 
                isOpen={isChatOpen} 
                onClose={handleCloseChat} 
                referrer={chatPartner} 
                currentUserId={currentUser._id} 
                currentUsername={currentUser.username || 'Referrer'}
            />
        </div>
    );
}
