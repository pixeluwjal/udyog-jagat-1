// app/seeker/dashboard/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Sidebar from '@/app/components/Sidebar';
import Link from 'next/link';
import { FiMapPin, FiBriefcase, FiCalendar, FiUsers, FiMenu } from 'react-icons/fi'; // Added FiUsers for openings

// Define interfaces for data structure
interface DashboardStats {
    appliedJobs: number;
    interviews: number;
    savedJobs: number;
}

interface ApplicationDisplay {
    _id: string;
    job: {
        _id: string;
        title: string;
        location: string;
        salaryOriginal?: string; 
        salaryMin?: number; 
        salaryMax?: number | null; 
        company?: string;
        companyLogo?: string;
        jobType?: string;
        numberOfOpenings?: number;
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


export default function JobSeekerDashboardPage() {
    const { user, loading: authLoading, isAuthenticated, logout, token } = useAuth();
    const router = useRouter();

    const [stats, setStats] = useState<DashboardStats>({
        appliedJobs: 0,
        interviews: 0,
        savedJobs: 0,
    });
    const [recentApplications, setRecentApplications] = useState<ApplicationDisplay[]>([]);
    const [loadingStats, setLoadingStats] = useState(true);
    const [loadingApplications, setLoadingApplications] = useState(true);
    const [errorStats, setErrorStats] = useState<string | null>(null);
    const [errorApplications, setErrorApplications] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for mobile sidebar

    // Redirection Logic
    useEffect(() => {
        if (authLoading) return; // Wait until auth loading is complete

        if (!isAuthenticated || !user) {
            console.warn('JobSeekerDashboardPage: Not authenticated or user missing. Redirecting to /login.');
            router.push('/login');
            return;
        }

        if (user.firstLogin) {
            console.warn('JobSeekerDashboardPage: User is firstLogin. Redirecting to /change-password.');
            router.push('/change-password');
            return;
        }

        // IMPORTANT: Redirect job_referrer to their own dashboard
        if (user.role === 'job_referrer') {
            console.warn('JobSeekerDashboardPage: User role is job_referrer. Redirecting to /referrer/dashboard.');
            router.push('/referrer/dashboard');
            return;
        }

        // Handle other roles trying to access seeker dashboard
        if (user.role !== 'job_seeker') {
            console.warn(`JobSeekerDashboardPage: User role is ${user.role}, not job_seeker. Redirecting.`);
            if (user.role === 'admin') router.push('/admin/dashboard');
            else if (user.role === 'job_poster') router.push('/poster/dashboard');
            else router.push('/'); // Fallback for unexpected roles
            return;
        }

        // Only job_seeker needs onboarding check
        if (user.role === 'job_seeker' && user.onboardingStatus !== 'completed') {
            console.warn('JobSeekerDashboardPage: Job Seeker, onboarding pending. Redirecting to /seeker/onboarding.');
            router.push('/seeker/onboarding');
            return;
        }
    }, [authLoading, isAuthenticated, user, router]); // Dependency array includes all variables used in the effect


    // Fetch Dashboard Stats (only if job_seeker and fully ready)
    const fetchStats = useCallback(async () => {
        // Added explicit checks here as well, though the useEffect below should handle it
        if (!token || !user?._id || user.role !== 'job_seeker' || user.onboardingStatus !== 'completed') {
            console.warn("Skipping fetchStats: Token/User ID not available or user not a completed job seeker.");
            setLoadingStats(false); // Ensure loading state is turned off
            return;
        }

        setLoadingStats(true);
        setErrorStats(null);
        try {
            const response = await fetch(`/api/seeker/stats?userId=${user._id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch dashboard stats');
            }

            setStats({
                appliedJobs: data.appliedJobs || 0,
                interviews: data.interviews || 0,
                savedJobs: data.savedJobs || 0
            });
        } catch (err: any) {
            console.error('Failed to fetch stats:', err);
            setErrorStats(err.message || 'Failed to load dashboard data.');
        } finally {
            setLoadingStats(false);
        }
    }, [token, user]); // Dependencies ensure this function is re-created if token or user changes


    // Fetch Recent Applications (only if job_seeker and fully ready)
    const fetchRecentApplications = useCallback(async () => {
        // Added explicit checks here as well
        if (!token || !user?._id || user.role !== 'job_seeker' || user.onboardingStatus !== 'completed') {
            console.warn("Skipping fetchRecentApplications: Token/User ID not available or user not a completed job seeker.");
            setLoadingApplications(false); // Ensure loading state is turned off
            return;
        }

        setLoadingApplications(true);
        setErrorApplications(null);
        try {
            // Assuming /api/applications can take applicantId, limit, sortBy, sortOrder
            const response = await fetch(`/api/applications?applicantId=${user._id}&limit=3&sortBy=appliedAt&sortOrder=desc`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch recent applications');
            }
            // Ensure data.applications is an array
            setRecentApplications(Array.isArray(data.applications) ? data.applications : []);
        } catch (err: any) {
            console.error('Failed to fetch recent applications:', err);
            setErrorApplications(err.message || 'Failed to load recent applications.');
            setRecentApplications([]);
        } finally {
            setLoadingApplications(false);
        }
    }, [token, user]); // Dependencies ensure this function is re-created if token or user changes


    // This useEffect ensures data fetching only happens when all conditions are met
    useEffect(() => {
        // Only fetch data if auth is loaded, user is authenticated, user object exists,
        // AND the user is a job_seeker with completed onboarding
        if (
            !authLoading &&
            isAuthenticated &&
            user &&
            user.role === 'job_seeker' &&
            user.onboardingStatus === 'completed'
        ) {
            console.log('JobSeekerDashboardPage: All conditions met. Fetching dashboard data.');
            fetchStats();
            fetchRecentApplications();
        } else {
            // If conditions are not met, ensure loading states are reset and data cleared
            setStats({ appliedJobs: 0, interviews: 0, savedJobs: 0 });
            setRecentApplications([]);
            setLoadingStats(false);
            setLoadingApplications(false);
        }
    }, [authLoading, isAuthenticated, user, fetchStats, fetchRecentApplications]); // All dependencies are correctly listed

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

    // Show loading spinner if auth is still loading or user is not authorized/onboarded to view THIS page
    if (
        authLoading ||
        !isAuthenticated ||
        !user ||
        user.firstLogin ||
        user.role !== 'job_seeker' || // Only show this page if role is job_seeker
        user.onboardingStatus !== 'completed' // And onboarding is completed for job_seeker
    ) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="m-auto flex flex-col items-center">
                    {/* Spinner color using the primary color from the theme */}
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1938A8]"></div>
                    <p className="mt-4 text-gray-700">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    // If we reach this point, the user is a fully authorized and onboarded job_seeker.
    return (
        <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden font-inter">
            {/* Pass isOpen and toggleSidebar to the Sidebar component for mobile responsiveness */}
            <Sidebar userRole={user.role} onLogout={logout} isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile Header: White background, centered text, and centered hamburger icon */}
                <div className="md:hidden bg-white shadow-lg p-4 flex items-center justify-between relative z-10">
                    {/* Hamburger Icon - positioned absolutely for precise centering of text */}
                    <button
                        onClick={toggleSidebar}
                        className="p-2 rounded-md text-[#1938A8] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#182E78]"
                        aria-label="Open sidebar"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    {/* Centered Header Text */}
                    <h1 className="text-lg font-bold text-[#1938A8] text-center absolute left-1/2 -translate-x-1/2">
                        Job Seeker Dashboard
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
                                    Welcome back, {user.username}!
                                </h1>
                                <p className="text-gray-500 text-lg">
                                    Job Seeker Dashboard Overview
                                </p>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100 flex items-center justify-between transition-transform transform hover:scale-105 duration-200">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium">Jobs Applied</p>
                                    {loadingStats ? (
                                        <div className="h-8 w-12 bg-gray-200 animate-pulse rounded mt-2"></div>
                                    ) : (
                                        <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{stats.appliedJobs}</h3>
                                    )}
                                </div>
                                {/* Icon with theme color */}
                                <div className={`p-3 rounded-full bg-opacity-20`} style={{ backgroundColor: jobSeekerTheme.primaryColor + '20' }}>
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ color: jobSeekerTheme.primaryColor }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100 flex items-center justify-between transition-transform transform hover:scale-105 duration-200">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium">Upcoming Interviews</p>
                                    {loadingStats ? (
                                        <div className="h-8 w-12 bg-gray-200 animate-pulse rounded mt-2"></div>
                                    ) : (
                                        <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{stats.interviews}</h3>
                                    )}
                                </div>
                                {/* Icon with theme color */}
                                <div className={`p-3 rounded-full bg-opacity-20`} style={{ backgroundColor: jobSeekerTheme.primaryColor + '20' }}>
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ color: jobSeekerTheme.primaryColor }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100 flex items-center justify-between transition-transform transform hover:scale-105 duration-200">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium">Saved Jobs</p>
                                    {loadingStats ? (
                                        <div className="h-8 w-12 bg-gray-200 animate-pulse rounded mt-2"></div>
                                    ) : (
                                        <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{stats.savedJobs}</h3>
                                    )}
                                </div>
                                {/* Icon with theme color */}
                                <div className={`p-3 rounded-full bg-opacity-20`} style={{ backgroundColor: jobSeekerTheme.primaryColor + '20' }}>
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ color: jobSeekerTheme.primaryColor }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Recent Applications Section */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                            <div className="p-4 md:p-6 border-b border-gray-200 flex justify-between items-center">
                                <h2 className="text-xl font-semibold text-gray-800">Your Recent Applications</h2>
                                <Link href="/seeker/applications" passHref>
                                    <button className={`text-[${jobSeekerTheme.primaryColor}] hover:text-[${jobSeekerTheme.darkPrimaryColor}] text-sm font-medium flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[${jobSeekerTheme.primaryColor}] rounded-md`}>
                                        View All Applications
                                        <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </Link>
                            </div>
                            <div className="p-4 md:p-6">
                                {loadingApplications ? (
                                    <div className="flex justify-center py-8">
                                        {/* Spinner color using primary color */}
                                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1938A8]"></div>
                                        <p className="ml-4 text-gray-700">Loading recent applications...</p>
                                    </div>
                                ) : errorApplications ? (
                                    <div className="text-center py-8 text-red-500 font-medium">
                                        {errorApplications}
                                    </div>
                                ) : recentApplications.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        You haven't applied to any jobs recently.
                                        <div className="mt-4">
                                            <Link href="/seeker/job" passHref>
                                                <button className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[${jobSeekerTheme.primaryColor}] hover:bg-[${jobSeekerTheme.darkPrimaryColor}] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[${jobSeekerTheme.primaryColor}] transition-all duration-200`}>
                                                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.55 23.55 0 0112 15c-1.606 0-3.14-.153-4.59-.445M21 4.87V11m0 0h-7.5M21 11l-3.25-3.25M12 3a9 9 0 100 18 9 9 0 000-18z" />
                                                    </svg>
                                                    Browse Jobs
                                                </button>
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {recentApplications.map((app) => (
                                            <div key={app._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow-lg transition-shadow duration-200">
                                                <div>
                                                    <div className="flex flex-col items-start gap-2 mb-4">
                                                        {/* Removed the circular company initial placeholder */}
                                                        {app.job.companyLogo && (
                                                            <img src={app.job.companyLogo} alt={app.job.company} className="h-10 w-10 object-contain mb-2" />
                                                        )}
                                                        <h3 className="text-xl font-bold text-gray-900 leading-tight">{app.job.title}</h3>
                                                        <p className="text-sm font-medium text-gray-600">{app.job.company}</p>
                                                    </div>
                                                    <div className="space-y-2 mb-4">
                                                        <div className="flex items-center text-sm text-gray-500">
                                                            <FiMapPin className="mr-2 text-indigo-500" size={16} />
                                                            <span>{app.job.location}</span>
                                                        </div>
                                                        <div className="flex items-center text-sm text-gray-500">
                                                            <FiBriefcase className="mr-2 text-indigo-500" size={16} />
                                                            <span>{app.job.jobType || 'Full-time'}</span>
                                                        </div>
                                                        {app.job.numberOfOpenings !== undefined && app.job.numberOfOpenings > 0 && (
                                                            <div className="flex items-center text-sm text-gray-500">
                                                                <FiUsers className="mr-2 text-indigo-500" size={16} />
                                                                <span>{app.job.numberOfOpenings} Openings</span>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center text-sm text-gray-500">
                                                            <FiCalendar className="mr-2 text-indigo-500" size={16} />
                                                            <span>Applied On: {new Date(app.appliedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                                        </div>
                                                        {/* CORRECTED CODE BLOCK - Use salaryOriginal */}
                                                        {app.job.salaryOriginal ? (
                                                            <p className="text-lg text-gray-800 font-bold mt-2">
                                                                ₹{app.job.salaryOriginal}
                                                            </p>
                                                        ) : (
                                                            <p className="text-lg text-gray-500 font-medium mt-2">
                                                                Salary Not Specified
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${getStatusClasses(app.status)}`}>
                                                        {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                                                    </span>
                                                </div>
                                                <div className="mt-6">
                                                    <Link href={`/seeker/job/${app.job._id}`} passHref>
                                                        <button className={`w-full text-white bg-[${jobSeekerTheme.primaryColor}] hover:bg-[${jobSeekerTheme.darkPrimaryColor}] font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[${jobSeekerTheme.primaryColor}]`}>
                                                            View Job Details
                                                        </button>
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}