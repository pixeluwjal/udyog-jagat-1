'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUsers, FiActivity, FiClock, FiSearch, FiPlus, FiZap, FiEdit, FiMail, FiMenu, FiCheckCircle, FiXCircle, FiFilter, FiLoader, FiChevronDown, FiTag } from 'react-icons/fi';
import Sidebar from '@/app/components/Sidebar';

// Brand colors
const primaryBlue = "#165BF8";
const darkBlue = "#1C3991";

// Type definition for a user in the display list
interface UserDisplay {
  _id: string;
  username?: string;
  email: string;
  role: string;
  firstLogin: boolean;
  isSuperAdmin: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
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
      delay: 0.1,
    },
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
    ease: "easeInOut",
  },
};

export default function AdminDashboardPage() {
  const { user, loading: authLoading, isAuthenticated, logout, token } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserDisplay[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [message, setMessage] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  /**
   * Fetches the list of users from the API.
   * This function is memoized with useCallback to prevent unnecessary re-creations.
   */
  const fetchUsers = useCallback(async () => {
    setFetchError(null);
    setFetchLoading(true);
    setMessage(null);

    try {
      if (!isAuthenticated || !token || !user || user.role !== 'admin') {
        setFetchError('Authentication or authorization missing for fetching users.');
        setFetchLoading(false);
        return;
      }

      const params = new URLSearchParams();
      params.append('all', 'true');
      if (searchQuery) params.append('search', searchQuery);
      if (filterStatus !== 'all') params.append('status', filterStatus);

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to fetch users');

      if (Array.isArray(data.users)) {
        // Filter out the currently logged-in admin
        let filteredUsers = data.users.filter((u: UserDisplay) => u._id !== user._id);
        setUsers(filteredUsers);
      } else {
        console.error('Invalid data format from server');
        setFetchError('Failed to fetch users: Invalid data format from server.');
        setUsers([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
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
  }, [isAuthenticated, token, user, searchQuery, filterStatus]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user && user.role === 'admin') {
      const handler = setTimeout(() => fetchUsers(), 500);

      return () => {
        clearTimeout(handler);
      };
    }
  }, [authLoading, isAuthenticated, user, fetchUsers, searchQuery, filterStatus]);

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
    }
  }, [authLoading, isAuthenticated, user, router]);
  
  const renderStatsCards = () => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsersThisWeek = users.filter(u => new Date(u.createdAt) > oneWeekAgo).length;

    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={cardAnimation}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {/* Total Users Card */}
        <motion.div
          variants={fadeIn}
          whileHover={{ y: -5, boxShadow: `0 10px 25px -5px ${primaryBlue}1A` }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-[#165BF8]/10 flex flex-col justify-between transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Users ({filterStatus === 'all' ? 'All' : filterStatus})</p>
              <h3 className="text-3xl font-bold mt-1 text-[#1C3991]">{users.length}</h3>
            </div>
            <div className="p-4 rounded-full bg-[#165BF8]/10 text-[#165BF8]">
              <FiUsers className="w-7 h-7" />
            </div>
          </div>
        </motion.div>

        {/* Active Today Card */}
        <motion.div
          variants={fadeIn}
          whileHover={{ y: -5, boxShadow: `0 10px 25px -5px ${primaryBlue}1A` }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-[#165BF8]/10 flex flex-col justify-between transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Active Today</p>
              <h3 className="text-3xl font-bold mt-1 text-[#1C3991]">{users.filter(u => u.status === 'active').length}</h3>
            </div>
            <div className="p-4 rounded-full bg-green-100 text-green-600">
              <FiActivity className="w-7 h-7" />
            </div>
          </div>
        </motion.div>

        {/* New This Week Card */}
        <motion.div
          variants={fadeIn}
          whileHover={{ y: -5, boxShadow: `0 10px 25px -5px ${primaryBlue}1A` }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-[#165BF8]/10 flex flex-col justify-between transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">New This Week</p>
              <h3 className="text-3xl font-bold mt-1 text-[#1C3991]">{newUsersThisWeek}</h3>
            </div>
            <div className="p-4 rounded-full bg-indigo-100 text-indigo-600">
              <FiClock className="w-7 h-7" />
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const renderUsersList = () => {
    if (fetchLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <motion.div
            animate={pulseEffect}
            className="p-3 bg-[#165BF8]/10 rounded-full"
          >
            <FiLoader className="animate-spin text-[#165BF8] h-8 w-8" />
          </motion.div>
        </div>
      );
    }

    if (users.length === 0) {
      const noUsersMessage = filterStatus === 'active'
        ? 'No active users found. Try adjusting your search or filter.'
        : filterStatus === 'inactive'
        ? 'No inactive users found. Try adjusting your search or filter.'
        : 'No users found. Try adjusting your search.';

      return (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-[#165BF8]/5 rounded-full flex items-center justify-center mb-4">
            <FiUsers className="h-10 w-10 text-[#165BF8]/70" />
          </div>
          <h3 className="text-lg font-medium text-[#1C3991]">{noUsersMessage}</h3>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto pb-6">
        <table className="min-w-full divide-y divide-[#165BF8]/10">
          <thead className="bg-[#165BF8]/5">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-[#1C3991] uppercase tracking-wider">User</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-[#1C3991] uppercase tracking-wider">Email</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-[#1C3991] uppercase tracking-wider">Role</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-[#1C3991] uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-[#1C3991] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-[#165BF8]/10">
            {users.map((u) => (
              <motion.tr
                key={u._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                whileHover={{ backgroundColor: `rgba(22, 91, 248, 0.05)`, x: 5 }}
                className="transition-all duration-200"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <motion.div
                      whileHover={{ scale: 1.15, rotate: 5 }}
                      className="flex-shrink-0 h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-[#4F39F6] font-bold text-base"
                    >
                      {u.username?.charAt(0).toUpperCase() || u.email.charAt(0).toUpperCase()}
                    </motion.div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-[#1C3991]">{u.username || 'N/A'}</div>
                      <div className="text-xs text-[#165BF8] mt-1">{u.isSuperAdmin ? 'Super Admin' : (u.firstLogin ? 'First Login' : '')}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1C3991]">{u.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize
                      ${u.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                        u.role === 'job_poster' ? 'bg-indigo-100 text-indigo-700' :
                        u.role === 'job_seeker' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-700'
                      }`}
                  >
                    {u.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1C3991]">
                  <div className="flex items-center space-x-2">
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
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-4">
                    <Link href={`/admin/edit-user/${u._id}`} passHref>
                      <motion.button
                        whileHover={{ scale: 1.1, color: '#3b82f6' }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 rounded-full text-[#165BF8] bg-[#165BF8]/10 hover:bg-[#165BF8]/20 transition-all duration-200"
                        title="Edit User"
                      >
                        <FiEdit className="w-5 h-5" />
                      </motion.button>
                    </Link>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    );
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
    <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] overflow-hidden font-inter">
      <Sidebar userRole={user.role} onLogout={logout} isOpen={mobileSidebarOpen} setIsOpen={setMobileSidebarOpen} userEmail={user?.email}/>

      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="md:hidden bg-white/95 backdrop-blur-md shadow-sm p-4 flex justify-between items-center z-10 sticky top-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-lg text-[#165BF8] hover:bg-[#165BF8]/10 focus:outline-none"
          >
            <FiMenu className="h-6 w-6" />
          </motion.button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent">
            Admin Panel
          </h1>
          <div className="w-6 h-6"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-[#1C3991] leading-tight">
                  <span className="bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent">
                    Welcome back, {user.username || 'Admin'}!
                  </span>
                </h1>
                <p className="text-[#165BF8] mt-2">
                  Manage your users and platform settings with ease.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
                <Link href="/admin/create-user" passHref>
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: `0 8px 16px ${primaryBlue}20` }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center px-6 py-3 bg-[#165BF8] text-white rounded-xl font-semibold shadow-md transition-all duration-300 w-full justify-center"
                  >
                    <FiPlus className="w-5 h-5 mr-3" />
                    <span>New User</span>
                  </motion.button>
                </Link>
                <Link href="/admin/generate-referral" passHref>
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: `0 8px 16px ${darkBlue}20` }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center px-6 py-3 bg-white text-[#1C3991] rounded-xl font-semibold shadow-md transition-all duration-300 w-full justify-center border border-[#165BF8]/20"
                  >
                    <FiZap className="w-5 h-5 mr-3 text-[#165BF8]" />
                    <span>Referral Codes</span>
                  </motion.button>
                </Link>
              </div>
            </motion.div>
            {renderStatsCards()}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg border border-[#165BF8]/10 p-6 md:p-8"
            >
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div className="relative w-full md:w-80">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#165BF8]">
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
                        fetchUsers();
                      }
                    }}
                  />
                </div>
                <div className="relative w-full md:w-48">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#165BF8]">
                    <FiFilter className="h-5 w-5" />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                    className="block appearance-none w-full bg-white border border-[#165BF8]/20 text-[#1C3991] py-3 px-4 pl-10 pr-8 rounded-xl leading-tight focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] transition-all shadow-sm cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#165BF8]">
                    <FiChevronDown className="h-5 w-5" />
                  </div>
                </div>
              </div>
              {renderUsersList()}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
