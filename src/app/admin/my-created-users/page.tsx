'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiMenu, FiUser, FiMail, FiCheckCircle, FiXCircle, FiLoader, 
  FiChevronLeft, FiTag, FiSearch, FiEdit, FiUsers, FiFilter,
  FiCalendar, FiShield, FiBriefcase, FiAward, FiRefreshCw
} from 'react-icons/fi';

// Brand colors
const primaryBlue = "#165BF8";
const darkBlue = "#1C3991";

interface UserDisplay {
  _id: string;
  username?: string;
  email: string;
  role: string;
  firstLogin: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  status: 'active' | 'inactive';
}

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
  y: -8,
  boxShadow: "0 20px 40px rgba(22, 91, 248, 0.15)",
  transition: { type: "spring", stiffness: 300, damping: 20 }
};

export default function MyCreatedUsersPage() {
  const { user, loading: authLoading, isAuthenticated, logout, token } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserDisplay[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [filterRole, setFilterRole] = useState<string>('all');

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    if (user.firstLogin) {
      router.push('/change-password');
      return;
    }
    if (user.role !== 'admin') {
      if (user.role === 'job_poster') router.push('/poster/dashboard');
      else if (user.role === 'job_seeker') router.push('/seeker/dashboard');
      else router.push('/');
      return;
    }
  }, [authLoading, isAuthenticated, user, router]);

  const fetchMyCreatedUsers = useCallback(async () => {
    setFetchError(null);
    setFetchLoading(true);
    setMessage(null);
    try {
      if (!isAuthenticated || !token || !user || !user._id) {
        setFetchError('Authentication or user ID missing for fetching created users.');
        setFetchLoading(false);
        return;
      }

      const params = new URLSearchParams();
      params.append('createdBy', user._id);
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      if (filterRole !== 'all') {
        params.append('role', filterRole);
      }

      const apiUrl = `/api/admin/users?${params.toString()}`;

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch created users');
      }

      if (Array.isArray(data.users)) {
        setUsers(data.users);
      } else {
        setFetchError('Failed to fetch users: Invalid data format from server.');
        setUsers([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch created users:', err);
      let errorMessage = 'Failed to fetch users. Please check your network connection.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      setFetchError(errorMessage);
    } finally {
      setFetchLoading(false);
    }
  }, [isAuthenticated, token, user, searchQuery, filterRole]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user && user.role === 'admin') {
      const handler = setTimeout(() => {
        fetchMyCreatedUsers();
      }, 500);

      return () => {
        clearTimeout(handler);
      };
    }
  }, [authLoading, isAuthenticated, user, fetchMyCreatedUsers, searchQuery, filterRole]);
  
  const formatDate = (isoString: string): string => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <FiShield className="h-4 w-4" />;
      case 'job_poster': return <FiBriefcase className="h-4 w-4" />;
      case 'job_seeker': return <FiUser className="h-4 w-4" />;
      default: return <FiUser className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'from-red-500 to-red-600';
      case 'job_poster': return 'from-indigo-500 to-indigo-600';
      case 'job_seeker': return 'from-green-500 to-green-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  if (authLoading || !isAuthenticated || !user || user.firstLogin || user.role !== 'admin') {
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

  const filteredUsers = users.filter(user => 
    filterRole === 'all' || user.role === filterRole
  );

  const userStats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    admins: users.filter(u => u.role === 'admin').length,
    posters: users.filter(u => u.role === 'job_poster').length,
    seekers: users.filter(u => u.role === 'job_seeker').length,
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] overflow-hidden font-inter">
      <Sidebar userRole={user.role} onLogout={logout} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} userEmail={user?.email}/>

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
            My Users
          </motion.h1>
          
          <div className="w-12"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
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
                <FiUsers className="h-10 w-10 text-white" />
              </motion.div>
              <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent mb-4">
                My Created Users
              </h1>
              <p className="text-lg text-[#165BF8] font-medium max-w-2xl mx-auto">
                Manage and track all users you've created with detailed insights and analytics
              </p>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={cardAnimation}
              className="grid grid-cols-2 md:grid-cols-4 gap-6"
            >
              {[
                { label: 'Total Users', value: userStats.total, icon: FiUsers, color: 'blue' },
                { label: 'Active Users', value: userStats.active, icon: FiCheckCircle, color: 'green' },
                { label: 'Admins', value: userStats.admins, icon: FiShield, color: 'red' },
                { label: 'Job Posters', value: userStats.posters, icon: FiBriefcase, color: 'indigo' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  variants={fadeIn}
                  whileHover={cardHover}
                  className="bg-white p-6 rounded-2xl shadow-lg border border-[#165BF8]/10 flex flex-col justify-between transition-all duration-300 group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-gray-600 text-sm font-bold mb-2">{stat.label}</p>
                      <h3 className="text-3xl font-black text-[#1C3991] mb-1">
                        {stat.value}
                      </h3>
                    </div>
                    <div className={`p-4 rounded-2xl ${
                      stat.color === 'blue' ? 'bg-[#165BF8]/10 text-[#165BF8]' :
                      stat.color === 'green' ? 'bg-green-100 text-green-600' :
                      stat.color === 'red' ? 'bg-red-100 text-red-600' :
                      'bg-indigo-100 text-indigo-600'
                    } group-hover:scale-110 transition-transform duration-300`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* User Search and List */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-3xl shadow-2xl border border-[#165BF8]/10 overflow-hidden"
            >
              <div className="p-8 border-b border-[#165BF8]/10">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-2 gap-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-[#165BF8] to-[#1C3991] text-white shadow-lg">
                      <FiUser className="h-7 w-7" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-[#1C3991]">User Management</h2>
                      <p className="text-[#165BF8] font-medium">View and manage users you have created</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                    {/* Search Input */}
                    <div className="relative w-full sm:w-80">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#165BF8]">
                        <FiSearch className="h-5 w-5" />
                      </div>
                      <input
                        type="text"
                        className="block w-full pl-12 pr-4 py-3.5 text-base text-[#1C3991] border-2 border-[#165BF8]/20 rounded-2xl bg-white focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] shadow-sm transition-all duration-300 hover:border-[#165BF8]/40"
                        placeholder="Search users by email or username..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    {/* Role Filter */}
                    <div className="relative w-full sm:w-48">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-[#165BF8]">
                        <FiFilter className="h-5 w-5" />
                      </div>
                      <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="block appearance-none w-full bg-white border-2 border-[#165BF8]/20 text-[#1C3991] py-3.5 px-4 pl-12 pr-8 rounded-2xl leading-tight focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] transition-all duration-300 shadow-sm cursor-pointer hover:border-[#165BF8]/40 font-medium"
                      >
                        <option value="all">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="job_poster">Job Poster</option>
                        <option value="job_seeker">Job Seeker</option>
                      </select>
                    </div>

                    {/* Refresh Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={fetchMyCreatedUsers}
                      className="p-3.5 rounded-2xl bg-[#165BF8]/10 text-[#165BF8] hover:bg-[#165BF8]/20 transition-all duration-300 shadow-sm"
                      title="Refresh users"
                    >
                      <FiRefreshCw className={`h-5 w-5 ${fetchLoading ? 'animate-spin' : ''}`} />
                    </motion.button>

                    {/* Back to Dashboard */}
                    <Link href="/admin/dashboard" passHref>
                      <motion.button
                        whileHover={{ scale: 1.05, boxShadow: "0 8px 25px rgba(22, 91, 248, 0.2)" }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center px-5 py-3.5 bg-white text-[#165BF8] rounded-2xl hover:bg-[#165BF8]/10 transition-all duration-300 font-bold shadow-lg border-2 border-[#165BF8]/20"
                      >
                        <FiChevronLeft className="mr-2 w-5 h-5" /> All Users
                      </motion.button>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="p-8">
                {/* Messages */}
                <AnimatePresence>
                  {fetchError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl shadow-sm text-red-700 font-medium flex items-center space-x-3 mb-6"
                    >
                      <FiXCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                      <span className="font-semibold">{fetchError}</span>
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

                {fetchLoading ? (
                  <div className="flex justify-center items-center py-16">
                    <motion.div
                      animate={pulseEffect}
                      className="rounded-full p-4 bg-gradient-to-br from-[#165BF8] to-[#1C3991] shadow-lg"
                    >
                      <FiLoader className="text-white h-8 w-8 animate-spin" />
                    </motion.div>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-16"
                  >
                    <div className="mx-auto w-24 h-24 bg-gradient-to-br from-[#165BF8]/10 to-[#1C3991]/10 rounded-3xl flex items-center justify-center mb-6">
                      <FiUser className="h-12 w-12 text-[#165BF8]" />
                    </div>
                    <h3 className="text-2xl font-black text-[#1C3991] mb-3">No users found</h3>
                    <p className="text-[#165BF8] font-medium">
                      {searchQuery || filterRole !== 'all' 
                        ? 'Try adjusting your search criteria' 
                        : 'You have not created any users yet'
                      }
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: {
                        transition: { staggerChildren: 0.15 },
                      },
                    }}
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                  >
                    {filteredUsers.map((u) => (
                      <motion.div
                        key={u._id}
                        variants={cardAnimation}
                        whileHover={cardHover}
                        className="bg-white border-2 border-[#165BF8]/10 rounded-2xl shadow-lg p-6 flex flex-col hover:border-[#165BF8]/30 transition-all duration-300 relative overflow-hidden group"
                      >
                        {/* Gradient overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#165BF8]/5 to-[#1C3991]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                        <div className="flex-grow relative z-10">
                          {/* User Header */}
                          <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center space-x-3">
                              <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="relative"
                              >
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                  {u.username?.charAt(0).toUpperCase() || u.email.charAt(0).toUpperCase()}
                                </div>
                                {u.status === 'active' && (
                                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                                )}
                              </motion.div>
                              <div>
                                <h3 className="text-lg font-black text-[#1C3991] break-words">
                                  {u.username || 'Unnamed User'}
                                </h3>
                                <div className="flex items-center space-x-2 mt-1">
                                  {u.isSuperAdmin && (
                                    <span className="px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-black rounded-full">
                                      SUPER ADMIN
                                    </span>
                                  )}
                                  {u.firstLogin && (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                                      First Login
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* User Details */}
                          <div className="space-y-4 text-sm">
                            <div className="flex gap-3">
                              <FiMail className="h-5 w-5 text-[#165BF8] shrink-0 mt-0.5" />
                              <div>
                                <p className="text-[#165BF8] font-bold">Email</p>
                                <p className="text-[#1C3991] font-semibold break-words">
                                  {u.email}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex gap-3">
                              <FiTag className="h-5 w-5 text-[#165BF8] shrink-0 mt-0.5" />
                              <div>
                                <p className="text-[#165BF8] font-bold">Role</p>
                                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-black capitalize
                                    ${u.role === 'admin' ? 'bg-red-100 text-red-800' :
                                      u.role === 'job_poster' ? 'bg-indigo-100 text-indigo-800' :
                                      u.role === 'job_seeker' ? 'bg-green-100 text-green-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}
                                >
                                  {getRoleIcon(u.role)}
                                  <span className="ml-1.5">{u.role.replace('_', ' ')}</span>
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex gap-3">
                              <FiCalendar className="h-5 w-5 text-[#165BF8] shrink-0 mt-0.5" />
                              <div>
                                <p className="text-[#165BF8] font-bold">Created</p>
                                <p className="text-[#1C3991] font-semibold">
                                  {formatDate(u.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-6 flex justify-between items-center relative z-10">
                          <div className={`px-4 py-2 text-sm font-black rounded-full inline-flex items-center
                            ${u.status === 'active' 
                              ? 'bg-green-100 text-green-800 border-2 border-green-200' 
                              : 'bg-red-100 text-red-800 border-2 border-red-200'
                            }`}
                          >
                            {u.status === 'active' ? (
                              <FiCheckCircle className="mr-2 h-4 w-4" />
                            ) : (
                              <FiXCircle className="mr-2 h-4 w-4" />
                            )}
                            {u.status.toUpperCase()}
                          </div>
                          
                          <Link href={`/admin/edit-user/${u._id}`} passHref>
                            <motion.button
                              whileHover={{ scale: 1.1, boxShadow: "0 8px 20px rgba(22, 91, 248, 0.3)" }}
                              whileTap={{ scale: 0.9 }}
                              className="p-3 bg-gradient-to-r from-[#165BF8] to-[#1C3991] text-white rounded-xl hover:from-[#1a65ff] hover:to-[#2242a8] transition-all duration-300 shadow-lg"
                              title="Edit User"
                            >
                              <FiEdit className="w-5 h-5" />
                            </motion.button>
                          </Link>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}