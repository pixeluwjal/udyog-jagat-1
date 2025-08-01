// app/poster/dashboard/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar'; // Corrected import path for Sidebar
import { FiBriefcase, FiMapPin, FiDollarSign, FiEdit, FiUsers, FiMenu, FiXCircle } from 'react-icons/fi'; // Added FiUsers for openings and FiEdit for edit button

// Updated Interface for displaying job data - now includes all fields
interface JobDisplay {
  _id: string;
  title: string;
  description: string;
  location: string;
  salary: number;
  status: 'active' | 'inactive' | 'closed';
  numberOfOpenings: number; // Added: No. of Openings
  company: string; // Added: Company Name
  jobType: 'Full-time' | 'Part-time' | 'Contract' | 'Temporary' | 'Internship'; // Added: Job Type
  skills?: string[]; // Added: Skills
  companyLogo?: string; // Added: Company Logo
  postedBy: string;
  createdAt: string;
  updatedAt: string; // Added: For completeness, though not always displayed
}

export default function PosterDashboardPage() {
  const { user, loading: authLoading, isAuthenticated, logout, token } = useAuth();
  const router = useRouter();

  const [recentJobs, setRecentJobs] = useState<JobDisplay[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for mobile sidebar

  // Redirection Logic remains the same
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user) {
      console.warn('PosterDashboardPage: Not authenticated. Redirecting to /login.');
      router.push('/login');
      return;
    }

    if (user.firstLogin) {
      console.warn('PosterDashboardPage: User is firstLogin. Redirecting to /change-password.');
      router.push('/change-password');
      return;
    }

    if (user.role !== 'job_poster') {
      console.warn(`PosterDashboardPage: Incorrect role (${user.role}). Redirecting.`);
      if (user.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (user.role === 'job_seeker') {
        router.push(user.onboardingStatus === 'completed' ? '/seeker/dashboard' : '/seeker/onboarding');
      } else {
        router.push('/');
      }
      return;
    }
  }, [authLoading, isAuthenticated, user, router]);

  const fetchRecentJobs = useCallback(async () => {
    setDataError(null);
    try {
      if (!token || !user?._id) {
        throw new Error('Authentication token or user ID not available.');
      }

      // Fetch recent jobs posted by the current user
      const response = await fetch(
        `/api/jobs?postedBy=${user._id}&limit=5&sortBy=createdAt&sortOrder=desc`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch recent jobs');
      }

      if (Array.isArray(data.jobs)) {
        setRecentJobs(data.jobs);
      } else {
        setDataError(
          'Failed to fetch recent jobs: Invalid data format from server.'
        );
        setRecentJobs([]);
      }
    } catch (err: any) {
      setDataError(err.message || 'Failed to load recent job data.');
    } finally {
      setDataLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user && user.role === 'job_poster') {
      setDataLoading(true);
      fetchRecentJobs();
    }
  }, [authLoading, isAuthenticated, user, fetchRecentJobs]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (
    authLoading ||
    !isAuthenticated ||
    !user ||
    user.firstLogin ||
    user.role !== 'job_poster'
  ) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="m-auto flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-700"></div>
          <p className="mt-4 text-gray-700">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden font-sans">
      {/* Sidebar - Conditionally render for mobile or use Tailwind's hidden/block */}
      <Sidebar userRole={user.role} onLogout={logout} isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile Header (visible only on small screens) */}
        <div className="md:hidden bg-white shadow-sm p-4 flex items-center justify-between relative">
          {/* Hamburger Icon */}
          <button
            onClick={toggleSidebar}
            className="p-2 -ml-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-700"
            aria-label="Toggle sidebar"
          >
            <FiMenu className="w-6 h-6" />
          </button>
          {/* Centered Title */}
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            Job Poster Panel
          </h1>
          {/* Empty div for spacing on the right to balance the hamburger */}
          <div className="w-6 h-6"></div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-blue-900">
                  Welcome back, {user.username}!
                </h1>
                <p className="text-blue-700 text-lg">Your Job Posting Dashboard</p>
              </div>

              <Link href="/poster/new-job" passHref>
                <button className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-blue-100 bg-blue-800 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200">
                  <FiBriefcase className="-ml-1 mr-2 h-5 w-5" />
                  Post New Job
                </button>
              </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
              {/* Recent Posted Jobs Card */}
              <div className="bg-white overflow-hidden rounded-xl shadow-md border border-gray-100">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-blue-800 rounded-full p-3 shadow-lg">
                      <FiBriefcase className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Recent Posted Jobs
                        </dt>
                        <dd>
                          <div className="text-3xl font-extrabold text-gray-900">
                            {recentJobs.length}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-gray-500">
                    Showing your {recentJobs.length} most recent job postings.
                  </div>
                </div>
              </div>

              {/* Total Applications Card (Placeholder) */}
              <div className="bg-white overflow-hidden rounded-xl shadow-md border border-gray-100">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-blue-600 rounded-full p-3 shadow-lg">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Applications
                        </dt>
                        <dd>
                          <div className="text-3xl font-extrabold text-gray-900">
                            N/A {/* This would be dynamic with application data */}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-gray-500">
                    View all applications on the{' '}
                    <Link
                      href="/poster/applications"
                      className="text-blue-700 hover:text-blue-900 font-medium transition-colors"
                    >
                      Applications page
                    </Link>
                    .
                  </div>
                </div>
              </div>

              {/* Active Jobs Card */}
              <div className="bg-white overflow-hidden rounded-xl shadow-md border border-gray-100">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-blue-700 rounded-full p-3 shadow-lg">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Active Jobs
                        </dt>
                        <dd>
                          <div className="text-3xl font-extrabold text-gray-900">
                            {
                              recentJobs.filter(
                                (job) => job.status === 'active'
                              ).length
                            }
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-gray-500">
                    Jobs currently open for applications.
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Jobs Section */}
            <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-100">
              <div className="px-6 py-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-blue-900">
                    Your Recent Job Listings
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    A quick overview of your latest job postings.
                  </p>
                </div>
                <div className="mt-4 sm:mt-0">
                  <Link href="/poster/posted-jobs" passHref>
                    <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-blue-100 bg-blue-800 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200">
                      <FiBriefcase className="-ml-1 mr-2 h-5 w-5" />
                      View All Jobs
                    </button>
                  </Link>
                </div>
              </div>

              {dataError && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-6 mt-4 rounded-r-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <FiXCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{dataError}</p>
                    </div>
                  </div>
                </div>
              )}

              {dataLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-700"></div>
                  <span className="ml-4 text-blue-700">Loading jobs...</span>
                </div>
              ) : recentJobs.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="mt-2 text-lg font-medium text-blue-900">
                    No jobs posted yet
                  </h3>
                  <p className="mt-1 text-sm text-blue-700">
                    Get started by posting your first job.
                  </p>
                  <div className="mt-6">
                    <Link href="/poster/new-job" passHref>
                      <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-blue-100 bg-blue-800 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200">
                        <FiBriefcase className="-ml-1 mr-2 h-5 w-5" />
                        Post New Job
                      </button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="px-6 py-4 grid grid-cols-1 gap-6">
                  {recentJobs.map((job) => (
                    <div
                      key={job._id}
                      className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                              {job.title}
                            </h3>
                            <p className="text-gray-600 line-clamp-2 mb-4">
                              {job.description}
                            </p>

                            <div className="flex flex-wrap gap-4 mb-4">
                              <div className="flex items-center text-sm text-gray-600">
                                <FiMapPin className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                {job.location}
                              </div>

                              <div className="flex items-center text-sm text-gray-600">
                                ₹{job.salary.toLocaleString('en-IN')} {/* Display in INR */}
                              </div>

                              <div className="flex items-center text-sm text-gray-600">
                                <FiUsers className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                Openings: {job.numberOfOpenings}
                              </div>

                              <div className="flex items-center text-sm text-gray-600">
                                <svg
                                  className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                                Posted{' '}
                                {new Date(job.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`ml-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium 
                              ${
                                job.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : job.status === 'closed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                          >
                            {(job.status || 'inactive')
                              .charAt(0)
                              .toUpperCase() +
                              (job.status || 'inactive').slice(1)}
                          </span>
                        </div>

                        <div className="mt-6 flex justify-end space-x-3">
                          <Link href={`/poster/jobs/${job._id}/edit`} passHref>
                            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-blue-100 bg-blue-800 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200">
                              <FiEdit className="-ml-1 mr-2 h-5 w-5" />
                              Edit
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
