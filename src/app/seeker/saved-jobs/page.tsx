// app/seeker/saved-jobs/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Sidebar from '@/app/components/Sidebar';
import Link from 'next/link';

// Define interfaces for data structure
interface Job {
  _id: string;
  title: string;
  description: string;
  location: string;
  salary: number;
  company?: string;
  companyLogo?: string;
  jobType?: string;
  createdAt: string;
}

interface SavedJobDisplay {
  _id: string;
  job: Job; // Populated job details
  savedAt: string;
}

export default function SeekerSavedJobsPage() {
  const { user, loading: authLoading, isAuthenticated, logout, token } = useAuth();
  const router = useRouter();

  const [savedJobs, setSavedJobs] = useState<SavedJobDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Redirection Logic
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user) {
      console.warn('SeekerSavedJobsPage: Not authenticated or user missing. Redirecting to /login.');
      router.push('/login');
      return;
    }

    if (user.firstLogin) {
      console.warn('SeekerSavedJobsPage: User is firstLogin. Redirecting to /change-password.');
      router.push('/change-password');
      return;
    }

    if (user.role !== 'job_seeker') {
      console.warn(`SeekerSavedJobsPage: User role is ${user.role}, not job_seeker. Redirecting.`);
      if (user.role === 'admin') router.push('/admin/dashboard');
      else if (user.role === 'job_poster') router.push('/poster/dashboard');
      else router.push('/'); // Default fallback
      return;
    }

    if (user.role === 'job_seeker' && user.onboardingStatus !== 'completed') {
      console.warn('SeekerSavedJobsPage: Job Seeker, onboarding pending. Redirecting to /seeker/onboarding.');
      router.push('/seeker/onboarding');
      return;
    }
  }, [authLoading, isAuthenticated, user, router]);

  // Fetch Saved Jobs
  const fetchSavedJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (!token) {
        throw new Error('Authentication token missing. Please log in again.');
      }
      const response = await fetch('/api/seeker/saved-jobs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch saved jobs');
      }

      setSavedJobs(Array.isArray(data.savedJobs) ? data.savedJobs : []);
    } catch (err: any) {
      console.error('Failed to fetch saved jobs:', err);
      setError(err.message || 'Failed to load saved jobs.');
      setSavedJobs([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Handle Unsave Job
  const handleUnsaveJob = async (savedJobId: string, jobId: string) => {
    setMessage(null);
    setError(null);
    if (!token) {
      setError('Authentication token missing. Please log in again.');
      return;
    }

    // Optimistically update UI
    setSavedJobs(prevJobs => prevJobs.filter(job => job._id !== savedJobId));
    setMessage('Unsaving job...');

    try {
      const response = await fetch(`/api/seeker/saved-jobs?jobId=${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        // If unsave fails, revert UI and show error
        fetchSavedJobs(); // Re-fetch to ensure data consistency
        throw new Error(data.error || 'Failed to unsave job');
      }

      setMessage(data.message || 'Job unsaved successfully!');
    } catch (err: any) {
      console.error('Error unsaving job:', err);
      setError(err.message || 'An unexpected error occurred while unsaving.');
      fetchSavedJobs(); // Re-fetch to ensure data consistency
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated && user && user.role === 'job_seeker' && user.onboardingStatus === 'completed') {
      fetchSavedJobs();
    }
  }, [authLoading, isAuthenticated, user, fetchSavedJobs]);

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
          <p className="mt-4 text-gray-700">Loading saved jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden font-inter">
      <Sidebar userRole={user.role} onLogout={logout} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center">
          <span className="text-lg font-bold text-indigo-600">
            Saved Jobs
          </span>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">
                  My Saved Jobs
                </h1>
                <p className="text-gray-500 text-lg">Manage your favorite job postings</p>
              </div>
              <Link href="/seeker/jobs" passHref>
                <button className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200">
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.55 23.55 0 0112 15c-1.606 0-3.14-.153-4.59-.445M21 4.87V11m0 0h-7.5M21 11l-3.25-3.25M12 3a9 9 0 100 18 9 9 0 000-18z" />
                  </svg>
                  Browse More Jobs
                </button>
              </Link>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg shadow-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              </div>
            )}
            {message && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg shadow-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700 font-medium">{message}</p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center py-12 bg-white rounded-xl shadow-md">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
                <p className="ml-4 text-gray-700">Loading your saved jobs...</p>
              </div>
            ) : savedJobs.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-100">
                <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <h3 className="mt-2 text-xl font-semibold text-gray-900">No saved jobs found</h3>
                <p className="mt-1 text-base text-gray-500">Start browsing jobs and save the ones you like!</p>
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
                {savedJobs.map((savedJob) => (
                  <div key={savedJob._id} className="bg-white rounded-xl shadow-md border border-gray-200 p-6 flex flex-col justify-between hover:shadow-lg transition-shadow duration-200 transform hover:-translate-y-1">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{savedJob.job.title}</h3>
                      <p className="text-sm text-gray-600 mb-1">{savedJob.job.company || 'N/A'} • {savedJob.job.location}</p>
                      <p className="text-md text-gray-800 font-semibold mb-3">${savedJob.job.salary.toLocaleString()} / year</p>
                      <p className="text-sm text-gray-500 line-clamp-3 mb-4">{savedJob.job.description}</p>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500 mt-auto">
                      <span>Saved on: {new Date(savedJob.savedAt).toLocaleDateString()}</span>
                      <div className="flex gap-2">
                        <Link href={`/seeker/job/${savedJob.job._id}`} passHref>
                          <button className="text-indigo-600 hover:text-indigo-800 font-medium">
                            View
                          </button>
                        </Link>
                        <button
                          onClick={() => handleUnsaveJob(savedJob._id, savedJob.job._id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Unsave
                        </button>
                      </div>
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
