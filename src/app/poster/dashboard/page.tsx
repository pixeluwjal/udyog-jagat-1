"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";
import Sidebar from "@/app/components/Sidebar";
import {
  FiBriefcase,
  FiMapPin,
  FiDollarSign,
  FiEdit,
  FiUsers,
  FiMenu,
  FiXCircle,
  FiActivity,
  FiClock,
  FiPlus,
  FiZap,
  FiLoader,
  FiEye,
  FiTrendingUp,
  FiAward,
  FiTarget,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

// Updated brand colors with #2245ae
const primaryBlue = "#2245ae";
const darkBlue = "#1a3a9c";
const lightBlue = "#eef2ff";

// Type definition for a user in the display list
interface UserDisplay {
  _id: string;
  username?: string;
  email: string;
  role: string;
  firstLogin: boolean;
  isSuperAdmin: boolean;
  status: "active" | "inactive";
  createdAt: string;
}

// Updated Interface for displaying job data
interface JobDisplay {
  _id: string;
  title: string;
  description: string;
  location: string;
  salary?: string | number;
  status: "active" | "inactive" | "closed";
  numberOfOpenings: number;
  company: string;
  jobType: "Full-time" | "Part-time" | "Contract" | "Temporary" | "Internship";
  skills?: string[];
  companyLogo?: string;
  postedBy: string;
  createdAt: string;
  updatedAt: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryOriginal?: string;
}

// Framer Motion animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
      delay: 0.1,
    },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardAnimation = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

const pulseEffect = {
  scale: [1, 1.03, 1],
  opacity: [0.8, 1, 0.8],
  transition: {
    duration: 1.2,
    repeat: Infinity,
    ease: "easeInOut",
  },
};

const hoverEffect = {
  y: -8,
  scale: 1.02,
  boxShadow: "0 20px 40px rgba(34, 69, 174, 0.15)",
  transition: {
    type: "spring",
    stiffness: 300,
    damping: 20,
  },
};

export default function PosterDashboardPage() {
  const {
    user,
    loading: authLoading,
    isAuthenticated,
    logout,
    token,
  } = useAuth();
  const router = useRouter();

  const [recentJobs, setRecentJobs] = useState<JobDisplay[]>([]);
  const [applicationsCount, setApplicationsCount] = useState<number>(0);
  const [activeJobsCount, setActiveJobsCount] = useState<number>(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }

    if (user.firstLogin) {
      router.push("/change-password");
      return;
    }

    if (user.role !== "job_poster") {
      if (user.role === "admin") {
        router.push("/admin/dashboard");
      } else if (user.role === "job_seeker") {
        router.push(
          user.onboardingStatus === "completed"
            ? "/seeker/dashboard"
            : "/seeker/onboarding"
        );
      } else {
        router.push("/");
      }
      return;
    }
  }, [authLoading, isAuthenticated, user, router]);

  const fetchRecentJobs = useCallback(async () => {
    setDataError(null);
    try {
      if (!token || !user?._id) {
        throw new Error("Authentication token or user ID not available.");
      }

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
        throw new Error(data.error || "Failed to fetch recent jobs");
      }

      if (Array.isArray(data.jobs)) {
        setRecentJobs(data.jobs);
        setActiveJobsCount(data.jobs.filter((job: JobDisplay) => job.status === "active").length);
      } else {
        setDataError("Failed to fetch recent jobs: Invalid data format from server.");
        setRecentJobs([]);
      }
    } catch (err: any) {
      setDataError(err.message || "Failed to load recent job data.");
    } finally {
      setDataLoading(false);
    }
  }, [token, user]);

  const fetchApplicationsCount = useCallback(async () => {
    try {
      if (!token || !user?._id) {
        throw new Error("Authentication token or user ID not available.");
      }

      const response = await fetch(
        `/api/applications/count?postedBy=${user._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch application count");
      }

      const data = await response.json();
      setApplicationsCount(data.count);
    } catch (err) {
      console.error("Error fetching application count:", err);
      setApplicationsCount(0);
    }
  }, [token, user]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user && user.role === "job_poster") {
      setDataLoading(true);
      fetchRecentJobs();
      fetchApplicationsCount();
    }
  }, [
    authLoading,
    isAuthenticated,
    user,
    fetchRecentJobs,
    fetchApplicationsCount,
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-gradient-to-r from-green-500 to-emerald-600 text-white";
      case "closed":
        return "bg-gradient-to-r from-red-500 to-red-600 text-white";
      default:
        return "bg-gradient-to-r from-gray-500 to-gray-600 text-white";
    }
  };

  const getSalaryDisplay = (job: JobDisplay) => {
    if (job.salaryOriginal) {
      return job.salaryOriginal;
    } else if (job.salaryMin && job.salaryMax) {
      return `${job.salaryMin / 100000} - ${job.salaryMax / 100000} LPA`;
    } else if (job.salaryMin) {
      return `${job.salaryMin / 100000}+ LPA`;
    } else {
      return "Not Specified";
    }
  };

  if (
    authLoading ||
    !isAuthenticated ||
    !user ||
    user.firstLogin ||
    user.role !== "job_poster"
  ) {
    return (
      <div className={`flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[${lightBlue}] justify-center items-center font-inter`}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center"
        >
          <motion.div
            animate={pulseEffect}
            className="rounded-full p-4 bg-[#2245ae]/10 shadow-inner"
          >
            <FiLoader className="text-[#2245ae] h-12 w-12 animate-spin" />
          </motion.div>
          <p className="mt-6 text-lg font-medium text-[#1a3a9c]">
            Loading dashboard...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[${lightBlue}] overflow-hidden font-inter`}>
      <Sidebar
        userRole={user.role}
        userEmail={user.email}
        onLogout={logout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden bg-white/95 backdrop-blur-md shadow-sm p-4 flex items-center justify-between sticky top-0 z-10 border-b border-[#2245ae]/10">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-xl text-[#2245ae] hover:bg-[#2245ae]/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#2245ae] transition-all duration-200"
            aria-label="Open sidebar"
          >
            <FiMenu className="w-6 h-6" />
          </motion.button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] bg-clip-text text-transparent">
            Dashboard
          </h1>
          <div className="w-6 h-6"></div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
            {/* Header Section */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
            >
              <div className="flex-1">
                <motion.h1 
                  className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1a3a9c] leading-tight"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] bg-clip-text text-transparent">
                    Welcome back, {user.username || "Job Poster"}!
                  </span>
                </motion.h1>
                <motion.p 
                  className="text-[#2245ae] text-lg md:text-xl mt-2 md:mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Manage your job postings and track applications
                </motion.p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto"
                >
                  <Link href="/poster/new-job" passHref>
                    <button className="flex items-center justify-center w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-[#2a55cc] hover:to-[#2242a8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2245ae] transition-all duration-200 group">
                      <FiPlus className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                      <span>Post New Job</span>
                    </button>
                  </Link>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto"
                >
                  <Link href="/poster/posted-jobs" passHref>
                    <button className="flex items-center justify-center w-full sm:w-auto px-6 py-3 bg-white text-[#1a3a9c] rounded-xl font-semibold shadow-md border border-[#2245ae]/20 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2245ae] transition-all duration-200 group">
                      <FiEye className="w-5 h-5 mr-3 text-[#2245ae] group-hover:scale-110 transition-transform" />
                      <span>View All Jobs</span>
                    </button>
                  </Link>
                </motion.div>
              </div>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6"
            >
              {/* Total Posted Jobs Card */}
              <motion.div
                variants={cardAnimation}
                whileHover={hoverEffect}
                className="bg-white p-6 rounded-2xl shadow-lg border border-[#2245ae]/10 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-2">
                      Total Posted Jobs
                    </p>
                    <h3 className="text-3xl font-bold text-[#1a3a9c]">
                      {recentJobs.length}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">All time</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#2245ae]/10 to-[#1a3a9c]/10 text-[#2245ae]">
                    <FiBriefcase className="w-7 h-7" />
                  </div>
                </div>
              </motion.div>

              {/* Active Jobs Card */}
              <motion.div
                variants={cardAnimation}
                whileHover={hoverEffect}
                className="bg-white p-6 rounded-2xl shadow-lg border border-[#2245ae]/10 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-2">
                      Active Jobs
                    </p>
                    <h3 className="text-3xl font-bold text-[#1a3a9c]">
                      {activeJobsCount}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Currently live</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-green-100 to-green-50 text-green-600">
                    <FiActivity className="w-7 h-7" />
                  </div>
                </div>
              </motion.div>

              {/* Total Applications Card */}
              <motion.div
                variants={cardAnimation}
                whileHover={hoverEffect}
                className="bg-white p-6 rounded-2xl shadow-lg border border-[#2245ae]/10 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-2">
                      Total Applications
                    </p>
                    <h3 className="text-3xl font-bold text-[#1a3a9c]">
                      {applicationsCount}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">All applications</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 text-purple-600">
                    <FiUsers className="w-7 h-7" />
                  </div>
                </div>
              </motion.div>

              {/* Quick Actions Card */}
              <motion.div
                variants={cardAnimation}
                whileHover={hoverEffect}
                className="bg-white p-6 rounded-2xl shadow-lg border border-[#2245ae]/10 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-2">
                      Quick Actions
                    </p>
                    <h3 className="text-xl font-bold text-[#1a3a9c]">
                      Manage
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Your listings</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 text-amber-600">
                    <FiZap className="w-7 h-7" />
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Recent Jobs Section */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="bg-white rounded-2xl shadow-lg border border-[#2245ae]/10 overflow-hidden"
            >
              {/* Section Header */}
              <div className="px-6 py-5 border-b border-[#2245ae]/10 bg-gradient-to-r from-[#2245ae]/5 to-transparent">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-[#1a3a9c] flex items-center">
                      <FiBriefcase className="mr-3 text-[#2245ae]" />
                      Your Recent Job Listings
                    </h2>
                    <p className="mt-1 text-sm text-[#2245ae]">
                      Overview of your latest job postings and their status
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Link href="/poster/posted-jobs" passHref>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center px-4 py-2 border border-[#2245ae] text-[#2245ae] rounded-xl text-sm font-medium hover:bg-[#2245ae] hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2245ae] transition-all duration-200"
                      >
                        <FiEye className="w-4 h-4 mr-2" />
                        View All
                      </motion.button>
                    </Link>
                    <Link href="/poster/new-job" passHref>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center px-4 py-2 bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] text-white rounded-xl text-sm font-medium hover:from-[#2a55cc] hover:to-[#2242a8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2245ae] transition-all duration-200 shadow-lg"
                      >
                        <FiPlus className="w-4 h-4 mr-2" />
                        New Job
                      </motion.button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Error State */}
              <AnimatePresence>
                {dataError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mx-6 mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg"
                  >
                    <div className="flex items-center">
                      <FiXCircle className="h-5 w-5 text-red-500 mr-3" />
                      <p className="text-sm text-red-700 font-medium">{dataError}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Loading State */}
              {dataLoading ? (
                <div className="flex justify-center items-center py-16">
                  <div className="text-center">
                    <motion.div
                      animate={pulseEffect}
                      className="p-4 bg-[#2245ae]/10 rounded-full inline-block"
                    >
                      <FiLoader className="text-[#2245ae] h-12 w-12 animate-spin" />
                    </motion.div>
                    <p className="mt-4 text-lg font-medium text-[#1a3a9c]">
                      Loading your job listings...
                    </p>
                  </div>
                </div>
              ) : recentJobs.length === 0 ? (
                /* Empty State */
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={fadeIn}
                  className="text-center py-12 px-6"
                >
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-[#2245ae]/10 to-[#1a3a9c]/10 rounded-2xl flex items-center justify-center mb-6">
                    <FiBriefcase className="h-10 w-10 text-[#2245ae]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1a3a9c] mb-2">
                    No jobs posted yet
                  </h3>
                  <p className="text-[#2245ae] text-base mb-6 max-w-md mx-auto">
                    Start posting jobs to attract talented candidates and grow your team.
                  </p>
                  <Link href="/poster/new-job" passHref>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] text-white rounded-xl font-medium hover:from-[#2a55cc] hover:to-[#2242a8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2245ae] transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <FiPlus className="w-5 h-5 mr-2" />
                      Post Your First Job
                    </motion.button>
                  </Link>
                </motion.div>
              ) : (
                /* Jobs List - Mobile Cards & Desktop Table */
                <div className="p-6">
                  {/* Mobile Cards View */}
                  <div className="lg:hidden space-y-4">
                    {recentJobs.map((job) => (
                      <motion.div
                        key={job._id}
                        variants={cardAnimation}
                        whileHover={{ y: -4, scale: 1.01 }}
                        className="bg-white border border-[#2245ae]/10 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <div className="space-y-4">
                          {/* Header */}
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-[#1a3a9c] line-clamp-2">
                                {job.title}
                              </h3>
                              <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                                {job.description}
                              </p>
                            </div>
                            <div className={`ml-3 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(job.status)} flex items-center gap-1`}>
                              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                            </div>
                          </div>

                          {/* Details */}
                          <div className="grid grid-cols-1 gap-3">
                            <div className="flex items-center text-sm text-gray-600">
                              <FiMapPin className="mr-2 text-[#2245ae]" />
                              {job.location}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <FiDollarSign className="mr-2 text-[#2245ae]" />
                              <span className="text-green-600 font-medium">
                                {getSalaryDisplay(job)}
                              </span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <FiUsers className="mr-2 text-[#2245ae]" />
                              {job.numberOfOpenings} openings
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <FiClock className="mr-2 text-[#2245ae]" />
                              Posted {new Date(job.createdAt).toLocaleDateString()}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-3 pt-4 border-t border-gray-200">
                            <Link href={`/poster/jobs/${job._id}/edit`} passHref className="flex-1">
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-[#2245ae] text-[#2245ae] rounded-xl text-sm font-medium hover:bg-[#2245ae] hover:text-white transition-all duration-200"
                              >
                                <FiEdit className="w-4 h-4" />
                                Edit
                              </motion.button>
                            </Link>
                            <Link href={`/poster/applications?job=${job._id}`} passHref className="flex-1">
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] text-white rounded-xl text-sm font-medium hover:from-[#2a55cc] hover:to-[#2242a8] transition-all duration-200"
                              >
                                <FiEye className="w-4 h-4" />
                                View Apps
                              </motion.button>
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#2245ae]/10">
                          <th className="text-left py-4 px-6 text-sm font-semibold text-[#1a3a9c]">Job Title</th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-[#1a3a9c]">Location</th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-[#1a3a9c]">Salary</th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-[#1a3a9c]">Openings</th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-[#1a3a9c]">Status</th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-[#1a3a9c]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentJobs.map((job) => (
                          <motion.tr
                            key={job._id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            whileHover={{ backgroundColor: "rgba(34, 69, 174, 0.03)" }}
                            className="border-b border-[#2245ae]/5 transition-all duration-200"
                          >
                            <td className="py-4 px-6">
                              <div>
                                <div className="font-semibold text-[#1a3a9c]">{job.title}</div>
                                <div className="text-sm text-gray-600 mt-1 line-clamp-1">{job.description}</div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center text-sm text-gray-600">
                                <FiMapPin className="mr-2 text-[#2245ae]" />
                                {job.location}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="text-green-600 font-medium text-sm">
                                {getSalaryDisplay(job)}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center text-sm text-gray-600">
                                <FiUsers className="mr-2 text-[#2245ae]" />
                                {job.numberOfOpenings}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(job.status)}`}>
                                {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <Link href={`/poster/jobs/${job._id}/edit`} passHref>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex items-center gap-2 px-3 py-2 border border-[#2245ae] text-[#2245ae] rounded-lg text-sm font-medium hover:bg-[#2245ae] hover:text-white transition-all duration-200"
                                  >
                                    <FiEdit className="w-4 h-4" />
                                    Edit
                                  </motion.button>
                                </Link>
                                <Link href={`/poster/applications?job=${job._id}`} passHref>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] text-white rounded-lg text-sm font-medium hover:from-[#2a55cc] hover:to-[#2242a8] transition-all duration-200"
                                  >
                                    <FiEye className="w-4 h-4" />
                                    View
                                  </motion.button>
                                </Link>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}