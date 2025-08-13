"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Sidebar from "@/app/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiUser,
  FiMail,
  FiEdit,
  FiSave,
  FiXCircle,
  FiCheckCircle,
  FiLoader,
  FiMenu,
  FiLock,
  FiBookOpen,
  FiMapPin,
  FiGlobe,
  FiTag,
  FiFileText, // Added for resume icon
  FiUploadCloud, // Added for upload icon
  FiDownload, // Added for download icon
} from "react-icons/fi";

// Brand colors
const primaryBlue = "#165BF8";
const darkBlue = "#1C3991";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const pulseEffect = {
  scale: [1, 1.05, 1],
  opacity: [1, 0.7, 1],
  transition: { duration: 0.8, repeat: Infinity, ease: "easeInOut" },
};

export default function ProfilePage() {
  const {
    user: currentUser,
    loading: authLoading,
    isAuthenticated,
    token,
    updateUser,
    logout,
  } = useAuth();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    milanShaka: "",
    valayaNagar: "",
    khandaBhaga: "",
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [resume, setResume] = useState<{ fileName: string; resumeId: string } | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false); // New state for download loading
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Function to fetch the user's resume details
  const fetchResumeDetails = async () => {
    if (!token || !currentUser || currentUser.role !== 'job_seeker') return;

    try {
      // Corrected API endpoint to fetch resume metadata
      const response = await fetch("/api/resumes", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No resume found, which is a valid state
          setResume(null);
          return;
        }
        throw new Error("Failed to fetch resume details.");
      }

      const data = await response.json();
      setResume({
        fileName: data.fileName,
        resumeId: data.resumeId,
      });
    } catch (err: any) {
      console.error("Error fetching resume details:", err);
      // We don't set an error here, as a missing resume isn't a critical failure
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !currentUser) {
        router.push("/login");
      } else {
        setFormData({
          username: currentUser.username || "",
          email: currentUser.email || "",
          milanShaka: currentUser.milanShakaBhaga || "",
          valayaNagar: currentUser.valayaNagar || "",
          khandaBhaga: currentUser.khandaBhaga || "",
        });
        // FIX: Fetch resume details whenever the currentUser or token changes
        if (currentUser.role === 'job_seeker') {
          fetchResumeDetails();
        }
      }
    }
  }, [authLoading, isAuthenticated, currentUser, router, token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "currentPassword") setCurrentPassword(value);
    else if (name === "newPassword") setNewPassword(value);
    else if (name === "confirmNewPassword") setConfirmNewPassword(value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setResumeFile(e.target.files[0]);
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!token) {
      setError("Authentication token missing. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      const payload: {
        username: string;
        milanShakaBhaga?: string;
        valayaNagar?: string;
        khandaBhaga?: string;
      } = {
        username: formData.username,
      };

      payload.milanShakaBhaga = formData.milanShaka;
      payload.valayaNagar = formData.valayaNagar;
      payload.khandaBhaga = formData.khandaBhaga;

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      updateUser(data.user);
      setMessage("Profile updated successfully!");
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during profile update.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!token) {
      setError("Authentication token missing. Please log in again.");
      setLoading(false);
      return;
    }

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setError("All password fields are required.");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("New password and confirm password do not match.");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/profile/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to change password.");
      }

      setMessage("Password changed successfully! You will be logged out to re-authenticate.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => {
        logout();
        router.push('/login');
      }, 2000);

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during password change.");
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!resumeFile) {
      setError("Please select a file to upload.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.append("resume", resumeFile);

    try {
      // Corrected API endpoint for resume upload
      const response = await fetch("/api/resumes", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload resume.");
      }

      // Update the resume state with the new data
      setResume({ fileName: data.fileName, resumeId: data.resumeId });
      setResumeFile(null);
      setMessage("Resume uploaded successfully!");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during resume upload.");
    } finally {
      setIsUploading(false);
    }
  };

  // FIX: New function to handle resume download
  const handleDownloadResume = async () => {
    if (!resume || !token) {
      setError("No resume found or authentication token missing.");
      return;
    }

    setIsDownloading(true);
    setError(null);

    try {
      const response = await fetch(`/api/resumes/${resume.resumeId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download resume.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      window.URL.revokeObjectURL(url); // Clean up the URL object
      setMessage("Resume opened in a new tab.");

    } catch (err: any) {
      console.error("Error downloading resume:", err);
      setError(err.message || "An unexpected error occurred during resume download.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (authLoading || !isAuthenticated || !currentUser) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] justify-center items-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center"
        >
          <motion.div
            animate={pulseEffect}
            className="rounded-full p-4 bg-[#165BF8]/10 shadow-inner"
          >
            <FiLoader className="text-[#165BF8] h-12 w-12 animate-spin" />
          </motion.div>
          <p className="mt-6 text-lg font-medium text-[#1C3991]">
            Loading profile...
          </p>
        </motion.div>
      </div>
    );
  }

  const shouldDisplayAdditionalFields =
    currentUser.role === 'job_seeker' ||
    currentUser.role === 'admin' ||
    currentUser.role === 'job_referrer';

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] overflow-hidden font-inter">
      <Sidebar
        userRole={currentUser.role}
        onLogout={logout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        userEmail= {currentUser.email}
      />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile header */}
        <div className="md:hidden bg-white/95 backdrop-blur-md shadow-lg p-4 flex justify-between items-center z-10 sticky top-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#165BF8]"
            aria-label="Toggle sidebar"
          >
            <FiMenu className="h-6 w-6" />
          </motion.button>
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            My Profile
          </h1>
          <div className="w-6 h-6"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-[#165BF8]/10 p-6 md:p-8"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h1 className="text-3xl font-extrabold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-[#165BF8] to-[#1C3991]">
                My Profile
              </h1>
              <motion.button
                whileHover={{
                  scale: 1.05,
                  boxShadow: `0 4px 15px #165BF830`,
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center px-4 py-2 bg-[#165BF8]/10 text-[#1C3991] rounded-lg hover:bg-[#165BF8]/20 transition-colors text-sm font-medium shadow-sm"
              >
                {isEditing ? (
                  <>
                    <FiXCircle className="mr-2 w-5 h-5" /> Cancel Edit
                  </>
                ) : (
                  <>
                    <FiEdit className="mr-2 w-5 h-5" /> Edit Profile
                  </>
                )}
              </motion.button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="p-3 bg-red-100 border-l-4 border-red-500 rounded-r-lg shadow-sm text-sm text-red-700 font-medium flex items-center mb-4"
                  role="alert"
                >
                  <FiXCircle className="h-5 w-5 text-red-500 mr-2" /> {error}
                </motion.div>
              )}
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="p-3 bg-green-100 border-l-4 border-green-500 rounded-r-lg shadow-sm text-sm text-green-700 font-medium flex items-center mb-4"
                  role="alert"
                >
                  <FiCheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  {message}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Username */}
                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm font-semibold text-[#1C3991] mb-2"
                  >
                    <FiUser className="inline-block mr-2 text-[#165BF8]" /> Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    readOnly={!isEditing}
                    className={`block w-full px-4 py-3 border border-[#165BF8]/20 rounded-xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] transition-all duration-200 text-[#1C3991] ${
                      !isEditing ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                    }`}
                  />
                </div>
                {/* Email - Always Read-Only */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-[#1C3991] mb-2"
                  >
                    <FiMail className="inline-block mr-2 text-[#165BF8]" /> Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    readOnly={true}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm bg-gray-100 cursor-not-allowed text-[#1C3991] transition-all duration-200"
                  />
                </div>
                {/* Role - Read-Only */}
                <div>
                  <label
                    htmlFor="role"
                    className="block text-sm font-semibold text-[#1C3991] mb-2"
                  >
                    <FiTag className="inline-block mr-2 text-[#165BF8]" /> Role
                  </label>
                  <input
                    type="text"
                    id="role"
                    name="role"
                    value={currentUser.role.replace('_', ' ')}
                    readOnly={true}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm bg-gray-100 cursor-not-allowed text-[#1C3991] capitalize transition-all duration-200"
                  />
                </div>
              </div>

              {shouldDisplayAdditionalFields && (
                <div className="pt-6 border-t border-[#165BF8]/10 mt-6 space-y-6">
                  <h3 className="text-xl font-semibold text-[#1C3991]">
                    Additional Details
                  </h3>
                  <div>
                    <label htmlFor="milanShaka" className="block text-sm font-semibold text-[#1C3991] mb-2">
                      <FiBookOpen className="inline-block mr-2 text-[#165BF8]" /> Milan/Shaka
                    </label>
                    <input
                      type="text"
                      id="milanShaka"
                      name="milanShaka"
                      value={formData.milanShaka}
                      onChange={handleChange}
                      readOnly={!isEditing}
                      className={`block w-full px-4 py-3 border border-[#165BF8]/20 rounded-xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] transition-all duration-200 text-[#1C3991] ${
                        !isEditing ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                      }`}
                      placeholder="Enter Milan/Shaka"
                    />
                  </div>
                  <div>
                    <label htmlFor="valayaNagar" className="block text-sm font-semibold text-[#1C3991] mb-2">
                      <FiMapPin className="inline-block mr-2 text-[#165BF8]" /> Valaya/Nagar
                    </label>
                    <input
                      type="text"
                      id="valayaNagar"
                      name="valayaNagar"
                      value={formData.valayaNagar}
                      onChange={handleChange}
                      readOnly={!isEditing}
                      className={`block w-full px-4 py-3 border border-[#165BF8]/20 rounded-xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] transition-all duration-200 text-[#1C3991] ${
                        !isEditing ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                      }`}
                      placeholder="Enter Valaya/Nagar"
                    />
                  </div>
                  <div>
                    <label htmlFor="khandaBhaga" className="block text-sm font-semibold text-[#1C3991] mb-2">
                      <FiGlobe className="inline-block mr-2 text-[#165BF8]" /> Khanda/Bhaga
                    </label>
                    <input
                      type="text"
                      id="khandaBhaga"
                      name="khandaBhaga"
                      value={formData.khandaBhaga}
                      onChange={handleChange}
                      readOnly={!isEditing}
                      className={`block w-full px-4 py-3 border border-[#165BF8]/20 rounded-xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] transition-all duration-200 text-[#1C3991] ${
                        !isEditing ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                      }`}
                      placeholder="Enter Khanda/Bhaga"
                    />
                  </div>
                </div>
              )}

              {isEditing && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3 }}
                  className="mt-6"
                >
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{
                      scale: 1.02,
                      boxShadow: "0 10px 20px rgba(0, 0, 0, 0.15)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-lg font-semibold text-white bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 ${
                      loading ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                  >
                    {loading ? (
                      <>
                        <FiLoader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                        Saving Profile...
                      </>
                    ) : (
                      <>
                        <FiSave className="-ml-1 mr-3 h-5 w-5" />
                        Save Profile Changes
                      </>
                    )}
                  </motion.button>
                </motion.div>
              )}
            </form>
            
            {/* --- New Resume Section --- */}
            {currentUser.role === 'job_seeker' && (
                <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                className="mt-10 bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-8"
              >
                <h2 className="text-2xl font-extrabold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-cyan-700 mb-6">
                  Manage Resume
                </h2>
                <form onSubmit={handleResumeUpload} className="space-y-6">
                  <div>
                    <label htmlFor="resume-file" className="block text-sm font-semibold text-[#1C3991] mb-2">
                        <FiFileText className="inline-block mr-2 text-teal-600" /> Upload a new resume
                    </label>
                    <input
                      type="file"
                      id="resume-file"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-xl file:border-0
                        file:text-sm file:font-semibold
                        file:bg-teal-50 file:text-teal-700
                        hover:file:bg-teal-100"
                      disabled={isUploading}
                    />
                  </div>
                  {/* FIX: Only render the link if the resume.resumeId exists */}
                  {resume && resume.resumeId && (
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <span className="flex items-center text-gray-700 font-medium">
                              <FiCheckCircle className="text-green-500 mr-2 h-5 w-5" />
                              Your current resume:
                          </span>
                          <motion.button
                              onClick={handleDownloadResume}
                              disabled={isDownloading}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="text-sm font-medium text-blue-600 hover:underline flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              {isDownloading ? (
                                <>
                                  <FiLoader className="animate-spin mr-2" />
                                  Loading...
                                </>
                              ) : (
                                <>
                                  {resume.fileName} <FiDownload className="ml-2" />
                                </>
                              )}
                          </motion.button>
                      </div>
                  )}
                  <motion.button
                    type="submit"
                    disabled={isUploading || !resumeFile}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-lg font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all duration-200 ${
                      isUploading ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <FiLoader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                        Uploading Resume...
                      </>
                    ) : (
                      <>
                        <FiUploadCloud className="-ml-1 mr-3 h-5 w-5" />
                        Upload Resume
                      </>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            )}
            {/* --- End New Resume Section --- */}

            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="mt-10 bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-8"
            >
              <h2 className="text-2xl font-extrabold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-red-800 mb-6">
                Change Password
              </h2>
              <form onSubmit={handleChangePassword} className="space-y-6">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                    <FiLock className="inline-block mr-2 text-gray-500" /> Current Password
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={currentPassword}
                    onChange={handlePasswordChangeInput}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    placeholder="Enter your current password"
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                    <FiLock className="inline-block mr-2 text-gray-500" /> New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={newPassword}
                    onChange={handlePasswordChangeInput}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    placeholder="Enter new password (min 6 characters)"
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="confirmNewPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                    <FiLock className="inline-block mr-2 text-gray-500" /> Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmNewPassword"
                    name="confirmNewPassword"
                    value={confirmNewPassword}
                    onChange={handlePasswordChangeInput}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    placeholder="Confirm your new password"
                    required
                    disabled={loading}
                  />
                </div>
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0 10px 20px rgba(0, 0, 0, 0.15)",
                  }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-lg font-semibold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 ${
                    loading ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  {loading ? (
                    <>
                      <FiLoader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                      Changing Password...
                    </>
                  ) : (
                    <>
                      <FiSave className="-ml-1 mr-3 h-5 w-5" />
                      Change Password
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>

          </motion.div>
        </div>
      </div>
    </div>
  );
}
