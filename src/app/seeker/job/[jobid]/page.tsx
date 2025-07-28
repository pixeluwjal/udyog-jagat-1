// app/seeker/job/[jobid]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Sidebar from '@/app/components/Sidebar';
import Link from 'next/link';

// Define a more specific Job interface for detailed view
interface Job {
  _id: string;
  title: string;
  description: string;
  location: string;
  salary: number;
  company?: string;
  companyLogo?: string;
  jobType?: string;
  skills?: string[];
  createdAt: string; // ISO date string
  isSaved?: boolean; // To track if the job is saved by the user
  // Add any other fields you expect from your job detail API
}

// Define the color theme based on your input
const theme = {
  job_seeker: {
    bg: "bg-gradient-to-b from-indigo-800 to-indigo-950",
    hover: "hover:bg-indigo-700",
    active: "bg-indigo-600",
    text: "text-indigo-100",
    border: "border-indigo-700",
    mobileButton: "bg-indigo-700",
    primaryColor: "#1938A8", // Extracted from your prompt (from-indigo-800 roughly)
    darkPrimaryColor: "#182E78", // Extracted from your prompt (to-indigo-950 roughly)
  },
};

export default function JobDetailPage() {
  const { user, loading: authLoading, isAuthenticated, logout, token } = useAuth();
  const router = useRouter();
  const params = useParams(); // Get dynamic parameters from the URL
  const jobId = params.jobid as string; // Extract jobid from params

  const [job, setJob] = useState<Job | null>(null);
  const [moreJobs, setMoreJobs] = useState<Job[]>([]); // For the "More Jobs" section
  const [loadingJob, setLoadingJob] = useState(true);
  const [loadingMoreJobs, setLoadingMoreJobs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [applicationStatus, setApplicationStatus] = useState<string>('Not Applied'); // Status for the current job
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for mobile sidebar

  // --- Redirection Logic ---
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user) {
      console.warn('JobDetailPage: Not authenticated or user missing. Redirecting to /login.');
      router.push('/login');
      return;
    }

    if (user.firstLogin) {
      console.warn('JobDetailPage: User is firstLogin. Redirecting to /change-password.');
      router.push('/change-password');
      return;
    }

    if (user.role !== 'job_seeker') {
      console.warn(`JobDetailPage: User role is ${user.role}, not a job_seeker. Redirecting.`);
      if (user.role === 'admin') router.push('/admin/dashboard');
      else if (user.role === 'job_poster') router.push('/poster/dashboard');
      else router.push('/'); // Fallback for unexpected roles
      return;
    }

    if (user.role === 'job_seeker' && user.onboardingStatus !== 'completed') {
      console.warn('JobDetailPage: Job Seeker onboarding not completed. Redirecting to /seeker/onboarding.');
      router.push('/seeker/onboarding');
      return;
    }
  }, [authLoading, isAuthenticated, user, router]);

  // --- Fetch Job Details ---
  const fetchJobDetails = useCallback(async () => {
    if (!jobId) {
      setError('Job ID is missing.');
      setLoadingJob(false);
      return;
    }
    if (!token) {
      setError('Authentication token missing. Please log in again.');
      setLoadingJob(false);
      return;
    }

    setLoadingJob(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch job details');
      }

      const fetchedJob: Job = data.job; // Assuming API returns { job: JobObject }
      setJob(fetchedJob);

      // After fetching job details, check its application and saved status
      const appliedStatus = await fetchApplicationStatus(jobId, user?._id);
      setApplicationStatus(appliedStatus);

      const isJobSaved = await fetchSavedJobStatus(jobId, user?._id);
      setJob(prevJob => prevJob ? { ...prevJob, isSaved: isJobSaved } : fetchedJob);

    } catch (err: any) {
      console.error('Failed to fetch job details:', err);
      setError(err.message || 'Failed to load job details.');
      setJob(null);
    } finally {
      setLoadingJob(false);
    }
  }, [jobId, token, user?._id]);

  // --- Fetch More Jobs (for sidebar) ---
  const fetchMoreJobs = useCallback(async () => {
    setLoadingMoreJobs(true);
    try {
      if (!token) {
        throw new Error('Authentication token missing.');
      }
      // Fetch up to 5 other jobs, excluding the current one
      const response = await fetch(`/api/jobs?limit=5&excludeJobId=${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch more jobs');
      }
      setMoreJobs(Array.isArray(data.jobs) ? data.jobs : []);
    } catch (err: any) {
      console.error('Failed to fetch more jobs:', err);
      // Optionally set an error for more jobs, but don't block main content
      setMoreJobs([]);
    } finally {
      setLoadingMoreJobs(false);
    }
  }, [jobId, token]);

  // --- Fetch Application Status for a single job ---
  const fetchApplicationStatus = useCallback(async (jobIdToCheck: string, applicantId: string | undefined) => {
    if (!token || !applicantId) {
      return 'Not Applied';
    }
    try {
      const response = await fetch(`/api/applications?jobIds=${jobIdToCheck}&applicantId=${applicantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data.applications) && data.applications.length > 0) {
        return 'Applied';
      }
      return 'Not Applied';
    } catch (error) {
      console.error('Error fetching application status:', error);
      return 'Not Applied';
    }
  }, [token]);

  // --- Fetch Saved Job Status for a single job ---
  const fetchSavedJobStatus = useCallback(async (jobIdToCheck: string, applicantId: string | undefined) => {
    if (!token || !applicantId) {
      return false;
    }
    try {
      const response = await fetch(`/api/seeker/saved-jobs`, { // Fetch all saved jobs
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data.savedJobs)) {
        return data.savedJobs.some((savedJob: any) => savedJob.job._id === jobIdToCheck);
      }
      return false;
    } catch (error) {
      console.error('Error fetching saved job status:', error);
      return false;
    }
  }, [token]);


  useEffect(() => {
    if (!authLoading && isAuthenticated && user && user.role === 'job_seeker' && user.onboardingStatus === 'completed') {
      fetchJobDetails();
      fetchMoreJobs();
    }
  }, [authLoading, isAuthenticated, user, fetchJobDetails, fetchMoreJobs]);

  // --- Handle Apply Button Click ---
  const handleApply = async () => {
    if (!token || !job?._id) {
      setError('Authentication token or job ID missing. Please log in again.');
      return;
    }

    setApplicationStatus('Applying...');
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ jobId: job._id })
      });

      const data = await response.json();

      if (!response.ok) {
        // If there's an error indicating missing resume, handle redirection
        if (response.status === 400 && data.error === 'Resume required' && data.redirect) {
            setError('Please upload your resume in your profile before applying.');
            setTimeout(() => router.push(data.redirect), 3000); // Redirect after a short delay
            setApplicationStatus('Not Applied'); // Revert status
            return;
        }
        throw new Error(data.error || 'Failed to apply');
      }

      setApplicationStatus('Applied');
      setMessage('Application submitted successfully!');
      // After successful application, also update the saved status locally
      setJob(prevJob => prevJob ? { ...prevJob, isSaved: false } : null); // Job should be unsaved
    } catch (err: any) {
      console.error('Error applying:', err);
      setApplicationStatus('Not Applied'); // Revert status on failure
      setError(err.message || 'Failed to apply for job');
    }
  };

  // --- Handle Save/Unsave Job Button Click ---
  const handleSaveUnsaveJob = async () => {
    if (!token || !job?._id) {
      setError('Authentication token or job ID missing. Please log in again.');
      return;
    }

    // Disable save/unsave if already applied
    if (applicationStatus === 'Applied') {
        setError('You cannot save/unsave a job you have already applied for.');
        return;
    }

    const isCurrentlySaved = job.isSaved || false;

    // Optimistically update UI
    setJob(prevJob => prevJob ? { ...prevJob, isSaved: !isCurrentlySaved } : null);
    setMessage(isCurrentlySaved ? 'Unsaving job...' : 'Saving job...');
    setError(null);

    try {
      const method = isCurrentlySaved ? 'DELETE' : 'POST';
      const url = isCurrentlySaved ? `/api/seeker/saved-jobs?jobId=${job._id}` : '/api/seeker/saved-jobs';
      const body = isCurrentlySaved ? null : JSON.stringify({ jobId: job._id });

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: body
      });

      const data = await response.json();

      if (!response.ok) {
        // Revert optimistic update on error
        setJob(prevJob => prevJob ? { ...prevJob, isSaved: isCurrentlySaved } : null);
        throw new Error(data.error || `Failed to ${isCurrentlySaved ? 'unsave' : 'save'} job`);
      }

      setMessage(data.message || `Job ${isCurrentlySaved ? 'unsaved' : 'saved'} successfully!`);
    } catch (err: any) {
      console.error(`Error ${isCurrentlySaved ? 'unsaving' : 'saving'} job:`, err);
      setError(err.message || `Failed to ${isCurrentlySaved ? 'unsave' : 'save'} job`);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };


  // --- Conditional Rendering for Loading/Unauthorized States ---
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
          <p className="mt-4 text-gray-700">Loading job details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden font-inter">
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
            Job Details
          </h1>
          {/* Placeholder for spacing on the right, equivalent to hamburger icon size */}
          <div className="h-6 w-6"></div> {/* This helps balance the header */}
        </div>


        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
            {/* Main Job Details Section */}
            <div className="flex-1 bg-white rounded-xl shadow-lg border border-gray-100 p-6 lg:p-8 transform transition-transform duration-300 hover:scale-[1.005]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 h-16 w-16 bg-indigo-100 rounded-lg flex items-center justify-center shadow-md">
                    {job?.companyLogo ? (
                      <img src={job.companyLogo} alt={job.company} className="h-14 w-14 object-contain rounded-md" />
                    ) : (
                      <span className="text-indigo-600 font-bold text-2xl">{job?.company?.charAt(0) || 'J'}</span>
                    )}
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight">{job?.title || 'Loading Job...'}</h1>
                    <p className="text-lg text-gray-600 mt-1">{job?.company || 'N/A'} • {job?.location || 'N/A'}</p>
                  </div>
                </div>
                <div className="text-right sm:self-center">
                  <span className="text-3xl font-bold text-gray-900">${job?.salary.toLocaleString() || 'N/A'}</span>
                  <span className="text-md text-gray-500">/year</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg shadow-md flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              )}
              {message && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg shadow-md flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 000-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700 font-medium">{message}</p>
                  </div>
                </div>
              )}

              {loadingJob ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-500"></div>
                  <p className="ml-4 text-gray-700 text-lg">Loading job details...</p>
                </div>
              ) : !job ? (
                <div className="text-center py-12 text-gray-600">Job details could not be loaded. Please try again.</div>
              ) : (
                <>
                  <div className="mb-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-indigo-200 pb-2">Job Description</h2>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line text-base">{job.description}</p>
                  </div>

                  {job.skills && job.skills.length > 0 && (
                    <div className="mb-8">
                      <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-indigo-200 pb-2">Required Skills</h2>
                      <div className="flex flex-wrap gap-2">
                        {job.skills.map((skill, index) => (
                          <span key={index} className={`px-4 py-1 ${theme.job_seeker.bg} ${theme.job_seeker.text} text-sm rounded-full font-medium shadow-sm`}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-indigo-200 pb-2">Job Overview</h2>
                    <ul className="space-y-3 text-gray-700">
                      <li className="flex items-center">
                        <svg className="w-5 h-5 mr-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <strong>Location:</strong> {job.location}
                      </li>
                      <li className="flex items-center">
                        <svg className="w-5 h-5 mr-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 6v2m0 6v2" /></svg>
                        <strong>Salary:</strong> ${job.salary.toLocaleString()} / year
                      </li>
                      <li className="flex items-center">
                        <svg className="w-5 h-5 mr-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        <strong>Job Type:</strong> {job.jobType || 'Full-time'}
                      </li>
                      <li className="flex items-center">
                        <svg className="w-5 h-5 mr-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <strong>Posted On:</strong> {new Date(job.createdAt).toLocaleDateString()}
                      </li>
                    </ul>
                  </div>

                  <div className="mt-8 flex flex-col sm:flex-row gap-4">
                    {/* Apply Now Button */}
                    {applicationStatus === 'Applying...' ? (
                      <button
                        disabled
                        className="flex-1 px-6 py-3 bg-indigo-400 text-white rounded-lg font-semibold cursor-not-allowed shadow-md flex items-center justify-center gap-2 transform transition-all duration-200"
                      >
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                        Applying...
                      </button>
                    ) : applicationStatus === 'Applied' ? (
                      <button
                        disabled
                        className="flex-1 px-6 py-3 bg-green-100 text-green-800 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-md cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Applied
                      </button>
                    ) : (
                      <button
                        onClick={handleApply}
                        className={`flex-1 px-6 py-3 ${theme.job_seeker.bg} ${theme.job_seeker.hover} text-white rounded-lg font-semibold transition-all duration-200 shadow-lg flex items-center justify-center gap-2 transform active:scale-98`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Apply Now
                      </button>
                    )}

                    {/* Save/Unsave Button */}
                    <button
                      onClick={handleSaveUnsaveJob}
                      disabled={applicationStatus === 'Applied'} // Disable if already applied
                      className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg flex items-center justify-center gap-2 transform active:scale-98
                        ${job.isSaved
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300'
                        }
                        ${applicationStatus === 'Applied' ? 'opacity-60 cursor-not-allowed' : ''}
                      `}
                    >
                      {job.isSaved ? (
                        <>
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"></path></svg>
                          Saved
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                          Save Job
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* More Jobs Sidebar Section */}
            <div className="w-full lg:w-80 flex-shrink-0 bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-extrabold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">More Jobs Like This</h2>
              {loadingMoreJobs ? (
                <div className="flex flex-col space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse bg-gray-100 p-4 rounded-lg">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : moreJobs.length === 0 ? (
                <p className="text-gray-500 text-sm">No other jobs found at the moment.</p>
              ) : (
                <div className="space-y-4">
                  {moreJobs.map((otherJob) => (
                    <Link href={`/seeker/job/${otherJob._id}`} key={otherJob._id} passHref>
                      <div className="block p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200 cursor-pointer shadow-sm">
                        <h3 className="text-md font-semibold text-gray-800 line-clamp-2">{otherJob.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{otherJob.company || 'N/A'} • {otherJob.location}</p>
                        <p className="text-sm text-gray-500 mt-1">${otherJob.salary.toLocaleString()}/year</p>
                      </div>
                    </Link>
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