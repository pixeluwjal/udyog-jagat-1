'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiMail, FiUser, FiBriefcase, FiLink, FiShield,
  FiXCircle, FiCheckCircle, FiLoader, FiChevronLeft, FiMenu, 
  FiBookOpen, FiMapPin, FiGlobe, FiPlus, FiAward, FiTarget
} from 'react-icons/fi';

// Brand colors
const primaryBlue = "#165BF8";
const darkBlue = "#1C3991";

export default function CreateUserPage() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'job_poster' | 'job_seeker' | 'job_referrer' | 'admin'>('job_seeker');
  const [milanShakaBhaga, setMilanShakaBhaga] = useState('');
  const [valayaNagar, setValayaNagar] = useState('');
  const [khandaBhaga, setKhandaBhaga] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const { user: currentUser, loading: authLoading, isAuthenticated, token, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !currentUser) {
      router.push('/login');
      return;
    }

    if (currentUser.firstLogin) {
      router.push('/change-password');
      return;
    }

    if (currentUser.role !== 'admin') {
      if (currentUser.role === 'job_poster') router.push('/poster/dashboard');
      else if (currentUser.role === 'job_seeker') router.push('/seeker/dashboard');
      else router.push('/');
      return;
    }
  }, [authLoading, isAuthenticated, currentUser, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    if (!token) {
      setError('Authentication token missing. Please log in again.');
      setIsLoading(false);
      return;
    }

    if (!email || !role) {
      setError('Please provide an email and select a role.');
      setIsLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Invalid email format.');
      setIsLoading(false);
      return;
    }

    if (role === 'admin' || role === 'job_referrer') {
      if (!milanShakaBhaga.trim()) {
        setError('Milan/Shaka is required for Admin and Referrer roles.');
        setIsLoading(false);
        return;
      }
      if (!valayaNagar.trim()) {
        setError('Valaya/Nagar is required for Admin and Referrer roles.');
        setIsLoading(false);
        return;
      }
      if (!khandaBhaga.trim()) {
        setError('Khanda/Bhaga is required for Admin and Referrer roles.');
        setIsLoading(false);
        return;
      }
    }

    try {
      const payload: {
        email: string;
        role: string;
        milanShakaBhaga?: string;
        valayaNagar?: string;
        khandaBhaga?: string;
      } = {
        email,
        role,
      };

      if (milanShakaBhaga.trim()) payload.milanShakaBhaga = milanShakaBhaga.trim();
      if (valayaNagar.trim()) payload.valayaNagar = valayaNagar.trim();
      if (khandaBhaga.trim()) payload.khandaBhaga = khandaBhaga.trim();

      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setMessage(data.message || 'User created successfully! A temporary password has been sent to their email.');
      setEmail('');
      setRole('job_seeker');
      setMilanShakaBhaga('');
      setValayaNagar('');
      setKhandaBhaga('');

    } catch (err: any) {
      console.error('Create user error:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced Animation Variants
  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.6, 
        ease: [0.16, 1, 0.3, 1],
        staggerChildren: 0.1
      } 
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1, 
      transition: { 
        duration: 0.5, 
        ease: [0.16, 1, 0.3, 1] 
      } 
    },
  };

  const cardHover = {
    scale: 1.02,
    y: -5,
    boxShadow: "0 20px 40px rgba(22, 91, 248, 0.15)",
    transition: { type: "spring", stiffness: 300, damping: 20 }
  };

  const pulseEffect = {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
  };

  if (authLoading || !isAuthenticated || !currentUser || currentUser.firstLogin || currentUser.role !== 'admin') {
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
            Loading Admin Panel...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  const roleOptions = [
    { 
      value: 'job_seeker', 
      label: 'Job Seeker', 
      icon: <FiUser className="h-7 w-7" />,
      description: 'Browse and apply for jobs',
      gradient: 'from-blue-500 to-blue-600'
    },
    { 
      value: 'job_poster', 
      label: 'Job Poster', 
      icon: <FiBriefcase className="h-7 w-7" />,
      description: 'Post and manage job listings',
      gradient: 'from-green-500 to-green-600'
    },
    { 
      value: 'job_referrer', 
      label: 'Referrer', 
      icon: <FiLink className="h-7 w-7" />,
      description: 'Refer candidates to jobs',
      gradient: 'from-purple-500 to-purple-600'
    },
    { 
      value: 'admin', 
      label: 'Admin', 
      icon: <FiShield className="h-7 w-7" />,
      description: 'Full system access',
      gradient: 'from-red-500 to-red-600'
    },
  ];

  const isRequiredForAdminOrReferrer = role === 'admin' || role === 'job_referrer';
  const areAdditionalFieldsVisible = role === 'admin' || role === 'job_referrer' || role === 'job_seeker';

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] overflow-hidden font-inter">
      <Sidebar 
        userRole={currentUser.role} 
        onLogout={logout} 
        isOpen={mobileSidebarOpen} 
        setIsOpen={setMobileSidebarOpen} 
        userEmail={currentUser?.email} 
      />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Enhanced Mobile Header */}
        <div className="md:hidden bg-white/95 backdrop-blur-md shadow-2xl p-4 flex items-center justify-between z-10 sticky top-0 border-b border-[#165BF8]/10">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setMobileSidebarOpen(true)}
            className="p-3 rounded-xl bg-[#165BF8]/10 text-[#165BF8] hover:bg-[#165BF8]/20 transition-all duration-200"
          >
            <FiMenu className="h-6 w-6" />
          </motion.button>
          
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-black bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent"
          >
            Create User
          </motion.h1>
          
          <div className="w-12"></div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="max-w-4xl mx-auto"
          >
            {/* Header Section */}
            <motion.div
              variants={itemVariants}
              className="text-center mb-8"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#165BF8] to-[#1C3991] rounded-3xl shadow-2xl mb-6"
              >
                <FiPlus className="h-10 w-10 text-white" />
              </motion.div>
              <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent mb-4">
                Create New User
              </h1>
              <p className="text-lg text-[#165BF8] font-medium max-w-2xl mx-auto">
                Add new members to your platform and assign them appropriate roles with customized permissions
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left Side - Form */}
              <motion.div
                variants={itemVariants}
                className="lg:col-span-2"
              >
                <div className="bg-white rounded-3xl shadow-2xl border border-[#165BF8]/10 overflow-hidden">
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-2xl font-bold text-[#1C3991]">User Information</h2>
                      <Link href="/admin/dashboard" passHref>
                        <motion.button
                          whileHover={{ scale: 1.05, boxShadow: "0 8px 25px rgba(22, 91, 248, 0.2)" }}
                          whileTap={{ scale: 0.95 }}
                          className="flex items-center px-5 py-2.5 bg-[#165BF8]/10 text-[#1C3991] rounded-xl hover:bg-[#165BF8]/20 transition-all duration-200 font-semibold shadow-sm"
                        >
                          <FiChevronLeft className="mr-2 w-5 h-5" /> Back
                        </motion.button>
                      </Link>
                    </div>

                    <form className="space-y-8" onSubmit={handleSubmit}>
                      {/* Email Field */}
                      <motion.div variants={itemVariants}>
                        <label className="block text-sm font-bold text-[#1C3991] mb-3 uppercase tracking-wide">
                          Email Address
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <FiMail className="h-6 w-6 text-[#165BF8]/70" />
                          </div>
                          <input
                            type="email"
                            required
                            className="block w-full pl-12 pr-4 py-4 text-lg border-2 border-[#165BF8]/20 rounded-2xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] text-[#1C3991] bg-white transition-all duration-300 group-hover:border-[#165BF8]/40"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                            placeholder="Enter email address"
                          />
                        </div>
                      </motion.div>

                      {/* Role Selection */}
                      <motion.div variants={itemVariants}>
                        <label className="block text-sm font-bold text-[#1C3991] mb-4 uppercase tracking-wide">
                          Select Role
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          {roleOptions.map((option) => (
                            <motion.div
                              key={option.value}
                              whileHover={cardHover}
                              whileTap={{ scale: 0.95 }}
                            >
                              <input
                                type="radio"
                                id={`role-${option.value}`}
                                name="role"
                                value={option.value}
                                checked={role === option.value}
                                onChange={() => setRole(option.value as any)}
                                className="hidden peer"
                                disabled={isLoading}
                              />
                              <label
                                htmlFor={`role-${option.value}`}
                                className={`block p-5 border-2 rounded-2xl cursor-pointer transition-all duration-300 h-full
                                  ${role === option.value
                                    ? `border-[#165BF8] bg-gradient-to-br ${option.gradient} text-white shadow-xl`
                                    : 'border-[#165BF8]/20 bg-white text-[#1C3991] hover:border-[#165BF8]/40 hover:shadow-lg'
                                  }
                                  ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`
                                }
                              >
                                <div className="flex items-center space-x-3">
                                  <div className={`p-2 rounded-xl ${role === option.value ? 'bg-white/20' : 'bg-[#165BF8]/10'}`}>
                                    {option.icon}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-bold text-sm">{option.label}</div>
                                    <div className={`text-xs mt-1 ${role === option.value ? 'text-white/90' : 'text-gray-600'}`}>
                                      {option.description}
                                    </div>
                                  </div>
                                </div>
                              </label>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>

                      {/* Additional Fields */}
                      {areAdditionalFieldsVisible && (
                        <motion.div
                          variants={itemVariants}
                          className="pt-6 border-t border-[#165BF8]/10"
                        >
                          <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-[#165BF8]/10 rounded-xl">
                              <FiAward className="h-6 w-6 text-[#165BF8]" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-[#1C3991]">
                                Additional Information
                              </h3>
                              <p className="text-sm text-[#165BF8]">
                                {isRequiredForAdminOrReferrer ? 'Required for Admin/Referrer roles' : 'Optional for Job Seeker role'}
                              </p>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-6">
                            <motion.div variants={itemVariants}>
                              <label className="block text-sm font-semibold text-[#1C3991] mb-2">
                                Milan/Shaka
                              </label>
                              <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <FiBookOpen className="h-5 w-5 text-[#165BF8]/70" />
                                </div>
                                <input
                                  type="text"
                                  required={isRequiredForAdminOrReferrer}
                                  className="block w-full pl-10 pr-3 py-3 border-2 border-[#165BF8]/20 rounded-xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] text-[#1C3991] transition-all duration-200 group-hover:border-[#165BF8]/40"
                                  value={milanShakaBhaga}
                                  onChange={(e) => setMilanShakaBhaga(e.target.value)}
                                  disabled={isLoading}
                                  placeholder="Enter Milan/Shaka"
                                />
                              </div>
                            </motion.div>

                            <motion.div variants={itemVariants}>
                              <label className="block text-sm font-semibold text-[#1C3991] mb-2">
                                Valaya/Nagar
                              </label>
                              <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <FiMapPin className="h-5 w-5 text-[#165BF8]/70" />
                                </div>
                                <input
                                  type="text"
                                  required={isRequiredForAdminOrReferrer}
                                  className="block w-full pl-10 pr-3 py-3 border-2 border-[#165BF8]/20 rounded-xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] text-[#1C3991] transition-all duration-200 group-hover:border-[#165BF8]/40"
                                  value={valayaNagar}
                                  onChange={(e) => setValayaNagar(e.target.value)}
                                  disabled={isLoading}
                                  placeholder="Enter Valaya/Nagar"
                                />
                              </div>
                            </motion.div>

                            <motion.div variants={itemVariants} className="md:col-span-2">
                              <label className="block text-sm font-semibold text-[#1C3991] mb-2">
                                Khanda/Bhaga
                              </label>
                              <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <FiGlobe className="h-5 w-5 text-[#165BF8]/70" />
                                </div>
                                <input
                                  type="text"
                                  required={isRequiredForAdminOrReferrer}
                                  className="block w-full pl-10 pr-3 py-3 border-2 border-[#165BF8]/20 rounded-xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] text-[#1C3991] transition-all duration-200 group-hover:border-[#165BF8]/40"
                                  value={khandaBhaga}
                                  onChange={(e) => setKhandaBhaga(e.target.value)}
                                  disabled={isLoading}
                                  placeholder="Enter Khanda/Bhaga"
                                />
                              </div>
                            </motion.div>
                          </div>
                        </motion.div>
                      )}

                      {/* Messages */}
                      <AnimatePresence>
                        {error && (
                          <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl shadow-sm text-red-700 font-medium flex items-center space-x-3"
                          >
                            <FiXCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                            <span>{error}</span>
                          </motion.div>
                        )}
                        {message && (
                          <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="p-4 bg-green-50 border-l-4 border-green-500 rounded-xl shadow-sm text-green-700 font-medium flex items-center space-x-3"
                          >
                            <FiCheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                            <span>{message}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Submit Button */}
                      <motion.div variants={itemVariants}>
                        <motion.button
                          type="submit"
                          disabled={isLoading}
                          whileHover={{ scale: 1.02, boxShadow: "0 15px 30px rgba(22, 91, 248, 0.3)" }}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-2xl shadow-xl text-lg font-bold text-white bg-gradient-to-r from-[#165BF8] to-[#1C3991] hover:from-[#1a65ff] hover:to-[#2242a8] focus:outline-none focus:ring-4 focus:ring-[#165BF8]/30 transition-all duration-300 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          {isLoading ? (
                            <>
                              <FiLoader className="animate-spin mr-3 h-6 w-6" />
                              Creating User...
                            </>
                          ) : (
                            <>
                              <FiPlus className="mr-3 h-6 w-6" />
                              Create User Account
                            </>
                          )}
                        </motion.button>
                      </motion.div>

                      <motion.p variants={itemVariants} className="text-center text-sm text-[#165BF8] font-medium">
                        A secure temporary password will be generated and sent to the user's email address
                      </motion.p>
                    </form>
                  </div>
                </div>
              </motion.div>

              {/* Right Side - Info Card */}
              <motion.div
                variants={itemVariants}
                className="lg:col-span-1"
              >
                <motion.div
                  whileHover={cardHover}
                  className="bg-gradient-to-br from-[#165BF8] to-[#1C3991] rounded-3xl shadow-2xl p-8 text-white h-full"
                >
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
                      <FiTarget className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-black mb-2">Quick Guide</h3>
                    <p className="text-white/80 text-sm">Creating user accounts made simple</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold">1</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-white">Enter Email</h4>
                        <p className="text-white/70 text-sm">Provide a valid email address for the user</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold">2</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-white">Select Role</h4>
                        <p className="text-white/70 text-sm">Choose appropriate permissions and access level</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold">3</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-white">Add Details</h4>
                        <p className="text-white/70 text-sm">Fill in organizational information if required</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold">4</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-white">Create Account</h4>
                        <p className="text-white/70 text-sm">User receives temporary password via email</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 p-4 bg-white/10 rounded-xl border border-white/20">
                    <p className="text-sm text-white/90 font-medium text-center">
                      💡 All users will be prompted to set a new password on first login
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}