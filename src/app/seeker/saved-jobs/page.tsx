'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Sidebar from '@/app/components/Sidebar';
import Link from 'next/link';
import { 
  FiMapPin, 
  FiBriefcase, 
  FiCalendar, 
  FiUsers, 
  FiXCircle, 
  FiCheckCircle, 
  FiMenu, 
  FiTrash2,
  FiArrowLeft,
  FiBookmark,
  FiEye,
  FiStar,
  FiRefreshCcw 
} from 'react-icons/fi';
import { IoSparkles, IoRocket } from 'react-icons/io5';

// Enhanced color theme with gradients
const colorTheme = {
  primary: "#1938A8",
  primaryLight: "#2D4FD8",
  primaryDark: "#12287A",
  secondary: "#182E78",
  accent: "#E9F2FF",
  accentDark: "#D4E5FF",
  background: "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50",
  cardGradient: "bg-gradient-to-br from-white to-blue-50",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
};

interface Job {
  _id: string;
  title: string;
  description: string;
  location: string;
  salaryOriginal?: string;
  salaryMin?: number;
  salaryMax?: number | null;
  company?: string;
  companyLogo?: string;
  jobType?: string;
  createdAt: string;
  numberOfOpenings?: number;
}

interface SavedJobDisplay {
  _id: string;
  job: Job;
  savedAt: string;
}

export default function SeekerSavedJobsPage() {
  const { user, loading: authLoading, isAuthenticated, logout, token } = useAuth();
  const router = useRouter();

  const [savedJobs, setSavedJobs] = useState<SavedJobDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [animatePulse, setAnimatePulse] = useState(false);

  // Redirection Logic
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

    if (user.role === 'job_seeker' && user.onboardingStatus !== 'completed') {
      router.push('/seeker/onboarding');
      return;
    }
  }, [authLoading, isAuthenticated, user, router]);

  // Fetch Saved Jobs
  const fetchSavedJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    setAnimatePulse(true);
    
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
      setTimeout(() => setAnimatePulse(false), 1000);
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
    setMessage('Removing from saved jobs...');

    try {
      const response = await fetch(`/api/seeker/saved-jobs?jobId=${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        fetchSavedJobs();
        throw new Error(data.error || 'Failed to unsave job');
      }

      setMessage('Job removed from saved list successfully!');
    } catch (err: any) {
      console.error('Error unsaving job:', err);
      setError(err.message || 'An unexpected error occurred while removing.');
      fetchSavedJobs();
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated && user && user.role === 'job_seeker' && user.onboardingStatus === 'completed') {
      fetchSavedJobs();
    }
  }, [authLoading, isAuthenticated, user, fetchSavedJobs]);

  // Format salary display
  const formatSalary = (job: Job) => {
    if (job.salaryOriginal) return job.salaryOriginal;
    if (job.salaryMin && job.salaryMax) {
      return `₹${(job.salaryMin / 100000).toFixed(1)} - ${(job.salaryMax / 100000).toFixed(1)} LPA`;
    }
    if (job.salaryMin) {
      return `₹${(job.salaryMin / 100000).toFixed(1)}+ LPA`;
    }
    return 'Salary not specified';
  };

  if (
    authLoading ||
    !isAuthenticated ||
    !user ||
    user.firstLogin ||
    (user.role === 'job_seeker' && user.onboardingStatus !== 'completed')
  ) {
    return (
      <div className={`flex h-screen ${colorTheme.background} justify-center items-center font-inter`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-medium">Loading your saved jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen ${colorTheme.background} overflow-hidden font-inter`}>
      <Sidebar userRole={user.role} onLogout={logout} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Enhanced Mobile Header */}
        <div className="md:hidden bg-gradient-to-r from-[#1938A8] to-[#2D4FD8] shadow-xl p-4 flex items-center justify-between relative z-20">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-white hover:bg-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-200 backdrop-blur-sm"
            aria-label="Open navigation"
          >
            <FiMenu className="h-6 w-6" />
          </button>
          
          <div className="flex items-center gap-2">
            <IoSparkles className="h-5 w-5 text-yellow-300" />
            <span className="text-lg font-bold text-white">Saved Jobs</span>
          </div>
          
          <div className="w-10 h-6"></div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Enhanced Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-gradient-to-br from-[#1938A8] to-[#2D4FD8] rounded-2xl shadow-lg">
                    <FiBookmark className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-[#1938A8] to-[#2D4FD8] bg-clip-text text-transparent">
                      Saved Jobs
                    </h1>
                    <p className="text-gray-600 text-lg md:text-xl mt-2">
                      Your curated list of favorite opportunities
                    </p>
                  </div>
                </div>

                {/* Saved Jobs Stats */}
                {savedJobs.length > 0 && (
                  <div className="flex flex-wrap gap-4 mt-6">
                    <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-xl border border-blue-100 shadow-sm">
                      <div className="w-3 h-3 bg-[#1938A8] rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-700">
                        {savedJobs.length} Saved Jobs
                      </span>
                    </div>
                    <div className="flex items-center gap-3 bg-yellow-50/80 backdrop-blur-sm px-4 py-3 rounded-xl border border-yellow-200 shadow-sm">
                      <FiStar className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-700">
                        {savedJobs.filter(job => new Date(job.savedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length} New this week
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/seeker/dashboard" passHref>
                  <button className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-xl shadow-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 transform hover:scale-105 backdrop-blur-sm">
                    <FiArrowLeft className="-ml-1 mr-2 h-5 w-5" />
                    Dashboard
                  </button>
                </Link>
                <Link href="/seeker/job" passHref>
                  <button className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-lg text-white bg-gradient-to-r from-[#1938A8] to-[#2D4FD8] hover:from-[#182E78] hover:to-[#1938A8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1938A8] transition-all duration-200 transform hover:scale-105 backdrop-blur-sm ${animatePulse ? 'animate-pulse' : ''}`}>
                    <IoRocket className="-ml-1 mr-2 h-5 w-5" />
                    Browse More Jobs
                  </button>
                </Link>
              </div>
            </div>

            {/* Enhanced Messages */}
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 p-6 rounded-2xl shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <FiXCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-base text-red-700 font-medium">{error}</p>
                    <button
                      onClick={fetchSavedJobs}
                      className="text-sm text-red-600 hover:text-red-800 font-medium mt-1 transition-colors duration-200"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {message && (
              <div className="bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 p-6 rounded-2xl shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <FiCheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="text-base text-green-700 font-medium">{message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Loading State */}
            {loading ? (
              <div className="flex flex-col justify-center items-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-100">
                <div className="relative">
                  <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-[#1938A8]"></div>
                  <FiBookmark className="absolute inset-0 m-auto h-10 w-10 text-[#1938A8] animate-bounce" />
                </div>
                <p className="text-gray-700 text-xl mt-6 font-medium">
                  Loading your saved jobs...
                </p>
                <p className="text-gray-500 mt-2">We're gathering all your favorite opportunities</p>
              </div>
            ) : savedJobs.length === 0 ? (
              /* Enhanced Empty State */
              <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-xl p-12 text-center border border-blue-100 backdrop-blur-sm">
                <div className="max-w-md mx-auto">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <FiBookmark className="h-12 w-12 text-[#1938A8]" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    No saved jobs yet
                  </h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Start exploring opportunities and save the ones that catch your eye. 
                    Your saved jobs will appear here for easy access.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                      href="/seeker/job"
                      className="inline-flex items-center px-6 py-3 border border-transparent shadow-lg text-base font-medium rounded-xl text-white bg-gradient-to-r from-[#1938A8] to-[#2D4FD8] hover:from-[#182E78] hover:to-[#1938A8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1938A8] transition-all duration-200 transform hover:scale-105"
                    >
                      <IoRocket className="-ml-1 mr-2 h-5 w-5" />
                      Explore Jobs
                    </Link>
                    <button
                      onClick={fetchSavedJobs}
                      className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-lg text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                    >
                      <FiRefreshCcw className="-ml-1 mr-2 h-5 w-5" />
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Enhanced Saved Jobs Grid */
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {savedJobs.map((savedJob, index) => (
                  <div
                    key={savedJob._id}
                    className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-lg border border-blue-100 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 flex flex-col backdrop-blur-sm group"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="p-6 flex-1">
                      {/* Company Header */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className="flex-shrink-0">
                          {savedJob.job.companyLogo ? (
                            <img
                              src={savedJob.job.companyLogo}
                              alt={savedJob.job.company}
                              className="h-14 w-14 object-contain rounded-2xl shadow-lg border border-blue-200 group-hover:scale-110 transition-transform duration-300"
                            />
                          ) : (
                            <div className="h-14 w-14 bg-gradient-to-br from-[#1938A8] to-[#2D4FD8] rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <span className="text-white font-bold text-lg">
                                {savedJob.job.company?.charAt(0) || 'J'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-[#1938A8] transition-colors duration-200 line-clamp-2">
                            {savedJob.job.title}
                          </h3>
                          <p className="text-sm font-semibold text-gray-600 mt-1">
                            {savedJob.job.company}
                          </p>
                        </div>
                      </div>

                      {/* Job Details */}
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <FiMapPin className="mr-3 text-[#1938A8] flex-shrink-0" size={16} />
                          <span className="truncate">{savedJob.job.location}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <FiBriefcase className="mr-3 text-[#1938A8] flex-shrink-0" size={16} />
                          <span>{savedJob.job.jobType || 'Full-time'}</span>
                        </div>
                        {savedJob.job.numberOfOpenings && (
                          <div className="flex items-center text-sm text-gray-600">
                            <FiUsers className="mr-3 text-[#1938A8] flex-shrink-0" size={16} />
                            <span>{savedJob.job.numberOfOpenings} Openings</span>
                          </div>
                        )}
                        
                        {/* Salary */}
                        <div className="mt-3">
                          <p className="text-lg font-bold bg-gradient-to-r from-[#1938A8] to-[#2D4FD8] bg-clip-text text-transparent">
                            {formatSalary(savedJob.job)}
                          </p>
                        </div>
                      </div>

                      {/* Job Description */}
                      <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">
                        {savedJob.job.description}
                      </p>
                    </div>
                    
                    {/* Footer with Actions */}
                    <div className="p-6 pt-0 flex items-center justify-between mt-4">
                      {/* Saved Date */}
                      <div className="flex items-center text-sm text-gray-500">
                        <FiCalendar className="mr-2 text-[#1938A8]" size={14} />
                        <span>Saved {new Date(savedJob.savedAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}</span>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Link href={`/seeker/job/${savedJob.job._id}`} passHref>
                          <button className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl shadow-lg text-white bg-gradient-to-r from-[#1938A8] to-[#2D4FD8] hover:from-[#182E78] hover:to-[#1938A8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1938A8] transition-all duration-200 transform hover:scale-105 backdrop-blur-sm">
                            <FiEye className="mr-2 h-4 w-4" />
                            View
                          </button>
                        </Link>
                        <button
                          onClick={() => handleUnsaveJob(savedJob._id, savedJob.job._id)}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl shadow-lg text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 transform hover:scale-105 backdrop-blur-sm"
                        >
                          <FiTrash2 className="mr-2 h-4 w-4" />
                          Remove
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