// app/profile/page.tsx
'use client';

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Sidebar from "@/app/components/Sidebar";
import OrganizationHierarchy from "../components/create-user/OrganizationHierarchy";
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
  FiUsers,
  FiRefreshCw,
  FiBriefcase,
  FiHome,
  FiPhone,
  FiMap,
} from "react-icons/fi";

// Brand colors
const primaryBlue = "#165BF8";
const darkBlue = "#1C3991";

interface Organization {
  _id: string;
  name: string;
  type: 'milan' | 'valaya' | 'khanda' | 'vibhaaga';
  parentId?: string;
}

interface UserData {
  role: "job_poster" | "job_seeker" | "admin" | "job_referrer" | "super_admin";
  email: string;
  username: string;
  milan?: string;
  valaya?: string;
  khanda?: string;
  vibhaaga?: string;
  // Referrer specific fields
  referrerDetails?: {
    fullName: string;
    mobileNumber: string;
    personalEmail: string;
    residentialAddress: string;
  };
  workDetails?: {
    companyName: string;
    workLocation: string;
    designation: string;
  };
}

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
    milan: "",
    valaya: "",
    khanda: "",
    vibhaaga: "",
    // Referrer specific fields
    fullName: "",
    mobileNumber: "",
    personalEmail: "",
    residentialAddress: "",
    companyName: "",
    workLocation: "",
    designation: "",
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [resume, setResume] = useState<{ fileName: string; resumeId: string } | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  // Fetch user data with proper role detection
  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      console.log('🟡 Fetching user data with role detection...');

      // First check if user is super admin
      const superAdminResponse = await fetch('/api/auth/check-super-admin', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (superAdminResponse.ok) {
        const superAdminData = await superAdminResponse.json();
        console.log('🔍 Super admin check result:', superAdminData);
        
        if (superAdminData.isSuperAdmin) {
          const userData: UserData = {
            role: 'super_admin',
            email: superAdminData.user.email,
            username: superAdminData.user.username,
            milan: superAdminData.user.milan,
            valaya: superAdminData.user.valaya,
            khanda: superAdminData.user.khanda,
            vibhaaga: superAdminData.user.vibhaaga,
            referrerDetails: superAdminData.user.referrerDetails,
            workDetails: superAdminData.user.workDetails
          };
          setUserData(userData);
          setFormData({
            username: userData.username,
            email: userData.email,
            milan: userData.milan || "",
            valaya: userData.valaya || "",
            khanda: userData.khanda || "",
            vibhaaga: userData.vibhaaga || "",
            fullName: userData.referrerDetails?.fullName || "",
            mobileNumber: userData.referrerDetails?.mobileNumber || "",
            personalEmail: userData.referrerDetails?.personalEmail || "",
            residentialAddress: userData.referrerDetails?.residentialAddress || "",
            companyName: userData.workDetails?.companyName || "",
            workLocation: userData.workDetails?.workLocation || "",
            designation: userData.workDetails?.designation || "",
          });
          console.log('✅ Set as Super Admin:', userData);
          return;
        }
      }

      // If not super admin, get regular user data
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Regular user data:', data);
        const userData: UserData = {
          role: data.user.role,
          email: data.user.email,
          username: data.user.username,
          milan: data.user.milan,
          valaya: data.user.valaya,
          khanda: data.user.khanda,
          vibhaaga: data.user.vibhaaga,
          referrerDetails: data.user.referrerDetails,
          workDetails: data.user.workDetails
        };
        setUserData(userData);
        setFormData({
          username: userData.username,
          email: userData.email,
          milan: userData.milan || "",
          valaya: userData.valaya || "",
          khanda: userData.khanda || "",
          vibhaaga: userData.vibhaaga || "",
          fullName: userData.referrerDetails?.fullName || "",
          mobileNumber: userData.referrerDetails?.mobileNumber || "",
          personalEmail: userData.referrerDetails?.personalEmail || "",
          residentialAddress: userData.referrerDetails?.residentialAddress || "",
          companyName: userData.workDetails?.companyName || "",
          workLocation: userData.workDetails?.workLocation || "",
          designation: userData.workDetails?.designation || "",
        });
        console.log('✅ Set as Regular User:', userData);
      } else {
        console.error('❌ Failed to fetch user data');
        router.push('/login');
      }
    } catch (error) {
      console.error('❌ Error fetching user data:', error);
      router.push('/login');
    }
  };

  // Fetch organizations from API
  const fetchOrganizations = async () => {
    try {
      setLoadingOrgs(true);
      console.log('🟡 Fetching organizations from /api/admin/organizations');
      
      const response = await fetch('/api/admin/organizations');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🟢 Organizations API response:', data);
      
      if (data.success && data.organizations) {
        console.log('✅ Organizations data:', data.organizations);
        setOrganizations(data.organizations);
      } else {
        throw new Error(data.error || 'Failed to fetch organizations');
      }
    } catch (err: any) {
      console.error('❌ Error fetching organizations:', err);
      setError('Failed to load organization data: ' + err.message);
    } finally {
      setLoadingOrgs(false);
    }
  };

  // Get organization name by ID
  const getOrganizationName = (id: string, type: string): string => {
    if (!id || !organizations.length) return "Not set";
    const org = organizations.find(o => o._id === id && o.type === type);
    return org?.name || "Not found";
  };

  const fetchResumeDetails = async () => {
    if (!token || !userData || userData.role !== 'job_seeker') return;

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
        fetchUserData();
        fetchOrganizations();
      }
    }
  }, [authLoading, isAuthenticated, currentUser, router]);

  useEffect(() => {
    if (userData && userData.role === 'job_seeker') {
      fetchResumeDetails();
    }
  }, [userData, token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    console.log(`🟡 Form data updated - ${name}: ${value}`);
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

  // Organization hierarchy handlers
  const handleVibhaagaChange = (vibhaagaId: string) => {
    console.log('🟡 Vibhaaga changed to:', vibhaagaId);
    setFormData(prev => ({
      ...prev,
      vibhaaga: vibhaagaId,
      khanda: "",
      valaya: "",
      milan: ""
    }));
  };

  const handleKhandaChange = (khandaId: string) => {
    console.log('🟡 Khanda changed to:', khandaId);
    setFormData(prev => ({
      ...prev,
      khanda: khandaId,
      valaya: "",
      milan: ""
    }));
  };

  const handleValayaChange = (valayaId: string) => {
    console.log('🟡 Valaya changed to:', valayaId);
    setFormData(prev => ({
      ...prev,
      valaya: valayaId,
      milan: ""
    }));
  };

  const handleMilanChange = (milanId: string) => {
    console.log('🟡 Milan changed to:', milanId);
    setFormData(prev => ({
      ...prev,
      milan: milanId
    }));
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
      // Prepare the payload with ALL fields
      const payload: any = {
        username: formData.username,
      };

      // Always include organization fields if they exist in the form
      if (formData.milan) payload.milan = formData.milan;
      if (formData.valaya) payload.valaya = formData.valaya;
      if (formData.khanda) payload.khanda = formData.khanda;
      if (formData.vibhaaga) payload.vibhaaga = formData.vibhaaga;

      // Include referrer details if user is a referrer
      if (userData?.role === 'job_referrer') {
        payload.referrerDetails = {
          fullName: formData.fullName,
          mobileNumber: formData.mobileNumber,
          personalEmail: formData.personalEmail,
          residentialAddress: formData.residentialAddress,
        };
        payload.workDetails = {
          companyName: formData.companyName,
          workLocation: formData.workLocation,
          designation: formData.designation,
        };
      }

      console.log('🟡 Sending profile update payload:', payload);

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('🟢 Profile update response:', data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      // Update both local state and auth context
      if (userData) {
        const updatedUserData = {
          ...userData,
          username: formData.username,
          milan: formData.milan,
          valaya: formData.valaya,
          khanda: formData.khanda,
          vibhaaga: formData.vibhaaga,
          referrerDetails: userData.role === 'job_referrer' ? {
            fullName: formData.fullName,
            mobileNumber: formData.mobileNumber,
            personalEmail: formData.personalEmail,
            residentialAddress: formData.residentialAddress,
          } : userData.referrerDetails,
          workDetails: userData.role === 'job_referrer' ? {
            companyName: formData.companyName,
            workLocation: formData.workLocation,
            designation: formData.designation,
          } : userData.workDetails,
        };
        setUserData(updatedUserData);
        
        // Also update auth context if needed
        if (updateUser) {
          updateUser({
            ...currentUser,
            username: formData.username,
            milan: formData.milan,
            valaya: formData.valaya,
            khanda: formData.khanda,
            vibhaaga: formData.vibhaaga,
            referrerDetails: userData.role === 'job_referrer' ? {
              fullName: formData.fullName,
              mobileNumber: formData.mobileNumber,
              personalEmail: formData.personalEmail,
              residentialAddress: formData.residentialAddress,
            } : currentUser.referrerDetails,
            workDetails: userData.role === 'job_referrer' ? {
              companyName: formData.companyName,
              workLocation: formData.workLocation,
              designation: formData.designation,
            } : currentUser.workDetails,
          });
        }
      }

      setMessage("Profile updated successfully!");
      setIsEditing(false);
      
      // Refresh user data to ensure consistency
      setTimeout(() => {
        fetchUserData();
      }, 1000);
      
    } catch (err: any) {
      console.error('❌ Profile update error:', err);
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

  const handleRetryOrganizations = () => {
    fetchOrganizations();
  };

  // Debug function to check current state
  const debugCurrentState = () => {
    const shouldDisplayAdditionalFields = userData ? 
      userData.role === 'job_seeker' ||
      userData.role === 'admin' ||
      userData.role === 'super_admin' ||
      userData.role === 'job_referrer' : false;

    console.log('🔍 Current State Debug:', {
      userData,
      formData,
      organizations: organizations.length,
      isEditing,
      shouldDisplayAdditionalFields
    });
  };

  // Add debug button (remove in production)
  useEffect(() => {
    if (userData) {
      debugCurrentState();
    }
  }, [userData, formData, organizations, isEditing]);

  if (authLoading || !isAuthenticated || !currentUser || !userData) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] justify-center items-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center"
        >
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [1, 0.8, 1],
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
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
    userData.role === 'job_seeker' ||
    userData.role === 'admin' ||
    userData.role === 'super_admin' ||
    userData.role === 'job_referrer';

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <FiShield className="h-5 w-5" />;
      case 'super_admin': return <FiShield className="h-5 w-5 text-yellow-500" />;
      case 'job_poster': return <FiUser className="h-5 w-5" />;
      case 'job_seeker': return <FiAward className="h-5 w-5" />;
      case 'job_referrer': return <FiUsers className="h-5 w-5" />;
      default: return <FiUser className="h-5 w-5" />;
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Administrator';
      case 'job_poster': return 'Job Poster';
      case 'job_seeker': return 'Job Seeker';
      case 'job_referrer': return 'Job Referrer';
      case 'admin': return 'Administrator';
      default: return role.replace('_', ' ');
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] overflow-hidden font-inter">
      <Sidebar
        userRole={userData.role}
        onLogout={logout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        userEmail={userData.email}
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
          
          {/* Debug button - remove in production */}
          <button 
            onClick={debugCurrentState}
            className="p-2 text-xs bg-gray-200 rounded"
            title="Debug State"
          >
            🐛
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Page Header */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
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
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
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
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Username */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
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
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                    >
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
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <label className="block text-sm font-bold text-[#1C3991] mb-3 uppercase tracking-wide">
                        <FiTag className="inline-block mr-2 text-[#165BF8]" /> Role
                      </label>
                      <div className={`flex items-center space-x-3 p-3.5 border-2 rounded-2xl ${
                        userData.role === 'super_admin' 
                          ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                          : 'bg-[#165BF8]/5 border-[#165BF8]/10 text-[#1C3991]'
                      }`}>
                        {getRoleIcon(userData.role)}
                        <span className="font-bold capitalize">
                          {getRoleDisplayName(userData.role)}
                        </span>
                        {userData.role === 'super_admin' && (
                          <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">
                            SUPER ADMIN
                          </span>
                        )}
                      </div>
                    </motion.div>
                  </div>

                  {/* Referrer Personal Details */}
                  {userData.role === 'job_referrer' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="pt-8 border-t border-[#165BF8]/10"
                    >
                      <h3 className="text-xl font-black text-[#1C3991] mb-6 flex items-center">
                        <FiUser className="mr-3 text-[#165BF8]" />
                        Personal Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-bold text-[#1C3991] mb-3">
                            <FiUser className="inline-block mr-2 text-[#165BF8]" /> Full Name
                          </label>
                          <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            readOnly={!isEditing}
                            className={`block w-full px-4 py-3.5 border-2 rounded-2xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] text-[#1C3991] transition-all duration-300 ${
                              !isEditing 
                                ? "bg-gray-100 border-gray-200 cursor-not-allowed" 
                                : "bg-white border-[#165BF8]/20 hover:border-[#165BF8]/40"
                            }`}
                            placeholder="Enter your full name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-[#1C3991] mb-3">
                            <FiPhone className="inline-block mr-2 text-[#165BF8]" /> Mobile Number
                          </label>
                          <input
                            type="tel"
                            name="mobileNumber"
                            value={formData.mobileNumber}
                            onChange={handleChange}
                            readOnly={!isEditing}
                            className={`block w-full px-4 py-3.5 border-2 rounded-2xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] text-[#1C3991] transition-all duration-300 ${
                              !isEditing 
                                ? "bg-gray-100 border-gray-200 cursor-not-allowed" 
                                : "bg-white border-[#165BF8]/20 hover:border-[#165BF8]/40"
                            }`}
                            placeholder="Enter your mobile number"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-[#1C3991] mb-3">
                            <FiMail className="inline-block mr-2 text-[#165BF8]" /> Personal Email
                          </label>
                          <input
                            type="email"
                            name="personalEmail"
                            value={formData.personalEmail}
                            onChange={handleChange}
                            readOnly={!isEditing}
                            className={`block w-full px-4 py-3.5 border-2 rounded-2xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] text-[#1C3991] transition-all duration-300 ${
                              !isEditing 
                                ? "bg-gray-100 border-gray-200 cursor-not-allowed" 
                                : "bg-white border-[#165BF8]/20 hover:border-[#165BF8]/40"
                            }`}
                            placeholder="Enter your personal email"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-[#1C3991] mb-3">
                            <FiHome className="inline-block mr-2 text-[#165BF8]" /> Residential Address
                          </label>
                          <textarea
                            name="residentialAddress"
                            value={formData.residentialAddress}
                            onChange={handleChange}
                            readOnly={!isEditing}
                            rows={3}
                            className={`block w-full px-4 py-3.5 border-2 rounded-2xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] text-[#1C3991] transition-all duration-300 resize-none ${
                              !isEditing 
                                ? "bg-gray-100 border-gray-200 cursor-not-allowed" 
                                : "bg-white border-[#165BF8]/20 hover:border-[#165BF8]/40"
                            }`}
                            placeholder="Enter your residential address"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Referrer Work Details */}
                  {userData.role === 'job_referrer' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="pt-8 border-t border-[#165BF8]/10"
                    >
                      <h3 className="text-xl font-black text-[#1C3991] mb-6 flex items-center">
                        <FiBriefcase className="mr-3 text-[#165BF8]" />
                        Work Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-bold text-[#1C3991] mb-3">
                            <FiBriefcase className="inline-block mr-2 text-[#165BF8]" /> Company Name
                          </label>
                          <input
                            type="text"
                            name="companyName"
                            value={formData.companyName}
                            onChange={handleChange}
                            readOnly={!isEditing}
                            className={`block w-full px-4 py-3.5 border-2 rounded-2xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] text-[#1C3991] transition-all duration-300 ${
                              !isEditing 
                                ? "bg-gray-100 border-gray-200 cursor-not-allowed" 
                                : "bg-white border-[#165BF8]/20 hover:border-[#165BF8]/40"
                            }`}
                            placeholder="Enter company name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-[#1C3991] mb-3">
                            <FiMapPin className="inline-block mr-2 text-[#165BF8]" /> Work Location
                          </label>
                          <input
                            type="text"
                            name="workLocation"
                            value={formData.workLocation}
                            onChange={handleChange}
                            readOnly={!isEditing}
                            className={`block w-full px-4 py-3.5 border-2 rounded-2xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] text-[#1C3991] transition-all duration-300 ${
                              !isEditing 
                                ? "bg-gray-100 border-gray-200 cursor-not-allowed" 
                                : "bg-white border-[#165BF8]/20 hover:border-[#165BF8]/40"
                            }`}
                            placeholder="Enter work location"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-[#1C3991] mb-3">
                            <FiUser className="inline-block mr-2 text-[#165BF8]" /> Designation
                          </label>
                          <input
                            type="text"
                            name="designation"
                            value={formData.designation}
                            onChange={handleChange}
                            readOnly={!isEditing}
                            className={`block w-full px-4 py-3.5 border-2 rounded-2xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] text-[#1C3991] transition-all duration-300 ${
                              !isEditing 
                                ? "bg-gray-100 border-gray-200 cursor-not-allowed" 
                                : "bg-white border-[#165BF8]/20 hover:border-[#165BF8]/40"
                            }`}
                            placeholder="Enter your designation"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Organization Hierarchy Component */}
                  {shouldDisplayAdditionalFields && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                      className="pt-8 border-t border-[#165BF8]/10 mt-8"
                    >
                      <OrganizationHierarchy
                        organizations={organizations}
                        loadingHierarchy={loadingOrgs}
                        hierarchyError={error}
                        vibhaaga={formData.vibhaaga}
                        khanda={formData.khanda}
                        valaya={formData.valaya}
                        milan={formData.milan}
                        onVibhaagaChange={handleVibhaagaChange}
                        onKhandaChange={handleKhandaChange}
                        onValayaChange={handleValayaChange}
                        onMilanChange={handleMilanChange}
                        onRetry={handleRetryOrganizations}
                        isLoading={loading || !isEditing}
                        isRequired={true}
                      />
                    </motion.div>
                  )}

                  {isEditing && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ delay: 0.6 }}
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
            {userData.role === 'job_seeker' && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
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
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                    >
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
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
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
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
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
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                    >
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

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
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

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 }}
                    >
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