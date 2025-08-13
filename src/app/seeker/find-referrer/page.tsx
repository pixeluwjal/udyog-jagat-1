'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Sidebar from '@/app/components/Sidebar';
import Link from 'next/link';
import { FiMenu, FiArrowLeft, FiUserCheck, FiPhone, FiMail, FiLoader, FiXCircle, FiSearch, FiMessageSquare, FiUsers } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import ChatModal from './ChatModal';

interface Referrer {
    _id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    company?: string;
    position?: string;
    profileImage?: string;
}

const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1],
        }
    },
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const cardAnimation = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: "easeOut"
        }
    }
};

const pulseEffect = {
    scale: [1, 1.03, 1],
    opacity: [0.8, 1, 0.8],
    transition: {
        duration: 1.2,
        repeat: Infinity,
        ease: "easeInOut"
    }
};

export default function FindReferrerPage() {
    const { user, loading: authLoading, isAuthenticated, logout, token } = useAuth();
    const router = useRouter();

    const [referrers, setReferrers] = useState<Referrer[]>([]);
    const [filteredReferrers, setFilteredReferrers] = useState<Referrer[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [referrerLoading, setReferrerLoading] = useState(false);
    const [referrerError, setReferrerError] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    // State for the chat modal
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [selectedReferrer, setSelectedReferrer] = useState<Referrer | null>(null);

    useEffect(() => {
        if (authLoading) return;

        if (!isAuthenticated || !user) {
            router.push('/login');
            return;
        }

        if (user.firstLogin) {
            router.push('/change-password');
            return;
        }
        
        if (user.role !== 'job_seeker') {
            if (user.role === 'admin') router.push('/admin/dashboard');
            else if (user.role === 'job_poster') router.push('/poster/dashboard');
            else if (user.role === 'job_referrer') router.push('/referrer/dashboard');
            else router.push('/');
        }

        if (user.role === 'job_seeker' && user.onboardingStatus !== 'completed') {
            router.push('/seeker/onboarding');
        }
    }, [authLoading, isAuthenticated, user, router]);

    const fetchAllReferrers = useCallback(async () => {
        if (!token) {
            setReferrerError('Authentication token or user ID not available.');
            return;
        }

        setReferrerLoading(true);
        setReferrerError(null);
        try {
            const response = await fetch(`/api/referrers`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch referrers.');
            }

            setReferrers(data.referrers);
            setFilteredReferrers(data.referrers);
            setReferrerError(null);
        } catch (err: any) {
            console.error('Failed to fetch referrers:', err);
            setReferrerError(err.message || 'An unexpected error occurred while fetching referrers.');
            setReferrers([]);
            setFilteredReferrers([]);
        } finally {
            setReferrerLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredReferrers(referrers);
        } else {
            const filtered = referrers.filter(referrer => {
                const searchLower = searchTerm.toLowerCase();
                return (
                    referrer.username?.toLowerCase().includes(searchLower) ||
                    referrer.firstName?.toLowerCase().includes(searchLower) ||
                    referrer.lastName?.toLowerCase().includes(searchLower) ||
                    referrer.email?.toLowerCase().includes(searchLower) ||
                    referrer.company?.toLowerCase().includes(searchLower) ||
                    referrer.position?.toLowerCase().includes(searchLower)
                );
            });
            setFilteredReferrers(filtered);
        }
    }, [searchTerm, referrers]);

    const getInitials = (firstName: string | undefined, lastName: string | undefined, username: string) => {
        if (firstName && lastName) {
            return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
        }
        if (firstName) {
            return firstName.charAt(0).toUpperCase();
        }
        return username.charAt(0).toUpperCase();
    };

    const handleOpenChat = (referrer: Referrer) => {
        setSelectedReferrer(referrer);
        setIsChatOpen(true);
    };

    const handleCloseChat = () => {
        setIsChatOpen(false);
        setSelectedReferrer(null);
    };

    useEffect(() => {
        if (!authLoading && isAuthenticated && user?.role === 'job_seeker' && user?.onboardingStatus === 'completed') {
            fetchAllReferrers();
        }
    }, [authLoading, isAuthenticated, user, fetchAllReferrers]);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    if (
        authLoading ||
        !isAuthenticated ||
        !user ||
        user.firstLogin ||
        user.role !== 'job_seeker' ||
        user.onboardingStatus !== 'completed'
    ) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 justify-center items-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center"
                >
                    <motion.div
                        animate={pulseEffect}
                        className="rounded-full p-4 bg-indigo-500/10 shadow-inner"
                    >
                        <FiLoader className="text-indigo-600 h-12 w-12 animate-spin" />
                    </motion.div>
                    <p className="mt-6 text-lg font-medium text-indigo-900">
                        Loading page...
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden font-inter">
            <Sidebar userRole={user.role} onLogout={logout} isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
            
            <div className="flex-1 flex flex-col overflow-y-auto">
                {/* Mobile Header */}
                <div className="md:hidden bg-white shadow-sm p-4 flex items-center justify-between sticky top-0 z-10">
                    <button
                        onClick={toggleSidebar}
                        className="p-2 rounded-md text-indigo-700 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-all duration-200"
                        aria-label="Open sidebar"
                    >
                        <FiMenu className="h-6 w-6" />
                    </button>
                    <h1 className="text-xl font-bold text-indigo-800">
                        Connect with Referrers
                    </h1>
                    <div className="w-6"></div>
                </div>

                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-6xl mx-auto space-y-8">
                        {/* Page Header */}
                        <motion.div 
                            initial="hidden" 
                            animate="visible" 
                            variants={fadeIn} 
                            className="flex flex-col space-y-6"
                        >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                                        Find Referrer
                                    </h1>
                                    <p className="text-gray-600 mt-2">
                                        Connect with professionals who can help you land your next job.
                                    </p>
                                </div>
                                <Link href="/seeker/dashboard" passHref>
                                    <motion.button 
                                        whileHover={{ scale: 1.02 }} 
                                        whileTap={{ scale: 0.98 }} 
                                        className="flex items-center gap-2 px-5 py-3 bg-white border border-indigo-200 text-indigo-700 rounded-lg shadow-sm hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-200 font-medium"
                                    >
                                        <FiArrowLeft className="h-5 w-5" />
                                        Back to Dashboard
                                    </motion.button>
                                </Link>
                            </div>

                            {/* Search Bar */}
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiSearch className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search referrers by name, username, company, or position..."
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </motion.div>

                        {/* Content Section */}
                        <motion.div 
                            initial="hidden" 
                            animate="visible" 
                            variants={fadeIn} 
                            className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                    <FiUsers className="text-indigo-600" />
                                    Available Referrers
                                </h2>
                                {filteredReferrers.length > 0 && (
                                    <span className="bg-indigo-100 text-indigo-800 text-sm font-medium px-3 py-1 rounded-full">
                                        {filteredReferrers.length} {filteredReferrers.length === 1 ? 'referrer' : 'referrers'}
                                    </span>
                                )}
                            </div>

                            <AnimatePresence mode="wait">
                                {referrerLoading ? (
                                    <motion.div 
                                        key="loading"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center justify-center py-12"
                                    >
                                        <motion.div
                                            animate={pulseEffect}
                                            className="mb-4"
                                        >
                                            <FiLoader className="text-indigo-600 h-10 w-10 animate-spin" />
                                        </motion.div>
                                        <p className="text-gray-600">Loading referrers...</p>
                                    </motion.div>
                                ) : referrerError ? (
                                    <motion.div
                                        key="error"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3"
                                    >
                                        <FiXCircle className="text-red-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <h3 className="font-medium text-red-800">Error loading referrers</h3>
                                            <p className="text-red-600 text-sm">{referrerError}</p>
                                            <button 
                                                onClick={fetchAllReferrers}
                                                className="mt-2 text-sm font-medium text-red-700 hover:text-red-800 underline"
                                            >
                                                Try again
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : filteredReferrers.length > 0 ? (
                                    <motion.div 
                                        key="referrers-list"
                                        variants={staggerContainer}
                                        initial="hidden"
                                        animate="visible"
                                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                    >
                                        {filteredReferrers.map((referrerItem) => (
                                            <motion.div 
                                                key={referrerItem._id}
                                                variants={cardAnimation}
                                                whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                                                className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col md:flex-row items-start md:items-center gap-4"
                                            >
                                                {referrerItem.profileImage ? (
                                                    <img src={referrerItem.profileImage} alt={`${referrerItem.firstName} ${referrerItem.lastName}`} className="h-12 w-12 rounded-full object-cover" />
                                                ) : (
                                                    <div className="flex-shrink-0 h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium text-lg">
                                                        {getInitials(referrerItem.firstName, referrerItem.lastName, referrerItem.username)}
                                                    </div>
                                                )}
                                                
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-lg font-bold text-gray-900">{referrerItem.firstName} {referrerItem.lastName}</h3>
                                                    <p className="text-sm text-gray-500 truncate mb-2">@{referrerItem.username}</p>
                                                    {referrerItem.position && referrerItem.company && (
                                                        <p className="text-sm text-gray-600 truncate">{referrerItem.position} at {referrerItem.company}</p>
                                                    )}
                                                    <div className="mt-4 text-sm space-y-1 text-gray-600">
                                                        <div className="flex items-center gap-2">
                                                            <FiMail className="text-indigo-500 flex-shrink-0" />
                                                            <span className="truncate">{referrerItem.email}</span>
                                                        </div>
                                                        {referrerItem.phone && (
                                                            <div className="flex items-center gap-2">
                                                                <FiPhone className="text-indigo-500 flex-shrink-0" />
                                                                <span>{referrerItem.phone}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-4 md:mt-0 flex-shrink-0">
                                                    <motion.button 
                                                        whileHover={{ scale: 1.05 }} 
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => handleOpenChat(referrerItem)}
                                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
                                                    >
                                                        <FiMessageSquare className="h-4 w-4" /> 
                                                        Start Conversation
                                                    </motion.button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="no-referrers"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex flex-col items-center justify-center py-12 text-center"
                                    >
                                        <div className="bg-indigo-50 p-4 rounded-full mb-4">
                                            <FiUsers className="h-8 w-8 text-indigo-600" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-1">No referrers found</h3>
                                        <p className="text-gray-500 max-w-md">
                                            {searchTerm.trim() ? 
                                                "No referrers match your search criteria. Try different keywords." : 
                                                "There are currently no referrers available. Please check back later."}
                                        </p>
                                        {searchTerm.trim() && (
                                            <button 
                                                onClick={() => setSearchTerm('')}
                                                className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-700 underline"
                                            >
                                                Clear search
                                            </button>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                </main>
            </div>
            
            <ChatModal isOpen={isChatOpen} onClose={handleCloseChat} referrer={selectedReferrer} />
        </div>
    );
}
