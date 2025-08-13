'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar';
import {
    FiSearch, FiFilter, FiXCircle, FiCheckCircle, FiLoader, FiChevronLeft, FiMenu,
    FiBriefcase, FiMapPin, FiUsers, FiRefreshCcw, FiEdit, FiDollarSign, FiClock,
    FiPlus, FiChevronDown, FiPower, FiZapOff, FiLink
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import Head from 'next/head';

// --- Improved Color Palette ---
const primaryBlue = "#165BF8";
const darkBlue = "#1C3991";
const lightBlue = "#E9F2FF";
const blueGray900 = "#1F2937";
const blueGray600 = "#4B5563";

// Framer Motion animation variants
const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1],
            delay: 0.1
        }
    },
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

interface JobDisplay {
    _id: string;
    title: string;
    description: string;
    location: string;
    salary?: string | number;
    status: 'active' | 'inactive' | 'closed';
    numberOfOpenings: number;
    company: string;
    jobType: string;
    createdAt: string;
    postedBy: string;
}

export default function PostedJobsPage() {
    const { user, loading: authLoading, isAuthenticated, logout, token } = useAuth();
    const router = useRouter();

    const [jobs, setJobs] = useState<JobDisplay[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'closed'>('all');
    const [minOpenings, setMinOpenings] = useState<number | ''>('');
    const [maxOpenings, setMaxOpenings] = useState<number | ''>('');

    // --- Redirection Logic ---
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
        if (user.role !== 'job_poster') {
            if (user.role === 'admin') router.push('/admin/dashboard');
            else if (user.role === 'job_seeker') router.push('/seeker/dashboard');
            else router.push('/');
            return;
        }
    }, [authLoading, isAuthenticated, user, router]);

    // --- Fetch Jobs Logic ---
    const fetchJobs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token || !user?._id) {
                throw new Error('Authentication token or user ID not available. Please log in again.');
            }
            const queryParams = new URLSearchParams();
            queryParams.append('postedBy', user._id);
            queryParams.append('sortBy', 'createdAt');
            queryParams.append('sortOrder', 'desc');

            if (searchTerm) queryParams.append('search', searchTerm);
            if (statusFilter !== 'all') queryParams.append('status', statusFilter);
            if (minOpenings !== '') queryParams.append('minOpenings', String(minOpenings));
            if (maxOpenings !== '') queryParams.append('maxOpenings', String(maxOpenings));

            const response = await fetch(`/api/jobs?${queryParams.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch jobs');
            }

            if (Array.isArray(data.jobs)) {
                setJobs(data.jobs);
            } else {
                setError('Failed to fetch jobs: Invalid data format from server.');
                setJobs([]);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load job data.');
        } finally {
            setLoading(false);
        }
    }, [token, user, searchTerm, statusFilter, minOpenings, maxOpenings]);

    // --- API to toggle job status ---
    const handleToggleJobStatus = async (jobId: string, currentStatus: string) => {
        if (!jobId) {
            console.error('Invalid jobId provided. Aborting status update.');
            return;
        }
        if (!token) {
            setError('Authentication token missing. Please log in again.');
            return;
        }

        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        setLoading(true);

        try {
            const response = await fetch(`/api/jobs/${jobId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to update job status to ${newStatus}`);
            }

            setJobs(prevJobs =>
                prevJobs.map(job =>
                    job._id === jobId ? { ...job, status: newStatus as JobDisplay['status'] } : job
                )
            );
        } catch (err: any) {
            console.error('Error toggling job status:', err);
            setError(err.message || 'Failed to toggle job status.');
        } finally {
            setLoading(false);
        }
    };

    // Trigger job fetching when authentication state is ready and user is a job_poster, or when filters change
    useEffect(() => {
        if (!authLoading && isAuthenticated && user && user.role === 'job_poster') {
            fetchJobs();
        }
    }, [authLoading, isAuthenticated, user, fetchJobs]);

    const handleApplyFilters = () => {
        fetchJobs();
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setMinOpenings('');
        setMaxOpenings('');
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    // --- Loading and Unauthorized State Display ---
    if (authLoading || !isAuthenticated || !user || user.firstLogin || user.role !== 'job_poster') {
        return (
            <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] justify-center items-center font-inter">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center"
                >
                    <motion.div
                        animate={pulseEffect}
                        className="rounded-full p-4 bg-[#165BF8]/10 shadow-inner"
                    >
                        <FiLoader className="text-[#165BF8] h-12 w-12 animate-spin" />
                    </motion.div>
                    <p className="mt-6 text-lg font-medium text-[#1C3991]">
                        Loading page...
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] overflow-hidden font-inter">
            <Head>
                <title>Your Posted Jobs - JobConnect</title>
            </Head>
            <Sidebar userRole={user.role} onLogout={logout} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex-1 flex flex-col overflow-y-auto">
                {/* Mobile Header */}
                <div className="md:hidden bg-white/95 backdrop-blur-md shadow-sm p-4 flex items-center justify-between relative z-10">
                    <button
                        onClick={toggleSidebar}
                        className="p-2 rounded-lg text-[#165BF8] hover:bg-[#165BF8]/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#165BF8]"
                        aria-label="Open sidebar"
                    >
                        <FiMenu className="h-6 w-6" />
                    </button>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent text-center absolute left-1/2 -translate-x-1/2">
                        Your Posted Jobs
                    </h1>
                    <div className="h-6 w-6"></div>
                </div>

                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-7xl mx-auto space-y-8">
                        {/* Header Section */}
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={fadeIn}
                            className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between"
                        >
                            <div>
                                <h1 className="text-3xl md:text-4xl font-extrabold text-[#1F2937] leading-tight">
                                    <span className="bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent">
                                        Your Posted Jobs
                                    </span>
                                </h1>
                                <p className="text-gray-500 text-lg mt-1">Manage and track your job listings</p>
                            </div>
                            <Link href="/poster/new-job" passHref>
                                <motion.button
                                    whileHover={{ scale: 1.02, boxShadow: `0 8px 16px ${primaryBlue}20` }}
                                    whileTap={{ scale: 0.98 }}
                                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-md text-white bg-gradient-to-r from-[#165BF8] to-[#1C3991] hover:from-[#1a65ff] hover:to-[#2242a8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#165BF8]/50 transition-all duration-200"
                                >
                                    <FiPlus className="mr-2 h-5 w-5" />
                                    Post New Job
                                </motion.button>
                            </Link>
                        </motion.div>

                        {/* Search and Filter Section */}
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={fadeIn}
                            className="bg-white shadow-lg rounded-2xl p-6 border border-[#165BF8]/10"
                        >
                            <h2 className="text-xl font-semibold text-[#1F2937] mb-5 flex items-center">
                                <FiFilter className="mr-2 text-[#165BF8]" /> Filter Jobs
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Search by Title */}
                                <div>
                                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search Title</label>
                                    <div className="relative rounded-xl shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FiSearch className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            name="search"
                                            id="search"
                                            className="focus:ring-[#165BF8] focus:border-[#165BF8] block w-full pl-10 pr-3 py-2 sm:text-sm border-gray-300 rounded-xl transition-all duration-200"
                                            placeholder="Job title..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleApplyFilters();
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Status Filter */}
                                <div>
                                    <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <div className="relative">
                                        <select
                                            id="statusFilter"
                                            name="statusFilter"
                                            className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] rounded-xl shadow-sm transition-all duration-200 appearance-none"
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive' | 'closed')}
                                        >
                                            <option value="all">All Statuses</option>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                            <FiChevronDown className="h-5 w-5" />
                                        </div>
                                    </div>
                                </div>

                                {/* Min Openings Filter */}
                                <div>
                                    <label htmlFor="minOpenings" className="block text-sm font-medium text-gray-700 mb-1">Min Openings</label>
                                    <input
                                        type="number"
                                        name="minOpenings"
                                        id="minOpenings"
                                        className="focus:ring-[#165BF8] focus:border-[#165BF8] block w-full py-2 sm:text-sm border-gray-300 rounded-xl shadow-sm transition-all duration-200"
                                        placeholder="e.g., 1"
                                        value={minOpenings}
                                        onChange={(e) => setMinOpenings(e.target.value === '' ? '' : Number(e.target.value))}
                                        min="0"
                                    />
                                </div>

                                {/* Max Openings Filter */}
                                <div>
                                    <label htmlFor="maxOpenings" className="block text-sm font-medium text-gray-700 mb-1">Max Openings</label>
                                    <input
                                        type="number"
                                        name="maxOpenings"
                                        id="maxOpenings"
                                        className="focus:ring-[#165BF8] focus:border-[#165BF8] block w-full py-2 sm:text-sm border-gray-300 rounded-xl shadow-sm transition-all duration-200"
                                        placeholder="e.g., 10"
                                        value={maxOpenings}
                                        onChange={(e) => setMaxOpenings(e.target.value === '' ? '' : Number(e.target.value))}
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                                <motion.button
                                    type="button"
                                    onClick={handleClearFilters}
                                    whileHover={{ scale: 1.02, backgroundColor: lightBlue }}
                                    whileTap={{ scale: 0.98 }}
                                    className="inline-flex items-center px-5 py-2 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#165BF8]/50 transition-all duration-200"
                                >
                                    <FiRefreshCcw className="mr-2 h-4 w-4" /> Clear Filters
                                </motion.button>
                                <motion.button
                                    type="button"
                                    onClick={handleApplyFilters}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="inline-flex items-center px-5 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-[#165BF8] to-[#1C3991] hover:from-[#1a65ff] hover:to-[#2242a8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#165BF8]/50 transition-all duration-200"
                                >
                                    <FiFilter className="mr-2 h-4 w-4" /> Apply Filters
                                </motion.button>
                            </div>
                        </motion.div>

                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg shadow-md"
                                    role="alert"
                                >
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <FiXCircle className="h-5 w-5 text-red-500" />
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm text-red-700 font-medium">{error}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {loading ? (
                            <div className="flex justify-center items-center py-12 bg-white rounded-2xl shadow-lg border border-[#165BF8]/10">
                                <motion.div
                                    animate={pulseEffect}
                                    className="p-3 bg-[#165BF8]/10 rounded-full"
                                >
                                    <FiLoader className="text-[#165BF8] h-10 w-10 animate-spin" />
                                </motion.div>
                            </div>
                        ) : jobs.length === 0 ? (
                            <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-[#165BF8]/10">
                                <div className="mx-auto w-24 h-24 bg-[#165BF8]/5 rounded-full flex items-center justify-center mb-4">
                                    <FiBriefcase className="h-10 w-10 text-[#165BF8]/70" />
                                </div>
                                <h3 className="mt-2 text-2xl font-semibold text-[#1F2937]">No jobs found</h3>
                                <p className="mt-1 text-sm text-gray-500">You haven't posted any jobs that match the filters.</p>
                                <div className="mt-6">
                                    <Link href="/poster/new-job" passHref>
                                        <motion.button
                                            whileHover={{ scale: 1.05, boxShadow: `0 8px 16px ${primaryBlue}20` }}
                                            whileTap={{ scale: 0.95 }}
                                            className="inline-flex items-center px-6 py-3 border border-transparent shadow-md text-base font-medium rounded-xl text-white bg-gradient-to-r from-[#165BF8] to-[#1C3991] hover:from-[#1a65ff] hover:to-[#2242a8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#165BF8]/50 transition-all duration-200"
                                        >
                                            <FiPlus className="w-5 h-5 mr-2" />
                                            Post Your First Job
                                        </motion.button>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {jobs.map((job) => (
                                    <motion.div
                                        key={job._id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                        whileHover={{ y: -3, boxShadow: `0 8px 16px ${primaryBlue}15` }}
                                        className="bg-white border border-[#165BF8]/10 rounded-2xl overflow-hidden shadow-sm transition-all duration-200"
                                    >
                                        <div className="p-6 flex flex-col h-full">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <h3 className="text-xl font-bold text-[#1F2937] leading-snug">{job.title}</h3>
                                                    <p className="text-sm text-gray-500 mt-1">{job.company}</p>
                                                </div>
                                                <span
                                                    className={`ml-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm
                                                    ${
                                                        job.status === 'active'
                                                            ? 'bg-green-100 text-green-800'
                                                            : job.status === 'closed'
                                                                ? 'bg-red-100 text-red-800'
                                                                : 'bg-yellow-100 text-yellow-800'
                                                    }`}
                                                >
                                                    {(job.status || 'inactive').charAt(0).toUpperCase() + (job.status || 'inactive').slice(1)}
                                                </span>
                                            </div>

                                            <p className="text-gray-600 text-sm line-clamp-3 mb-4">{job.description}</p>

                                            <div className="flex-grow grid grid-cols-2 gap-4 mt-auto text-sm text-gray-600">
                                                <div className="flex items-center">
                                                    <FiMapPin className="flex-shrink-0 mr-2 h-5 w-5 text-[#165BF8]/70" />
                                                    <span>{job.location}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    {job.salary ? (
                                                        <>
                                                            <span className="flex-shrink-0 mr-1.5 font-medium text-lg text-green-600/70">₹</span>
                                                            <span>
                                                                {typeof job.salary === 'number'
                                                                    ? job.salary.toLocaleString('en-IN')
                                                                    : job.salary}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-400 italic">
                                                            <span className="sr-only">Salary: </span>
                                                            Not Specified
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center">
                                                    <FiUsers className="flex-shrink-0 mr-2 h-5 w-5 text-[#165BF8]/70" />
                                                    <span>Openings: {job.numberOfOpenings}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <FiClock className="flex-shrink-0 mr-2 h-5 w-5 text-[#165BF8]/70" />
                                                    <span>Posted: {new Date(job.createdAt).toLocaleDateString('en-GB')}</span>
                                                </div>
                                            </div>

                                            <div className="mt-6 flex flex-wrap justify-between items-center gap-3 border-t border-gray-100 pt-4">
                                                {job.status !== 'closed' && (
                                                    <motion.button
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => handleToggleJobStatus(job._id, job.status)}
                                                        className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm transition-all duration-200 w-full sm:w-auto
                                                            ${job.status === 'active'
                                                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                                                : 'bg-green-500 hover:bg-green-600 text-white'
                                                            }`}
                                                    >
                                                        {job.status === 'active' ? (
                                                            <>
                                                                <FiZapOff className="mr-2 h-4 w-4" /> Deactivate
                                                            </>
                                                        ) : (
                                                            <>
                                                                <FiPower className="mr-2 h-4 w-4" /> Activate
                                                            </>
                                                        )}
                                                    </motion.button>
                                                )}

                                                <div className="flex-1 flex justify-end gap-3 w-full sm:w-auto">
                                                    <Link href={`/poster/jobs/${job._id}/edit`} passHref>
                                                        <motion.button
                                                            whileHover={{ scale: 1.05, backgroundColor: lightBlue }}
                                                            whileTap={{ scale: 0.98 }}
                                                            className="inline-flex items-center justify-center p-2 border border-gray-300 text-sm font-medium rounded-xl shadow-sm text-gray-700 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#165BF8]/50 transition-all duration-200"
                                                        >
                                                            <FiEdit className="h-5 w-5" />
                                                        </motion.button>
                                                    </Link>
                                                    <Link href={`/poster/applications?jobId=${job._id}`} passHref>
                                                        <motion.button
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-[#165BF8] hover:bg-[#1a65ff] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#165BF8]/50 transition-all duration-200"
                                                        >
                                                            <FiUsers className="mr-2 h-4 w-4" /> Applications
                                                        </motion.button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}