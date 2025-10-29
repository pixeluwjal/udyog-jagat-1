// app/posted-jobs/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import { FiEdit, FiTrash2, FiEye, FiPlus, FiSearch, FiFilter, FiBriefcase, FiMapPin, FiDollarSign, FiUsers, FiCalendar, FiCheckCircle, FiXCircle, FiPause } from "react-icons/fi";

interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  salaryOriginal: string;
  jobType: string;
  status: "active" | "inactive" | "closed";
  numberOfOpenings: number;
  skills: string[];
  createdAt: string;
  applicationsCount?: number;
}

export default function PostedJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [jobTypeFilter, setJobTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"job_poster" | "job_seeker" | "admin" | "job_referrer">("job_poster");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const router = useRouter();
  const jobsPerPage = 8;

  useEffect(() => {
    // Get user role from localStorage or API
    const role = localStorage.getItem("userRole") as "job_poster" | "job_seeker" | "admin" | "job_referrer";
    if (role) {
      setUserRole(role);
    }
    fetchJobs();
  }, []);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchTerm, statusFilter, jobTypeFilter, currentPage]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      const response = await fetch(`/api/jobs?page=${currentPage}&limit=${jobsPerPage}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs);
        setTotalPages(Math.ceil(data.totalJobs / jobsPerPage));
        
        // Fetch application counts for each job
        await fetchApplicationCounts(data.jobs);
      } else {
        console.error("Failed to fetch jobs");
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicationCounts = async (jobsList: Job[]) => {
    try {
      const token = localStorage.getItem("token");
      
      const jobsWithCounts = await Promise.all(
        jobsList.map(async (job) => {
          const response = await fetch(`/api/applications?jobId=${job._id}`, {
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            return {
              ...job,
              applicationsCount: data.totalApplications || 0
            };
          }
          return job;
        })
      );
      
      setJobs(jobsWithCounts);
    } catch (error) {
      console.error("Error fetching application counts:", error);
    }
  };

  const filterJobs = () => {
    let filtered = jobs;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(job => job.status === statusFilter);
    }

    // Apply job type filter
    if (jobTypeFilter !== "all") {
      filtered = filtered.filter(job => job.jobType === jobTypeFilter);
    }

    setFilteredJobs(filtered);
  };

  const updateJobStatus = async (jobId: string, newStatus: "active" | "inactive" | "closed") => {
    try {
      setUpdatingStatus(jobId);
      const token = localStorage.getItem("token");

      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setJobs(jobs.map(job =>
          job._id === jobId ? { ...job, status: newStatus } : job
        ));
      } else {
        console.error("Failed to update job status");
        alert("Failed to update job status");
      }
    } catch (error) {
      console.error("Error updating job status:", error);
      alert("Error updating job status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setJobs(jobs.filter(job => job._id !== jobId));
        setDeleteConfirm(null);
      } else {
        console.error("Failed to delete job");
        alert("Failed to delete job");
      }
    } catch (error) {
      console.error("Error deleting job:", error);
      alert("Error deleting job");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "inactive":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "closed":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <FiCheckCircle className="w-4 h-4" />;
      case "inactive":
        return <FiPause className="w-4 h-4" />;
      case "closed":
        return <FiXCircle className="w-4 h-4" />;
      default:
        return <FiBriefcase className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar
          userRole={userRole}
          onLogout={handleLogout}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        userRole={userRole}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Posted Jobs</h1>
                <p className="text-gray-600 mt-1">Manage and track your job postings</p>
              </div>
              <button
                onClick={() => router.push("/poster/new-job")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <FiPlus className="w-5 h-5" />
                <span>Post New Job</span>
              </button>
            </div>
          </div>
        </header>

        {/* Filters and Search */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Job Type Filter */}
            <div className="relative">
              <FiBriefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={jobTypeFilter}
                onChange={(e) => setJobTypeFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
              >
                <option value="all">All Types</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Temporary">Temporary</option>
                <option value="Internship">Internship</option>
              </select>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-end text-gray-600">
              <span className="text-sm">
                Showing {filteredJobs.length} of {jobs.length} jobs
              </span>
            </div>
          </div>
        </div>

        {/* Jobs Grid */}
        <main className="flex-1 overflow-y-auto p-6">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <FiBriefcase className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No jobs found</h3>
              <p className="mt-2 text-gray-500">
                {jobs.length === 0 
                  ? "You haven't posted any jobs yet. Get started by posting your first job!"
                  : "No jobs match your current filters."}
              </p>
              {jobs.length === 0 && (
                <button
                  onClick={() => router.push("/poster/new-job")}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-flex items-center space-x-2 transition-colors"
                >
                  <FiPlus className="w-5 h-5" />
                  <span>Post Your First Job</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredJobs.map((job) => (
                <div
                  key={job._id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  {/* Job Header */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                        {job.title}
                      </h3>
                      <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(job.status)}`}>
                        {getStatusIcon(job.status)}
                        <span className="capitalize">{job.status}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center text-gray-600 mb-2">
                      <FiBriefcase className="w-4 h-4 mr-2" />
                      <span className="text-sm">{job.company}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <FiMapPin className="w-4 h-4 mr-2" />
                      <span className="text-sm">{job.location}</span>
                    </div>
                  </div>

                  {/* Job Details */}
                  <div className="p-6 space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center text-gray-600">
                        <FiDollarSign className="w-4 h-4 mr-2" />
                        <span>{job.salaryOriginal || "Not specified"}</span>
                      </div>
                      
                      <div className="flex items-center text-gray-600">
                        <FiUsers className="w-4 h-4 mr-2" />
                        <span>{job.numberOfOpenings} opening(s)</span>
                      </div>
                      
                      <div className="flex items-center text-gray-600">
                        <FiCalendar className="w-4 h-4 mr-2" />
                        <span>{formatDate(job.createdAt)}</span>
                      </div>
                      
                      <div className="flex items-center text-blue-600 font-medium">
                        <FiEye className="w-4 h-4 mr-2" />
                        <span>{job.applicationsCount || 0} applications</span>
                      </div>
                    </div>

                    {/* Skills */}
                    {job.skills && job.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {job.skills.slice(0, 3).map((skill, index) => (
                          <span
                            key={index}
                            className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded"
                          >
                            {skill}
                          </span>
                        ))}
                        {job.skills.length > 3 && (
                          <span className="inline-block bg-gray-50 text-gray-600 text-xs px-2 py-1 rounded">
                            +{job.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                    <div className="flex justify-between items-center space-x-3">
                      {/* Status Actions */}
                      <div className="flex space-x-2">
                        {job.status !== "active" && (
                          <button
                            onClick={() => updateJobStatus(job._id, "active")}
                            disabled={updatingStatus === job._id}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updatingStatus === job._id ? "..." : "Activate"}
                          </button>
                        )}
                        
                        {job.status !== "inactive" && job.status !== "closed" && (
                          <button
                            onClick={() => updateJobStatus(job._id, "inactive")}
                            disabled={updatingStatus === job._id}
                            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updatingStatus === job._id ? "..." : "Pause"}
                          </button>
                        )}
                        
                        {job.status !== "closed" && (
                          <button
                            onClick={() => updateJobStatus(job._id, "closed")}
                            disabled={updatingStatus === job._id}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updatingStatus === job._id ? "..." : "Close"}
                          </button>
                        )}
                      </div>

                      {/* View/Edit/Delete */}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => router.push(`/poster/applications?jobId=${job._id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Applications"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => router.push(`/poster/jobs/${job._id}/edit`)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit Job"
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => setDeleteConfirm(job._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Job"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-8">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Job Posting
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this job posting? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteJob(deleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}