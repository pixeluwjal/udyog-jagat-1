// app/seeker/dashboard/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Sidebar from '@/app/components/Sidebar';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiMapPin,
  FiBriefcase,
  FiCalendar,
  FiUsers,
  FiMenu,
  FiFileText,
  FiBookmark,
  FiCheckCircle,
  FiTrendingUp,
  FiSearch,
  FiArrowRight,
  FiAward,
  FiClock
} from 'react-icons/fi';

// Brand colors
const primaryBlue = "#165BF8";
const darkBlue = "#1C3991";

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.6, 
      ease: [0.16, 1, 0.3, 1],
      delay: 0.1
    } 
  },
};

const cardAnimation = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { 
      duration: 0.7, 
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.15
    }
  }
};

const pulseEffect = {
  scale: [1, 1.05, 1],
  opacity: [1, 0.8, 1],
  transition: { 
    duration: 1.5, 
    repeat: Infinity, 
    ease: "easeInOut" 
  }
};

const cardHover = {
  scale: 1.02,
  y: -5,
  boxShadow: "0 20px 40px rgba(22, 91, 248, 0.15)",
  transition: { type: "spring", stiffness: 300, damping: 20 }
};

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

    if (user.role === 'job_referrer') {
      router.push('/referrer/dashboard');
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

  // Fetch Dashboard Stats
  const fetchStats = useCallback(async () => {
    if (!token || !user?._id || user.role !== 'job_seeker' || user.onboardingStatus !== 'completed') {
      setLoadingStats(false);
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
  }, [token, user]);

  // Fetch Recent Applications
  const fetchRecentApplications = useCallback(async () => {
    if (!token || !user?._id || user.role !== 'job_seeker' || user.onboardingStatus !== 'completed') {
      setLoadingApplications(false);
      return;
    }

    setLoadingApplications(true);
    setErrorApplications(null);
    try {
      const response = await fetch(`/api/applications?applicantId=${user._id}&limit=3&sortBy=appliedAt&sortOrder=desc`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch recent applications');
      }
      
      setRecentApplications(Array.isArray(data.applications) ? data.applications : []);
    } catch (err: any) {
      console.error('Failed to fetch recent applications:', err);
      setErrorApplications(err.message || 'Failed to load recent applications.');
      setRecentApplications([]);
    } finally {
      setLoadingApplications(false);
    }
  }, [token, user]);

  // Data fetching effect
  useEffect(() => {
    if (
      !authLoading &&
      isAuthenticated &&
      user &&
      user.role === 'job_seeker' &&
      user.onboardingStatus === 'completed'
    ) {
      fetchStats();
      fetchRecentApplications();
    } else {
      setStats({ appliedJobs: 0, interviews: 0, savedJobs: 0 });
      setRecentApplications([]);
      setLoadingStats(false);
      setLoadingApplications(false);
    }
  }, [authLoading, isAuthenticated, user, fetchStats, fetchRecentApplications]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Helper function to get status badge classes
  const getStatusClasses = (status: ApplicationDisplay['status']) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800 border-2 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-2 border-red-200';
      case 'interview':
        return 'bg-blue-100 text-blue-800 border-2 border-blue-200';
      case 'reviewed':
        return 'bg-purple-100 text-purple-800 border-2 border-purple-200';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800 border-2 border-yellow-200';
    }
  };

  // Loading state
  if (
    authLoading ||
    !isAuthenticated ||
    !user ||
    user.firstLogin ||
    user.role !== 'job_seeker' ||
    user.onboardingStatus !== 'completed'
  ) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] justify-center items-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center"
        >
          <motion.div
            animate={pulseEffect}
            className="rounded-full p-6 bg-gradient-to-br from-[#165BF8] to-[#1C3991] shadow-2xl"
          >
            <FiClock className="text-white h-12 w-12 animate-spin" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-xl font-semibold text-[#1C3991]"
          >
            Loading Dashboard...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] overflow-hidden font-inter">
      <Sidebar userRole={user.role} onLogout={logout} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} userEmail={user.email} />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Enhanced Mobile Header */}
        <div className="md:hidden bg-white/95 backdrop-blur-md shadow-2xl p-4 flex items-center justify-between z-10 sticky top-0 border-b border-[#165BF8]/10">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleSidebar}
            className="p-3 rounded-xl bg-[#165BF8]/10 text-[#165BF8] hover:bg-[#165BF8]/20 transition-all duration-200"
          >
            <FiMenu className="h-6 w-6" />
          </motion.button>
          
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-black bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent"
          >
            Dashboard
          </motion.h1>
          
          <div className="w-12"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header Section */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="text-center"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#165BF8] to-[#1C3991] rounded-3xl shadow-2xl mb-6"
              >
                <FiAward className="h-10 w-10 text-white" />
              </motion.div>
              <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent mb-4">
                Welcome back, {user.username}!
              </h1>
              <p className="text-lg text-[#165BF8] font-medium max-w-2xl mx-auto">
                Track your job applications and discover new opportunities
              </p>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              transition={{ delay: 0.1 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/seeker/job" passHref>
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 15px 30px rgba(22, 91, 248, 0.3)" }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center px-6 py-3.5 bg-gradient-to-r from-[#165BF8] to-[#1C3991] text-white rounded-2xl font-bold shadow-lg hover:from-[#1a65ff] hover:to-[#2242a8] transition-all duration-300"
                >
                  <FiSearch className="mr-3 h-5 w-5" />
                  Browse Jobs
                </motion.button>
              </Link>
              <Link href="/seeker/applications" passHref>
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 8px 25px rgba(22, 91, 248, 0.2)" }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center px-6 py-3.5 bg-white text-[#165BF8] rounded-2xl font-bold shadow-lg border-2 border-[#165BF8]/20 hover:bg-[#165BF8]/10 transition-all duration-300"
                >
                  <FiFileText className="mr-3 h-5 w-5" />
                  View Applications
                </motion.button>
              </Link>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={cardAnimation}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {[
                { 
                  label: 'Jobs Applied', 
                  value: stats.appliedJobs, 
                  icon: FiFileText,
                  color: 'from-blue-500 to-blue-600',
                  description: 'Total applications submitted'
                },
                { 
                  label: 'Upcoming Interviews', 
                  value: stats.interviews, 
                  icon: FiCalendar,
                  color: 'from-green-500 to-green-600',
                  description: 'Scheduled interviews'
                },
                { 
                  label: 'Saved Jobs', 
                  value: stats.savedJobs, 
                  icon: FiBookmark,
                  color: 'from-purple-500 to-purple-600',
                  description: 'Jobs you\'ve bookmarked'
                }
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  variants={cardAnimation}
                  whileHover={cardHover}
                  className="bg-white rounded-2xl shadow-lg border border-[#165BF8]/10 p-6 flex flex-col justify-between transition-all duration-300 group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-gray-600 text-sm font-bold mb-2">{stat.label}</p>
                      {loadingStats ? (
                        <div className="h-10 bg-gray-200 animate-pulse rounded-lg mb-2"></div>
                      ) : (
                        <h3 className="text-3xl font-black text-[#1C3991] mb-1">
                          {stat.value}
                        </h3>
                      )}
                      <p className="text-gray-500 text-xs">
                        {stat.description}
                      </p>
                    </div>
                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Recent Applications Section */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-3xl shadow-2xl border border-[#165BF8]/10 overflow-hidden"
            >
              <div className="p-8 border-b border-[#165BF8]/10">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-[#165BF8] to-[#1C3991] text-white shadow-lg">
                      <FiTrendingUp className="h-7 w-7" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-[#1C3991]">Recent Applications</h2>
                      <p className="text-[#165BF8] font-medium">Track your latest job applications</p>
                    </div>
                  </div>
                  <Link href="/seeker/applications" passHref>
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: "0 8px 25px rgba(22, 91, 248, 0.2)" }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center px-5 py-3 bg-[#165BF8]/10 text-[#165BF8] rounded-2xl hover:bg-[#165BF8]/20 transition-all duration-300 font-bold shadow-lg border-2 border-[#165BF8]/20"
                    >
                      View All
                      <FiArrowRight className="ml-2 w-5 h-5" />
                    </motion.button>
                  </Link>
                </div>
              </div>

              <div className="p-8">
                {loadingApplications ? (
                  <div className="flex justify-center items-center py-16">
                    <motion.div
                      animate={pulseEffect}
                      className="rounded-full p-4 bg-gradient-to-br from-[#165BF8] to-[#1C3991] shadow-lg"
                    >
                      <FiClock className="text-white h-8 w-8 animate-spin" />
                    </motion.div>
                  </div>
                ) : errorApplications ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-16"
                  >
                    <div className="mx-auto w-24 h-24 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
                      <FiTrendingUp className="h-12 w-12 text-red-500" />
                    </div>
                    <h3 className="text-2xl font-black text-red-600 mb-3">Error Loading Applications</h3>
                    <p className="text-red-500 font-medium">{errorApplications}</p>
                  </motion.div>
                ) : recentApplications.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-16"
                  >
                    <div className="mx-auto w-24 h-24 bg-gradient-to-br from-[#165BF8]/10 to-[#1C3991]/10 rounded-3xl flex items-center justify-center mb-6">
                      <FiSearch className="h-12 w-12 text-[#165BF8]" />
                    </div>
                    <h3 className="text-2xl font-black text-[#1C3991] mb-3">No Applications Yet</h3>
                    <p className="text-[#165BF8] font-medium mb-8">Start your job search journey today!</p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: {
                        transition: { staggerChildren: 0.15 },
                      },
                    }}
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                  >
                    {recentApplications.map((app) => (
                      <motion.div
                        key={app._id}
                        variants={cardAnimation}
                        whileHover={cardHover}
                        className="bg-white border-2 border-[#165BF8]/10 rounded-2xl shadow-lg p-6 flex flex-col hover:border-[#165BF8]/30 transition-all duration-300 relative overflow-hidden group"
                      >
                        {/* Gradient overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#165BF8]/5 to-[#1C3991]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                        
                        <div className="flex-grow relative z-10">
                          {/* Application Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-black text-[#1C3991] leading-tight mb-2">
                                {app.job.title}
                              </h3>
                              <p className="text-[#165BF8] font-bold text-sm">
                                {app.job.company}
                              </p>
                            </div>
                          </div>

                          {/* Job Details */}
                          <div className="space-y-3 text-sm mb-4">
                            <div className="flex items-center text-[#1C3991]">
                              <FiMapPin className="h-4 w-4 text-[#165BF8] mr-2 flex-shrink-0" />
                              <span className="font-medium">{app.job.location}</span>
                            </div>
                            
                            <div className="flex items-center text-[#1C3991]">
                              <FiBriefcase className="h-4 w-4 text-[#165BF8] mr-2 flex-shrink-0" />
                              <span className="font-medium">{app.job.jobType || 'Full-time'}</span>
                            </div>
                            
                            {app.job.numberOfOpenings !== undefined && app.job.numberOfOpenings > 0 && (
                              <div className="flex items-center text-[#1C3991]">
                                <FiUsers className="h-4 w-4 text-[#165BF8] mr-2 flex-shrink-0" />
                                <span className="font-medium">{app.job.numberOfOpenings} Openings</span>
                              </div>
                            )}
                            
                            <div className="flex items-center text-[#1C3991]">
                              <FiCalendar className="h-4 w-4 text-[#165BF8] mr-2 flex-shrink-0" />
                              <span className="font-medium">
                                Applied: {new Date(app.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          </div>

                          {/* Salary */}
                          {app.job.salaryOriginal ? (
                            <p className="text-xl font-black text-[#1C3991] mb-4">
                              ₹{app.job.salaryOriginal}
                            </p>
                          ) : (
                            <p className="text-lg text-gray-500 font-medium mb-4">
                              Salary Not Specified
                            </p>
                          )}
                        </div>

                        {/* Status and Action */}
                        <div className="flex justify-between items-center mt-4 relative z-10">
                          <span className={`px-3 py-1.5 text-xs font-black rounded-full capitalize ${getStatusClasses(app.status)}`}>
                            {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                          </span>
                          
                          <Link href={`/seeker/job/${app.job._id}`} passHref>
                            <motion.button
                              whileHover={{ scale: 1.05, boxShadow: "0 8px 20px rgba(22, 91, 248, 0.3)" }}
                              whileTap={{ scale: 0.95 }}
                              className="px-4 py-2 bg-gradient-to-r from-[#165BF8] to-[#1C3991] text-white rounded-xl hover:from-[#1a65ff] hover:to-[#2242a8] transition-all duration-300 shadow-lg text-sm font-bold"
                            >
                              View Details
                            </motion.button>
                          </Link>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}