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
  FiEye, 
  FiArrowLeft,
  FiFileText,
  FiTrendingUp,
  FiClock,
  FiAward
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
  applicant: {
    _id: string;
  };
  status: 'pending' | 'reviewed' | 'interview' | 'accepted' | 'rejected';
  appliedAt: string;
}

export default function SeekerApplicationsPage() {
  const { user, loading: authLoading, isAuthenticated, logout, token } = useAuth();
  const router = useRouter();

  const [applications, setApplications] = useState<ApplicationDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Application statistics
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    interview: 0,
    accepted: 0,
    rejected: 0
  });

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

  // Calculate statistics whenever applications change
  useEffect(() => {
    const newStats = {
      total: applications.length,
      pending: applications.filter(app => app.status === 'pending').length,
      interview: applications.filter(app => app.status === 'interview').length,
      accepted: applications.filter(app => app.status === 'accepted').length,
      rejected: applications.filter(app => app.status === 'rejected').length
    };
    setStats(newStats);
  }, [applications]);

  // Fetch Applications
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!token || !user?._id) {
        throw new Error('Authentication token or user ID not available.');
      }

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

  // FIXED: Enhanced status badge classes with icons and better styling
  const getStatusConfig = (status: ApplicationDisplay['status']) => {
    const config = {
      pending: { 
        class: 'bg-yellow-50 text-yellow-800 border-yellow-200', 
        icon: FiClock,
        label: 'Under Review'
      },
      reviewed: { 
        class: 'bg-purple-50 text-purple-800 border-purple-200', 
        icon: FiEye,
        label: 'Reviewed'
      },
      interview: { 
        class: 'bg-blue-50 text-blue-800 border-blue-200', 
        icon: FiTrendingUp,
        label: 'Interview'
      },
      accepted: { 
        class: 'bg-green-50 text-green-800 border-green-200', 
        icon: FiAward,
        label: 'Accepted'
      },
      rejected: { 
        class: 'bg-red-50 text-red-800 border-red-200', 
        icon: FiXCircle,
        label: 'Not Selected'
      }
    };
    
    // FIX: Return default config for unknown status
    return config[status] || config.pending;
  };

  // Format salary display
  const formatSalary = (job: ApplicationDisplay['job']) => {
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
          <p className="text-gray-700 text-lg font-medium">Loading your applications...</p>
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
            onClick={toggleSidebar}
            className="p-2 text-white hover:bg-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-200 backdrop-blur-sm"
            aria-label="Open sidebar"
          >
            <FiMenu className="h-6 w-6" />
          </button>
          
          <div className="flex items-center gap-2">
            <IoSparkles className="h-5 w-5 text-yellow-300" />
            <h1 className="text-lg font-bold text-white">My Applications</h1>
          </div>
          
          <div className="w-10 h-6"></div> {/* Spacer for balance */}
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Enhanced Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-gradient-to-br from-[#1938A8] to-[#2D4FD8] rounded-2xl shadow-lg">
                    <FiFileText className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-[#1938A8] to-[#2D4FD8] bg-clip-text text-transparent">
                      My Applications
                    </h1>
                    <p className="text-gray-600 text-lg md:text-xl mt-2">
                      Track your job applications and their status
                    </p>
                  </div>
                </div>

                {/* Application Statistics */}
                {applications.length > 0 && (
                  <div className="flex flex-wrap gap-4 mt-6">
                    <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-xl border border-blue-100 shadow-sm">
                      <div className="w-3 h-3 bg-[#1938A8] rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-700">
                        {stats.total} Total Applications
                      </span>
                    </div>
                    {stats.pending > 0 && (
                      <div className="flex items-center gap-3 bg-yellow-50/80 backdrop-blur-sm px-4 py-3 rounded-xl border border-yellow-200 shadow-sm">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm font-medium text-yellow-700">
                          {stats.pending} Under Review
                        </span>
                      </div>
                    )}
                    {stats.interview > 0 && (
                      <div className="flex items-center gap-3 bg-blue-50/80 backdrop-blur-sm px-4 py-3 rounded-xl border border-blue-200 shadow-sm">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-blue-700">
                          {stats.interview} Interview Stage
                        </span>
                      </div>
                    )}
                    {stats.accepted > 0 && (
                      <div className="flex items-center gap-3 bg-green-50/80 backdrop-blur-sm px-4 py-3 rounded-xl border border-green-200 shadow-sm">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-green-700">
                          {stats.accepted} Accepted!
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <Link href="/seeker/dashboard" passHref>
                <button className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-lg text-white bg-gradient-to-r from-[#1938A8] to-[#2D4FD8] hover:from-[#182E78] hover:to-[#1938A8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1938A8] transition-all duration-200 transform hover:scale-105 backdrop-blur-sm">
                  <FiArrowLeft className="-ml-1 mr-2 h-5 w-5" />
                  Back to Dashboard
                </button>
              </Link>
            </div>

            {/* Enhanced Error Message */}
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 p-6 rounded-2xl shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <FiXCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-base text-red-700 font-medium">{error}</p>
                    <button
                      onClick={fetchApplications}
                      className="text-sm text-red-600 hover:text-red-800 font-medium mt-1 transition-colors duration-200"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Loading State */}
            {loading ? (
              <div className="flex flex-col justify-center items-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-100">
                <div className="relative">
                  <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-[#1938A8]"></div>
                  <IoRocket className="absolute inset-0 m-auto h-10 w-10 text-[#1938A8] animate-bounce" />
                </div>
                <p className="text-gray-700 text-xl mt-6 font-medium">
                  Loading your applications...
                </p>
                <p className="text-gray-500 mt-2">We're gathering all your application details</p>
              </div>
            ) : applications.length === 0 ? (
              /* Enhanced Empty State */
              <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-xl p-12 text-center border border-blue-100 backdrop-blur-sm">
                <div className="max-w-md mx-auto">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <FiFileText className="h-12 w-12 text-[#1938A8]" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    No applications yet
                  </h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Start your job search journey! Browse available positions and apply to find your perfect role.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                      href="/seeker/jobs"
                      className="inline-flex items-center px-6 py-3 border border-transparent shadow-lg text-base font-medium rounded-xl text-white bg-gradient-to-r from-[#1938A8] to-[#2D4FD8] hover:from-[#182E78] hover:to-[#1938A8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1938A8] transition-all duration-200 transform hover:scale-105"
                    >
                      <IoRocket className="-ml-1 mr-2 h-5 w-5" />
                      Browse Jobs
                    </Link>
                    <button
                      onClick={fetchApplications}
                      className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-lg text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                    >
                      <FiRefreshCcw className="-ml-1 mr-2 h-5 w-5" />
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Enhanced Applications Grid */
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {applications.map((app, index) => {
                  // FIX: Ensure statusConfig is always defined
                  const statusConfig = getStatusConfig(app.status);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <div
                      key={app._id}
                      className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-lg border border-blue-100 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 flex flex-col backdrop-blur-sm group"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="p-6 flex-1">
                        {/* Company Header */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className="flex-shrink-0">
                            {app.job.companyLogo ? (
                              <img
                                src={app.job.companyLogo}
                                alt={app.job.company}
                                className="h-14 w-14 object-contain rounded-2xl shadow-lg border border-blue-200 group-hover:scale-110 transition-transform duration-300"
                              />
                            ) : (
                              <div className="h-14 w-14 bg-gradient-to-br from-[#1938A8] to-[#2D4FD8] rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                <span className="text-white font-bold text-lg">
                                  {app.job.company?.charAt(0) || 'J'}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-[#1938A8] transition-colors duration-200 line-clamp-2">
                              {app.job.title}
                            </h3>
                            <p className="text-sm font-semibold text-gray-600 mt-1">
                              {app.job.company}
                            </p>
                          </div>
                        </div>

                        {/* Job Details */}
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <FiMapPin className="mr-3 text-[#1938A8] flex-shrink-0" size={16} />
                            <span className="truncate">{app.job.location}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <FiBriefcase className="mr-3 text-[#1938A8] flex-shrink-0" size={16} />
                            <span>{app.job.jobType || 'Full-time'}</span>
                          </div>
                          {app.job.numberOfOpenings && (
                            <div className="flex items-center text-sm text-gray-600">
                              <FiUsers className="mr-3 text-[#1938A8] flex-shrink-0" size={16} />
                              <span>{app.job.numberOfOpenings} Openings</span>
                            </div>
                          )}
                          <div className="flex items-center text-sm text-gray-600">
                            <FiCalendar className="mr-3 text-[#1938A8] flex-shrink-0" size={16} />
                            <span>Applied {new Date(app.appliedAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}</span>
                          </div>
                          
                          {/* Salary */}
                          <div className="mt-3">
                            <p className="text-lg font-bold bg-gradient-to-r from-[#1938A8] to-[#2D4FD8] bg-clip-text text-transparent">
                              {formatSalary(app.job)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Footer with Status and Actions */}
                      <div className="p-6 pt-0 flex items-center justify-between">
                        {/* Enhanced Status Badge - FIXED: statusConfig is now guaranteed to be defined */}
                        <span className={`inline-flex items-center px-3 py-2 rounded-xl text-sm font-semibold border ${statusConfig.class} backdrop-blur-sm`}>
                          <StatusIcon className="mr-2 h-4 w-4" />
                          {statusConfig.label}
                        </span>
                        
                        {/* View Job Button */}
                        <Link href={`/seeker/job/${app.job._id}`} passHref>
                          <button className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl shadow-lg text-white bg-gradient-to-r from-[#1938A8] to-[#2D4FD8] hover:from-[#182E78] hover:to-[#1938A8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1938A8] transition-all duration-200 transform hover:scale-105 backdrop-blur-sm">
                            View Details
                            <FiEye className="ml-2 h-4 w-4" />
                          </button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}