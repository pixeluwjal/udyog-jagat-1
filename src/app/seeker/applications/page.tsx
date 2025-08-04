// app/seeker/applications/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Sidebar from '@/app/components/Sidebar';
import Link from 'next/link';
import { FiMapPin, FiBriefcase, FiCalendar, FiUsers, FiXCircle, FiCheckCircle, FiMenu, FiEye, FiArrowLeft } from 'react-icons/fi';

// Define interfaces for data structure, consistent with the API response
interface ApplicationDisplay {
    _id: string;
    job: {
        _id: string;
        title: string;
        location: string;
        salary: number;
        company?: string; // Added company
        companyLogo?: string; // Added companyLogo
        jobType?: string; // Added jobType
        numberOfOpenings?: number; // Added numberOfOpenings
    };
    applicant: { // Applicant details are populated, but we only need _id for this page
        _id: string;
    };
    status: 'pending' | 'reviewed' | 'interview' | 'accepted' | 'rejected';
    appliedAt: string;
}

// Define the color theme based on your input
const jobSeekerTheme = {
    bg: "bg-gradient-to-b from-indigo-800 to-indigo-950",
    hover: "hover:bg-indigo-700",
    active: "bg-indigo-600",
    text: "text-indigo-100",
    border: "border-indigo-700",
    mobileButton: "bg-indigo-700",
    primaryColor: "#1938A8", // Extracted from your prompt (from-indigo-800 roughly)
    darkPrimaryColor: "#182E78", // Extracted from your prompt (to-indigo-950 roughly)
};


export default function SeekerApplicationsPage() {
    const { user, loading: authLoading, isAuthenticated, logout, token } = useAuth();
    const router = useRouter();

    const [applications, setApplications] = useState<ApplicationDisplay[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for mobile sidebar

    // Redirection Logic
    useEffect(() => {
        if (authLoading) return;

        if (!isAuthenticated || !user) {
            console.warn('SeekerApplicationsPage: Not authenticated or user missing. Redirecting to /login.');
            router.push('/login');
            return;
        }

        if (user.firstLogin) {
            console.warn('SeekerApplicationsPage: User is firstLogin. Redirecting to /change-password.');
            router.push('/change-password');
            return;
        }

        if (user.role !== 'job_seeker') {
            console.warn(`SeekerApplicationsPage: User role is ${user.role}, not job_seeker. Redirecting.`);
            if (user.role === 'admin') router.push('/admin/dashboard');
            else if (user.role === 'job_poster') router.push('/poster/dashboard');
            else router.push('/'); // Default fallback
            return;
        }

        if (user.role === 'job_seeker' && user.onboardingStatus !== 'completed') {
            console.warn('SeekerApplicationsPage: Job Seeker, onboarding pending. Redirecting to /seeker/onboarding.');
            router.push('/seeker/onboarding');
            return;
        }
    }, [authLoading, isAuthenticated, user, router]);

    // Fetch Applications
    const fetchApplications = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token || !user?._id) {
                throw new Error('Authentication token or user ID not available.');
            }
            // Fetch applications for the current job seeker
            const response = await fetch(`/api/applications?applicantId=${user._id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch applications');
            }

            setApplications(Array.isArray(data.applications) ? data.applications : []);
        } catch (err: any) {
            console.error('Failed to fetch applications:', err);
            setError(err.message || 'Failed to load applications.');
            setApplications([]);
        } finally {
            setLoading(false);
        }
    }, [token, user]);

    useEffect(() => {
        if (!authLoading && isAuthenticated && user && user.role === 'job_seeker' && user.onboardingStatus === 'completed') {
            fetchApplications();
        }
    }, [authLoading, isAuthenticated, user, fetchApplications]);

    // Function to toggle sidebar visibility
    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    // Helper function to get status badge classes
    const getStatusClasses = (status: ApplicationDisplay['status']) => {
        switch (status) {
            case 'accepted':
                return 'bg-green-100 text-green-800';
            case 'rejected':
                return 'bg-red-100 text-red-800';
            case 'interview':
                return 'bg-blue-100 text-blue-800';
            case 'reviewed':
                return 'bg-purple-100 text-purple-800';
            case 'pending':
            default:
                return 'bg-yellow-100 text-yellow-800';
        }
    };

    // Show loading spinner if auth is still loading or user is not authorized/onboarded
    if (
        authLoading ||
        !isAuthenticated ||
        !user ||
        user.firstLogin ||
        (user.role === 'job_seeker' && user.onboardingStatus !== 'completed')
    ) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="m-auto flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                    <p className="mt-4 text-gray-700">Loading applications...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden font-inter">
            {/* Pass isOpen and toggleSidebar to the Sidebar component for mobile responsiveness */}
            <Sidebar userRole={user.role} onLogout={logout} isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile Header: White background, centered text, and centered hamburger icon */}
                <div className="md:hidden bg-white shadow-md p-4 flex items-center justify-between relative z-10">
                    {/* Hamburger Icon */}
                    <button
                        onClick={toggleSidebar}
                        className={`p-2 rounded-md text-indigo-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-all duration-200`}
                        aria-label="Open sidebar"
                    >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    {/* Centered Header Text */}
                    <h1 className="text-lg font-bold text-indigo-800 text-center absolute left-1/2 -translate-x-1/2">
                        My Applications
                    </h1>
                    {/* Placeholder for spacing on the right, equivalent to hamburger icon size */}
                    <div className="h-6 w-6"></div> {/* This helps balance the header */}
                </div>

                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-7xl mx-auto space-y-8">
                        {/* Header Section */}
                        <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between mb-6">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">
                                    My Job Applications
                                </h1>
                                <p className="text-gray-500 text-lg">Overview of your submitted applications</p>
                            </div>
                            <Link href="/seeker/dashboard" passHref>
                                <button className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200">
                                    <FiArrowLeft className="-ml-1 mr-2 h-5 w-5" />
                                    Back to Dashboard
                                </button>
                            </Link>
                        </div>

                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg shadow-md">
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
                                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
                                <p className="ml-4 text-gray-700">Loading your applications...</p>
                            </div>
                        ) : applications.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-100">
                                <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <h3 className="mt-2 text-xl font-semibold text-gray-900">No applications found</h3>
                                <p className="mt-1 text-base text-gray-500">You haven't applied to any jobs yet.</p>
                                <div className="mt-6">
                                    <Link
                                        href="/seeker/jobs"
                                        className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
                                    >
                                        <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.55 23.55 0 0112 15c-1.606 0-3.14-.153-4.59-.445M21 4.87V11m0 0h-7.5M21 11l-3.25-3.25M12 3a9 9 0 100 18 9 9 0 000-18z" />
                                        </svg>
                                        Browse Jobs
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {applications.map((app) => (
                                    <div key={app._id} className="bg-white rounded-xl shadow-md p-6 flex flex-col justify-between hover:shadow-lg transition-shadow duration-200 border border-gray-100">
                                        <div>
                                            {/* Removed the circular placeholder for company logo and text */}
                                            <div className="flex items-start gap-3 mb-4">
                                                {app.job.companyLogo && (
                                                    <img src={app.job.companyLogo} alt={app.job.company} className="h-10 w-10 object-contain flex-shrink-0" />
                                                )}
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900 leading-tight">{app.job.title}</h3>
                                                    <p className="text-sm font-medium text-gray-600">{app.job.company}</p>
                                                </div>
                                            </div>

                                            {/* Job details */}
                                            <div className="space-y-2 mb-4">
                                                <div className="flex items-center text-sm text-gray-500">
                                                    <FiMapPin className="mr-2 text-indigo-500" size={16} />
                                                    <span>{app.job.location}</span>
                                                </div>
                                                <div className="flex items-center text-sm text-gray-500">
                                                    <FiBriefcase className="mr-2 text-indigo-500" size={16} />
                                                    <span>{app.job.jobType || 'Full-time'}</span>
                                                </div>
                                                <div className="flex items-center text-sm text-gray-500">
                                                    <FiUsers className="mr-2 text-indigo-500" size={16} />
                                                    <span>{app.job.numberOfOpenings || 0} Openings</span>
                                                </div>
                                                <div className="flex items-center text-sm text-gray-500">
                                                    <FiCalendar className="mr-2 text-indigo-500" size={16} />
                                                    <span>Applied On: {new Date(app.appliedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                                </div>
                                                <p className="text-lg text-gray-800 font-bold mt-2">
                                                    ₹{app.job.salary.toLocaleString('en-IN')} / year
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-4 flex items-center justify-between">
                                            {/* Status Badge */}
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${getStatusClasses(app.status)}`}>
                                                {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                                            </span>
                                            {/* View Details Button */}
                                            <Link href={`/seeker/job/${app.job._id}`} passHref>
                                                <button className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-[${jobSeekerTheme.primaryColor}] hover:bg-[${jobSeekerTheme.darkPrimaryColor}] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[${jobSeekerTheme.primaryColor}] transition-colors duration-200`}>
                                                    View Job
                                                    <FiEye className="ml-2 h-4 w-4" />
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
