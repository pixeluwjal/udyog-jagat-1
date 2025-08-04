// app/seeker/jobs/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar';
import { FiSearch, FiFilter, FiXCircle, FiSave, FiBriefcase, FiMapPin, FiUsers, FiDollarSign, FiCalendar, FiExternalLink, FiLogOut, FiMenu, FiRefreshCcw, FiChevronLeft, FiCheckCircle } from 'react-icons/fi';
import { FaRegHandPointUp } from 'react-icons/fa';

// Define a simple color theme for consistency
const colorTheme = {
    job_seeker: {
        mobileButton: 'bg-[#1938A8]', // Primary blue for buttons
        hover: 'hover:bg-[#182E78]', // Darker blue on hover
        active: 'bg-[#1938A8]', // Active state for pagination
        text: 'text-white', // Text color for active elements
    },
};

// Interface for job data from the API
interface JobDisplay {
    _id: string;
    title: string;
    description: string;
    location: string;
    salary: number;
    company: string;
    jobType: string;
    createdAt: string;
    postedBy: string;
    companyLogo?: string; // Added for company logo display
    skills?: string[]; // Added for skills display
    numberOfOpenings?: number; // Added for number of openings display
    // New fields to track applied and saved status
    isApplied: boolean;
    applicationId?: string; // Storing the application ID to use for withdrawal
    isSaved: boolean;
    savedJobId?: string; // Storing the saved job ID to use for unsaving
}

export default function JobsPage() {
    const { user, loading: authLoading, isAuthenticated, logout, token } = useAuth();
    const router = useRouter();

    const [jobs, setJobs] = useState<JobDisplay[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null); // For success messages
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for mobile sidebar (main nav)
    const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false); // State for mobile filter sidebar

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [locationFilter, setLocationFilter] = useState(''); // Added location filter state
    const [salaryFilter, setSalaryFilter] = useState<'all' | 'less_1' | '1_plus' | '5_plus' | '10_plus' | '20_plus'>('all');
    const [appliedFilter, setAppliedFilter] = useState<'all' | 'applied' | 'saved'>('all');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const jobsPerPage = 10; // Define how many jobs per page

    // State to manage application status (for loading indicators on buttons)
    const [applicationStatus, setApplicationStatus] = useState<{ [key: string]: 'Applying...' | 'Applied' | undefined }>({});

    // Helper to get minimum salary value from filter string
    const getMinSalary = (filter: string): number | null => {
        switch (filter) {
            case '1_plus': return 100000;
            case '5_plus': return 500000;
            case '10_plus': return 1000000;
            case '20_plus': return 2000000;
            default: return null;
        }
    };

    // Helper to get maximum salary value for 'Less than 1 LPA'
    const getMaxSalary = (filter: string): number | null => {
        if (filter === 'less_1') return 99999; // Less than 1 LPA
        return null;
    };

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
        if (user.role !== 'job_seeker') {
            if (user.role === 'admin') router.push('/admin/dashboard');
            else if (user.role === 'job_poster') router.push('/poster/dashboard');
            else router.push('/');
            return;
        }
    }, [authLoading, isAuthenticated, user, router]);

    // --- Fetch Jobs Logic ---
    const fetchJobs = useCallback(async () => {
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            if (!token || !user?._id) {
                throw new Error('Authentication token or user ID not available. Please log in again.');
            }

            const queryParams = new URLSearchParams();
            queryParams.append('page', String(currentPage));
            queryParams.append('limit', String(jobsPerPage));
            queryParams.append('sortBy', 'createdAt');
            queryParams.append('sortOrder', 'desc');

            if (searchTerm) queryParams.append('search', searchTerm);
            if (locationFilter) queryParams.append('location', locationFilter);
            
            if (salaryFilter !== 'all') {
                const minSalary = getMinSalary(salaryFilter);
                if (minSalary !== null) {
                    queryParams.append('minSalary', String(minSalary));
                }
                const maxSalary = getMaxSalary(salaryFilter);
                if (maxSalary !== null) {
                    queryParams.append('maxSalary', String(maxSalary));
                }
            }

            const response = await fetch(`/api/jobs?${queryParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch jobs');
            }

            if (Array.isArray(data.jobs)) {
                // Filter out jobs with 0 openings
                const jobsWithOpenings = data.jobs.filter((job: any) => 
                    job.numberOfOpenings === undefined || job.numberOfOpenings > 0
                );

                // Fetch user's applied and saved jobs to merge with the job list
                const myAppsResponse = await fetch('/api/applications/my-applications', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const myAppsData = await myAppsResponse.json();

                if (!myAppsResponse.ok) {
                    throw new Error(myAppsData.error || 'Failed to fetch user applications');
                }

                // Correctly map application IDs and saved job IDs
                const appliedJobMap = new Map(myAppsData.applications.map((app: any) => [app.job._id, app._id])); // Map jobId to applicationId
                const savedJobMap = new Map(myAppsData.savedJobs.map((saved: any) => [saved.job._id, saved._id])); // Map jobId to savedJobId

                const jobsWithStatus = jobsWithOpenings.map((job: any) => ({ // Use jobsWithOpenings here
                    ...job,
                    isApplied: appliedJobMap.has(job._id),
                    applicationId: appliedJobMap.get(job._id), // Get the actual application ID
                    isSaved: savedJobMap.has(job._id),
                    savedJobId: savedJobMap.get(job._id),
                }));

                // Apply the 'applied' and 'saved' filters
                const filteredJobs = jobsWithStatus.filter((job: JobDisplay) => {
                    if (appliedFilter === 'applied') return job.isApplied;
                    if (appliedFilter === 'saved') return job.isSaved;
                    return true;
                });
                
                setJobs(filteredJobs);
                setTotalPages(Math.ceil(data.totalJobs / jobsPerPage));
            } else {
                setError('Failed to fetch jobs: Invalid data format from server.');
                setJobs([]);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load job data.');
        } finally {
            setLoading(false);
        }
    }, [token, user, currentPage, searchTerm, locationFilter, salaryFilter, appliedFilter]);

    useEffect(() => {
        if (!authLoading && isAuthenticated && user && user.role === 'job_seeker') {
            fetchJobs();
        }
    }, [authLoading, isAuthenticated, user, fetchJobs]);

    const handleApplyFilters = () => {
        setCurrentPage(1); // Reset to first page on filter change
        fetchJobs();
        setIsFilterSidebarOpen(false); // Close filter sidebar on mobile
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setLocationFilter('');
        setSalaryFilter('all');
        setAppliedFilter('all');
        setCurrentPage(1); // Reset to first page
        // fetchJobs will be called by useEffect due to filter state changes
        setIsFilterSidebarOpen(false); // Close filter sidebar on mobile
    };

    const handlePageChange = (page: number) => {
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handleWithdrawApplication = async (jobId: string) => {
        // Removed window.confirm()
        setMessage(null); // Clear previous messages
        setError(null); // Clear previous errors

        try {
            const jobToUpdate = jobs.find(job => job._id === jobId);
            if (!jobToUpdate || !jobToUpdate.applicationId) {
                throw new Error("Application ID not found for withdrawal.");
            }

            const response = await fetch(`/api/applications/${jobToUpdate.applicationId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to withdraw application');
            }

            // Update the state to reflect the change
            setJobs(prevJobs => prevJobs.map(job =>
                job._id === jobId ? { ...job, isApplied: false, applicationId: undefined } : job
            ));
            setMessage('Application withdrawn successfully!');
            console.log(`Successfully withdrew application for job ${jobId}`);
        } catch (err: any) {
            setError(err.message || 'Failed to withdraw application.');
        }
    };

    const handleSaveJob = async (jobId: string) => {
        setMessage(null); // Clear previous messages
        setError(null); // Clear previous errors
        try {
            const response = await fetch('/api/seeker/saved-jobs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ jobId })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to save job');
            }

            const data = await response.json();
            setJobs(prevJobs => prevJobs.map(job =>
                job._id === jobId ? { ...job, isSaved: true, savedJobId: data.savedJob._id } : job
            ));
            setMessage('Job saved successfully!');
        } catch (err: any) {
            setError(err.message || 'Failed to save job.');
        }
    };

    const handleUnsaveJob = async (jobId: string) => {
        setMessage(null); // Clear previous messages
        setError(null); // Clear previous errors
        try {
            const jobToUpdate = jobs.find(job => job._id === jobId);
            if (!jobToUpdate || !jobToUpdate.savedJobId) {
                throw new Error("Saved job ID not found for unsaving.");
            }

            const response = await fetch(`/api/seeker/saved-jobs/${jobToUpdate.savedJobId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to unsave job');
            }

            setJobs(prevJobs => prevJobs.map(job =>
                job._id === jobId ? { ...job, isSaved: false, savedJobId: undefined } : job
            ));
            setMessage('Job unsaved successfully!');
        } catch (err: any) {
            setError(err.message || 'Failed to unsave job.');
        }
    };

    // New handleApply function
    const handleApply = async (jobId: string) => {
        setApplicationStatus(prev => ({ ...prev, [jobId]: 'Applying...' }));
        setMessage(null); // Clear previous messages
        setError(null); // Clear previous errors
        try {
            const response = await fetch('/api/applications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ jobId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to apply for job');
            }

            const result = await response.json();
            setJobs(prevJobs => prevJobs.map(job =>
                job._id === jobId ? { ...job, isApplied: true, applicationId: result.application._id } : job
            ));
            setApplicationStatus(prev => ({ ...prev, [jobId]: 'Applied' }));
            setMessage('Successfully applied for the job!');
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred during application.');
            setApplicationStatus(prev => ({ ...prev, [jobId]: undefined })); // Reset status on error
        }
    };


    // --- Loading and Unauthorized State Display ---
    if (authLoading || !isAuthenticated || !user || user.firstLogin || user.role !== 'job_seeker') {
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
            <Sidebar userRole={user.role} onLogout={logout} isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

            <div className="flex-1 flex flex-col overflow-y-auto">
                {/* Mobile Header - centered and white background with Hamburger and Filter Icons */}
                <div className="md:hidden bg-white shadow-sm p-4 flex items-center justify-between relative z-20">
                    <button
                        onClick={() => setIsSidebarOpen(true)} // Toggles main sidebar
                        className="p-2 text-gray-600 hover:text-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors duration-200"
                        aria-label="Open navigation"
                    >
                        <FiMenu className="h-6 w-6" />
                    </button>
                    <span className="text-lg font-bold text-[#1938A8]">Browse Jobs</span>
                    <button
                        onClick={() => setIsFilterSidebarOpen(true)}
                        className="p-2 text-gray-600 hover:text-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors duration-200"
                        aria-label="Open filters"
                    >
                        <FiFilter className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* Filters Sidebar (Left Column for MD+, Overlay for Mobile) */}
                    <div
                        className={`
                            fixed inset-y-0 left-0 w-full bg-white z-50 transform md:relative md:translate-x-0 md:w-1/4 lg:w-1/5
                            ${isFilterSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                            transition-transform duration-300 ease-in-out
                            md:flex md:flex-col md:bg-gray-50 md:p-6 md:border-r md:border-gray-100 md:shadow-none
                            overflow-y-auto flex-shrink-0
                        `}
                    >
                        <div className="p-6 md:p-0"> {/* Padding for mobile overlay */}
                            <div className="flex justify-between items-center mb-6 md:mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">Filters</h2>
                                <button
                                    onClick={() => setIsFilterSidebarOpen(false)}
                                    className="md:hidden text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 rounded-md p-1"
                                    aria-label="Close filters"
                                >
                                    <FiXCircle className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="mb-6 pb-6 border-b border-gray-200">
                                <label htmlFor="search" className="block text-sm font-semibold text-gray-700 mb-2">Search Keywords</label>
                                <input
                                    type="text"
                                    id="search"
                                    placeholder="e.g., Software Engineer, React"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#1938A8] focus:border-[#1938A8] transition duration-200 text-gray-800 placeholder-gray-400"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="mb-6 pb-6 border-b border-gray-200">
                                <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                                <input
                                    type="text"
                                    id="location"
                                    placeholder="e.g., New York, Remote"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#1938A8] focus:border-[#1938A8] transition duration-200 text-gray-800 placeholder-gray-400"
                                    value={locationFilter}
                                    onChange={(e) => setLocationFilter(e.target.value)}
                                />
                            </div>

                            <div className="mb-6 pb-6 border-b border-gray-200">
                                <label htmlFor="salary" className="block text-sm font-semibold text-gray-700 mb-2">Minimum Salary</label>
                                <select
                                    id="salary"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#1938A8] focus:border-[#1938A8] transition duration-200 bg-white text-gray-800"
                                    value={salaryFilter}
                                    onChange={(e) => setSalaryFilter(e.target.value as any)}
                                >
                                    <option value="all">Any</option>
                                    <option value="less_1">Less than 1 LPA</option>
                                    <option value="1_plus">1 LPA +</option>
                                    <option value="5_plus">5 LPA +</option>
                                    <option value="10_plus">10 LPA +</option>
                                    <option value="20_plus">20 LPA +</option>
                                </select>
                            </div>

                            <div className="mb-8">
                                <label htmlFor="appliedFilter" className="block text-sm font-semibold text-gray-700 mb-2">Job Status</label>
                                <select
                                    id="appliedFilter"
                                    name="appliedFilter"
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#1938A8] focus:border-[#1938A8] sm:text-sm rounded-md shadow-sm transition-all duration-200"
                                    value={appliedFilter}
                                    onChange={(e) => setAppliedFilter(e.target.value as any)}
                                >
                                    <option value="all">All Jobs</option>
                                    <option value="applied">Applied Jobs</option>
                                    <option value="saved">Saved Jobs</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleApplyFilters}
                                    className={`w-full ${colorTheme.job_seeker.mobileButton} ${colorTheme.job_seeker.hover} text-white font-semibold py-3 px-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1938A8] transition duration-300 shadow-lg transform hover:scale-105`}
                                >
                                    Apply Filters
                                </button>
                                <button
                                    onClick={handleClearFilters}
                                    className="w-full bg-gray-200 text-gray-700 font-semibold py-3 px-8 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition duration-300 shadow-lg transform hover:scale-105"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Overlay for filter sidebar on mobile */}
                    {isFilterSidebarOpen && (
                        <div
                            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                            onClick={() => setIsFilterSidebarOpen(false)}
                            aria-hidden="true"
                        ></div>
                    )}

                    {/* Main Content Area (Right Column) */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white">
                        <div className="max-w-4xl mx-auto"> {/* Constrain width for better readability of stacked cards */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-4">
                                <div>
                                    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">Browse Jobs</h1>
                                    <p className="text-gray-500 text-lg mt-2">Find your next career opportunity</p>
                                </div>
                                <Link href="/seeker/dashboard" passHref>
                                    <button className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-md text-white bg-[#1938A8] hover:bg-[#182E78] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1938A8] transition-all duration-200`}>
                                        <FiChevronLeft className="-ml-1 mr-2 h-5 w-5" />
                                        Back to Dashboard
                                    </button>
                                </Link>
                            </div>

                            {error && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg shadow-md" role="alert">
                                    <div className="flex">
                                        <div className="flex-shrink-0"><FiXCircle className="h-5 w-5 text-red-500" /></div>
                                        <div className="ml-3"><p className="text-sm text-red-700 font-medium">{error}</p></div>
                                    </div>
                                </div>
                            )}
                            {message && (
                                <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg shadow-md" role="alert">
                                    <div className="flex">
                                        <div className="flex-shrink-0"><FiCheckCircle className="h-5 w-5 text-green-500" /></div>
                                        <div className="ml-3"><p className="text-sm text-green-700 font-medium">{message}</p></div>
                                    </div>
                                </div>
                            )}

                            {loading ? (
                                <div className="flex flex-col justify-center items-center py-12 bg-white rounded-xl shadow-md">
                                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#1938A8]"></div>
                                    <p className="ml-4 text-gray-700 text-xl mt-4">Loading amazing jobs for you...</p>
                                </div>
                            ) : jobs.length === 0 ? (
                                <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-100">
                                    <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <h3 className="mt-2 text-xl font-semibold text-gray-900">No jobs found</h3>
                                    <p className="mt-1 text-base text-gray-500">Try adjusting your search filters or check back later. New opportunities are posted daily!</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-6"> {/* Changed to single column grid */}
                                    {jobs.map((job) => (
                                        <div key={job._id} className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col">
                                            <Link href={`/seeker/job/${job._id}`} passHref className="flex-grow cursor-pointer">
                                                <div className="p-6">
                                                    <div className="flex items-start gap-4">
                                                        <div className="flex-shrink-0 h-16 w-16 bg-gradient-to-br from-indigo-50 to-blue-100 rounded-lg flex items-center justify-center shadow-inner">
                                                            {job.companyLogo ? (
                                                                <img src={job.companyLogo} alt={job.company} className="h-14 w-14 object-contain rounded-md" />
                                                            ) : (
                                                                <span className="text-[#1938A8] font-bold text-2xl">{job.company?.charAt(0) || 'J'}</span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h3 className="text-xl font-bold text-gray-800 hover:text-[#1938A8] transition-colors duration-200">
                                                                {job.title}
                                                            </h3>
                                                            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm">
                                                                <span className="font-medium text-gray-600">{job.company || 'N/A'}</span>
                                                                <span className="text-gray-400">•</span>
                                                                <span className="text-gray-500 flex items-center"><FiMapPin className="mr-1" size={14} />{job.location}</span>
                                                                <span className="text-gray-400">•</span>
                                                                <span className="text-gray-500 flex items-center"><FiBriefcase className="mr-1" size={14} />{job.jobType || 'Full-time'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4">
                                                        <p className="text-base text-gray-700 line-clamp-3">{job.description}</p>
                                                    </div>

                                                    {job.skills && job.skills.length > 0 && (
                                                        <div className="mt-4 flex flex-wrap gap-2">
                                                            {job.skills.slice(0, 4).map((skill: string, index: number) => (
                                                                <span key={index} className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full font-medium shadow-sm">
                                                                    {skill}
                                                                </span>
                                                            ))}
                                                            {job.skills.length > 4 && (
                                                                <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full font-medium shadow-sm">
                                                                    +{job.skills.length - 4} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>

                                            <div className="p-6 pt-0 flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3 mt-auto">
                                                <div className="text-left sm:text-right w-full sm:w-auto">
                                                    <span className="text-2xl font-extrabold text-[#1938A8]">₹{job.salary.toLocaleString('en-IN')}</span>
                                                    <span className="text-sm text-gray-500 ml-1">/year</span>
                                                </div>
                                                <div className="text-sm text-gray-500 w-full sm:w-auto text-left sm:text-right flex items-center">
                                                    <FiCalendar className="mr-1" size={14} /> Posted {new Date(job.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </div>
                                                {/* Display Number of Openings */}
                                                {job.numberOfOpenings !== undefined && (
                                                    <div className="text-sm text-gray-500 w-full sm:w-auto text-left sm:text-right flex items-center">
                                                        <FiUsers className="mr-1" size={14} /> Openings: {job.numberOfOpenings}
                                                    </div>
                                                )}
                                                <div className="flex gap-3 w-full sm:w-auto justify-start sm:justify-end flex-wrap">
                                                    {/* Save/Unsave Button - Hidden if already applied */}
                                                    {!job.isApplied && (
                                                        <button
                                                            onClick={() => job.isSaved ? handleUnsaveJob(job._id) : handleSaveJob(job._id)}
                                                            className={`py-2 px-5 rounded-lg font-semibold transition-all duration-200 shadow-md flex items-center justify-center gap-2
                                                                ${job.isSaved
                                                                    ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500 focus:ring-yellow-500'
                                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-400'
                                                                } focus:outline-none focus:ring-2 focus:ring-offset-2`}
                                                        >
                                                            <FiSave className="w-5 h-5" />
                                                            {job.isSaved ? 'Saved' : 'Save'}
                                                        </button>
                                                    )}

                                                    {/* Apply/Applied/Withdraw Button */}
                                                    {job.isApplied ? (
                                                        <>
                                                            <span className="inline-flex items-center justify-center py-2 px-5 text-sm font-medium rounded-lg shadow-sm text-green-700 bg-green-100 w-full sm:w-auto cursor-not-allowed">
                                                                <FiCheckCircle className="mr-2 h-4 w-4" /> Applied
                                                            </span>
                                                            <button
                                                                onClick={() => handleWithdrawApplication(job._id)}
                                                                className="inline-flex items-center justify-center px-4 py-2 border border-red-300 text-sm font-medium rounded-lg shadow-sm text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 w-full sm:w-auto"
                                                            >
                                                                <FiLogOut className="mr-2 h-4 w-4 rotate-90" /> Withdraw
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleApply(job._id)}
                                                            className={`${colorTheme.job_seeker.mobileButton} ${colorTheme.job_seeker.hover} text-white py-2 px-6 rounded-lg font-semibold transition-all duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1938A8]`}
                                                            disabled={applicationStatus[job._id] === 'Applying...'}
                                                        >
                                                            {applicationStatus[job._id] === 'Applying...' ? (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                                                                    Applying...
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2">
                                                                    <FaRegHandPointUp className="w-4 h-4" /> Apply Now
                                                                </div>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {totalPages > 1 && (
                                <div className="flex justify-center items-center space-x-3 mt-10 py-5 bg-white rounded-xl shadow-xl border border-gray-100">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1 || loading}
                                        className="px-5 py-3 bg-[#1938A8] text-white rounded-lg hover:bg-[#182E78] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 font-medium shadow-md"
                                    >
                                        Previous
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                        <button
                                            key={page}
                                            onClick={() => handlePageChange(page)}
                                            className={`px-5 py-3 rounded-lg font-medium transition-colors duration-200 shadow-sm
                                                ${currentPage === page
                                                    ? 'bg-[#1938A8] text-white'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                }`}
                                            disabled={loading}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages || loading}
                                        className="px-5 py-3 bg-[#1938A8] text-white rounded-lg hover:bg-[#182E78] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 font-medium shadow-md"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
