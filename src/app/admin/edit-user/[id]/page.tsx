'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUser, FiMail, FiTag, FiSave, FiArrowLeft, FiHardDrive, 
  FiMenu, FiActivity, FiXCircle, FiBookOpen, FiMapPin, FiGlobe, FiLoader 
} from 'react-icons/fi';
import Sidebar from '@/app/components/Sidebar';

// Brand colors
const primaryBlue = "#165BF8";
const darkBlue = "#1C3991";

interface UserDisplay {
  _id: string;
  username: string;
  email: string;
  role: 'job_seeker' | 'job_poster' | 'admin' | 'job_referrer';
  status: 'active' | 'inactive';
  milanShakaBhaga?: string;
  valayaNagar?: string;
  khandaBhaga?: string;
  resumeGridFsId?: string;
  candidateDetails?: {
    fullName?: string;
    phone?: string;
    skills?: string[];
    experience?: string;
  };
  jobPosterDetails?: {
    companyName?: string;
  };
  jobReferrerDetails?: {};
}

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    }
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

const buttonHover = {
  scale: 1.02, 
  boxShadow: `0 8px 16px ${primaryBlue}20`
};

export default function EditUserPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { user: currentUser, loading: authLoading, isAuthenticated, token } = useAuth();

  const [userData, setUserData] = useState<UserDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const fetchUserData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!isAuthenticated || !token || !currentUser || currentUser.role !== 'admin') {
      setError('Authentication or authorization missing for fetching user data.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch user data.');
      }

      const fetchedUser: UserDisplay = {
        _id: data.user._id,
        username: data.user.username,
        email: data.user.email,
        role: data.user.role,
        status: (data.user.status === 'active' || data.user.status === 'inactive') ? data.user.status : 'active',
        milanShakaBhaga: data.user.milanShakaBhaga || '',
        valayaNagar: data.user.valayaNagar || '',
        khandaBhaga: data.user.khandaBhaga || '',
        
        resumeGridFsId: data.user.resumeGridFsId,
        candidateDetails: data.user.candidateDetails,
        jobPosterDetails: data.user.jobPosterDetails,
        jobReferrerDetails: data.user.jobReferrerDetails,
      };

      setUserData(fetchedUser);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id, isAuthenticated, token, currentUser]);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !currentUser || currentUser.role !== 'admin') {
        router.push('/login');
      } else {
        fetchUserData();
      }
    }
  }, [authLoading, isAuthenticated, currentUser, router, fetchUserData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (!userData) return;

    if (name.startsWith("candidateDetails.")) {
      const field = name.split('.')[1];
      setUserData(prev => ({
        ...prev!,
        candidateDetails: {
          ...(prev!.candidateDetails || {}),
          [field]: field === 'skills' ? value.split(',').map(s => s.trim()) : value
        }
      }));
    } else if (name.startsWith("jobPosterDetails.")) {
      const field = name.split('.')[1];
      setUserData(prev => ({
        ...prev!,
        jobPosterDetails: {
          ...(prev!.jobPosterDetails || {}),
          [field]: value
        }
      }));
    } else {
      setUserData({ ...userData, [name]: value as any });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    if (!userData || !token) {
      setError('User data or authentication token missing.');
      setIsSaving(false);
      return;
    }

    if (userData.role === 'admin' || userData.role === 'job_referrer') {
      if (!userData.milanShakaBhaga?.trim() || !userData.valayaNagar?.trim() || !userData.khandaBhaga?.trim()) {
        setError('Milan/Shaka, Valaya/Nagar, and Khanda/Bhaga are required for Admin and Referrer roles.');
        setIsSaving(false);
        return;
      }
    }

    const dataToSend = {
      username: userData.username,
      role: userData.role,
      status: userData.status,
      ...(userData.role !== 'job_poster' && {
        milanShakaBhaga: userData.milanShakaBhaga,
        valayaNagar: userData.valayaNagar,
        khandaBhaga: userData.khandaBhaga,
      }),
      candidateDetails: userData.candidateDetails,
      jobPosterDetails: userData.jobPosterDetails,
    };

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSend)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user.');
      }

      setMessage('User updated successfully!');
      fetchUserData();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during update.');
    } finally {
      setIsSaving(false);
    }
  };

  const isRequiredForAdminOrReferrer = userData && (userData.role === 'admin' || userData.role === 'job_referrer');
  const areAdditionalFieldsVisible = userData && (userData.role === 'admin' || userData.role === 'job_referrer' || userData.role === 'job_seeker');

  if (authLoading || loading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] justify-center items-center font-inter">
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
            Loading user data...
          </p>
        </motion.div>
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] justify-center items-center font-inter">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-red-100">
          <FiXCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-700 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.back()}
            className="mt-6 px-6 py-2 bg-[#165BF8] text-white rounded-lg shadow-md hover:bg-[#1a65ff] transition-colors flex items-center mx-auto"
          >
            <FiArrowLeft className="mr-2" /> Go Back
          </motion.button>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] justify-center items-center font-inter">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-[#1C3991] mb-2">User Not Found</h2>
          <p className="text-gray-600">The user you are trying to edit does not exist.</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/admin/dashboard')}
            className="mt-6 px-6 py-2 bg-[#165BF8] text-white rounded-lg shadow-md hover:bg-[#1a65ff] transition-colors flex items-center mx-auto"
          >
            <FiArrowLeft className="mr-2" /> Back to Dashboard
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] overflow-hidden font-inter">
      <Sidebar userRole={currentUser?.role || 'job_seeker'} onLogout={() => { /* handled by context */ }} isOpen={mobileSidebarOpen} setIsOpen={setMobileSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile header */}
        <div className="md:hidden bg-white/95 backdrop-blur-md shadow-lg p-4 flex justify-between items-center z-10 sticky top-0">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-md hover:bg-gray-100"
          >
            <FiMenu className="w-7 h-7" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#165BF8] to-[#1C3991]">
              Edit User
            </h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="bg-white rounded-2xl shadow-xl border border-[#165BF8]/10 p-6 md:p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <motion.h1
                  className="text-3xl md:text-4xl font-extrabold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-[#165BF8] to-[#1C3991]"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  Edit User: {userData.username || userData.email}
                </motion.h1>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push('/admin/dashboard')}
                  className="flex items-center px-4 py-2 bg-[#165BF8]/10 text-[#1C3991] rounded-lg hover:bg-[#165BF8]/20 transition-colors text-sm font-medium"
                >
                  <FiArrowLeft className="mr-2" /> Back to Users
                </motion.button>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-red-100/70 text-red-800 border-l-4 border-red-500 rounded-r-lg mb-6 text-sm font-medium"
                    role="alert"
                  >
                    {error}
                  </motion.div>
                )}
                {message && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-green-100/70 text-green-800 border-l-4 border-green-500 rounded-r-lg mb-6 text-sm font-medium"
                    role="alert"
                  >
                    {message}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Username */}
                <motion.div variants={fadeIn}>
                  <label htmlFor="username" className="block text-sm font-semibold text-[#1C3991] mb-2">Username</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiUser className="h-5 w-5 text-[#165BF8]/70" />
                    </div>
                    <input
                      type="text"
                      name="username"
                      id="username"
                      value={userData.username}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-3 border border-[#165BF8]/20 rounded-xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] text-[#1C3991] transition-all duration-200"
                      placeholder="User's name"
                      required
                    />
                  </div>
                </motion.div>

                {/* Email (Locked) */}
                <motion.div variants={fadeIn}>
                  <label htmlFor="email" className="block text-sm font-semibold text-[#1C3991] mb-2">Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiMail className="h-5 w-5 text-[#165BF8]/70" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={userData.email}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl shadow-sm bg-gray-100 cursor-not-allowed text-[#1C3991] transition-all duration-200"
                      readOnly
                      disabled
                    />
                  </div>
                </motion.div>

                {/* Role */}
                <motion.div variants={fadeIn}>
                  <label htmlFor="role" className="block text-sm font-semibold text-[#1C3991] mb-2">Role</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiTag className="h-5 w-5 text-[#165BF8]/70" />
                    </div>
                    <select
                      name="role"
                      id="role"
                      value={userData.role}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-3 border border-[#165BF8]/20 rounded-xl shadow-sm bg-white text-[#1C3991] focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] transition-all duration-200 appearance-none"
                      required
                    >
                      <option value="job_seeker">Job Seeker</option>
                      <option value="job_poster">Job Poster</option>
                      <option value="job_referrer">Job Referrer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </motion.div>

                {/* Status */}
                <motion.div variants={fadeIn}>
                  <label htmlFor="status" className="block text-sm font-semibold text-[#1C3991] mb-2">Status</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiActivity className="h-5 w-5 text-[#165BF8]/70" />
                    </div>
                    <select
                      name="status"
                      id="status"
                      value={userData.status}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-3 border border-[#165BF8]/20 rounded-xl shadow-sm bg-white text-[#1C3991] focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] transition-all duration-200 appearance-none"
                      required
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </motion.div>

                {/* Conditional Additional Details fields */}
                {areAdditionalFieldsVisible && (
                  <motion.div variants={fadeIn} className="space-y-6 pt-4 border-t border-[#165BF8]/10 mt-6">
                    <h3 className="text-xl font-semibold text-[#1C3991]">
                      Additional Details {isRequiredForAdminOrReferrer ? '(Mandatory for Admin/Referrer)' : '(Optional for Job Seeker)'}
                    </h3>
                    
                    <motion.div variants={fadeIn}>
                      <label htmlFor="milanShakaBhaga" className="block text-sm font-semibold text-[#1C3991] mb-2">
                        Milan/Shaka
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiBookOpen className="h-5 w-5 text-[#165BF8]/70" />
                        </div>
                        <input
                          type="text"
                          name="milanShakaBhaga"
                          id="milanShakaBhaga"
                          value={userData.milanShakaBhaga || ''}
                          onChange={handleChange}
                          className="block w-full pl-10 pr-3 py-3 border border-[#165BF8]/20 rounded-xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] text-[#1C3991] transition-all duration-200"
                          placeholder="Enter Milan/Shaka"
                          required={isRequiredForAdminOrReferrer}
                        />
                      </div>
                    </motion.div>

                    <motion.div variants={fadeIn}>
                      <label htmlFor="valayaNagar" className="block text-sm font-semibold text-[#1C3991] mb-2">
                        Valaya/Nagar
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiMapPin className="h-5 w-5 text-[#165BF8]/70" />
                        </div>
                        <input
                          type="text"
                          name="valayaNagar"
                          id="valayaNagar"
                          value={userData.valayaNagar || ''}
                          onChange={handleChange}
                          className="block w-full pl-10 pr-3 py-3 border border-[#165BF8]/20 rounded-xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] text-[#1C3991] transition-all duration-200"
                          placeholder="Enter Valaya/Nagar"
                          required={isRequiredForAdminOrReferrer}
                        />
                      </div>
                    </motion.div>

                    <motion.div variants={fadeIn}>
                      <label htmlFor="khandaBhaga" className="block text-sm font-semibold text-[#1C3991] mb-2">
                        Khanda/Bhaga
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiGlobe className="h-5 w-5 text-[#165BF8]/70" />
                        </div>
                        <input
                          type="text"
                          name="khandaBhaga"
                          id="khandaBhaga"
                          value={userData.khandaBhaga || ''}
                          onChange={handleChange}
                          className="block w-full pl-10 pr-3 py-3 border border-[#165BF8]/20 rounded-xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] text-[#1C3991] transition-all duration-200"
                          placeholder="Enter Khanda/Bhaga"
                          required={isRequiredForAdminOrReferrer}
                        />
                      </div>
                    </motion.div>
                  </motion.div>
                )}

                {/* Job Seeker details (only visible when role is 'job_seeker') */}
                {userData.role === 'job_seeker' && (
                    <motion.div variants={fadeIn} className="space-y-6 pt-4 border-t border-[#165BF8]/10 mt-6">
                        <h3 className="text-xl font-semibold text-[#1C3991]">Candidate Details</h3>
                        <motion.div variants={fadeIn}>
                          <label htmlFor="candidateDetails.fullName" className="block text-sm font-semibold text-[#1C3991] mb-2">Full Name</label>
                          <div className="relative">
                            <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#165BF8]/70" />
                            <input
                              type="text"
                              name="candidateDetails.fullName"
                              id="candidateDetails.fullName"
                              value={userData.candidateDetails?.fullName || ''}
                              onChange={handleChange}
                              className="block w-full pl-10 pr-3 py-3 border border-[#165BF8]/20 rounded-xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] text-[#1C3991] transition-all duration-200"
                              placeholder="Full Name"
                            />
                          </div>
                        </motion.div>
                        <motion.div variants={fadeIn}>
                          <label htmlFor="candidateDetails.phone" className="block text-sm font-semibold text-[#1C3991] mb-2">Phone</label>
                          <div className="relative">
                            <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#165BF8]/70" />
                            <input
                              type="text"
                              name="candidateDetails.phone"
                              id="candidateDetails.phone"
                              value={userData.candidateDetails?.phone || ''}
                              onChange={handleChange}
                              className="block w-full pl-10 pr-3 py-3 border border-[#165BF8]/20 rounded-xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] text-[#1C3991] transition-all duration-200"
                              placeholder="Phone Number"
                            />
                          </div>
                        </motion.div>
                        <motion.div variants={fadeIn}>
                          <label htmlFor="candidateDetails.skills" className="block text-sm font-semibold text-[#1C3991] mb-2">Skills</label>
                          <div className="relative">
                            <FiTag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#165BF8]/70" />
                            <input
                              type="text"
                              name="candidateDetails.skills"
                              id="candidateDetails.skills"
                              value={userData.candidateDetails?.skills?.join(', ') || ''}
                              onChange={handleChange}
                              className="block w-full pl-10 pr-3 py-3 border border-[#165BF8]/20 rounded-xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] text-[#1C3991] transition-all duration-200"
                              placeholder="e.g., React, Node.js, AWS"
                            />
                          </div>
                        </motion.div>
                        <motion.div variants={fadeIn}>
                          <label htmlFor="candidateDetails.experience" className="block text-sm font-semibold text-[#1C3991] mb-2">Experience</label>
                          <textarea
                            name="candidateDetails.experience"
                            id="candidateDetails.experience"
                            value={userData.candidateDetails?.experience || ''}
                            onChange={handleChange}
                            rows={3}
                            className="block w-full p-3 border border-[#165BF8]/20 rounded-xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] text-[#1C3991] transition-all duration-200"
                            placeholder="Brief summary of experience"
                          />
                        </motion.div>
                        {userData.resumeGridFsId && (
                          <motion.div variants={fadeIn}>
                            <label className="block text-sm font-semibold text-[#1C3991] mb-2">Resume ID</label>
                            <div className="relative flex items-center bg-[#165BF8]/5 p-3 rounded-xl border border-[#165BF8]/20 text-[#1C3991] break-all text-sm">
                              <FiHardDrive className="h-5 w-5 text-[#165BF8] mr-2" />
                              <span className="font-medium">{userData.resumeGridFsId}</span>
                              <span className="ml-auto text-xs text-[#165BF8]/80">(Not editable)</span>
                            </div>
                          </motion.div>
                        )}
                    </motion.div>
                )}

                {/* Job Poster details (only visible when role is 'job_poster') */}
                {userData.role === 'job_poster' && (
                    <motion.div variants={fadeIn} className="space-y-6 pt-4 border-t border-[#165BF8]/10 mt-6">
                        <h3 className="text-xl font-semibold text-[#1C3991]">Job Poster Details</h3>
                        <motion.div variants={fadeIn}>
                          <label htmlFor="jobPosterDetails.companyName" className="block text-sm font-semibold text-[#1C3991] mb-2">Company Name</label>
                          <div className="relative">
                            <FiBriefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#165BF8]/70" />
                            <input
                              type="text"
                              name="jobPosterDetails.companyName"
                              id="jobPosterDetails.companyName"
                              value={userData.jobPosterDetails?.companyName || ''}
                              onChange={handleChange}
                              className="block w-full pl-10 pr-3 py-3 border border-[#165BF8]/20 rounded-xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] text-[#1C3991] transition-all duration-200"
                              placeholder="Enter Company Name"
                            />
                          </div>
                        </motion.div>
                    </motion.div>
                )}

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="p-3 bg-red-100 border-l-4 border-red-500 rounded-r-lg shadow-sm text-sm text-red-700 font-medium flex items-center"
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
                      className="p-3 bg-green-100 border-l-4 border-green-500 rounded-r-lg shadow-sm text-sm text-green-700 font-medium flex items-center"
                      role="alert"
                    >
                      <FiCheckCircle className="h-5 w-5 text-green-500 mr-2" /> {message}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div variants={fadeIn}>
                  <motion.button
                    type="submit"
                    disabled={isSaving}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-lg text-lg font-semibold text-white
                      bg-gradient-to-r from-[#165BF8] to-[#1C3991]
                      hover:from-[#1a65ff] hover:to-[#2242a8]
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#165BF8]
                      transition-all duration-200
                      ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}
                    `}
                  >
                    {isSaving ? (
                      <>
                        <FiLoader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FiSave className="mr-3 h-5 w-5" />
                        Save Changes
                      </>
                    )}
                  </motion.button>
                </motion.div>
              </form>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
