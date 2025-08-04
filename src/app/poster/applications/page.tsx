'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Sidebar from '@/app/components/Sidebar';
import Link from 'next/link';
import { FiSearch, FiFilter, FiXCircle, FiCheckCircle, FiLoader, FiChevronLeft, FiMenu, FiUser, FiMail, FiBriefcase, FiCalendar, FiDollarSign, FiRefreshCcw, FiMapPin, FiPhone, FiChevronDown } from 'react-icons/fi'; // Added FiPhone for phone number
import { motion, AnimatePresence } from 'framer-motion';

// Brand colors
const primaryBlue = "#165BF8";
const darkBlue = "#1C3991";

// Interface for displaying application data - UPDATED STATUS ENUM AND ADDED JOB OPENINGS
interface Application {
    _id: string;
    job: {
        _id: string;
        title: string;
        description: string;
        location: string;
        salary: number;
        postedBy: string;
        numberOfOpenings: number; // Added for display if needed
    };
    applicant: {
        _id: string;
        username?: string;
        email: string;
        candidateDetails?: {
            fullName?: string;
            phone?: string;
            skills?: string[];
            experience?: string;
        };
        resumeGridFsId?: string;
    } | null;
    status: 'Received' | 'Interview Scheduled' | 'Rejected' | 'Hired'; // UPDATED STATUS ENUM
    appliedAt: string;
}

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

export default function ApplicationsPage() {
    const { user, loading: authLoading, isAuthenticated, token, logout } = useAuth();
    const router = useRouter();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'Received' | 'Interview Scheduled' | 'Rejected' | 'Hired'>('all');

    const fetchApplications = useCallback(async () => {
        if (!token) {
            setError('Authentication token missing. Please log in again.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            if (searchTerm) {
                queryParams.append('search', searchTerm);
            }
            if (statusFilter !== 'all') {
                queryParams.append('status', statusFilter);
            }
            queryParams.append('sortBy', 'appliedAt');
            queryParams.append('sortOrder', 'desc');

            const response = await fetch(`/api/applications?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch applications');
            }

            const data = await response.json();
            setApplications(Array.isArray(data.applications) ? data.applications : []);
        } catch (err: any) {
            console.error('Error fetching applications:', err);
            setError(err.message || 'An unexpected error occurred while fetching applications.');
            setApplications([]);
        } finally {
            setLoading(false);
        }
    }, [token, searchTerm, statusFilter, user]);

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
            if (user.role === 'admin') {
                router.push('/admin/dashboard');
            } else {
                router.push('/seeker/dashboard');
            }
            return;
        }

        fetchApplications();
    }, [authLoading, isAuthenticated, user, router, fetchApplications]);

    const updateApplicationStatus = async (id: string, newStatus: Application['status']) => {
        try {
            const response = await fetch(`/api/applications/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update status');
            }

            fetchApplications();
            console.log(`Application ${id} status updated to ${newStatus}`);
        } catch (err: any) {
            console.error('Error updating application status:', err);
            setError(err.message || 'Failed to update application status.');
        }
    };

    const handleViewResume = async (resumeGridFsId: string) => {
        if (!token) {
            setError('Authentication token missing. Please log in again.');
            return;
        }

        try {
            const response = await fetch(`/api/resumes/${resumeGridFsId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch resume');
            }

            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
            window.URL.revokeObjectURL(blobUrl);

        } catch (err: any) {
            console.error('Error viewing resume:', err);
            setError(err.message || 'An unexpected error occurred while viewing resume.');
        }
    };

    const handleApplyFilters = () => {
        fetchApplications();
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        fetchApplications();
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

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
                        Loading applications...
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] overflow-hidden font-inter">
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
                        Job Applications
                    </h1>
                    <div className="h-6 w-6"></div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-7xl mx-auto space-y-8">
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={fadeIn}
                            className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4"
                        >
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-[#1C3991] leading-tight">
                                    <span className="bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent">
                                        Job Applications
                                    </span>
                                </h1>
                                <p className="text-[#165BF8] text-lg mt-2">Review and manage applications for your posted jobs</p>
                            </div>
                            <Link
                                href="/poster/dashboard"
                                className="px-4 py-2 bg-white border border-[#165BF8]/20 rounded-xl shadow-sm text-sm font-medium text-[#1C3991] hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#165BF8] transition-all duration-200 flex items-center justify-center w-full sm:w-auto"
                            >
                                <FiChevronLeft className="w-5 h-5 mr-2" />
                                Back to Dashboard
                            </Link>
                        </motion.div>

                        {/* Search and Filter Section */}
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={fadeIn}
                            className="bg-white shadow-lg rounded-2xl p-6 border border-[#165BF8]/10 mb-8"
                        >
                            <h2 className="text-xl font-semibold text-[#1C3991] mb-5 flex items-center">
                                <FiFilter className="mr-2 text-[#165BF8]" /> Filter Applications
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Search by Applicant/Job Title */}
                                <div>
                                    <label htmlFor="search" className="block text-sm font-medium text-[#1C3991] mb-1">Search (Applicant/Job Title)</label>
                                    <div className="relative rounded-xl shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FiSearch className="h-5 w-5 text-[#165BF8]/70" aria-hidden="true" />
                                        </div>
                                        <input
                                            type="text"
                                            name="search"
                                            id="search"
                                            className="focus:ring-[#165BF8] focus:border-[#165BF8] block w-full pl-10 pr-3 py-2 sm:text-sm border-[#165BF8]/20 rounded-xl transition-all duration-200"
                                            placeholder="Applicant name, email, or job title..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Status Filter */}
                                <div>
                                    <label htmlFor="statusFilter" className="block text-sm font-medium text-[#1C3991] mb-1">Application Status</label>
                                    <div className="relative">
                                        <select
                                            id="statusFilter"
                                            name="statusFilter"
                                            className="block w-full pl-3 pr-10 py-2 text-sm border-[#165BF8]/20 focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] rounded-xl shadow-sm transition-all duration-200 appearance-none"
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value as Application['status'] | 'all')}
                                        >
                                            <option value="all">All Statuses</option>
                                            <option value="Received">Received</option>
                                            <option value="Interview Scheduled">Interview Scheduled</option>
                                            <option value="Rejected">Rejected</option>
                                            <option value="Hired">Hired</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#165BF8]">
                                            <FiChevronDown className="h-5 w-5" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                                <motion.button
                                    type="button"
                                    onClick={handleClearFilters}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="inline-flex items-center px-5 py-2 border border-[#165BF8]/30 rounded-xl shadow-sm text-sm font-medium text-[#1C3991] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#165BF8]/50 transition-all duration-200"
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
                        ) : applications.length === 0 ? (
                            <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-[#165BF8]/10">
                                <div className="mx-auto w-24 h-24 bg-[#165BF8]/5 rounded-full flex items-center justify-center mb-4">
                                    <FiBriefcase className="h-10 w-10 text-[#165BF8]/70" />
                                </div>
                                <h3 className="mt-2 text-lg font-medium text-[#1C3991]">No applications found</h3>
                                <p className="mt-1 text-sm text-[#165BF8]">You haven't received any applications for your posted jobs that match the filters.</p>
                                <div className="mt-6">
                                    <Link
                                        href="/poster/new-job"
                                        className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-xl text-white bg-[#165BF8] hover:bg-[#1a65ff] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#165BF8]/50 transition-all duration-200"
                                    >
                                        <FiBriefcase className="-ml-1 mr-2 h-5 w-5" />
                                        Post New Job
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white shadow-lg rounded-2xl overflow-hidden border border-[#165BF8]/10">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-[#165BF8]/10">
                                        <thead className="bg-[#165BF8]/5">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#1C3991] uppercase tracking-wider">Job Title</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#1C3991] uppercase tracking-wider">Applicant</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#1C3991] uppercase tracking-wider">Applied On</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#1C3991] uppercase tracking-wider">Status</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#1C3991] uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-[#165BF8]/10">
                                            {applications.map((application) => {
                                                const isStatusFinal = application.status === 'Hired' || application.status === 'Rejected';
                                                const statusColor =
                                                    application.status === 'Hired' ? 'bg-green-100 text-green-800' :
                                                    application.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                    application.status === 'Interview Scheduled' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-yellow-100 text-yellow-800';

                                                return (
                                                    <motion.tr 
                                                        key={application._id} 
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                        whileHover={{ backgroundColor: `rgba(22, 91, 248, 0.05)` }}
                                                        className="transition-all duration-200"
                                                    >
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-[#1C3991]">{application.job.title}</div>
                                                            <div className="text-xs text-gray-600 flex items-center mt-1">
                                                                <FiMapPin className="inline-block mr-1.5 text-[#165BF8]/70" />{application.job.location}
                                                            </div>
                                                            <div className="text-xs text-gray-600 flex items-center mt-1">
                                                                <FiDollarSign className="inline-block mr-1.5 text-[#165BF8]/70" />₹{application.job.salary.toLocaleString('en-IN')}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <div>
                                                                    <div className="text-sm font-medium text-[#1C3991] flex items-center">
                                                                        <FiUser className="inline-block mr-1.5 text-[#165BF8]/70" />
                                                                        {application.applicant?.candidateDetails?.fullName || application.applicant?.username || 'N/A'}
                                                                    </div>
                                                                    <div className="text-sm text-gray-600 flex items-center mt-1">
                                                                        <FiMail className="inline-block mr-1.5 text-[#165BF8]/70" />
                                                                        {application.applicant?.email || 'N/A'}
                                                                    </div>
                                                                    {application.applicant?.candidateDetails?.phone && (
                                                                        <div className="text-sm text-gray-600 flex items-center mt-1">
                                                                            <FiPhone className="inline-block mr-1.5 text-[#165BF8]/70" />
                                                                            {application.applicant.candidateDetails.phone}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-600 flex items-center">
                                                                <FiCalendar className="inline-block mr-1.5 text-[#165BF8]/70" />
                                                                {new Date(application.appliedAt).toLocaleDateString('en-GB')}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full shadow-sm ${statusColor}`}>
                                                                {application.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                            <div className="flex flex-col space-y-2 items-start">
                                                                {application.applicant?.resumeGridFsId && (
                                                                    <motion.button
                                                                        whileHover={{ scale: 1.05 }}
                                                                        whileTap={{ scale: 0.95 }}
                                                                        onClick={() => handleViewResume(application.applicant!.resumeGridFsId!)}
                                                                        className="text-[#1C3991] hover:text-[#165BF8] flex items-center bg-transparent border border-[#165BF8]/30 hover:border-[#165BF8] px-3 py-1 rounded-md transition-all duration-200 text-sm"
                                                                        title="View Applicant's Resume"
                                                                    >
                                                                        <FiBriefcase className="w-4 h-4 mr-1.5" />
                                                                        Resume
                                                                    </motion.button>
                                                                )}
                                                                <div className="relative inline-block text-left">
                                                                    <select
                                                                        value={application.status}
                                                                        onChange={(e) => updateApplicationStatus(application._id, e.target.value as Application['status'])}
                                                                        disabled={isStatusFinal}
                                                                        className={`block w-full pl-3 pr-10 py-2 text-sm border-[#165BF8]/20 focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] rounded-xl shadow-sm transition-all duration-200 appearance-none ${isStatusFinal ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}`}
                                                                    >
                                                                        <option value="Received">Received</option>
                                                                        <option value="Interview Scheduled">Interview Scheduled</option>
                                                                        <option value="Rejected">Rejected</option>
                                                                        <option value="Hired">Hired</option>
                                                                    </select>
                                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#165BF8]/70">
                                                                        <FiChevronDown className="h-5 w-5" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
