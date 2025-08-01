// app/poster/posted-jobs/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar';
import { FiSearch, FiFilter, FiXCircle, FiCheckCircle, FiLoader, FiChevronLeft, FiMenu, FiBriefcase, FiMapPin, FiUsers, FiRefreshCcw, FiEdit } from 'react-icons/fi'; // Removed FiDollarSign as it's replaced by a custom SVG for INR

// Interface for displaying job data - UPDATED
interface JobDisplay {
    _id: string;
    title: string;
    description: string;
    location: string;
    salary: number;
    status: 'active' | 'inactive' | 'closed';
    numberOfOpenings: number; // NEW: Number of openings
    company: string; // Added company for display
    jobType: string; // Added jobType for display
    createdAt: string;
    postedBy: string; // ID of the poster
}

export default function PostedJobsPage() {
    const { user, loading: authLoading, isAuthenticated, logout, token } = useAuth();
    const router = useRouter();

    const [jobs, setJobs] = useState<JobDisplay[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for mobile sidebar

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
            else router.push('/'); // Fallback for unhandled roles
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
            queryParams.append('postedBy', user._id); // Filter jobs by the currently logged-in job poster
            queryParams.append('sortBy', 'createdAt'); // Sort by creation date
            queryParams.append('sortOrder', 'desc');    // Newest jobs first

            // Add filters to query parameters
            if (searchTerm) {
                queryParams.append('search', searchTerm);
            }
            if (statusFilter !== 'all') {
                queryParams.append('status', statusFilter);
            }
            if (minOpenings !== '') {
                queryParams.append('minOpenings', String(minOpenings));
            }
            if (maxOpenings !== '') {
                queryParams.append('maxOpenings', String(maxOpenings));
            }

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
    }, [token, user, searchTerm, statusFilter, minOpenings, maxOpenings]); // Dependencies for useCallback

    // Trigger job fetching when authentication state is ready and user is a job_poster, or when filters change
    useEffect(() => {
        if (!authLoading && isAuthenticated && user && user.role === 'job_poster') {
            fetchJobs();
        }
    }, [authLoading, isAuthenticated, user, fetchJobs]);

    const handleApplyFilters = () => {
        fetchJobs(); // Re-fetch jobs with current filter states
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setMinOpenings('');
        setMaxOpenings('');
        // fetchJobs will be called by useEffect due to filter state changes
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    // --- Loading and Unauthorized State Display ---
    if (authLoading || !isAuthenticated || !user || user.firstLogin || user.role !== 'job_poster') {
        return (
            <div className="flex h-screen bg-gray-50 justify-center items-center font-inter">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1938A8] mx-auto"></div>
                    <p className="mt-4 text-gray-700">Loading page...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden font-inter">
            <Sidebar userRole={user.role} onLogout={logout} isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

            <div className="flex-1 flex flex-col overflow-y-auto">
                {/* Mobile Header */}
                <div className="md:hidden bg-white shadow-lg p-4 flex items-center justify-between relative z-10">
                    <button
                        onClick={toggleSidebar}
                        className="p-2 rounded-md text-[#1938A8] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#182E78]"
                        aria-label="Open sidebar"
                    >
                        <FiMenu className="h-6 w-6" />
                    </button>
                    <h1 className="text-lg font-bold text-[#1938A8] text-center absolute left-1/2 -translate-x-1/2">
                        Your Posted Jobs
                    </h1>
                    <div className="h-6 w-6"></div>
                </div>

                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-7xl mx-auto space-y-8">
                        {/* Header Section */}
                        <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">Your Posted Jobs</h1>
                                <p className="text-gray-500 text-lg mt-2">Manage and track your job listings</p>
                            </div>
                            <Link href="/poster/new-job" passHref>
                                <button className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-md text-white bg-[#1938A8] hover:bg-[#182E78] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1938A8] transition-all duration-200">
                                    <FiBriefcase className="-ml-1 mr-2 h-5 w-5" />
                                    Post New Job
                                </button>
                            </Link>
                        </div>

                        {/* Search and Filter Section */}
                        <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
                            <h2 className="text-xl font-semibold text-gray-800 mb-5 flex items-center">
                                <FiFilter className="mr-2 text-[#1938A8]" /> Filter Jobs
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Search by Title */}
                                <div>
                                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search Title</label>
                                    <div className="relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FiSearch className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                        </div>
                                        <input
                                            type="text"
                                            name="search"
                                            id="search"
                                            className="focus:ring-[#1938A8] focus:border-[#1938A8] block w-full pl-10 pr-3 py-2 sm:text-sm border-gray-300 rounded-md transition-all duration-200"
                                            placeholder="Job title..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Status Filter */}
                                <div>
                                    <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        id="statusFilter"
                                        name="statusFilter"
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#1938A8] focus:border-[#1938A8] sm:text-sm rounded-md shadow-sm transition-all duration-200"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive' | 'closed')}
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                </div>

                                {/* Min Openings Filter */}
                                <div>
                                    <label htmlFor="minOpenings" className="block text-sm font-medium text-gray-700 mb-1">Min Openings</label>
                                    <input
                                        type="number"
                                        name="minOpenings"
                                        id="minOpenings"
                                        className="mt-1 focus:ring-[#1938A8] focus:border-[#1938A8] block w-full sm:text-sm border-gray-300 rounded-md shadow-sm transition-all duration-200"
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
                                        className="mt-1 focus:ring-[#1938A8] focus:border-[#1938A8] block w-full sm:text-sm border-gray-300 rounded-md shadow-sm transition-all duration-200"
                                        placeholder="e.g., 10"
                                        value={maxOpenings}
                                        onChange={(e) => setMaxOpenings(e.target.value === '' ? '' : Number(e.target.value))}
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={handleClearFilters}
                                    className="inline-flex items-center px-5 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1938A8] transition-all duration-200"
                                >
                                    <FiRefreshCcw className="mr-2 h-4 w-4" /> Clear Filters
                                </button>
                                <button
                                    type="button"
                                    onClick={handleApplyFilters}
                                    className="inline-flex items-center px-5 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#1938A8] hover:bg-[#182E78] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1938A8] transition-all duration-200"
                                >
                                    <FiFilter className="mr-2 h-4 w-4" /> Apply Filters
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg shadow-md" role="alert">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <FiXCircle className="h-5 w-5 text-red-500" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-red-700 font-medium">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {loading ? (
                            <div className="flex justify-center items-center py-12 bg-white rounded-xl shadow-md">
                                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1938A8]"></div>
                                <p className="ml-4 text-gray-700">Loading jobs...</p>
                            </div>
                        ) : jobs.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-100">
                                <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <h3 className="mt-2 text-xl font-semibold text-gray-900">No jobs found</h3>
                                <p className="mt-1 text-base text-gray-500">You haven't posted any jobs yet that match the filters.</p>
                                <div className="mt-6">
                                    <Link href="/poster/new-job" passHref>
                                        <button className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-lg text-white bg-[#1938A8] hover:bg-[#182E78] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1938A8] transition-all duration-200">
                                            <FiBriefcase className="-ml-1 mr-2 h-5 w-5" />
                                            Post New Job
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {jobs.map((job) => (
                                    <div key={job._id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 transform hover:scale-102 transition-all duration-200 ease-in-out">
                                        <div className="p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-xl font-bold text-gray-900 truncate pr-2">{job.title}</h3>
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm
                                                    ${job.status === 'active' ? 'bg-green-100 text-green-800' :
                                                    job.status === 'closed' ? 'bg-red-100 text-red-800' :
                                                    'bg-gray-100 text-gray-800'}`}
                                                >
                                                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                                                </span>
                                            </div>
                                            <p className="text-gray-600 text-sm mb-4 line-clamp-3">{job.description}</p>

                                            <div className="space-y-2 text-gray-700 text-sm">
                                                <div className="flex items-center">
                                                    <FiBriefcase className="flex-shrink-0 mr-2 h-5 w-5 text-gray-500" />
                                                    <span>{job.company} - {job.jobType}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <FiMapPin className="flex-shrink-0 mr-2 h-5 w-5 text-gray-500" />
                                                    <span>{job.location}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    {/* Custom INR icon SVG */}
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 mr-2 h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M6 3h12M6 8h12M6 13h12M6 18h12M6 21l3-3m-3 0l3 3M18 21l-3-3m3 0l-3 3" />
                                                    </svg>
                                                    <span>₹{job.salary.toLocaleString('en-IN')}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <FiUsers className="flex-shrink-0 mr-2 h-5 w-5 text-gray-500" />
                                                    <span>Openings: {job.numberOfOpenings}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    {/* Calendar icon for posted date */}
                                                    <svg className="flex-shrink-0 mr-2 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    {/* Modern date format: e.g., "Jan 15, 2024" */}
                                                    <span>Posted: {new Date(job.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row justify-end gap-3 border-t border-gray-100">
                                            <Link href={`/poster/applications?jobId=${job._id}`} passHref>
                                                <button className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 w-full sm:w-auto">
                                                    <FiUsers className="mr-2 h-4 w-4" /> View Applications
                                                </button>
                                            </Link>
                                            <Link href={`/poster/jobs/${job._id}/edit`} passHref>
                                                <button className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1938A8] transition-all duration-200 w-full sm:w-auto">
                                                    <FiEdit className="mr-2 h-4 w-4" /> Edit Job
                                                </button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
