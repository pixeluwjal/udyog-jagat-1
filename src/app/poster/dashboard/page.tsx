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
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

// Brand colors
const primaryBlue = "#165BF8";
const darkBlue = "#1C3991";

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

// Updated Interface for displaying job data - now includes all fields
interface JobDisplay {
  _id: string;
  title: string;
  description: string;
  location: string;
  salary?: string | number; // Made optional and flexible for number or string
  status: "active" | "inactive" | "closed";
  numberOfOpenings: number;
  company: string;
  jobType: "Full-time" | "Part-time" | "Contract" | "Temporary" | "Internship";
  skills?: string[];
  companyLogo?: string;
  postedBy: string;
  createdAt: string;
  updatedAt: string;
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

const cardAnimation = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.1,
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
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user) {
      console.warn(
        "PosterDashboardPage: Not authenticated. Redirecting to /login."
      );
      router.push("/login");
      return;
    }

    if (user.firstLogin) {
      console.warn(
        "PosterDashboardPage: User is firstLogin. Redirecting to /change-password."
      );
      router.push("/change-password");
      return;
    }

    if (user.role !== "job_poster") {
      console.warn(
        `PosterDashboardPage: Incorrect role (${user.role}). Redirecting.`
      );
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
      } else {
        setDataError(
          "Failed to fetch recent jobs: Invalid data format from server."
        );
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

  if (
    authLoading ||
    !isAuthenticated ||
    !user ||
    user.firstLogin ||
    user.role !== "job_poster"
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
            className="rounded-full p-4 bg-[#165BF8]/10 shadow-inner"
          >
            <FiLoader className="text-[#165BF8] h-12 w-12 animate-spin" />
          </motion.div>
          <p className="mt-6 text-lg font-medium text-[#1C3991]">
            Loading dashboard...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] overflow-hidden font-inter">
      <Sidebar
        userRole={user.role}
        onLogout={logout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile Header (visible only on small screens) */}
        <div className="md:hidden bg-white/95 backdrop-blur-md shadow-sm p-4 flex items-center justify-between z-10 sticky top-0">
          {/* Hamburger Icon */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg text-[#165BF8] hover:bg-[#165BF8]/10 focus:outline-none"
          >
            <FiMenu className="w-6 h-6" />
          </motion.button>
          {/* Centered Title */}
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent">
            Job Poster Panel
          </h1>
          {/* Empty div for spacing on the right to balance the hamburger */}
          <div className="w-6 h-6"></div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Header Section */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between mb-6"
            >
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-[#1C3991] leading-tight">
                  <span className="bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent">
                    Welcome back, {user.username || "Job Poster"}!
                  </span>
                </h1>
                <p className="text-[#165BF8] mt-2">
                  Your Job Posting Dashboard
                </p>
              </div>

              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
                <Link href="/poster/new-job" passHref>
                  <motion.button
                    whileHover={{
                      scale: 1.02,
                      boxShadow: `0 8px 16px ${primaryBlue}20`,
                    }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center px-6 py-3 bg-[#165BF8] text-white rounded-xl font-semibold shadow-md transition-all duration-300 w-full justify-center"
                  >
                    <FiBriefcase className="w-5 h-5 mr-3" />
                    <span>Post New Job</span>
                  </motion.button>
                </Link>
                <Link href="/poster/posted-jobs" passHref>
                  <motion.button
                    whileHover={{
                      scale: 1.02,
                      boxShadow: `0 8px 16px ${darkBlue}20`,
                    }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center px-6 py-3 bg-white text-[#1C3991] rounded-xl font-semibold shadow-md transition-all duration-300 w-full justify-center border border-[#165BF8]/20"
                  >
                    <FiBriefcase className="w-5 h-5 mr-3 text-[#165BF8]" />
                    <span>View All Jobs</span>
                  </motion.button>
                </Link>
              </div>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={cardAnimation}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {/* Total Posted Jobs Card */}
              <motion.div
                variants={fadeIn}
                whileHover={{
                  y: -5,
                  boxShadow: `0 10px 25px -5px ${primaryBlue}1A`,
                }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-[#165BF8]/10 flex flex-col justify-between transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">
                      Total Posted Jobs
                    </p>
                    <h3 className="text-3xl font-bold mt-1 text-[#1C3991]">
                      {recentJobs.length}
                    </h3>
                  </div>
                  <div className="p-4 rounded-full bg-[#165BF8]/10 text-[#165BF8]">
                    <FiBriefcase className="w-7 h-7" />
                  </div>
                </div>
              </motion.div>

              {/* Active Jobs Card */}
              <motion.div
                variants={fadeIn}
                whileHover={{
                  y: -5,
                  boxShadow: `0 10px 25px -5px ${primaryBlue}1A`,
                }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-[#165BF8]/10 flex flex-col justify-between transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">
                      Active Jobs
                    </p>
                    <h3 className="text-3xl font-bold mt-1 text-[#1C3991]">
                      {
                        recentJobs.filter((job) => job.status === "active")
                          .length
                      }
                    </h3>
                  </div>
                  <div className="p-4 rounded-full bg-green-100/30 text-green-600">
                    <FiActivity className="w-7 h-7" />
                  </div>
                </div>
              </motion.div>

              {/* Total Applications Card (Placeholder) */}
              <motion.div
                variants={fadeIn}
                whileHover={{
                  y: -5,
                  boxShadow: `0 10px 25px -5px ${primaryBlue}1A`,
                }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-[#165BF8]/10 flex flex-col justify-between transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">
                      Total Applications
                    </p>
                    <h3 className="text-3xl font-bold mt-1 text-[#1C3991]">
                      {applicationsCount}
                    </h3>
                  </div>
                  <div className="p-4 rounded-full bg-indigo-100/30 text-indigo-600">
                    <FiUsers className="w-7 h-7" />
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Recent Jobs Section */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#165BF8]/10">
              <div className="px-6 py-5 border-b border-[#165BF8]/10 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-[#1C3991]">
                    Your Recent Job Listings
                  </h2>
                  <p className="mt-1 text-sm text-[#165BF8]">
                    A quick overview of your latest job postings.
                  </p>
                </div>
                <div className="mt-4 sm:mt-0">
                  <Link href="/poster/posted-jobs" passHref>
                    <button className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-blue-100 bg-[#165BF8] hover:bg-[#1a65ff] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#165BF8]/50 transition-all duration-200">
                      <FiBriefcase className="w-5 h-5 mr-2" />
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
                  <motion.div
                    animate={pulseEffect}
                    className="p-3 bg-[#165BF8]/10 rounded-full"
                  >
                    <FiLoader className="text-[#165BF8] h-10 w-10 animate-spin" />
                  </motion.div>
                </div>
              ) : recentJobs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-24 h-24 bg-[#165BF8]/5 rounded-full flex items-center justify-center mb-4">
                    <FiBriefcase className="h-10 w-10 text-[#165BF8]/70" />
                  </div>
                  <h3 className="mt-2 text-lg font-medium text-[#1C3991]">
                    No jobs posted yet
                  </h3>
                  <p className="mt-1 text-sm text-[#165BF8]">
                    Get started by posting your first job.
                  </p>
                  <div className="mt-6">
                    <Link href="/poster/new-job" passHref>
                      <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-blue-100 bg-[#165BF8] hover:bg-[#1a65ff] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#165BF8]/50 transition-all duration-200">
                        <FiPlus className="w-5 h-5 mr-2" />
                        Post New Job
                      </button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="px-6 py-4 grid grid-cols-1 gap-6">
                  {recentJobs.map((job) => (
                    <motion.div
                      key={job._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      whileHover={{
                        y: -3,
                        boxShadow: `0 8px 16px ${primaryBlue}15`,
                      }}
                      className="bg-white border border-[#165BF8]/10 rounded-xl overflow-hidden shadow-sm transition-all duration-200"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-[#1C3991] mb-2">
                              {job.title}
                            </h3>
                            <p className="text-gray-600 line-clamp-2 mb-4">
                              {job.description}
                            </p>

                            <div className="flex flex-wrap gap-4 mb-4">
                              <div className="flex items-center text-sm text-gray-600">
                                <FiMapPin className="flex-shrink-0 mr-1.5 h-5 w-5 text-[#165BF8]/70" />
                                {job.location}
                              </div>

                              <div className="flex items-center text-sm text-gray-600">
                                {job.salaryOriginal ? (
                                  <span className="text-green-600/80 font-medium">
                                    {job.salaryOriginal}
                                  </span>
                                ) : job.salaryMin && job.salaryMax ? (
                                  <span className="text-green-600/80 font-medium">
                                    {job.salaryMin / 100000} -{" "}
                                    {job.salaryMax / 100000} LPA
                                  </span>
                                ) : job.salaryMin ? (
                                  <span className="text-green-600/80 font-medium">
                                    {job.salaryMin / 100000}+ LPA
                                  </span>
                                ) : (
                                  <span className="text-gray-400 italic">
                                    Not Specified
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center text-sm text-gray-600">
                                <FiUsers className="flex-shrink-0 mr-1.5 h-5 w-5 text-[#165BF8]/70" />
                                Openings: {job.numberOfOpenings}
                              </div>

                              <div className="flex items-center text-sm text-gray-600">
                                <FiClock className="flex-shrink-0 mr-1.5 h-5 w-5 text-[#165BF8]/70" />
                                Posted{" "}
                                {new Date(job.createdAt).toLocaleDateString(
                                  "en-GB"
                                )}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`ml-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium 
                            ${
                              job.status === "active"
                                ? "bg-green-100/30 text-green-800"
                                : job.status === "closed"
                                ? "bg-red-100/30 text-red-800"
                                : "bg-gray-100/30 text-gray-800"
                            }`}
                          >
                            {(job.status || "inactive")
                              .charAt(0)
                              .toUpperCase() +
                              (job.status || "inactive").slice(1)}
                          </span>
                        </div>

                        <div className="mt-6 flex justify-end space-x-3">
                          <Link href={`/poster/jobs/${job._id}/edit`} passHref>
                            <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-blue-100 bg-[#165BF8] hover:bg-[#1a65ff] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#165BF8]/50 transition-all duration-200">
                              <FiEdit className="w-5 h-5 mr-2" />
                              Edit
                            </button>
                          </Link>
                        </div>
                      </div>
                    </motion.div>
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
