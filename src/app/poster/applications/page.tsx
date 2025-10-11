"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Sidebar from "@/app/components/Sidebar";
import Link from "next/link";
import {
  FiSearch,
  FiFilter,
  FiXCircle,
  FiCheckCircle,
  FiLoader,
  FiChevronLeft,
  FiMenu,
  FiUser,
  FiMail,
  FiBriefcase,
  FiCalendar,
  FiDollarSign,
  FiRefreshCcw,
  FiMapPin,
  FiPhone,
  FiChevronDown,
  FiEye,
  FiDownload,
  FiStar,
  FiTrendingUp,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

// Updated brand colors with #2245ae
const primaryBlue = "#2245ae";
const darkBlue = "#1a3a9c";
const lightBlue = "#eef2ff";

interface Application {
  _id: string;
  job: {
    _id: string;
    title: string;
    description: string;
    location: string;
    salaryOriginal?: string;
    salaryMin?: number;
    salaryMax?: number;
    postedBy: string;
    numberOfOpenings: number;
  };
  applicant: {
    _id: string;
    username?: string;
    email: string;
    candidateDetails?: {
      fullName?: string;
      phone?: string;
      skills?: string[];
      experience?: string;
    };
    resume?: {
      resumeId: string;
      fileName: string;
    };
  } | null;
  status: "Received" | "Interview Scheduled" | "Rejected" | "Hired";
  appliedAt: string;
}

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

const staggerChildren = {
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
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

export default function ApplicationsPage() {
  const {
    user,
    loading: authLoading,
    isAuthenticated,
    token,
    logout,
  } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "Received" | "Interview Scheduled" | "Rejected" | "Hired"
  >("all");

  const fetchApplications = useCallback(async () => {
    if (!token) {
      setError("Authentication token missing. Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (searchTerm) {
        queryParams.append("search", searchTerm);
      }
      if (statusFilter !== "all") {
        queryParams.append("status", statusFilter);
      }
      queryParams.append("sortBy", "appliedAt");
      queryParams.append("sortOrder", "desc");

      const response = await fetch(
        `/api/applications?${queryParams.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch applications");
      }

      const data = await response.json();
      setApplications(
        Array.isArray(data.applications) ? data.applications : []
      );
    } catch (err: any) {
      console.error("Error fetching applications:", err);
      setError(
        err.message ||
          "An unexpected error occurred while fetching applications."
      );
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [token, searchTerm, statusFilter, user]);

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
      } else {
        router.push("/seeker/dashboard");
      }
      return;
    }

    fetchApplications();
  }, [authLoading, isAuthenticated, user, router, fetchApplications]);

  const updateApplicationStatus = async (
    id: string,
    newStatus: Application["status"]
  ) => {
    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update status");
      }

      fetchApplications();
    } catch (err: any) {
      console.error("Error updating application status:", err);
      setError(err.message || "Failed to update application status.");
    }
  };

  const handleViewResume = async (resumeId: string) => {
    if (!token) {
      setError("Authentication token missing. Please log in again.");
      return;
    }

    try {
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch resume");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      console.error("Error viewing resume:", err);
      setError(
        err.message || "An unexpected error occurred while viewing resume."
      );
    }
  };

  const handleApplyFilters = () => {
    fetchApplications();
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    fetchApplications();
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Hired":
        return "bg-gradient-to-r from-green-500 to-emerald-600 text-white";
      case "Rejected":
        return "bg-gradient-to-r from-red-500 to-red-600 text-white";
      case "Interview Scheduled":
        return "bg-gradient-to-r from-blue-500 to-blue-600 text-white";
      case "Received":
        return "bg-gradient-to-r from-amber-500 to-amber-600 text-white";
      default:
        return "bg-gradient-to-r from-gray-500 to-gray-600 text-white";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Hired":
        return <FiCheckCircle className="w-4 h-4" />;
      case "Rejected":
        return <FiXCircle className="w-4 h-4" />;
      case "Interview Scheduled":
        return <FiCalendar className="w-4 h-4" />;
      case "Received":
        return <FiTrendingUp className="w-4 h-4" />;
      default:
        return <FiLoader className="w-4 h-4" />;
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
            Loading applications...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[${lightBlue}] overflow-hidden font-inter`}>
      <Sidebar
        userRole={user.role}
        onLogout={logout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden bg-white/95 backdrop-blur-md shadow-sm p-4 flex items-center justify-between relative z-10 border-b border-[#2245ae]/10">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleSidebar}
            className="p-2 rounded-xl text-[#2245ae] hover:bg-[#2245ae]/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#2245ae] transition-all duration-200"
            aria-label="Open sidebar"
          >
            <FiMenu className="h-6 w-6" />
          </motion.button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] bg-clip-text text-transparent text-center absolute left-1/2 -translate-x-1/2">
            Applications
          </h1>
          <div className="h-6 w-6"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
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
                    Job Applications
                  </span>
                </motion.h1>
                <motion.p 
                  className="text-[#2245ae] text-lg md:text-xl mt-2 md:mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Review and manage applications for your posted jobs
                </motion.p>
              </div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full lg:w-auto"
              >
                <Link
                  href="/poster/dashboard"
                  className="inline-flex items-center justify-center w-full lg:w-auto px-6 py-3 bg-white border border-[#2245ae]/20 rounded-xl shadow-sm text-base font-medium text-[#1a3a9c] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2245ae] transition-all duration-200 group"
                >
                  <FiChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                  Back to Dashboard
                </Link>
              </motion.div>
            </motion.div>

            {/* Stats Overview */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerChildren}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
            >
              {[
                { label: "Total", value: applications.length, color: "from-[#2245ae] to-[#1a3a9c]" },
                { label: "Received", value: applications.filter(app => app.status === "Received").length, color: "from-amber-500 to-amber-600" },
                { label: "Interview", value: applications.filter(app => app.status === "Interview Scheduled").length, color: "from-blue-500 to-blue-600" },
                { label: "Hired", value: applications.filter(app => app.status === "Hired").length, color: "from-green-500 to-emerald-600" },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  variants={cardVariants}
                  className="bg-white rounded-2xl p-4 md:p-6 shadow-lg border border-[#2245ae]/10 hover:shadow-xl transition-all duration-300"
                >
                  <div className="text-center">
                    <div className={`text-2xl md:text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                      {stat.value}
                    </div>
                    <div className="text-sm md:text-base text-gray-600 mt-1 font-medium">
                      {stat.label}
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
                <FiFilter className="mr-3 text-[#2245ae]" /> Filter Applications
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Search Input */}
                <div>
                  <label className="block text-sm font-medium text-[#1a3a9c] mb-2">
                    Search Applications
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiSearch className="h-5 w-5 text-[#2245ae]/70" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-4 py-3 border border-[#2245ae]/20 rounded-xl focus:ring-2 focus:ring-[#2245ae] focus:border-[#2245ae] transition-all duration-200"
                      placeholder="Search by applicant, job title, or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-[#1a3a9c] mb-2">
                    Filter by Status
                  </label>
                  <div className="relative">
                    <select
                      className="block w-full pl-4 pr-10 py-3 border border-[#2245ae]/20 rounded-xl focus:ring-2 focus:ring-[#2245ae] focus:border-[#2245ae] transition-all duration-200 appearance-none bg-white"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="Received">Received</option>
                      <option value="Interview Scheduled">Interview Scheduled</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Hired">Hired</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#2245ae]">
                      <FiChevronDown className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClearFilters}
                  className="inline-flex items-center justify-center px-6 py-3 border border-[#2245ae]/30 rounded-xl text-sm font-medium text-[#1a3a9c] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2245ae] transition-all duration-200"
                >
                  <FiRefreshCcw className="mr-2 h-4 w-4" />
                  Clear Filters
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleApplyFilters}
                  className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] border border-transparent rounded-xl text-sm font-medium text-white hover:from-[#2a55cc] hover:to-[#2242a8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2245ae] transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <FiFilter className="mr-2 h-4 w-4" />
                  Apply Filters
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
                  className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-md"
                >
                  <div className="flex items-center">
                    <FiXCircle className="h-5 w-5 text-red-500 mr-3" />
                    <p className="text-sm text-red-700 font-medium">{error}</p>
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
                    Loading applications...
                  </p>
                </div>
              </motion.div>
            ) : applications.length === 0 ? (
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
                  No applications found
                </h3>
                <p className="text-[#2245ae] text-base md:text-lg mb-6 max-w-md mx-auto">
                  {searchTerm || statusFilter !== "all" 
                    ? "No applications match your current filters. Try adjusting your search criteria."
                    : "You haven't received any applications for your posted jobs yet."}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {(searchTerm || statusFilter !== "all") && (
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
                    <FiBriefcase className="mr-2 h-5 w-5" />
                    Post New Job
                  </Link>
                </div>
              </motion.div>
            ) : (
              /* Applications List */
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerChildren}
                className="space-y-4 md:space-y-6"
              >
                {/* Mobile Cards View */}
                <div className="lg:hidden space-y-4">
                  {applications.map((application) => (
                    <motion.div
                      key={application._id}
                      variants={cardVariants}
                      className="bg-white rounded-2xl shadow-lg border border-[#2245ae]/10 p-6 hover:shadow-xl transition-all duration-300"
                    >
                      <div className="space-y-4">
                        {/* Job Title & Status */}
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-[#1a3a9c] line-clamp-2">
                              {application.job.title}
                            </h3>
                            <div className="flex items-center mt-1 text-sm text-gray-600">
                              <FiMapPin className="mr-1.5 text-[#2245ae]" />
                              {application.job.location}
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(application.status)} flex items-center gap-1 ml-2`}>
                            {getStatusIcon(application.status)}
                            {application.status}
                          </div>
                        </div>

                        {/* Applicant Info */}
                        <div className="space-y-2">
                          <div className="flex items-center text-sm">
                            <FiUser className="mr-2 text-[#2245ae]" />
                            <span className="font-medium text-gray-900">
                              {application.applicant?.candidateDetails?.fullName || application.applicant?.username || "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center text-sm">
                            <FiMail className="mr-2 text-[#2245ae]" />
                            <span className="text-gray-600">{application.applicant?.email}</span>
                          </div>
                          {application.applicant?.candidateDetails?.phone && (
                            <div className="flex items-center text-sm">
                              <FiPhone className="mr-2 text-[#2245ae]" />
                              <span className="text-gray-600">{application.applicant.candidateDetails.phone}</span>
                            </div>
                          )}
                        </div>

                        {/* Applied Date & Salary */}
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center text-gray-600">
                            <FiCalendar className="mr-1.5 text-[#2245ae]" />
                            {new Date(application.appliedAt).toLocaleDateString()}
                          </div>
                          {application.job.salaryOriginal && (
                            <div className="text-green-600 font-medium">
                              {application.job.salaryOriginal}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 pt-4 border-t border-gray-200">
                          {application.applicant?.resume?.resumeId && (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleViewResume(application.applicant!.resume!.resumeId)}
                              className="flex items-center justify-center gap-2 px-4 py-2 border border-[#2245ae] text-[#2245ae] rounded-xl font-medium hover:bg-[#2245ae] hover:text-white transition-all duration-200"
                            >
                              <FiEye className="w-4 h-4" />
                              View Resume
                            </motion.button>
                          )}
                          <select
                            value={application.status}
                            onChange={(e) => updateApplicationStatus(application._id, e.target.value as Application["status"])}
                            disabled={application.status === "Hired" || application.status === "Rejected"}
                            className={`px-4 py-2 border rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-[#2245ae] transition-all duration-200 ${
                              application.status === "Hired" || application.status === "Rejected"
                                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                : "border-[#2245ae] text-[#2245ae] hover:bg-[#2245ae] hover:text-white"
                            }`}
                          >
                            <option value="Received">Mark as Received</option>
                            <option value="Interview Scheduled">Schedule Interview</option>
                            <option value="Rejected">Reject</option>
                            <option value="Hired">Hire</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block bg-white shadow-lg rounded-2xl overflow-hidden border border-[#2245ae]/10">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#2245ae]/10">
                      <thead className="bg-gradient-to-r from-[#2245ae]/5 to-[#1a3a9c]/5">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-[#1a3a9c] uppercase tracking-wider">
                            Job & Applicant
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-[#1a3a9c] uppercase tracking-wider">
                            Applied
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-[#1a3a9c] uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-[#1a3a9c] uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-[#2245ae]/10">
                        {applications.map((application) => (
                          <motion.tr
                            key={application._id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            whileHover={{ backgroundColor: "rgba(34, 69, 174, 0.03)" }}
                            className="transition-all duration-200"
                          >
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-semibold text-[#1a3a9c]">
                                  {application.job.title}
                                </div>
                                <div className="text-xs text-gray-600 mt-1 flex items-center">
                                  <FiMapPin className="mr-1.5 text-[#2245ae]" />
                                  {application.job.location}
                                </div>
                                <div className="mt-2">
                                  <div className="text-sm font-medium text-gray-900 flex items-center">
                                    <FiUser className="mr-1.5 text-[#2245ae]" />
                                    {application.applicant?.candidateDetails?.fullName || application.applicant?.username || "N/A"}
                                  </div>
                                  <div className="text-sm text-gray-600 flex items-center mt-1">
                                    <FiMail className="mr-1.5 text-[#2245ae]" />
                                    {application.applicant?.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 flex items-center">
                                <FiCalendar className="mr-1.5 text-[#2245ae]" />
                                {new Date(application.appliedAt).toLocaleDateString()}
                              </div>
                              {application.job.salaryOriginal && (
                                <div className="text-sm text-green-600 font-medium mt-1">
                                  {application.job.salaryOriginal}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(application.status)}`}>
                                {getStatusIcon(application.status)}
                                {application.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {application.applicant?.resume?.resumeId && (
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleViewResume(application.applicant!.resume!.resumeId)}
                                    className="inline-flex items-center gap-1 px-3 py-2 border border-[#2245ae] text-[#2245ae] rounded-lg text-sm font-medium hover:bg-[#2245ae] hover:text-white transition-all duration-200"
                                  >
                                    <FiEye className="w-4 h-4" />
                                    Resume
                                  </motion.button>
                                )}
                                <select
                                  value={application.status}
                                  onChange={(e) => updateApplicationStatus(application._id, e.target.value as Application["status"])}
                                  disabled={application.status === "Hired" || application.status === "Rejected"}
                                  className={`px-3 py-2 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2245ae] transition-all duration-200 ${
                                    application.status === "Hired" || application.status === "Rejected"
                                      ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                      : "border-[#2245ae] text-[#2245ae] hover:bg-[#2245ae] hover:text-white"
                                  }`}
                                >
                                  <option value="Received">Received</option>
                                  <option value="Interview Scheduled">Interview</option>
                                  <option value="Rejected">Reject</option>
                                  <option value="Hired">Hire</option>
                                </select>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}