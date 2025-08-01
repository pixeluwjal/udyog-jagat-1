// app/seeker/applications/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Sidebar from '@/app/components/Sidebar';
import Link from 'next/link';
import { FiMapPin, FiBriefcase, FiCalendar, FiUsers, FiXCircle, FiCheckCircle, FiMenu, FiEye } from 'react-icons/fi'; // Added FiEye for view button

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
    bg: "bg-gradient-to-b from-indigo-800 to-indigo-950", // This theme object is kept as provided
    hover: "hover:bg-indigo-700",
    active: "bg-indigo-600",
    text: "text-indigo-100",
    border: "border-indigo-700",
    mobileButton: "bg-indigo-700",
    primaryColor: "#3730A3", // A darker indigo for consistency with from-indigo-800
    darkPrimaryColor: "#1E1B4B", // A very dark indigo for consistency with to-indigo-950
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
        <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden font-sans">
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
                                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
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
                            <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-100">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Job Title
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Company
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Location
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Job Type
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Openings
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Salary
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Applied On
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Status
                                                </th>
                                                <th scope="col" className="relative px-6 py-3">
                                                    <span className="sr-only">View</span>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {applications.map((app) => (
                                                <tr key={app._id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            {app.job.companyLogo ? (
                                                                <img src={app.job.companyLogo} alt={app.job.company} className="h-8 w-8 rounded-full object-contain mr-3" />
                                                            ) : (
                                                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm mr-3">
                                                                    {app.job.company?.charAt(0) || 'J'}
                                                                </div>
                                                            )}
                                                            <div className="text-sm font-medium text-gray-900">{app.job.title}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-600">{app.job.company || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center text-sm text-gray-600">
                                                            <FiMapPin className="mr-1" size={14} /> {app.job.location}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center text-sm text-gray-600">
                                                            <FiBriefcase className="mr-1" size={14} /> {app.job.jobType || 'Full-time'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {app.job.numberOfOpenings !== undefined && app.job.numberOfOpenings > 0 ? (
                                                            <div className="flex items-center text-sm text-gray-600">
                                                                <FiUsers className="mr-1" size={14} /> {app.job.numberOfOpenings}
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm text-gray-400">N/A</div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-600">₹{app.job.salary.toLocaleString('en-IN')}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-500">
                                                            {new Date(app.appliedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${getStatusClasses(app.status)}`}>
                                                            {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <Link href={`/seeker/job/${app.job._id}`} passHref>
                                                            <button className="text-indigo-600 hover:text-indigo-900 transition-colors duration-200 p-2 rounded-md hover:bg-indigo-50">
                                                                <FiEye className="h-5 w-5" />
                                                            </button>
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
