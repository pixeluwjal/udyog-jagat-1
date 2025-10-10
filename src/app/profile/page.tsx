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
  FiFileText,
  FiUploadCloud,
  FiDownload,
  FiShield,
  FiAward,
  FiKey,
} from "react-icons/fi";

// Brand colors
const primaryBlue = "#165BF8";
const darkBlue = "#1C3991";

// Enhanced Animation Variants
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
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchResumeDetails = async () => {
    if (!token || !currentUser || currentUser.role !== 'job_seeker') return;

    try {
      const response = await fetch("/api/resumes", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
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

      setResume({ fileName: data.fileName, resumeId: data.resumeId });
      setResumeFile(null);
      setMessage("Resume uploaded successfully!");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during resume upload.");
    } finally {
      setIsUploading(false);
    }
  };

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
      window.URL.revokeObjectURL(url);
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
          className="flex flex-col items-center"
        >
          <motion.div
            animate={pulseEffect}
            className="rounded-full p-6 bg-gradient-to-br from-[#165BF8] to-[#1C3991] shadow-2xl"
          >
            <FiLoader className="text-white h-12 w-12 animate-spin" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-xl font-semibold text-[#1C3991]"
          >
            Loading Profile...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  const shouldDisplayAdditionalFields =
    currentUser.role === 'job_seeker' ||
    currentUser.role === 'admin' ||
    currentUser.role === 'job_referrer';

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <FiShield className="h-5 w-5" />;
      case 'job_poster': return <FiUser className="h-5 w-5" />;
      case 'job_seeker': return <FiAward className="h-5 w-5" />;
      default: return <FiUser className="h-5 w-5" />;
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] overflow-hidden font-inter">
      <Sidebar
        userRole={currentUser.role}
        onLogout={logout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        userEmail={currentUser.email}
      />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Enhanced Mobile Header */}
        <div className="md:hidden bg-white/95 backdrop-blur-md shadow-2xl p-4 flex items-center justify-between z-10 sticky top-0 border-b border-[#165BF8]/10">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSidebarOpen(true)}
            className="p-3 rounded-xl bg-[#165BF8]/10 text-[#165BF8] hover:bg-[#165BF8]/20 transition-all duration-200"
          >
            <FiMenu className="h-6 w-6" />
          </motion.button>
          
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-black bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent"
          >
            My Profile
          </motion.h1>
          
          <div className="w-12"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Page Header */}
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
                <FiUser className="h-10 w-10 text-white" />
              </motion.div>
              <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent mb-4">
                My Profile
              </h1>
              <p className="text-lg text-[#165BF8] font-medium max-w-2xl mx-auto">
                Manage your personal information, security settings, and professional details
              </p>
            </motion.div>

            {/* Profile Information Card */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={cardAnimation}
              className="bg-white rounded-3xl shadow-2xl border border-[#165BF8]/10 overflow-hidden"
            >
              <div className="p-8 border-b border-[#165BF8]/10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-[#165BF8] to-[#1C3991] text-white shadow-lg">
                      <FiUser className="h-7 w-7" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-[#1C3991]">Profile Information</h2>
                      <p className="text-[#165BF8] font-medium">Update your personal and professional details</p>
                    </div>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 8px 25px rgba(22, 91, 248, 0.2)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center px-5 py-3 bg-[#165BF8]/10 text-[#1C3991] rounded-2xl hover:bg-[#165BF8]/20 transition-all duration-300 font-bold shadow-lg border-2 border-[#165BF8]/20"
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
              </div>

              <div className="p-8">
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl shadow-sm text-red-700 font-medium flex items-center space-x-3 mb-6"
                    >
                      <FiXCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                      <span className="font-semibold">{error}</span>
                    </motion.div>
                  )}
                  {message && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="p-4 bg-green-50 border-l-4 border-green-500 rounded-xl shadow-sm text-green-700 font-medium flex items-center space-x-3 mb-6"
                    >
                      <FiCheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                      <span className="font-semibold">{message}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSaveProfile} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Username */}
                    <motion.div variants={cardAnimation}>
                      <label className="block text-sm font-bold text-[#1C3991] mb-3 uppercase tracking-wide">
                        <FiUser className="inline-block mr-2 text-[#165BF8]" /> Username
                      </label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        readOnly={!isEditing}
                        className={`block w-full px-4 py-3.5 text-lg border-2 rounded-2xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] text-[#1C3991] transition-all duration-300 ${
                          !isEditing 
                            ? "bg-gray-100 border-gray-200 cursor-not-allowed" 
                            : "bg-white border-[#165BF8]/20 hover:border-[#165BF8]/40"
                        }`}
                      />
                    </motion.div>

                    {/* Email */}
                    <motion.div variants={cardAnimation}>
                      <label className="block text-sm font-bold text-[#1C3991] mb-3 uppercase tracking-wide">
                        <FiMail className="inline-block mr-2 text-[#165BF8]" /> Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        readOnly={true}
                        className="block w-full px-4 py-3.5 text-lg border-2 border-gray-200 rounded-2xl shadow-sm bg-gray-100 cursor-not-allowed text-[#1C3991] transition-all duration-300"
                      />
                    </motion.div>

                    {/* Role */}
                    <motion.div variants={cardAnimation}>
                      <label className="block text-sm font-bold text-[#1C3991] mb-3 uppercase tracking-wide">
                        <FiTag className="inline-block mr-2 text-[#165BF8]" /> Role
                      </label>
                      <div className="flex items-center space-x-3 p-3.5 bg-[#165BF8]/5 border-2 border-[#165BF8]/10 rounded-2xl">
                        {getRoleIcon(currentUser.role)}
                        <span className="text-[#1C3991] font-bold capitalize">
                          {currentUser.role.replace('_', ' ')}
                        </span>
                      </div>
                    </motion.div>
                  </div>

                  {shouldDisplayAdditionalFields && (
                    <motion.div 
                      variants={cardAnimation}
                      className="pt-8 border-t border-[#165BF8]/10 mt-8 space-y-6"
                    >
                      <h3 className="text-xl font-black text-[#1C3991] flex items-center">
                        <FiAward className="mr-3 text-[#165BF8]" />
                        Additional Details
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <motion.div variants={cardAnimation}>
                          <label className="block text-sm font-bold text-[#1C3991] mb-3">
                            <FiBookOpen className="inline-block mr-2 text-[#165BF8]" /> Milan/Shaka
                          </label>
                          <input
                            type="text"
                            name="milanShaka"
                            value={formData.milanShaka}
                            onChange={handleChange}
                            readOnly={!isEditing}
                            className={`block w-full px-4 py-3.5 border-2 rounded-2xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] text-[#1C3991] transition-all duration-300 ${
                              !isEditing 
                                ? "bg-gray-100 border-gray-200 cursor-not-allowed" 
                                : "bg-white border-[#165BF8]/20 hover:border-[#165BF8]/40"
                            }`}
                            placeholder="Enter Milan/Shaka"
                          />
                        </motion.div>

                        <motion.div variants={cardAnimation}>
                          <label className="block text-sm font-bold text-[#1C3991] mb-3">
                            <FiMapPin className="inline-block mr-2 text-[#165BF8]" /> Valaya/Nagar
                          </label>
                          <input
                            type="text"
                            name="valayaNagar"
                            value={formData.valayaNagar}
                            onChange={handleChange}
                            readOnly={!isEditing}
                            className={`block w-full px-4 py-3.5 border-2 rounded-2xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] text-[#1C3991] transition-all duration-300 ${
                              !isEditing 
                                ? "bg-gray-100 border-gray-200 cursor-not-allowed" 
                                : "bg-white border-[#165BF8]/20 hover:border-[#165BF8]/40"
                            }`}
                            placeholder="Enter Valaya/Nagar"
                          />
                        </motion.div>

                        <motion.div variants={cardAnimation} className="md:col-span-2">
                          <label className="block text-sm font-bold text-[#1C3991] mb-3">
                            <FiGlobe className="inline-block mr-2 text-[#165BF8]" /> Khanda/Bhaga
                          </label>
                          <input
                            type="text"
                            name="khandaBhaga"
                            value={formData.khandaBhaga}
                            onChange={handleChange}
                            readOnly={!isEditing}
                            className={`block w-full px-4 py-3.5 border-2 rounded-2xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] text-[#1C3991] transition-all duration-300 ${
                              !isEditing 
                                ? "bg-gray-100 border-gray-200 cursor-not-allowed" 
                                : "bg-white border-[#165BF8]/20 hover:border-[#165BF8]/40"
                            }`}
                            placeholder="Enter Khanda/Bhaga"
                          />
                        </motion.div>
                      </div>
                    </motion.div>
                  )}

                  {isEditing && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      variants={cardAnimation}
                      className="mt-8"
                    >
                      <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: 1.02, boxShadow: "0 15px 30px rgba(22, 91, 248, 0.3)" }}
                        whileTap={{ scale: 0.98 }}
                        className={`
                          w-full flex justify-center items-center py-4 px-6 rounded-2xl shadow-xl text-lg font-black text-white
                          bg-gradient-to-r from-[#165BF8] to-[#1C3991]
                          hover:from-[#1a65ff] hover:to-[#2242a8]
                          focus:outline-none focus:ring-4 focus:ring-[#165BF8]/30
                          transition-all duration-300
                          ${loading ? "opacity-70 cursor-not-allowed" : ""}
                        `}
                      >
                        {loading ? (
                          <>
                            <FiLoader className="animate-spin mr-3 h-6 w-6" />
                            Saving Profile...
                          </>
                        ) : (
                          <>
                            <FiSave className="mr-3 h-6 w-6" />
                            Save Profile Changes
                          </>
                        )}
                      </motion.button>
                    </motion.div>
                  )}
                </form>
              </div>
            </motion.div>

            {/* Resume Management Section */}
            {currentUser.role === 'job_seeker' && (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-3xl shadow-2xl border border-[#165BF8]/10 overflow-hidden"
              >
                <div className="p-8 border-b border-[#165BF8]/10">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-[#165BF8] to-[#1C3991] text-white shadow-lg">
                      <FiFileText className="h-7 w-7" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-[#1C3991]">Resume Management</h2>
                      <p className="text-[#165BF8] font-medium">Upload and manage your professional resume</p>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  <form onSubmit={handleResumeUpload} className="space-y-6">
                    <motion.div variants={cardAnimation}>
                      <label className="block text-sm font-bold text-[#1C3991] mb-3">
                        <FiUploadCloud className="inline-block mr-2 text-[#165BF8]" /> Upload New Resume
                      </label>
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-[#1C3991] font-medium
                          file:mr-4 file:py-3 file:px-6
                          file:rounded-2xl file:border-0
                          file:text-sm file:font-bold
                          file:bg-[#165BF8]/10 file:text-[#165BF8]
                          hover:file:bg-[#165BF8]/20 transition-all duration-300"
                        disabled={isUploading}
                      />
                    </motion.div>

                    {resume && resume.resumeId && (
                      <motion.div
                        variants={cardAnimation}
                        className="flex items-center justify-between p-5 bg-[#165BF8]/5 rounded-2xl border-2 border-[#165BF8]/10"
                      >
                        <span className="flex items-center text-[#1C3991] font-bold">
                          <FiCheckCircle className="text-green-500 mr-3 h-5 w-5" />
                          Current Resume:
                        </span>
                        <motion.button
                          onClick={handleDownloadResume}
                          disabled={isDownloading}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="text-sm font-bold text-[#165BF8] hover:underline flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
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
                      </motion.div>
                    )}

                    <motion.button
                      type="submit"
                      disabled={isUploading || !resumeFile}
                      whileHover={{ scale: 1.02, boxShadow: "0 15px 30px rgba(22, 91, 248, 0.2)" }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        w-full flex justify-center items-center py-4 px-6 rounded-2xl shadow-xl text-lg font-black text-white
                        bg-gradient-to-r from-[#165BF8] to-[#1C3991]
                        hover:from-[#1a65ff] hover:to-[#2242a8]
                        focus:outline-none focus:ring-4 focus:ring-[#165BF8]/30
                        transition-all duration-300
                        ${isUploading ? "opacity-70 cursor-not-allowed" : ""}
                      `}
                    >
                      {isUploading ? (
                        <>
                          <FiLoader className="animate-spin mr-3 h-6 w-6" />
                          Uploading Resume...
                        </>
                      ) : (
                        <>
                          <FiUploadCloud className="mr-3 h-6 w-6" />
                          Upload Resume
                        </>
                      )}
                    </motion.button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* Password Change Section */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-3xl shadow-2xl border border-[#165BF8]/10 overflow-hidden"
            >
              <div className="p-8 border-b border-[#165BF8]/10">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-[#165BF8] to-[#1C3991] text-white shadow-lg">
                    <FiKey className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-[#1C3991]">Security Settings</h2>
                    <p className="text-[#165BF8] font-medium">Update your password and security preferences</p>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <form onSubmit={handleChangePassword} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.div variants={cardAnimation}>
                      <label className="block text-sm font-bold text-[#1C3991] mb-3">
                        <FiLock className="inline-block mr-2 text-[#165BF8]" /> Current Password
                      </label>
                      <input
                        type="password"
                        name="currentPassword"
                        value={currentPassword}
                        onChange={handlePasswordChangeInput}
                        className="block w-full px-4 py-3.5 border-2 border-[#165BF8]/20 rounded-2xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] text-[#1C3991] transition-all duration-300 hover:border-[#165BF8]/40"
                        placeholder="Enter current password"
                        required
                        disabled={loading}
                      />
                    </motion.div>

                    <motion.div variants={cardAnimation}>
                      <label className="block text-sm font-bold text-[#1C3991] mb-3">
                        <FiLock className="inline-block mr-2 text-[#165BF8]" /> New Password
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        value={newPassword}
                        onChange={handlePasswordChangeInput}
                        className="block w-full px-4 py-3.5 border-2 border-[#165BF8]/20 rounded-2xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] text-[#1C3991] transition-all duration-300 hover:border-[#165BF8]/40"
                        placeholder="Enter new password"
                        required
                        disabled={loading}
                      />
                    </motion.div>

                    <motion.div variants={cardAnimation}>
                      <label className="block text-sm font-bold text-[#1C3991] mb-3">
                        <FiLock className="inline-block mr-2 text-[#165BF8]" /> Confirm Password
                      </label>
                      <input
                        type="password"
                        name="confirmNewPassword"
                        value={confirmNewPassword}
                        onChange={handlePasswordChangeInput}
                        className="block w-full px-4 py-3.5 border-2 border-[#165BF8]/20 rounded-2xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] text-[#1C3991] transition-all duration-300 hover:border-[#165BF8]/40"
                        placeholder="Confirm new password"
                        required
                        disabled={loading}
                      />
                    </motion.div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02, boxShadow: "0 15px 30px rgba(22, 91, 248, 0.3)" }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      w-full flex justify-center items-center py-4 px-6 rounded-2xl shadow-xl text-lg font-black text-white
                      bg-gradient-to-r from-[#165BF8] to-[#1C3991]
                      hover:from-[#1a65ff] hover:to-[#2242a8]
                      focus:outline-none focus:ring-4 focus:ring-[#165BF8]/30
                      transition-all duration-300
                      ${loading ? "opacity-70 cursor-not-allowed" : ""}
                    `}
                  >
                    {loading ? (
                      <>
                        <FiLoader className="animate-spin mr-3 h-6 w-6" />
                        Changing Password...
                      </>
                    ) : (
                      <>
                        <FiKey className="mr-3 h-6 w-6" />
                        Change Password
                      </>
                    )}
                  </motion.button>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}