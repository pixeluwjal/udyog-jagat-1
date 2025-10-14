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
  FiChevronRight,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

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
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

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

  const toggleCardExpansion = (applicationId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(applicationId)) {
      newExpanded.delete(applicationId);
    } else {
      newExpanded.add(applicationId);
    }
    setExpandedCards(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Hired":
        return "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/25";
      case "Rejected":
        return "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/25";
      case "Interview Scheduled":
        return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25";
      case "Received":
        return "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25";
      default:
        return "bg-gradient-to-r from-gray-500 to-slate-500 text-white shadow-lg shadow-gray-500/25";
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
        return <FiLoader className="w-4 h-4" />;
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
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 justify-center items-center">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl"></div>
            <FiLoader className="relative text-[#2245ae] h-12 w-12 animate-spin" />
          </div>
          <p className="mt-6 text-lg font-medium text-slate-700">
            Loading applications...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden">
      <Sidebar
        userRole={user.role}
        onLogout={logout}
        userEmail={user.email}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden bg-white/80 backdrop-blur-xl shadow-2xl shadow-blue-500/5 p-4 flex items-center justify-between relative z-10 border-b border-white/20">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleSidebar}
            className="p-2 rounded-2xl bg-white/90 shadow-lg shadow-black/5 border border-white/20 text-[#2245ae] hover:bg-white transition-all duration-200"
          >
            <FiMenu className="h-6 w-6" />
          </motion.button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] bg-clip-text text-transparent text-center absolute left-1/2 -translate-x-1/2">
            Applications
          </h1>
          <div className="w-6"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Job Applications
                </h1>
                <p className="text-slate-600 mt-2 text-lg">
                  Review and manage candidate applications
                </p>
              </div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/poster/dashboard"
                  className="group flex items-center px-6 py-3 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-blue-500/10 border border-white/20 text-slate-700 hover:bg-white hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300"
                >
                  <FiChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                  Back to Dashboard
                </Link>
              </motion.div>
            </motion.div>

            {/* Filters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-500/10 border border-white/20 p-6"
            >
              <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center">
                <FiFilter className="mr-3 text-[#2245ae]" /> Filter Applications
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Search Applications
                  </label>
                  <div className="relative">
                    <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      className="w-full pl-12 pr-4 py-4 bg-white/50 backdrop-blur-lg rounded-2xl border border-white/30 shadow-lg shadow-black/5 focus:shadow-2xl focus:shadow-blue-500/20 focus:border-[#2245ae]/30 focus:outline-none transition-all duration-300"
                      placeholder="Search by name, job, or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Filter by Status
                  </label>
                  <div className="relative">
                    <select
                      className="w-full pl-4 pr-10 py-4 bg-white/50 backdrop-blur-lg rounded-2xl border border-white/30 shadow-lg shadow-black/5 focus:shadow-2xl focus:shadow-blue-500/20 focus:border-[#2245ae]/30 focus:outline-none transition-all duration-300 appearance-none"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="Received">Received</option>
                      <option value="Interview Scheduled">Interview Scheduled</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Hired">Hired</option>
                    </select>
                    <FiChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClearFilters}
                  className="px-6 py-3 bg-white/60 backdrop-blur-lg rounded-2xl border border-white/30 shadow-lg shadow-black/5 text-slate-700 hover:bg-white hover:shadow-xl hover:shadow-black/10 transition-all duration-300 flex items-center"
                >
                  <FiRefreshCcw className="mr-2 h-4 w-4" />
                  Clear Filters
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleApplyFilters}
                  className="px-6 py-3 bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] rounded-2xl shadow-2xl shadow-blue-500/25 text-white hover:shadow-3xl hover:shadow-blue-500/40 transition-all duration-300 flex items-center"
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
                  className="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl shadow-2xl shadow-red-500/10 border border-red-200/50 p-4"
                >
                  <div className="flex items-center">
                    <FiXCircle className="text-red-500 mr-3 w-5 h-5" />
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
                className="flex justify-center items-center py-16 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-500/10 border border-white/20"
              >
                <div className="text-center">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl"></div>
                    <FiLoader className="relative text-[#2245ae] h-12 w-12 animate-spin" />
                  </div>
                  <p className="mt-4 text-lg font-medium text-slate-700">
                    Loading applications...
                  </p>
                </div>
              </motion.div>
            ) : applications.length === 0 ? (
              /* Empty State */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-500/10 border border-white/20 p-12 text-center"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/10 border border-white/20">
                  <FiBriefcase className="h-10 w-10 text-[#2245ae]" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">
                  No applications found
                </h3>
                <p className="text-slate-600 text-lg mb-8 max-w-md mx-auto">
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
                      className="px-6 py-3 bg-white/60 backdrop-blur-lg rounded-2xl border border-white/30 shadow-lg shadow-black/5 text-slate-700 hover:bg-white hover:shadow-xl hover:shadow-black/10 transition-all duration-300"
                    >
                      Clear Filters
                    </motion.button>
                  )}
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link
                      href="/poster/new-job"
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] rounded-2xl shadow-2xl shadow-blue-500/25 text-white hover:shadow-3xl hover:shadow-blue-500/40 transition-all duration-300"
                    >
                      <FiBriefcase className="mr-2 h-5 w-5" />
                      Post New Job
                    </Link>
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              /* Applications List - INSANE DESIGN */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                {applications.map((application, index) => (
                  <motion.div
                    key={application._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group"
                  >
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-500/10 border border-white/20 overflow-hidden hover:shadow-3xl hover:shadow-blue-500/20 hover:border-white/40 transition-all duration-500">
                      {/* Main Card Content */}
                      <div 
                        className="p-6 cursor-pointer hover:bg-white/50 transition-all duration-300"
                        onClick={() => toggleCardExpansion(application._id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent group-hover:from-[#2245ae] group-hover:to-[#1a3a9c] transition-all duration-300">
                                  {application.job.title}
                                </h3>
                                <div className="flex items-center text-slate-500 mt-2">
                                  <FiMapPin className="w-4 h-4 mr-2" />
                                  <span className="font-medium">{application.job.location}</span>
                                </div>
                              </div>
                              <div className={`px-4 py-2 rounded-2xl ${getStatusColor(application.status)} flex items-center gap-2 ml-4 transition-all duration-300 group-hover:scale-105`}>
                                {getStatusIcon(application.status)}
                                <span className="font-semibold text-sm">{application.status}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] rounded-full blur-md opacity-50"></div>
                                <div className="relative w-12 h-12 bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/25">
                                  {application.applicant?.candidateDetails?.fullName?.charAt(0) || 
                                   application.applicant?.username?.charAt(0) || 
                                   application.applicant?.email?.charAt(0).toUpperCase() || "U"}
                                </div>
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800 text-lg">
                                  {application.applicant?.candidateDetails?.fullName || application.applicant?.username || "Unknown Applicant"}
                                </p>
                                <p className="text-slate-500 flex items-center">
                                  <FiMail className="w-4 h-4 mr-2" />
                                  {application.applicant?.email}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <motion.div
                            animate={{ rotate: expandedCards.has(application._id) ? 180 : 0 }}
                            className="text-slate-400 group-hover:text-[#2245ae] transition-colors duration-300 ml-4"
                          >
                            <FiChevronDown className="w-6 h-6" />
                          </motion.div>
                        </div>
                      </div>

                      {/* Expandable Section */}
                      <AnimatePresence>
                        {expandedCards.has(application._id) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                            className="border-t border-white/20 bg-gradient-to-br from-white/40 to-white/10 backdrop-blur-lg"
                          >
                            <div className="p-6 space-y-6">
                              {/* Details Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                  <div className="flex items-center text-slate-700">
                                    <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center mr-4">
                                      <FiCalendar className="w-5 h-5 text-[#2245ae]" />
                                    </div>
                                    <div>
                                      <p className="text-sm text-slate-500">Applied Date</p>
                                      <p className="font-semibold">{new Date(application.appliedAt).toLocaleDateString()}</p>
                                    </div>
                                  </div>
                                  
                                  {application.job.salaryOriginal && (
                                    <div className="flex items-center text-slate-700">
                                      <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center mr-4">
                                        <FiDollarSign className="w-5 h-5 text-emerald-600" />
                                      </div>
                                      <div>
                                        <p className="text-sm text-slate-500">Salary</p>
                                        <p className="font-semibold text-emerald-600">{application.job.salaryOriginal}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-4">
                                  {application.applicant?.candidateDetails?.phone && (
                                    <div className="flex items-center text-slate-700">
                                      <div className="w-10 h-10 bg-purple-100 rounded-2xl flex items-center justify-center mr-4">
                                        <FiPhone className="w-5 h-5 text-purple-600" />
                                      </div>
                                      <div>
                                        <p className="text-sm text-slate-500">Phone</p>
                                        <p className="font-semibold">{application.applicant.candidateDetails.phone}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Skills Section */}
                              {application.applicant?.candidateDetails?.skills && application.applicant.candidateDetails.skills.length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-slate-800 mb-4 text-lg">Skills & Expertise</h4>
                                  <div className="flex flex-wrap gap-3">
                                    {application.applicant.candidateDetails.skills.map((skill, index) => (
                                      <span
                                        key={index}
                                        className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 text-slate-700 font-medium shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/20 hover:scale-105 transition-all duration-300"
                                      >
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-white/20">
                                {application.applicant?.resume?.resumeId && (
                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleViewResume(application.applicant!.resume!.resumeId)}
                                    className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 text-[#2245ae] font-semibold shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/20 hover:bg-white transition-all duration-300"
                                  >
                                    <FiEye className="w-5 h-5" />
                                    View Resume
                                  </motion.button>
                                )}
                                
                                <div className="flex-1">
                                  <label className="block text-sm font-semibold text-slate-700 mb-3">Update Application Status</label>
                                  <select
                                    value={application.status}
                                    onChange={(e) => updateApplicationStatus(application._id, e.target.value as Application["status"])}
                                    disabled={application.status === "Hired" || application.status === "Rejected"}
                                    className="w-full px-4 py-3 bg-white/50 backdrop-blur-lg rounded-2xl border border-white/30 shadow-lg shadow-black/5 focus:shadow-2xl focus:shadow-blue-500/20 focus:border-[#2245ae]/30 focus:outline-none transition-all duration-300 disabled:bg-slate-100 disabled:text-slate-400"
                                  >
                                    <option value="Received">Mark as Received</option>
                                    <option value="Interview Scheduled">Schedule Interview</option>
                                    <option value="Rejected">Reject Application</option>
                                    <option value="Hired">Hire Candidate</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}