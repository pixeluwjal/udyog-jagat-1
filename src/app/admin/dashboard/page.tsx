'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUsers, FiActivity, FiClock, FiSearch, FiPlus, FiZap, FiEdit, FiMail, FiMenu, FiCheckCircle, FiXCircle, FiFilter, FiLoader, FiChevronDown, FiTag, FiRefreshCw, FiTrendingUp, FiUserCheck } from 'react-icons/fi';
import Sidebar from '@/app/components/Sidebar';

// Brand colors
const primaryBlue = "#165BF8";
const darkBlue = "#1C3991";

// Type definitions
interface UserDisplay {
  _id: string;
  username?: string;
  email: string;
  role: string;
  firstLogin: boolean;
  isSuperAdmin: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
  lastActive?: string;
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisWeek: number;
  userGrowth: number;
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
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    newUsersThisWeek: 0,
    userGrowth: 0
  });
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [message, setMessage] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Calculate real-time statistics from users data
   */
  const calculateStats = useCallback((usersData: UserDisplay[]): DashboardStats => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const activeUsers = usersData.filter(u => u.status === 'active').length;
    const newUsersThisWeek = usersData.filter(u => new Date(u.createdAt) > oneWeekAgo).length;
    const previousWeekUsers = usersData.filter(u => {
      const created = new Date(u.createdAt);
      return created > twoWeeksAgo && created <= oneWeekAgo;
    }).length;

    const userGrowth = previousWeekUsers > 0 
      ? Math.round(((newUsersThisWeek - previousWeekUsers) / previousWeekUsers) * 100)
      : newUsersThisWeek > 0 ? 100 : 0;

    return {
      totalUsers: usersData.length,
      activeUsers,
      newUsersThisWeek,
      userGrowth
    };
  }, []);

  /**
   * Fetches the list of users from the API
   */
  const fetchUsers = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setFetchError(null);
      setFetchLoading(true);
    }
    setMessage(null);

    try {
      if (!isAuthenticated || !token || !user || user.role !== 'admin') {
        setFetchError('Authentication or authorization missing for fetching users.');
        return;
      }

      const params = new URLSearchParams();
      params.append('all', 'true');
      if (searchQuery) params.append('search', searchQuery);
      if (filterStatus !== 'all') params.append('status', filterStatus);

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to fetch users');

      if (Array.isArray(data.users)) {
        // Filter out the currently logged-in admin
        let filteredUsers = data.users.filter((u: UserDisplay) => u._id !== user._id);
        setUsers(filteredUsers);
        
        // Calculate and set real stats
        const calculatedStats = calculateStats(filteredUsers);
        setStats(calculatedStats);
        
        setStatsLoading(false);
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
      setRefreshing(false);
    }
  }, [isAuthenticated, token, user, searchQuery, filterStatus, calculateStats]);

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

  const handleRefresh = () => {
    fetchUsers(true);
  };

  const renderStatsCards = () => {
    if (statsLoading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((item) => (
            <motion.div
              key={item}
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="bg-white p-6 rounded-2xl shadow-sm border border-[#165BF8]/10"
            >
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-12 bg-gray-200 rounded-full w-12 float-right"></div>
              </div>
            </motion.div>
          ))}
        </div>
      );
    }

    const statCards = [
      {
        title: `Total Users (${filterStatus === 'all' ? 'All' : filterStatus})`,
        value: stats.totalUsers,
        description: 'All registered users',
        icon: FiUsers,
        color: 'blue'
      },
      {
        title: 'Active Today',
        value: stats.activeUsers,
        description: 'Currently active users',
        icon: FiActivity,
        color: 'green'
      },
      {
        title: 'New This Week',
        value: stats.newUsersThisWeek,
        description: stats.userGrowth !== 0 ? `${stats.userGrowth > 0 ? '+' : ''}${stats.userGrowth}% from last week` : 'Growth Data',
        icon: FiClock,
        color: 'indigo'
      }
    ];

    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={cardAnimation}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            variants={fadeIn}
            whileHover={{ 
              y: -5, 
              scale: 1.02,
              boxShadow: `0 20px 40px -10px ${primaryBlue}1A` 
            }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-[#165BF8]/10 flex flex-col justify-between transition-all duration-300 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-gray-500 text-sm font-medium mb-2">{stat.title}</p>
                <h3 className="text-3xl font-bold text-[#1C3991] mb-1">
                  {stat.value.toLocaleString()}
                </h3>
                <p className="text-gray-500 text-xs">
                  {stat.description}
                </p>
              </div>
              <div className={`p-4 rounded-2xl ${
                stat.color === 'blue' ? 'bg-[#165BF8]/10 text-[#165BF8]' :
                stat.color === 'green' ? 'bg-green-100 text-green-600' :
                'bg-indigo-100 text-indigo-600'
              } group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    );
  };

  const renderUsersList = () => {
    if (fetchLoading && !refreshing) {
      return (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="animate-pulse bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-8"></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (users.length === 0) {
      const noUsersMessage = searchQuery || filterStatus !== 'all' 
        ? 'No users match your current filters. Try adjusting your search criteria.'
        : 'No users found in the system. Start by creating your first user.';

      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16 px-4"
        >
          <div className="mx-auto w-24 h-24 bg-[#165BF8]/5 rounded-full flex items-center justify-center mb-4">
            <FiUsers className="h-10 w-10 text-[#165BF8]/70" />
          </div>
          <h3 className="text-lg font-medium text-[#1C3991]">
            {searchQuery || filterStatus !== 'all' ? 'No matches found' : 'No users yet'}
          </h3>
          <p className="text-gray-600 max-w-md mx-auto mb-8 leading-relaxed">
            {noUsersMessage}
          </p>
          {!searchQuery && filterStatus === 'all' && (
            <Link href="/admin/create-user" passHref>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center px-6 py-3 bg-[#165BF8] text-white font-semibold rounded-xl shadow-lg hover:bg-[#1C3991] transition-colors duration-200"
              >
                <FiPlus className="w-5 h-5 mr-2" />
                Create First User
              </motion.button>
            </Link>
          )}
        </motion.div>
      );
    }

    return (
      <div className="space-y-3">
        <AnimatePresence>
          {users.map((user) => (
            <motion.div
              key={user._id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              whileHover={{ 
                x: 4,
                boxShadow: '0 10px 30px -10px rgba(22, 91, 248, 0.2)'
              }}
              transition={{ 
                type: "spring", 
                stiffness: 400, 
                damping: 25 
              }}
              className="bg-white rounded-xl border border-[#165BF8]/10 p-6 hover:border-[#165BF8]/30 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="relative"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#165BF8]/10 flex items-center justify-center text-[#165BF8] font-bold text-base">
                      {user.username?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                    </div>
                    {user.status === 'active' && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-semibold text-[#1C3991] truncate">
                        {user.username || 'Unnamed User'}
                      </h4>
                      {user.isSuperAdmin && (
                        <span className="px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold rounded-full">
                          SUPER ADMIN
                        </span>
                      )}
                      {user.firstLogin && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          First Login
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-1 flex items-center">
                      <FiMail className="w-4 h-4 mr-2" />
                      {user.email}
                    </p>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full font-medium ${
                        user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                        user.role === 'job_poster' ? 'bg-indigo-100 text-indigo-700' :
                        user.role === 'job_seeker' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {user.role.replace('_', ' ')}
                      </span>
                      <span className={`inline-flex items-center ${
                        user.status === 'active' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {user.status === 'active' ? (
                          <FiCheckCircle className="w-4 h-4 mr-1" />
                        ) : (
                          <FiXCircle className="w-4 h-4 mr-1" />
                        )}
                        {user.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Link href={`/admin/edit-user/${user._id}`} passHref>
                      <button className="p-3 bg-[#165BF8]/10 text-[#165BF8] rounded-xl hover:bg-[#165BF8]/20 transition-colors duration-200">
                        <FiEdit className="w-5 h-5" />
                      </button>
                    </Link>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
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
        {/* Mobile Header */}
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
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            className="p-2 rounded-lg text-[#165BF8] hover:bg-[#165BF8]/10"
          >
            <FiRefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Header Section */}
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
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRefresh}
                  className="flex items-center justify-center px-6 py-3 bg-white text-[#1C3991] rounded-xl font-semibold shadow-md border border-[#165BF8]/20 hover:border-[#165BF8]/40 transition-all duration-300"
                >
                  <FiRefreshCw className={`w-5 h-5 mr-3 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </motion.button>
                
                <Link href="/admin/create-user" passHref>
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: `0 8px 16px ${primaryBlue}20` }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-center px-6 py-3 bg-[#165BF8] text-white rounded-xl font-semibold shadow-md transition-all duration-300"
                  >
                    <FiPlus className="w-5 h-5 mr-3" />
                    New User
                  </motion.button>
                </Link>

                <Link href="/admin/generate-referral" passHref>
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: `0 8px 16px ${darkBlue}20` }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-center px-6 py-3 bg-white text-[#1C3991] rounded-xl font-semibold shadow-md border border-[#165BF8]/20 hover:border-[#165BF8]/40 transition-all duration-300"
                  >
                    <FiZap className="w-5 h-5 mr-3 text-[#165BF8]" />
                    Referral Codes
                  </motion.button>
                </Link>
              </div>
            </motion.div>

            {/* Stats Cards */}
            {renderStatsCards()}

            {/* Users Section */}
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