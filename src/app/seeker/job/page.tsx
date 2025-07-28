// app/seeker/jobs/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Sidebar from '@/app/components/Sidebar';
import Link from 'next/link';

// Define a more specific Job interface
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
  isSaved?: boolean; // Add isSaved property to track saved status
}

// Define the color theme object
const colorTheme = {
  job_seeker: {
    bg: "bg-gradient-to-b from-indigo-800 to-indigo-950", // This will now be primarily for sidebar, if used
    hover: "hover:bg-indigo-700",
    active: "bg-indigo-600",
    text: "text-indigo-100",
    border: "border-indigo-700",
    mobileButton: "bg-indigo-700",
  },
};

export default function JobSeekerJobsPage() {
  const { user, loading: authLoading, isAuthenticated, logout, token } = useAuth();
  const router = useRouter();

  console.log('JobSeekerJobsPage Render:', { user, authLoading, isAuthenticated, token: token ? 'present' : 'missing' });

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [applicationStatus, setApplicationStatus] = useState<{ [jobId: string]: string }>({});
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [salaryFilter, setSalaryFilter] = useState('');
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false); // State for mobile filter sidebar

  const [currentPage, setCurrentPage] = useState(1);
  const [jobsPerPage] = useState(10); // Display 10 jobs per page for stacked layout
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for mobile sidebar

  const fetchApplicationStatuses = useCallback(async (jobIds: string[], applicantId: string) => {
    if (!token || jobIds.length === 0 || !applicantId) {
      console.log("Skipping fetchApplicationStatuses: Missing token, applicantId, or jobIds.");
      return {};
    }
    console.log(`fetchApplicationStatuses: Fetching for applicantId: ${applicantId} and ${jobIds.length} jobIds.`);

    try {
      const response = await fetch(`/api/applications?jobIds=${jobIds.join(',')}&applicantId=${applicantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (response.ok && Array.isArray(data.applications)) {
        const statusMap: { [jobId: string]: string } = {};
        data.applications.forEach((app: any) => {
          if (app.job && app.job._id) {
            statusMap[app.job._id] = 'Applied';
          } else {
            console.warn('Application object missing job or job._id from backend for app:', app);
          }
        });
        console.log('fetchApplicationStatuses: Fetched status map:', statusMap);
        return statusMap;
      } else {
        console.error('fetchApplicationStatuses: Error fetching applications status:', data.error || 'Invalid response');
        return {};
      }
    } catch (error) {
      console.error('fetchApplicationStatuses: Caught error:', error);
      return {};
    }
  }, [token]);

  const fetchSavedJobStatuses = useCallback(async (applicantId: string) => {
    if (!token || !applicantId) {
      console.log("Skipping fetchSavedJobStatuses: Missing token or applicantId.");
      return [];
    }
    console.log(`fetchSavedJobStatuses: Fetching for applicantId: ${applicantId}.`);

    try {
      const response = await fetch(`/api/seeker/saved-jobs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data.savedJobs)) {
        const savedJobIds = data.savedJobs.map((savedJob: any) => savedJob.job._id);
        console.log('fetchSavedJobStatuses: Fetched saved job IDs:', savedJobIds);
        return savedJobIds;
      } else {
        console.error('fetchSavedJobStatuses: Error fetching saved jobs status:', data.error || 'Invalid response');
        return [];
      }
    } catch (error) {
      console.error('fetchSavedJobStatuses: Caught error:', error);
      return [];
    }
  }, [token]);

  const fetchJobs = useCallback(async (page: number, limit: number, currentUserId: string | null | undefined) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    console.log(`fetchJobs: Attempting to fetch jobs for page ${page}, limit ${limit}. User ID: ${currentUserId}`);

    try {
      if (!token) {
        setError('Authentication token missing. Please log in again.');
        setLoading(false);
        return;
      }

      let url = '/api/jobs';
      const params = new URLSearchParams();

      if (searchTerm) params.append('search', searchTerm);
      if (locationFilter) params.append('location', locationFilter);
      if (salaryFilter) params.append('minSalary', salaryFilter);

      params.append('page', page.toString());
      params.append('limit', limit.toString());

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch jobs');
      }

      if (Array.isArray(data.jobs)) {
        const fetchedJobs: Job[] = data.jobs;
        setTotalJobs(data.totalJobs || 0);
        setTotalPages(Math.ceil((data.totalJobs || 0) / jobsPerPage));

        let appliedStatusMap: { [jobId: string]: string } = {};
        let savedJobsList: string[] = [];

        if (currentUserId) {
          console.log('fetchJobs: User ID available. Fetching application and saved job statuses.');
          [appliedStatusMap, savedJobsList] = await Promise.all([
            fetchApplicationStatuses(fetchedJobs.map(job => job._id), currentUserId),
            fetchSavedJobStatuses(currentUserId)
          ]);
        } else {
          console.warn('fetchJobs: User ID is null or undefined. Cannot fetch application/saved statuses for this batch of jobs.');
          setApplicationStatus({});
          setJobs(fetchedJobs.map(job => ({ ...job, isSaved: false })));
        }

        const updatedJobs = fetchedJobs.map(job => ({
          ...job,
          isSaved: savedJobsList.includes(job._id)
        }));

        setJobs(updatedJobs);
        if (currentUserId) {
          setApplicationStatus(appliedStatusMap);
        } else {
          setApplicationStatus({});
        }

      } else {
        setError('Invalid data format from server');
        setJobs([]);
        setTotalJobs(0);
        setTotalPages(1);
      }
    } catch (err: any) {
      console.error('fetchJobs: Caught error:', err);
      setError(err.message || 'Failed to load jobs');
      setJobs([]);
      setTotalJobs(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [token, searchTerm, locationFilter, salaryFilter, jobsPerPage, fetchApplicationStatuses, fetchSavedJobStatuses]);


  useEffect(() => {
    console.log('useEffect: Running. authLoading:', authLoading, 'isAuthenticated:', isAuthenticated, 'user:', user);

    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!isAuthenticated || !user) {
      console.warn('useEffect: Not authenticated or user missing. Redirecting to /login.');
      router.push('/login');
      return;
    }
    if (user.firstLogin) {
      console.warn('useEffect: User is firstLogin. Redirecting to /change-password.');
      router.push('/change-password');
      return;
    }
    if (user.role !== 'job_seeker') {
      console.warn(`useEffect: User role is ${user.role}, not a job_seeker. Redirecting.`);
      if (user.role === 'admin') router.push('/admin/dashboard');
      else if (user.role === 'job_poster') router.push('/poster/dashboard');
      else router.push('/');
      return;
    }
    if (user.role === 'job_seeker' && user.onboardingStatus !== 'completed') {
      console.warn('useEffect: Job Seeker onboarding not completed. Redirecting to /seeker/onboarding.');
      router.push('/seeker/onboarding');
      return;
    }

    if (user._id) {
      console.log('useEffect: User ID confirmed:', user._id, '. Triggering fetchJobs...');
      fetchJobs(currentPage, jobsPerPage, user._id);
    } else {
      console.error('useEffect: CRITICAL - User object is present but _id is missing after all checks. User:', user);
      setError('User ID could not be retrieved. Please try logging in again.');
      setLoading(false);
    }

  }, [
    authLoading,
    isAuthenticated,
    user,
    router,
    currentPage,
    jobsPerPage,
    searchTerm,
    locationFilter,
    salaryFilter,
    token,
    fetchJobs
  ]);

  const handleApply = async (jobId: string) => {
    if (!token) {
      setError('You must be logged in to apply');
      return;
    }
    if (!user?._id) {
      setError('User information missing. Cannot apply for job.');
      return;
    }

    setApplicationStatus(prev => ({ ...prev, [jobId]: 'Applying...' }));
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ jobId, applicantId: user._id })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to apply');
      }

      setApplicationStatus(prev => ({ ...prev, [jobId]: 'Applied' }));
      setMessage('Application submitted successfully!');
    } catch (err: any) {
      console.error('handleApply: Caught error:', err);
      setApplicationStatus(prev => ({ ...prev, [jobId]: 'Failed' }));
      setError(err.message || 'Failed to apply for job');
    }
  };

  const handleSaveUnsaveJob = async (jobId: string, isCurrentlySaved: boolean) => {
    if (!token) {
      setError('You must be logged in to save jobs.');
      return;
    }
    if (!user?._id) {
      setError('User information missing. Cannot save job.');
      return;
    }

    setJobs(prevJobs => prevJobs.map(job =>
      job._id === jobId ? { ...job, isSaved: !isCurrentlySaved } : job
    ));
    setMessage(isCurrentlySaved ? 'Unsaving job...' : 'Saving job...');
    setError(null);

    try {
      const method = isCurrentlySaved ? 'DELETE' : 'POST';
      const url = isCurrentlySaved ? `/api/seeker/saved-jobs?jobId=${jobId}` : '/api/seeker/saved-jobs';
      const body = isCurrentlySaved ? null : JSON.stringify({ jobId, applicantId: user._id });

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
        setJobs(prevJobs => prevJobs.map(job =>
          job._id === jobId ? { ...job, isSaved: isCurrentlySaved } : job
        ));
        throw new Error(data.error || `Failed to ${isCurrentlySaved ? 'unsave' : 'save'} job`);
      }

      setMessage(data.message || `Job ${isCurrentlySaved ? 'unsaved' : 'saved'} successfully!`);
    } catch (err: any) {
      console.error('handleSaveUnsaveJob: Caught error:', err);
      setError(err.message || `Failed to ${isCurrentlySaved ? 'unsave' : 'save'} job`);
    }
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    setIsFilterSidebarOpen(false); // Close sidebar after applying filters on mobile
  };
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (authLoading || !isAuthenticated || !user || user.firstLogin ||
    (user.role === 'job_seeker' && user.onboardingStatus !== 'completed')) {
    return (
      <div className="flex h-screen bg-white">
        <div className="m-auto">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="mt-4 text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden font-inter">
      <Sidebar userRole={user.role} onLogout={logout} isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile Header - centered and white background with Hamburger and Filter Icons */}
        <div className="md:hidden bg-white shadow-sm p-4 flex items-center justify-between relative z-20">
          <button
            onClick={() => {toggleSidebar}} // Example for hamburger icon, linking to dashboard
            className="p-2 text-gray-600 hover:text-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors duration-200"
            aria-label="Open navigation"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
          <span className="text-lg font-bold text-indigo-600">Browse Jobs</span>
          <button
            onClick={() => setIsFilterSidebarOpen(true)}
            className="p-2 text-gray-600 hover:text-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors duration-200"
            aria-label="Open filters"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01.293.707V19a1 1 0 01-1 1H4a1 1 0 01-1-1v-6.586a1 1 0 01.293-.707L3 4zm6 6a3 3 0 11-6 0 3 3 0 016 0zm9 0a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
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
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <div className="mb-6 pb-6 border-b border-gray-200"> {/* Added border-b */}
                <label htmlFor="search" className="block text-sm font-semibold text-gray-700 mb-2">Search Keywords</label>
                <input
                  type="text"
                  id="search"
                  placeholder="e.g., Software Engineer, React"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 text-gray-800 placeholder-gray-400"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="mb-6 pb-6 border-b border-gray-200"> {/* Added border-b */}
                <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  id="location"
                  placeholder="e.g., New York, Remote"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 text-gray-800 placeholder-gray-400"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                />
              </div>

              <div className="mb-8">
                <label htmlFor="salary" className="block text-sm font-semibold text-gray-700 mb-2">Minimum Salary</label>
                <select
                  id="salary"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 bg-white text-gray-800"
                  value={salaryFilter}
                  onChange={(e) => setSalaryFilter(e.target.value)}
                >
                  <option value="">Any</option>
                  <option value="50000">$50,000+</option>
                  <option value="75000">$75,000+</option>
                  <option value="100000">$100,000+</option>
                  <option value="125000">$125,000+</option>
                  <option value="150000">$150,000+</option>
                  <option value="200000">$200,000+</option>
                </select>
              </div>

              <button
                onClick={handleApplyFilters}
                className={`w-full ${colorTheme.job_seeker.mobileButton} ${colorTheme.job_seeker.hover} text-white font-semibold py-3 px-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-300 shadow-lg transform hover:scale-105`}
              >
                Apply Filters
              </button>
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
                  <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">Browse Jobs</h1>
                  <p className="text-gray-600 text-lg">Find your next career opportunity</p>
                </div>
                <Link href="/seeker/dashboard" passHref>
                  <button className={`bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition duration-200 shadow-sm`}>
                    Back to Dashboard
                  </button>
                </Link>
              </div>

              {error && (
                <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg shadow-sm" role="alert">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
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
                <div className="bg-green-100 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg shadow-sm" role="alert">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 000-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-700 font-medium">{message}</p>
                    </div>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex flex-col justify-center items-center py-12 bg-white rounded-xl shadow-md border border-gray-100">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500"></div>
                  <p className="ml-4 text-gray-700 text-xl mt-4">Loading amazing jobs for you...</p>
                </div>
              ) : jobs.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-100">
                  <svg className="mx-auto h-20 w-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-4 text-2xl font-semibold text-gray-900">No jobs found</h3>
                  <p className="mt-2 text-md text-gray-600">Try adjusting your search filters or check back later. New opportunities are posted daily!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6"> {/* Changed to single column grid */}
                  {jobs.map((job) => (
                    <div key={job._id} className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col">
                      <Link href={`/seeker/job/${job._id}`} passHref className="flex-grow cursor-pointer">
                        <div className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 h-16 w-16 bg-indigo-50 rounded-lg flex items-center justify-center shadow-inner">
                              {job.companyLogo ? (
                                <img src={job.companyLogo} alt={job.company} className="h-14 w-14 object-contain rounded-md" />
                              ) : (
                                <span className="text-indigo-600 font-bold text-2xl">{job.company?.charAt(0) || 'J'}</span>
                              )}
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-800 hover:text-indigo-600 transition-colors duration-200">
                                {job.title}
                              </h3>
                              <div className="flex flex-wrap items-center gap-2 mt-1 text-sm">
                                <span className="font-medium text-gray-600">{job.company || 'N/A'}</span>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-500">{job.location}</span>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-500">{job.jobType || 'Full-time'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4">
                            <p className="text-base text-gray-700 line-clamp-3">{job.description}</p>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {job.skills?.slice(0, 4).map((skill: string, index: number) => (
                              <span key={index} className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full font-medium shadow-sm">
                                {skill}
                              </span>
                            ))}
                            {job.skills && job.skills.length > 4 && (
                              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full font-medium shadow-sm">
                                +{job.skills.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>

                      <div className="p-6 pt-0 flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3 mt-auto">
                        <div className="text-left sm:text-right w-full sm:w-auto">
                          <span className="text-2xl font-extrabold text-indigo-700">${job.salary.toLocaleString()}</span>
                          <span className="text-sm text-gray-500 ml-1">/year</span>
                        </div>
                        <div className="text-sm text-gray-500 w-full sm:w-auto text-left sm:text-right">
                          Posted {new Date(job.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto justify-start sm:justify-end flex-wrap">
                          <button
                            onClick={() => handleSaveUnsaveJob(job._id, job.isSaved || false)}
                            className={`py-2 px-5 rounded-lg font-semibold transition-all duration-200 shadow-md flex items-center justify-center gap-2
                              ${job.isSaved
                                ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500 focus:ring-yellow-500'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-400'
                              } focus:outline-none focus:ring-2 focus:ring-offset-2`}
                          >
                            {job.isSaved ? (
                              <>
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"></path></svg>
                                Saved
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                                Save
                              </>
                            )}
                          </button>

                          {applicationStatus[job._id] === 'Applying...' ? (
                            <button
                              disabled
                              className="bg-indigo-300 text-white py-2 px-6 rounded-lg font-semibold cursor-not-allowed shadow-md flex items-center justify-center gap-2"
                            >
                              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                              Applying...
                            </button>
                          ) : applicationStatus[job._id] === 'Applied' ? (
                            <button
                              disabled
                              className="bg-green-200 text-green-900 py-2 px-6 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-md cursor-not-allowed"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Applied
                            </button>
                          ) : (
                            <button
                              onClick={() => handleApply(job._id)}
                              className={`${colorTheme.job_seeker.mobileButton} ${colorTheme.job_seeker.hover} text-white py-2 px-6 rounded-lg font-semibold transition-all duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                            >
                              Apply Now
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
                    className="px-5 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 font-medium shadow-md"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-5 py-3 rounded-lg font-medium transition-colors duration-200 shadow-sm
                        ${currentPage === page
                          ? `${colorTheme.job_seeker.active} ${colorTheme.job_seeker.text}`
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
                    className="px-5 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 font-medium shadow-md"
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