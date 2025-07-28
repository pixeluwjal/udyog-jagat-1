// app/poster/posted-jobs/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar'; // Assuming Sidebar handles its own styling internally

// Interface for displaying job data
interface JobDisplay {
  _id: string;
  title: string;
  description: string;
  location: string;
  salary: number;
  status: 'active' | 'inactive' | 'closed';
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
      // Ensure token and user ID are available before making the request
      if (!token || !user?._id) {
        throw new Error('Authentication token or user ID not available. Please log in again.');
      }

      const queryParams = new URLSearchParams();
      queryParams.append('postedBy', user._id); // Filter jobs by the currently logged-in job poster
      queryParams.append('sortBy', 'createdAt'); // Sort by creation date
      queryParams.append('sortOrder', 'desc');    // Newest jobs first

      const response = await fetch(`/api/jobs?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}` // Include the authorization token
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch jobs');
      }

      // Check if the received data is an array of jobs
      if (Array.isArray(data.jobs)) {
        setJobs(data.jobs);
      } else {
        setError('Failed to fetch jobs: Invalid data format from server.');
        setJobs([]); // Set to empty array to avoid rendering issues
      }
    } catch (err: any) {
      // Catch and display any errors during the fetch process
      setError(err.message || 'Failed to load job data.');
    } finally {
      setLoading(false); // Always set loading to false after the fetch attempt
    }
  }, [token, user]); // Dependencies for useCallback: re-run if token or user changes

  // Trigger job fetching when authentication state is ready and user is a job_poster
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && user.role === 'job_poster') {
      fetchJobs();
    }
  }, [authLoading, isAuthenticated, user, fetchJobs]); // Dependencies for useEffect

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // --- Loading and Unauthorized State Display ---
  if (authLoading || !isAuthenticated || !user || user.firstLogin || user.role !== 'job_poster') {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="m-auto">
          {/* Spinner color using primary blue */}
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1938A8]"></div>
          <p className="mt-4 text-gray-700">Loading page...</p>
        </div>
      </div>
    );
  }

  // --- Main Component Render ---
  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden font-inter">
      {/* Pass isOpen and toggleSidebar to the Sidebar component for mobile responsiveness */}
      <Sidebar userRole={user.role} onLogout={logout} isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile Header: Centered Hamburger and Text, now with white background and specific title color */}
        <div className="md:hidden bg-white shadow-lg p-4 flex items-center justify-between relative z-10">
          {/* Hamburger Icon - Centered vertically with text */}
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
            Your Posted Jobs
          </h1>
          {/* Placeholder for spacing on the right, equivalent to hamburger icon size */}
          <div className="h-6 w-6"></div> {/* This helps balance the header */}
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Section (Desktop) */}
            <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Your Posted Jobs</h1>
                <p className="text-gray-600">View all your job listings</p>
              </div>
              <Link href="/poster/new-job" passHref>
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#1938A8] hover:bg-[#182E78] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1938A8]">
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Post New Job
                </button>
              </Link>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-100">
              <div className="px-6 py-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-medium text-gray-900">Job Listings</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} found
                  </p>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-6 mt-4 rounded-r-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1938A8]"></div>
                  <span className="ml-4 text-gray-700">Loading jobs...</span>
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs found</h3>
                  <p className="mt-1 text-sm text-gray-500">You haven't posted any jobs yet.</p>
                  <div className="mt-6">
                    <Link href="/poster/new-job" passHref>
                      <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#1938A8] hover:bg-[#182E78] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1938A8]">
                        <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Post New Job
                      </button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {jobs.map((job) => (
                    <div key={job._id} className="px-6 py-5 hover:bg-gray-50 transition-colors duration-150">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-medium text-gray-900 truncate">{job.title}</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${job.status === 'active' ? 'bg-green-100 text-green-800' :
                                job.status === 'closed' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'}`}
                            >
                              {job.status || 'inactive'}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600 line-clamp-2">{job.description}</p>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                            <div className="flex items-center text-sm text-gray-500">
                              <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.828 0L6.343 16.657a4 4 0 115.656-5.656l.828.829.828-.829a4 4 0 115.656 5.656z" />
                              </svg>
                              {job.location}
                            </div>

                            <div className="flex items-center text-sm text-gray-500">
                              <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              ${job.salary.toLocaleString()}
                            </div>

                            <div className="flex items-center text-sm text-gray-500">
                              <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Posted {new Date(job.createdAt).toLocaleDateString()}
                            </div>
                          </div>
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