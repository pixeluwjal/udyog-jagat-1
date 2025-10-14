"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";
import Sidebar from "@/app/components/Sidebar";
import {
  FiSearch,
  FiFilter,
  FiXCircle,
  FiCheckCircle,
  FiLoader,
  FiChevronLeft,
  FiMenu,
  FiBriefcase,
  FiMapPin,
  FiUsers,
  FiRefreshCcw,
  FiEdit,
  FiDollarSign,
  FiClock,
  FiPlus,
  FiChevronDown,
  FiPower,
  FiZapOff,
  FiEye,
  FiTrendingUp,
  FiAward,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import Head from "next/head";

// Updated brand colors with #2245ae
const primaryBlue = "#2245ae";
const darkBlue = "#1a3a9c";
const lightBlue = "#eef2ff";

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
      staggerChildren: 0.1
    }
  }
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
      damping: 15
    }
  }
};

const hoverEffect = {
  y: -8,
  scale: 1.02,
  boxShadow: "0 20px 40px rgba(34, 69, 174, 0.15)",
  transition: {
    type: "spring",
    stiffness: 300,
    damping: 20
  }
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

interface JobDisplay {
  _id: string;
  title: string;
  description: string;
  location: string;
  salaryOriginal?: string;
  salaryMin?: number;
  salaryMax?: number;
  status: "active" | "inactive" | "closed";
  numberOfOpenings: number;
  company: string;
  jobType: string;
  createdAt: string;
  postedBy: string;
}

export default function PostedJobsPage() {
  const {
    user,
    loading: authLoading,
    isAuthenticated,
    logout,
    token,
  } = useAuth();
  const router = useRouter();

  const [jobs, setJobs] = useState<JobDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive" | "closed"
  >("all");
  const [minOpenings, setMinOpenings] = useState<number | "">("");
  const [maxOpenings, setMaxOpenings] = useState<number | "">("");

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    closed: 0
  });

  // --- Redirection Logic ---
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
      if (user.role === "admin") router.push("/admin/dashboard");
      else if (user.role === "job_seeker") router.push("/seeker/dashboard");
      else router.push("/");
      return;
    }
  }, [authLoading, isAuthenticated, user, router]);

  // --- Fetch Jobs Logic ---
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!token || !user?._id) {
        throw new Error(
          "Authentication token or user ID not available. Please log in again."
        );
      }
      const queryParams = new URLSearchParams();
      queryParams.append("postedBy", user._id);
      queryParams.append("sortBy", "createdAt");
      queryParams.append("sortOrder", "desc");

      if (searchTerm) queryParams.append("search", searchTerm);
      if (statusFilter !== "all") queryParams.append("status", statusFilter);
      if (minOpenings !== "")
        queryParams.append("minOpenings", String(minOpenings));
      if (maxOpenings !== "")
        queryParams.append("maxOpenings", String(maxOpenings));

      const response = await fetch(`/api/jobs?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch jobs");
      }

      if (Array.isArray(data.jobs)) {
        setJobs(data.jobs);
        // Calculate stats
        setStats({
          total: data.jobs.length,
          active: data.jobs.filter((job: JobDisplay) => job.status === "active").length,
          inactive: data.jobs.filter((job: JobDisplay) => job.status === "inactive").length,
          closed: data.jobs.filter((job: JobDisplay) => job.status === "closed").length
        });
      } else {
        setError("Failed to fetch jobs: Invalid data format from server.");
        setJobs([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load job data.");
    } finally {
      setLoading(false);
    }
  }, [token, user, searchTerm, statusFilter, minOpenings, maxOpenings]);

  // --- API to toggle job status ---
  const handleToggleJobStatus = async (
    jobId: string,
    currentStatus: string
  ) => {
    if (!jobId) {
      console.error("Invalid jobId provided. Aborting status update.");
      return;
    }
    if (!token) {
      setError("Authentication token missing. Please log in again.");
      return;
    }

    const newStatus = currentStatus === "active" ? "inactive" : "active";
    setLoading(true);

    try {
      const response = await fetch(`/api/jobs/${jobId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to update job status to ${newStatus}`
        );
      }

      setJobs((prevJobs) =>
        prevJobs.map((job) =>
          job._id === jobId
            ? { ...job, status: newStatus as JobDisplay["status"] }
            : job
        )
      );
      
      // Update stats
      setStats(prev => ({
        ...prev,
        active: newStatus === "active" ? prev.active + 1 : prev.active - 1,
        inactive: newStatus === "inactive" ? prev.inactive + 1 : prev.inactive - 1
      }));
    } catch (err: any) {
      console.error("Error toggling job status:", err);
      setError(err.message || "Failed to toggle job status.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger job fetching when authentication state is ready and user is a job_poster, or when filters change
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && user.role === "job_poster") {
      fetchJobs();
    }
  }, [authLoading, isAuthenticated, user, fetchJobs]);

  const handleApplyFilters = () => {
    fetchJobs();
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setMinOpenings("");
    setMaxOpenings("");
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-gradient-to-r from-green-500 to-emerald-600 text-white";
      case "closed":
        return "bg-gradient-to-r from-red-500 to-red-600 text-white";
      case "inactive":
        return "bg-gradient-to-r from-amber-500 to-amber-600 text-white";
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

  // --- Loading and Unauthorized State Display ---
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
            Loading page...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[${lightBlue}] overflow-hidden font-inter`}>
      <Head>
        <title>Your Posted Jobs - JobConnect</title>
      </Head>
      <Sidebar
        userRole={user.role}
        onLogout={logout}
        userEmail={user.email}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden bg-white/95 backdrop-blur-md shadow-sm p-4 flex items-center justify-between sticky top-0 z-10 border-b border-[#2245ae]/10">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleSidebar}
            className="p-2 rounded-xl text-[#2245ae] hover:bg-[#2245ae]/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#2245ae] transition-all duration-200"
            aria-label="Open sidebar"
          >
            <FiMenu className="h-6 w-6" />
          </motion.button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] bg-clip-text text-transparent">
            Posted Jobs
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
                    Your Posted Jobs
                  </span>
                </motion.h1>
                <motion.p 
                  className="text-[#2245ae] text-lg md:text-xl mt-2 md:mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Manage and track your job listings
                </motion.p>
              </div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full lg:w-auto"
              >
                <Link href="/poster/new-job" passHref>
                  <button className="flex items-center justify-center w-full lg:w-auto px-6 py-3 bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-[#2a55cc] hover:to-[#2242a8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2245ae] transition-all duration-200 group">
                    <FiPlus className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                    <span>Post New Job</span>
                  </button>
                </Link>
              </motion.div>
            </motion.div>

            {/* Stats Overview */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
            >
              {[
                { label: "Total Jobs", value: stats.total, color: "from-[#2245ae] to-[#1a3a9c]", icon: FiBriefcase },
                { label: "Active", value: stats.active, color: "from-green-500 to-emerald-600", icon: FiTrendingUp },
                { label: "Inactive", value: stats.inactive, color: "from-amber-500 to-amber-600", icon: FiPower },
                { label: "Closed", value: stats.closed, color: "from-red-500 to-red-600", icon: FiAward },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  variants={cardAnimation}
                  whileHover={hoverEffect}
                  className="bg-white rounded-2xl p-4 md:p-6 shadow-lg border border-[#2245ae]/10 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-2xl md:text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                        {stat.value}
                      </div>
                      <div className="text-sm md:text-base text-gray-600 mt-1 font-medium">
                        {stat.label}
                      </div>
                    </div>
                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.color.split(' ')[0]}/10 ${stat.color.split(' ')[2]}/10`}>
                      <stat.icon className={`w-6 h-6 ${stat.color.includes('[#2245ae]') ? 'text-[#2245ae]' : stat.color.includes('green') ? 'text-green-500' : stat.color.includes('amber') ? 'text-amber-500' : 'text-red-500'}`} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Search and Filter Section */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="bg-white shadow-lg rounded-2xl p-6 border border-[#2245ae]/10"
            >
              <h2 className="text-xl font-semibold text-[#1a3a9c] mb-5 flex items-center">
                <FiFilter className="mr-3 text-[#2245ae]" /> Filter Jobs
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Search by Title */}
                <div>
                  <label className="block text-sm font-medium text-[#1a3a9c] mb-2">
                    Search Jobs
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiSearch className="h-5 w-5 text-[#2245ae]/70" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-4 py-3 border border-[#2245ae]/20 rounded-xl focus:ring-2 focus:ring-[#2245ae] focus:border-[#2245ae] placeholder-gray-400 transition-all duration-200"
                      placeholder="Job title or company..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleApplyFilters();
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-[#1a3a9c] mb-2">
                    Job Status
                  </label>
                  <div className="relative">
                    <select
                      className="block w-full pl-4 pr-10 py-3 border border-[#2245ae]/20 rounded-xl focus:ring-2 focus:ring-[#2245ae] focus:border-[#2245ae] transition-all duration-200 appearance-none bg-white"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="closed">Closed</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#2245ae]">
                      <FiChevronDown className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                {/* Min Openings Filter */}
                <div>
                  <label className="block text-sm font-medium text-[#1a3a9c] mb-2">
                    Min Openings
                  </label>
                  <input
                    type="number"
                    className="block w-full px-4 py-3 border border-[#2245ae]/20 rounded-xl focus:ring-2 focus:ring-[#2245ae] focus:border-[#2245ae] placeholder-gray-400 transition-all duration-200"
                    placeholder="e.g., 1"
                    value={minOpenings}
                    onChange={(e) =>
                      setMinOpenings(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    min="0"
                  />
                </div>

                {/* Max Openings Filter */}
                <div>
                  <label className="block text-sm font-medium text-[#1a3a9c] mb-2">
                    Max Openings
                  </label>
                  <input
                    type="number"
                    className="block w-full px-4 py-3 border border-[#2245ae]/20 rounded-xl focus:ring-2 focus:ring-[#2245ae] focus:border-[#2245ae] placeholder-gray-400 transition-all duration-200"
                    placeholder="e.g., 10"
                    value={maxOpenings}
                    onChange={(e) =>
                      setMaxOpenings(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    min="0"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                <motion.button
                  type="button"
                  onClick={handleClearFilters}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center justify-center px-6 py-3 border border-[#2245ae]/30 rounded-xl text-sm font-medium text-[#1a3a9c] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2245ae] transition-all duration-200"
                >
                  <FiRefreshCcw className="mr-2 h-4 w-4" /> Clear Filters
                </motion.button>
                <motion.button
                  type="button"
                  onClick={handleApplyFilters}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] border border-transparent rounded-xl text-sm font-medium text-white hover:from-[#2a55cc] hover:to-[#2242a8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2245ae] transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <FiFilter className="mr-2 h-4 w-4" /> Apply Filters
                </motion.button>
              </div>
            </motion.div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm"
                >
                  <div className="flex items-center">
                    <FiXCircle className="h-5 w-5 text-red-500 mr-3" />
                    <p className="text-red-700 font-medium">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading State */}
            {loading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center items-center py-16 bg-white rounded-2xl shadow-lg border border-[#2245ae]/10"
              >
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
              </motion.div>
            ) : jobs.length === 0 ? (
              /* Empty State */
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                className="bg-white rounded-2xl shadow-lg p-8 md:p-12 text-center border border-[#2245ae]/10"
              >
                <div className="mx-auto w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-[#2245ae]/10 to-[#1a3a9c]/10 rounded-full flex items-center justify-center mb-6">
                  <FiBriefcase className="h-10 w-10 md:h-12 md:w-12 text-[#2245ae]" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-[#1a3a9c] mb-2">
                  No jobs found
                </h3>
                <p className="text-[#2245ae] text-base md:text-lg mb-6 max-w-md mx-auto">
                  {searchTerm || statusFilter !== "all" || minOpenings !== "" || maxOpenings !== ""
                    ? "No jobs match your current filters. Try adjusting your search criteria."
                    : "You haven't posted any jobs yet. Start by creating your first job listing."}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {(searchTerm || statusFilter !== "all" || minOpenings !== "" || maxOpenings !== "") && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleClearFilters}
                      className="px-6 py-3 border border-[#2245ae] text-[#2245ae] rounded-xl font-medium hover:bg-[#2245ae] hover:text-white transition-all duration-200"
                    >
                      Clear Filters
                    </motion.button>
                  )}
                  <Link
                    href="/poster/new-job"
                    className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] text-white rounded-xl font-medium hover:from-[#2a55cc] hover:to-[#2242a8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2245ae] transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <FiPlus className="mr-2 h-5 w-5" />
                    Post Your First Job
                  </Link>
                </div>
              </motion.div>
            ) : (
              /* Jobs Grid */
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
              >
                {jobs.map((job) => (
                  <motion.div
                    key={job._id}
                    variants={cardAnimation}
                    whileHover={hoverEffect}
                    className="bg-white border border-[#2245ae]/10 rounded-2xl shadow-lg overflow-hidden transition-all duration-300"
                  >
                    <div className="p-6 flex flex-col h-full">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-[#1a3a9c] leading-tight line-clamp-2">
                            {job.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {job.company}
                          </p>
                        </div>
                        <span className={`ml-3 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(job.status)} flex items-center gap-1`}>
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-gray-600 text-sm line-clamp-3 mb-4 flex-1">
                        {job.description}
                      </p>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-4 mt-auto text-sm text-gray-600 mb-4">
                        <div className="flex items-center">
                          <FiMapPin className="mr-2 text-[#2245ae] flex-shrink-0" />
                          <span className="truncate">{job.location}</span>
                        </div>
                        <div className="flex items-center">
                          <FiDollarSign className="mr-2 text-[#2245ae] flex-shrink-0" />
                          <span className="text-green-600 font-medium truncate">
                            {getSalaryDisplay(job)}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <FiUsers className="mr-2 text-[#2245ae] flex-shrink-0" />
                          <span>{job.numberOfOpenings} openings</span>
                        </div>
                        <div className="flex items-center">
                          <FiClock className="mr-2 text-[#2245ae] flex-shrink-0" />
                          <span className="truncate">
                            {new Date(job.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                        {job.status !== "closed" && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleToggleJobStatus(job._id, job.status)}
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                              job.status === "active"
                                ? "bg-red-500 hover:bg-red-600 text-white"
                                : "bg-green-500 hover:bg-green-600 text-white"
                            }`}
                          >
                            {job.status === "active" ? (
                              <>
                                <FiZapOff className="w-4 h-4" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <FiPower className="w-4 h-4" />
                                Activate
                              </>
                            )}
                          </motion.button>
                        )}
                        
                        <div className="flex gap-2 flex-1 justify-end">
                          <Link href={`/poster/jobs/${job._id}/edit`} passHref>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="flex items-center justify-center p-2 border border-[#2245ae] text-[#2245ae] rounded-xl hover:bg-[#2245ae] hover:text-white transition-all duration-200"
                              title="Edit Job"
                            >
                              <FiEdit className="w-4 h-4" />
                            </motion.button>
                          </Link>
                          <Link href={`/poster/applications?jobId=${job._id}`} passHref>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] text-white rounded-xl text-sm font-medium hover:from-[#2a55cc] hover:to-[#2242a8] transition-all duration-200"
                            >
                              <FiEye className="w-4 h-4" />
                              View
                            </motion.button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}