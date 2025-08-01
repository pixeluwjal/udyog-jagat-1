// app/poster/applications/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Sidebar from '@/app/components/Sidebar';
import Link from 'next/link';
import { FiSearch, FiFilter, FiXCircle, FiCheckCircle, FiLoader, FiChevronLeft, FiMenu, FiUser, FiMail, FiBriefcase, FiCalendar, FiDollarSign, FiRefreshCcw, FiMapPin, FiPhone } from 'react-icons/fi'; // Added FiPhone for phone number

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

export default function ApplicationsPage() {
    const { user, loading: authLoading, isAuthenticated, token, logout } = useAuth();
    const router = useRouter();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for mobile sidebar

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

            // After successful update, re-fetch applications to reflect changes including job openings decrement
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
                    'Authorization': `Bearer ${token}`, // Crucially send the token
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch resume');
            }

            const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
            const blob = await response.blob(); // Get the response as a Blob

            const blobUrl = window.URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');

            window.URL.revokeObjectURL(blobUrl);

        } catch (err: any) {
            console.error('Error viewing resume:', err);
            setError(err.message || 'An unexpected error occurred while viewing resume.');
        }
    };

    const handleApplyFilters = () => {
        fetchApplications(); // Re-fetch applications with current filter states
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        // fetchApplications will be called by useEffect due to filter state changes
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    if (authLoading || !isAuthenticated || !user || user.firstLogin || user.role !== 'job_poster') {
        return (
            <div className="flex h-screen bg-gray-50 justify-center items-center font-inter">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1938A8] mx-auto"></div>
                    <p className="mt-4 text-gray-700">Loading applications...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden font-inter">
            <Sidebar userRole={user.role} onLogout={logout} isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

            <div className="flex-1 flex flex-col overflow-hidden">
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
                        Job Applications
                    </h1>
                    <div className="h-6 w-6"></div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">Job Applications</h1>
                                <p className="text-gray-500 text-lg mt-2">Review and manage applications for your posted jobs</p>
                            </div>
                            <Link
                                href="/poster/dashboard"
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1938A8] transition-all duration-200 flex items-center justify-center w-full sm:w-auto"
                            >
                                <FiChevronLeft className="w-5 h-5 mr-2" />
                                Back to Dashboard
                            </Link>
                        </div>

                        {/* Search and Filter Section */}
                        <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100 mb-8">
                            <h2 className="text-xl font-semibold text-gray-800 mb-5 flex items-center">
                                <FiFilter className="mr-2 text-[#1938A8]" /> Filter Applications
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Search by Applicant/Job Title */}
                                <div>
                                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search (Applicant/Job Title)</label>
                                    <div className="relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FiSearch className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                        </div>
                                        <input
                                            type="text"
                                            name="search"
                                            id="search"
                                            className="focus:ring-[#1938A8] focus:border-[#1938A8] block w-full pl-10 pr-3 py-2 sm:text-sm border-gray-300 rounded-md transition-all duration-200"
                                            placeholder="Applicant name, email, or job title..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Status Filter */}
                                <div>
                                    <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">Application Status</label>
                                    <select
                                        id="statusFilter"
                                        name="statusFilter"
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#1938A8] focus:border-[#1938A8] sm:text-sm rounded-md shadow-sm transition-all duration-200"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as Application['status'] | 'all')}
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="Received">Received</option>
                                        <option value="Interview Scheduled">Interview Scheduled</option>
                                        <option value="Rejected">Rejected</option>
                                        <option value="Hired">Hired</option>
                                    </select>
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
                                <p className="ml-4 text-gray-700">Loading applications...</p>
                            </div>
                        ) : applications.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-100">
                                <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <h3 className="mt-2 text-xl font-semibold text-gray-900">No applications found</h3>
                                <p className="mt-1 text-base text-gray-500">You haven't received any applications for your posted jobs that match the filters.</p>
                                <div className="mt-6">
                                    <Link
                                        href="/poster/new-job"
                                        className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-[#1938A8] hover:bg-[#182E78] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1938A8] transition-all duration-200"
                                    >
                                        <FiBriefcase className="-ml-1 mr-2 h-5 w-5" />
                                        Post New Job
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Job Title
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Applicant
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Applied On
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Status
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {applications.map((application) => {
                                                // isStatusFinal now only controls the dropdown, not the resume button
                                                const isStatusFinal = application.status === 'Hired' || application.status === 'Rejected';
                                                return (
                                                    <tr key={application._id} className="hover:bg-blue-50 transition-colors duration-150">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900">{application.job.title}</div>
                                                            <div className="text-xs text-gray-600 flex items-center mt-1">
                                                                <FiMapPin className="inline-block mr-1.5 text-gray-500" />{application.job.location}
                                                              ₹{application.job.salary.toLocaleString('en-IN')}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <div>
                                                                    <div className="text-sm font-medium text-gray-900 flex items-center">
                                                                        <FiUser className="inline-block mr-1.5 text-gray-500" />
                                                                        {application.applicant?.candidateDetails?.fullName || application.applicant?.username || 'N/A'}
                                                                    </div>
                                                                    <div className="text-sm text-gray-600 flex items-center mt-1">
                                                                        <FiMail className="inline-block mr-1.5 text-gray-500" />
                                                                        {application.applicant?.email || 'N/A'}
                                                                    </div>
                                                                    {application.applicant?.candidateDetails?.phone && (
                                                                        <div className="text-sm text-gray-600 flex items-center mt-1">
                                                                            <FiPhone className="inline-block mr-1.5 text-gray-500" />
                                                                            {application.applicant.candidateDetails.phone}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-600 flex items-center">
                                                                <FiCalendar className="inline-block mr-1.5 text-gray-500" />
                                                                {new Date(application.appliedAt).toLocaleDateString()}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full shadow-sm ${
                                                                application.status === 'Hired' ? 'bg-green-100 text-green-800' :
                                                                application.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                                application.status === 'Interview Scheduled' ? 'bg-blue-100 text-blue-800' :
                                                                'bg-yellow-100 text-yellow-800' // 'Received'
                                                            }`}>
                                                                {application.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                            <div className="flex flex-col space-y-2 items-start">
                                                                {application.applicant?.resumeGridFsId && (
                                                                    <button
                                                                        onClick={() => handleViewResume(application.applicant!.resumeGridFsId!)}
                                                                        // Removed 'disabled={isStatusFinal}' from here
                                                                        className="text-[#1938A8] hover:text-[#182E78] flex items-center bg-transparent border border-[#1938A8] hover:border-[#182E78] px-3 py-1 rounded-md transition-colors duration-200 text-sm"
                                                                        title="View Applicant's Resume"
                                                                    >
                                                                        <FiBriefcase className="w-4 h-4 mr-1.5" />
                                                                        Resume
                                                                    </button>
                                                                )}
                                                                <select
                                                                    value={application.status}
                                                                    onChange={(e) => updateApplicationStatus(application._id, e.target.value as Application['status'])}
                                                                    disabled={isStatusFinal} // Still disables if status is Hired or Rejected
                                                                    className={`block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#1938A8] focus:border-[#1938A8] sm:text-sm rounded-md shadow-sm transition-all duration-200 ${isStatusFinal ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                                                                >
                                                                    <option value="Received">Received</option>
                                                                    <option value="Interview Scheduled">Interview Scheduled</option>
                                                                    <option value="Rejected">Rejected</option>
                                                                    <option value="Hired">Hired</option>
                                                                </select>
                                                            </div>
                                                        </td>
                                                    </tr>
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
