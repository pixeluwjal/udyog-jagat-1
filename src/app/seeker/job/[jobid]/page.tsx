"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Sidebar from "@/app/components/Sidebar";
import Link from "next/link";
import {
  FiMapPin,
  FiBriefcase,
  FiDollarSign,
  FiCalendar,
  FiUsers,
  FiXCircle,
  FiCheckCircle,
  FiSave,
} from "react-icons/fi";

// Define a more specific Job interface for detailed view
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
  skills?: string[];
  createdAt: string;
  isSaved?: boolean;
  numberOfOpenings?: number;
}

const theme = {
  job_seeker: {
    bg: "bg-gradient-to-b from-indigo-800 to-indigo-950",
    hover: "hover:bg-indigo-700",
    active: "bg-indigo-600",
    text: "text-indigo-100",
    border: "border-indigo-700",
    mobileButton: "bg-indigo-700",
    primaryColor: "#1938A8",
    darkPrimaryColor: "#182E78",
  },
};

export default function JobDetailPage() {
  const {
    user,
    loading: authLoading,
    isAuthenticated,
    logout,
    token,
  } = useAuth();
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobid as string;

  const [job, setJob] = useState<Job | null>(null);
  const [moreJobs, setMoreJobs] = useState<Job[]>([]);
  const [loadingJob, setLoadingJob] = useState(true);
  const [loadingMoreJobs, setLoadingMoreJobs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [applicationStatus, setApplicationStatus] =
    useState<string>("Not Applied");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user) {
      console.warn(
        "JobDetailPage: Not authenticated or user missing. Redirecting to /login."
      );
      router.push("/login");
      return;
    }

    if (user.firstLogin) {
      console.warn(
        "JobDetailPage: User is firstLogin. Redirecting to /change-password."
      );
      router.push("/change-password");
      return;
    }

    if (user.role !== "job_seeker") {
      console.warn(
        `JobDetailPage: User role is ${user.role}, not a job_seeker. Redirecting.`
      );
      if (user.role === "admin") router.push("/admin/dashboard");
      else if (user.role === "job_poster") router.push("/poster/dashboard");
      else router.push("/");
      return;
    }

    if (user.role === "job_seeker" && user.onboardingStatus !== "completed") {
      console.warn(
        "JobDetailPage: Job Seeker onboarding not completed. Redirecting to /seeker/onboarding."
      );
      router.push("/seeker/onboarding");
      return;
    }
  }, [authLoading, isAuthenticated, user, router]);

  const fetchJobDetails = useCallback(async () => {
    if (!jobId) {
      setError("Job ID is missing.");
      setLoadingJob(false);
      return;
    }
    if (!token) {
      setError("Authentication token missing. Please log in again.");
      setLoadingJob(false);
      return;
    }

    setLoadingJob(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch job details");
      }

      const fetchedJob: Job = data.job;
      setJob(fetchedJob);

      const appliedStatus = await fetchApplicationStatus(jobId, user?._id);
      setApplicationStatus(appliedStatus);

      const isJobSaved = await fetchSavedJobStatus(jobId, user?._id);
      setJob((prevJob) =>
        prevJob ? { ...prevJob, isSaved: isJobSaved } : fetchedJob
      );
    } catch (err: any) {
      console.error("Failed to fetch job details:", err);
      setError(err.message || "Failed to load job details.");
      setJob(null);
    } finally {
      setLoadingJob(false);
    }
  }, [jobId, token, user?._id]);

  const fetchMoreJobs = useCallback(async () => {
    setLoadingMoreJobs(true);
    try {
      if (!token) {
        throw new Error("Authentication token missing.");
      }
      const response = await fetch(`/api/jobs?limit=5&excludeJobId=${jobId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch more jobs");
      }
      setMoreJobs(Array.isArray(data.jobs) ? data.jobs : []);
    } catch (err: any) {
      console.error("Failed to fetch more jobs:", err);
      setMoreJobs([]);
    } finally {
      setLoadingMoreJobs(false);
    }
  }, [jobId, token]);

  const fetchApplicationStatus = useCallback(
    async (jobIdToCheck: string, applicantId: string | undefined) => {
      if (!token || !applicantId) {
        return "Not Applied";
      }
      try {
        const response = await fetch(
          `/api/applications?jobIds=${jobIdToCheck}&applicantId=${applicantId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await response.json();
        if (
          response.ok &&
          Array.isArray(data.applications) &&
          data.applications.length > 0
        ) {
          return "Applied";
        }
        return "Not Applied";
      } catch (error) {
        console.error("Error fetching application status:", error);
        return "Not Applied";
      }
    },
    [token]
  );

  const fetchSavedJobStatus = useCallback(
    async (jobIdToCheck: string, applicantId: string | undefined) => {
      if (!token || !applicantId) {
        return false;
      }
      try {
        const response = await fetch(`/api/seeker/saved-jobs`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (response.ok && Array.isArray(data.savedJobs)) {
          return data.savedJobs.some(
            (savedJob: any) => savedJob.job._id === jobIdToCheck
          );
        }
        return false;
      } catch (error) {
        console.error("Error fetching saved job status:", error);
        return false;
      }
    },
    [token]
  );

  useEffect(() => {
    if (
      !authLoading &&
      isAuthenticated &&
      user &&
      user.role === "job_seeker" &&
      user.onboardingStatus === "completed"
    ) {
      fetchJobDetails();
      fetchMoreJobs();
    }
  }, [authLoading, isAuthenticated, user, fetchJobDetails, fetchMoreJobs]);

  const handleApply = async () => {
    if (!token || !job?._id) {
      setError("Authentication token or job ID missing. Please log in again.");
      return;
    }

    setApplicationStatus("Applying...");
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jobId: job._id }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (
          response.status === 400 &&
          data.error === "Resume required" &&
          data.redirect
        ) {
          setError(
            "Please upload your resume in your profile before applying."
          );
          setTimeout(() => router.push(data.redirect), 3000);
          setApplicationStatus("Not Applied");
          return;
        }
        throw new Error(data.error || "Failed to apply");
      }

      setApplicationStatus("Applied");
      setMessage("Application submitted successfully!");
      setJob((prevJob) => (prevJob ? { ...prevJob, isSaved: false } : null));
    } catch (err: any) {
      console.error("Error applying:", err);
      setApplicationStatus("Not Applied");
      setError(err.message || "Failed to apply for job");
    }
  };

  const handleSaveUnsaveJob = async () => {
    if (!token || !job?._id) {
      setError("Authentication token or job ID missing. Please log in again.");
      return;
    }

    if (applicationStatus === "Applied") {
      setError("You cannot save/unsave a job you have already applied for.");
      return;
    }

    const isCurrentlySaved = job.isSaved || false;

    setJob((prevJob) =>
      prevJob ? { ...prevJob, isSaved: !isCurrentlySaved } : null
    );
    setMessage(isCurrentlySaved ? "Unsaving job..." : "Saving job...");
    setError(null);

    try {
      let response;
      if (isCurrentlySaved) {
        response = await fetch(`/api/seeker/saved-jobs?jobId=${job._id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } else {
        response = await fetch("/api/seeker/saved-jobs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ jobId: job._id }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        setJob((prevJob) =>
          prevJob ? { ...prevJob, isSaved: isCurrentlySaved } : null
        );
        throw new Error(
          data.error || `Failed to ${isCurrentlySaved ? "unsave" : "save"} job`
        );
      }

      const updatedIsSaved = await fetchSavedJobStatus(jobId, user?._id);
      setJob((prevJob) =>
        prevJob ? { ...prevJob, isSaved: updatedIsSaved } : null
      );

      setMessage(
        data.message ||
          `Job ${isCurrentlySaved ? "unsaved" : "saved"} successfully!`
      );
    } catch (err: any) {
      console.error(
        `Error ${isCurrentlySaved ? "unsaving" : "saving"} job:`,
        err
      );
      setError(
        err.message || `Failed to ${isCurrentlySaved ? "unsave" : "save"} job`
      );
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (
    authLoading ||
    !isAuthenticated ||
    !user ||
    user.firstLogin ||
    (user.role === "job_seeker" && user.onboardingStatus !== "completed")
  ) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="m-auto flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="mt-4 text-gray-700">Loading job details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden font-inter">
      <Sidebar
        userRole={user.role}
        onLogout={logout}
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden bg-white shadow-lg p-4 flex items-center justify-between relative z-10">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md text-[#1938A8] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#182E78]"
            aria-label="Open sidebar"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-[#1938A8] text-center absolute left-1/2 -translate-x-1/2">
            Job Details
          </h1>
          <div className="h-6 w-6"></div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
            <div className="flex-1 bg-white rounded-xl shadow-lg border border-gray-100 p-6 lg:p-8 transform transition-transform duration-300 hover:scale-[1.005]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 h-16 w-16 bg-indigo-100 rounded-lg flex items-center justify-center shadow-md">
                    {job?.companyLogo ? (
                      <img
                        src={job.companyLogo}
                        alt={job.company}
                        className="h-14 w-14 object-contain rounded-md"
                      />
                    ) : (
                      <span className="text-indigo-600 font-bold text-2xl">
                        {job?.company?.charAt(0) || "J"}
                      </span>
                    )}
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight">
                      {job?.title || "Loading Job..."}
                    </h1>
                    <p className="text-lg text-gray-600 mt-1">
                      {job?.company || "N/A"} • {job?.location || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="text-right sm:self-center">
                  <span className="text-3xl font-bold text-gray-900">
                    {job?.salaryOriginal || "N/A"}
                  </span>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg shadow-md flex items-center">
                  <div className="flex-shrink-0">
                    <FiXCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              )}
              {message && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg shadow-md flex items-center">
                  <div className="flex-shrink-0">
                    <FiCheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700 font-medium">
                      {message}
                    </p>
                  </div>
                </div>
              )}

              {loadingJob ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-500"></div>
                  <p className="ml-4 text-gray-700 text-lg">
                    Loading job details...
                  </p>
                </div>
              ) : !job ? (
                <div className="text-center py-12 text-gray-600">
                  Job details could not be loaded. Please try again.
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-indigo-200 pb-2">
                      Job Description
                    </h2>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line text-base">
                      {job.description}
                    </p>
                  </div>

                  {job.skills && job.skills.length > 0 && (
                    <div className="mb-8">
                      <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-indigo-200 pb-2">
                        Required Skills
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {job.skills.map((skill, index) => (
                          <span
                            key={index}
                            className={`px-4 py-1 ${theme.job_seeker.bg} ${theme.job_seeker.text} text-sm rounded-full font-medium shadow-sm`}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-indigo-200 pb-2">
                      Job Overview
                    </h2>
                    <ul className="space-y-3 text-gray-700">
                      <li className="flex items-center">
                        <FiMapPin className="w-5 h-5 mr-3 text-indigo-500" />
                        <strong>Location:</strong> {job.location}
                      </li>
                      <li className="flex items-center">
                        <FiDollarSign className="w-5 h-5 mr-3 text-indigo-500" />
                        <strong>Salary:</strong>
                        {job.salaryOriginal || 'N/A'}
                      </li>
                      <li className="flex items-center">
                        <FiBriefcase className="w-5 h-5 mr-3 text-indigo-500" />
                        <strong>Job Type:</strong> {job.jobType || "Full-time"}
                      </li>
                      <li className="flex items-center">
                        <FiCalendar className="w-5 h-5 mr-3 text-indigo-500" />
                        <strong>Posted On:</strong>{" "}
                        {new Date(job.createdAt).toLocaleDateString()}
                      </li>
                      {job.numberOfOpenings !== undefined && (
                        <li className="flex items-center">
                          <FiUsers className="w-5 h-5 mr-3 text-indigo-500" />
                          <strong>Openings:</strong> {job.numberOfOpenings}
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="mt-8 flex flex-col sm:flex-row gap-4">
                    {applicationStatus === "Applying..." ? (
                      <button
                        disabled
                        className="flex-1 px-6 py-3 bg-indigo-400 text-white rounded-lg font-semibold cursor-not-allowed shadow-md flex items-center justify-center gap-2 transform transition-all duration-200"
                      >
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                        Applying...
                      </button>
                    ) : applicationStatus === "Applied" ? (
                      <button
                        disabled
                        className="flex-1 px-6 py-3 bg-green-100 text-green-800 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-md cursor-not-allowed"
                      >
                        <FiCheckCircle className="w-5 h-5" />
                        Applied
                      </button>
                    ) : (
                      <button
                        onClick={handleApply}
                        className={`flex-1 px-6 py-3 ${theme.job_seeker.bg} ${theme.job_seeker.hover} text-white rounded-lg font-semibold transition-all duration-200 shadow-lg flex items-center justify-center gap-2 transform active:scale-98`}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Apply Now
                      </button>
                    )}
                    <button
                      onClick={handleSaveUnsaveJob}
                      disabled={applicationStatus === "Applied"}
                      className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg flex items-center justify-center gap-2 transform active:scale-98
                                                        ${
                                                          job.isSaved
                                                            ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300"
                                                            : "bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300"
                                                        }
                                                        ${
                                                          applicationStatus ===
                                                          "Applied"
                                                            ? "opacity-60 cursor-not-allowed"
                                                            : ""
                                                        }
                    `}
                    >
                      {job.isSaved ? (
                        <>
                          <FiSave className="w-5 h-5" />
                          Saved
                        </>
                      ) : (
                        <>
                          <FiSave className="w-5 h-5" />
                          Save Job
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="w-full lg:w-80 flex-shrink-0 bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-extrabold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
                More Jobs Like This
              </h2>
              {loadingMoreJobs ? (
                <div className="flex flex-col space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="animate-pulse bg-gray-100 p-4 rounded-lg"
                    >
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : moreJobs.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No other jobs found at the moment.
                </p>
              ) : (
                <div className="space-y-4">
                  {moreJobs.map((otherJob) => (
                    <Link
                      href={`/seeker/job/${otherJob._id}`}
                      key={otherJob._id}
                    >
                      <div className="block p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200 cursor-pointer shadow-sm">
                        <h3 className="text-md font-semibold text-gray-800 line-clamp-2">
                          {otherJob.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {otherJob.company || "N/A"} • {otherJob.location}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {otherJob.salaryOriginal || "Salary Not Specified"}
                        </p>
                      </div>
                    </Link>
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