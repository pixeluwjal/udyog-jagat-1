'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiMenu, FiUser, FiMail, FiCheckCircle, FiXCircle, FiLoader, FiChevronLeft, FiTag, FiSearch, FiEdit, FiUsers, FiFilter
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
  createdAt: string; // ISO date string
  status: 'active' | 'inactive'; // Added status field
}

// Framer Motion animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.5, 
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
      duration: 0.6, 
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.1
    }
  }
};

const pulseEffect = {
  scale: [1, 1.03, 1],
  opacity: [0.8, 1, 0.8],
  transition: { 
    duration: 1.2, 
    repeat: Infinity, 
    ease: "easeInOut" 
  }
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

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      console.warn('MyCreatedUsersPage: Not authenticated or user missing. Redirecting to /login.');
      router.push('/login');
      return;
    }
    if (user.firstLogin) {
      console.warn('MyCreatedUsersPage: User is firstLogin. Redirecting to /change-password.');
      router.push('/change-password');
      return;
    }
    if (user.role !== 'admin') {
      console.warn(`MyCreatedUsersPage: User role is ${user.role}, not admin. Redirecting to appropriate dashboard.`);
      if (user.role === 'job_poster') router.push('/poster/dashboard');
      else if (user.role === 'job_seeker') router.push('/seeker/dashboard');
      else router.push('/');
      return;
    }
    console.log('MyCreatedUsersPage: User is authenticated as admin. Proceeding.');
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

      const apiUrl = `/api/admin/users?${params.toString()}`;
      console.log(`API: Fetching users created by ${user._id} from: ${apiUrl}`);

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
        console.error('API: Backend response for users is not in expected format (missing "users" array):', data);
        setFetchError('Failed to fetch users: Invalid data format from server.');
        setUsers([]);
      }
    } catch (err: any) {
      console.error('API: Failed to fetch created users:', err);
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
  }, [isAuthenticated, token, user, searchQuery]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user && user.role === 'admin') {
      const handler = setTimeout(() => {
        fetchMyCreatedUsers();
      }, 500); // Debounce search/fetch

      return () => {
        clearTimeout(handler);
      };
    }
  }, [authLoading, isAuthenticated, user, fetchMyCreatedUsers, searchQuery]);
  
  const formatDate = (isoString: string): string => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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
            className="rounded-full p-4 bg-[#165BF8]/10 shadow-inner"
          >
            <FiLoader className="text-[#165BF8] h-12 w-12 animate-spin" />
          </motion.div>
          <p className="mt-6 text-lg font-medium text-[#1C3991]">
            Loading admin panel...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] overflow-hidden">
      <Sidebar userRole={user.role} onLogout={logout} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden bg-white/95 backdrop-blur-md shadow-sm p-4 flex justify-between items-center z-10 sticky top-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg text-[#165BF8] hover:bg-[#165BF8]/10 focus:outline-none"
          >
            <FiMenu className="h-6 w-6" />
          </motion.button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent">
            My Created Users
          </h1>
          <div className="w-6 h-6"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Page Header */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-[#1C3991] leading-tight">
                  <span className="bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent">
                    My Created Users
                  </span>
                </h1>
                <p className="text-[#165BF8] mt-2">
                  View and manage users you have created
                </p>
              </div>
              <Link href="/admin/dashboard" passHref>
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: `0 4px 15px ${primaryBlue}30` }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center px-5 py-2.5 bg-white text-[#165BF8] rounded-xl hover:bg-[#165BF8]/10 transition-all text-sm font-medium shadow-sm border border-[#165BF8]/20"
                >
                  <FiChevronLeft className="mr-2 w-5 h-5" /> All Users
                </motion.button>
              </Link>
            </motion.div>

            {/* User Search and List */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg border border-[#165BF8]/10 p-6 md:p-8"
            >
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div className="relative w-full md:w-80">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#165BF8]/70">
                    <FiSearch className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    className="block w-full p-3 pl-10 text-base text-[#1C3991] border border-[#165BF8]/20 rounded-xl bg-white focus:ring-[#165BF8] focus:border-[#165BF8] shadow-sm transition-all duration-200"
                    placeholder="Search users by email or username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        fetchMyCreatedUsers();
                      }
                    }}
                  />
                </div>
              </div>

              {fetchError && (
                <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-lg flex items-center">
                  <FiXCircle className="h-5 w-5 text-red-500 mr-2" />
                  <span>{fetchError}</span>
                </div>
              )}
              {message && (
                <div className="p-4 bg-green-50 border-l-4 border-green-400 text-green-700 rounded-lg flex items-center">
                  <FiCheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span>{message}</span>
                </div>
              )}

              {fetchLoading ? (
                <div className="flex justify-center items-center py-12">
                  <motion.div
                    animate={pulseEffect}
                    className="p-3 bg-[#165BF8]/10 rounded-full"
                  >
                    <FiLoader className="animate-spin text-[#165BF8] h-8 w-8" />
                  </motion.div>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-24 h-24 bg-[#165BF8]/5 rounded-full flex items-center justify-center mb-4">
                    <FiUser className="h-10 w-10 text-[#165BF8]/70" />
                  </div>
                  <h3 className="text-lg font-medium text-[#1C3991]">No users found</h3>
                  <p className="text-[#165BF8] mt-1">You have not created any users yet.</p>
                </div>
              ) : (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: {
                      transition: { staggerChildren: 0.1 },
                    },
                  }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                >
                  {users.map((u) => (
                    <motion.div
                      key={u._id}
                      variants={cardAnimation}
                      whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(22, 91, 248, 0.1)" }}
                      className="bg-white border border-[#165BF8]/10 rounded-xl shadow-sm p-5 flex flex-col hover:shadow-md transition-all duration-200 hover:border-[#165BF8]/20 relative group"
                    >
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-[#165BF8]/5 to-[#1C3991]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                      <div className="flex items-center mb-4 relative z-10">
                        <div className="flex-shrink-0 h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-[#4F39F6] font-bold text-base">
                          {u.username?.charAt(0).toUpperCase() || u.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="text-lg font-bold text-[#1C3991] break-words">{u.username || 'N/A'}</div>
                          <div className="text-xs text-[#165BF8] mt-1 break-all">{u.isSuperAdmin ? 'Super Admin' : (u.firstLogin ? 'First Login' : '')}</div>
                        </div>
                      </div>

                      <div className="relative z-10 space-y-2 mt-2">
                        <div className="flex items-center text-sm text-[#1C3991]">
                          <FiMail className="h-4 w-4 mr-2 text-[#165BF8]" />
                          <span className="font-medium break-words">{u.email}</span>
                        </div>
                        
                        <div className="flex items-center text-sm">
                          <FiTag className="h-4 w-4 mr-2 text-[#165BF8]" />
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize
                              ${u.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                                u.role === 'job_poster' ? 'bg-indigo-100 text-indigo-700' :
                                u.role === 'job_seeker' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-700'
                              }`}
                          >
                            {u.role.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div className="flex items-center text-sm">
                          {u.status === 'active' ? (
                            <span className="text-green-600 font-semibold flex items-center">
                              <FiCheckCircle className="inline-block mr-1" /> Active
                            </span>
                          ) : (
                            <span className="text-red-600 font-semibold flex items-center">
                              <FiXCircle className="inline-block mr-1" /> Inactive
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 flex justify-end relative z-10">
                        <Link href={`/admin/edit-user/${u._id}`} passHref>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-2 rounded-full text-[#165BF8] bg-[#165BF8]/10 hover:bg-[#165BF8]/20 transition-all duration-200"
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
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
