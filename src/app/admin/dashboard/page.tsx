'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUsers, FiActivity, FiClock, FiSearch, FiPlus, FiZap, FiEdit, FiMail, FiMenu, FiCheckCircle, FiXCircle, FiFilter, FiLoader, FiChevronDown, FiTag, FiRefreshCw, FiTrendingUp, FiUserCheck, FiAward, FiTarget, FiBarChart2, FiUserPlus, FiShare2, FiSettings, FiShield } from 'react-icons/fi';
import Sidebar from '@/app/components/Sidebar';

// Updated brand colors with #2245ae
const primaryBlue = "#2245ae";
const darkBlue = "#1a3a9c";
const lightBlue = "#eef2ff";

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

interface ReferrerDisplay {
  _id: string;
  username?: string;
  email: string;
  referralCode: string;
  referrerDetails?: {
    company?: string;
    position?: string;
    experience?: string;
  };
  workDetails?: {
    currentCompany?: string;
    jobTitle?: string;
  };
  jobReferrerDetails?: {
    areasOfExpertise?: string[];
    industries?: string[];
  };
  onboardingStatus: string;
  createdAt: string;
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisWeek: number;
  userGrowth: number;
  totalReferrers: number;
  activeReferrers: number;
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

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const cardAnimation = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

const hoverEffect = {
  y: -8,
  scale: 1.02,
  boxShadow: "0 20px 40px rgba(34, 69, 174, 0.15)",
  transition: {
    type: "spring",
    stiffness: 300,
    damping: 20
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
  const [referrers, setReferrers] = useState<ReferrerDisplay[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    newUsersThisWeek: 0,
    userGrowth: 0,
    totalReferrers: 0,
    activeReferrers: 0
  });
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [message, setMessage] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'referrers'>('users');
  const [actualUserRole, setActualUserRole] = useState(user?.role || 'admin');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [checkingSuperAdmin, setCheckingSuperAdmin] = useState(true);

  // Check if user is super admin using the API
  const checkSuperAdminStatus = useCallback(async () => {
    if (!user || user.role !== 'admin') {
      setCheckingSuperAdmin(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setCheckingSuperAdmin(false);
        return;
      }

      const response = await fetch('/api/auth/check-super-admin', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Super admin check response:', data);
        
        if (data.isSuperAdmin) {
          setIsSuperAdmin(true);
          setActualUserRole('super_admin');
        } else {
          setIsSuperAdmin(false);
          setActualUserRole('admin');
        }
      } else {
        console.error('Failed to check super admin status:', response.status);
        setIsSuperAdmin(false);
        setActualUserRole('admin');
      }
    } catch (error) {
      console.error('Error checking super admin status:', error);
      setIsSuperAdmin(false);
      setActualUserRole('admin');
    } finally {
      setCheckingSuperAdmin(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      checkSuperAdminStatus();
    } else {
      setCheckingSuperAdmin(false);
    }
  }, [user, checkSuperAdminStatus]);

  /**
   * Calculate real-time statistics from users data
   */
  const calculateStats = useCallback((usersData: UserDisplay[], referrersData: ReferrerDisplay[]): DashboardStats => {
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

    const activeReferrers = referrersData.filter(r => r.onboardingStatus === 'completed').length;

    return {
      totalUsers: usersData.length,
      activeUsers,
      newUsersThisWeek,
      userGrowth,
      totalReferrers: referrersData.length,
      activeReferrers
    };
  }, []);

  /**
   * Fetches the list of users from the API - COMPLETELY FIXED VERSION
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

      console.log('🟡 Fetching users from API...');

      // Fetch users
      const usersResponse = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });

      const usersData = await usersResponse.json();

      if (!usersResponse.ok) throw new Error(usersData.error || 'Failed to fetch users');

      console.log('🟢 Users API response:', usersData);

      // Fetch referrers
      const referrersResponse = await fetch('/api/referrers', {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });

      const referrersData = await referrersResponse.json();

      if (!referrersResponse.ok) throw new Error(referrersData.error || 'Failed to fetch referrers');

      console.log('🟢 Referrers API response:', referrersData);

      if (Array.isArray(usersData.users)) {
        // Filter out the currently logged-in admin and process user roles
        let filteredUsers = usersData.users
          .filter((u: UserDisplay) => u._id !== user._id)
          .map((userItem: UserDisplay) => {
            // DEBUG: Log the raw data for each user
            console.log(`🔍 Raw user data for ${userItem.email}:`, {
              role: userItem.role,
              isSuperAdmin: userItem.isSuperAdmin,
              hasIsSuperAdmin: 'isSuperAdmin' in userItem
            });

            // Determine the actual role - FIXED LOGIC
            let actualRole = userItem.role;
            let actualIsSuperAdmin = userItem.isSuperAdmin;

            // If user has isSuperAdmin flag set to true, override role to super_admin
            if (userItem.isSuperAdmin === true) {
              actualRole = 'super_admin';
              actualIsSuperAdmin = true;
            }

            console.log(`✅ Processed: ${userItem.email} -> role: ${actualRole}, isSuperAdmin: ${actualIsSuperAdmin}`);

            return {
              ...userItem,
              role: actualRole,
              isSuperAdmin: actualIsSuperAdmin
            };
          });

        console.log('🟢 Final processed users:', filteredUsers);
        setUsers(filteredUsers);
        
        // Set referrers
        if (Array.isArray(referrersData.referrers)) {
          setReferrers(referrersData.referrers);
        } else {
          console.error('Invalid referrers data format from server');
          setReferrers([]);
        }
        
        // Calculate and set real stats
        const calculatedStats = calculateStats(filteredUsers, referrersData.referrers || []);
        setStats(calculatedStats);
        
        setStatsLoading(false);
      } else {
        console.error('Invalid data format from server');
        setFetchError('Failed to fetch users: Invalid data format from server.');
        setUsers([]);
        setReferrers([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      let errorMessage = 'Failed to fetch data. Please check your network connection.';
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
    if (!authLoading && isAuthenticated && user && user.role === 'admin' && !checkingSuperAdmin) {
      const handler = setTimeout(() => fetchUsers(), 500);

      return () => {
        clearTimeout(handler);
      };
    }
  }, [authLoading, isAuthenticated, user, fetchUsers, searchQuery, filterStatus, checkingSuperAdmin]);

  useEffect(() => {
    if (authLoading || checkingSuperAdmin) return;

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
  }, [authLoading, isAuthenticated, user, router, checkingSuperAdmin]);

  const handleRefresh = () => {
    fetchUsers(true);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] text-white';
      case 'super_admin':
        return 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white';
      case 'job_poster':
        return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white';
      case 'job_seeker':
        return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white';
      case 'job_referrer':
        return 'bg-gradient-to-r from-orange-500 to-amber-600 text-white';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
    }
  };

  const renderStatsCards = () => {
    if (statsLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4].map((item) => (
            <motion.div
              key={item}
              variants={cardAnimation}
              className="bg-white p-6 rounded-2xl shadow-lg border border-[#2245ae]/10"
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
        title: 'Total Users',
        value: stats.totalUsers,
        description: 'All registered users',
        icon: FiUsers,
        color: 'from-[#2245ae] to-[#1a3a9c]',
        bgColor: 'bg-gradient-to-br from-[#2245ae]/10 to-[#1a3a9c]/10',
        textColor: 'text-[#2245ae]'
      },
      {
        title: 'Active Users',
        value: stats.activeUsers,
        description: 'Currently active users',
        icon: FiActivity,
        color: 'from-green-500 to-emerald-600',
        bgColor: 'bg-gradient-to-br from-green-100 to-emerald-50',
        textColor: 'text-green-600'
      },
      {
        title: 'Active Referrers',
        value: stats.activeReferrers,
        description: 'Completed onboarding',
        icon: FiUserCheck,
        color: 'from-orange-500 to-amber-600',
        bgColor: 'bg-gradient-to-br from-orange-100 to-amber-50',
        textColor: 'text-orange-600'
      },
      {
        title: 'User Growth',
        value: `${stats.userGrowth > 0 ? '+' : ''}${stats.userGrowth}%`,
        description: 'Weekly growth rate',
        icon: FiBarChart2,
        color: 'from-purple-500 to-purple-600',
        bgColor: 'bg-gradient-to-br from-purple-100 to-purple-50',
        textColor: 'text-purple-600'
      }
    ];

    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6"
      >
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            variants={cardAnimation}
            whileHover={hoverEffect}
            className="bg-white p-6 rounded-2xl shadow-lg border border-[#2245ae]/10 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">{stat.title}</p>
                <h3 className="text-3xl font-bold text-[#1a3a9c] mb-1">
                  {stat.value}
                </h3>
                <p className="text-gray-500 text-xs">
                  {stat.description}
                </p>
              </div>
              <div className={`p-4 rounded-2xl ${stat.bgColor}`}>
                <stat.icon className={`w-7 h-7 ${stat.textColor}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    );
  };

  const renderUsersList = () => {
    // DEBUG: Log current users data
    console.log('🔍 CURRENT USERS DATA FOR DISPLAY:', users);

    if (fetchLoading && !refreshing) {
      return (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="animate-pulse bg-white p-6 rounded-2xl border border-[#2245ae]/10">
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

    const currentData = activeTab === 'users' ? users : referrers;
    const isUsersTab = activeTab === 'users';

    if (currentData.length === 0) {
      const noDataMessage = searchQuery || filterStatus !== 'all' 
        ? `No ${isUsersTab ? 'users' : 'referrers'} match your current filters. Try adjusting your search criteria.`
        : `No ${isUsersTab ? 'users' : 'referrers'} found in the system.`;

      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16 px-4"
        >
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-[#2245ae]/10 to-[#1a3a9c]/10 rounded-2xl flex items-center justify-center mb-6">
            {isUsersTab ? (
              <FiUsers className="h-10 w-10 text-[#2245ae]" />
            ) : (
              <FiUserPlus className="h-10 w-10 text-[#2245ae]" />
            )}
          </div>
          <h3 className="text-xl font-bold text-[#1a3a9c] mb-2">
            {searchQuery || filterStatus !== 'all' ? 'No matches found' : `No ${isUsersTab ? 'users' : 'referrers'} yet`}
          </h3>
          <p className="text-[#2245ae] text-base mb-6 max-w-md mx-auto">
            {noDataMessage}
          </p>
          {!searchQuery && filterStatus === 'all' && isUsersTab && (
            <Link href="/admin/create-user" passHref>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] text-white rounded-xl font-medium hover:from-[#2a55cc] hover:to-[#2242a8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2245ae] transition-all duration-200 shadow-lg hover:shadow-xl"
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
      <div className="space-y-4">
        <AnimatePresence>
          {currentData.map((item) => {
            // DEBUG: Log each item being rendered
            console.log(`🎯 Rendering user card for:`, {
              email: item.email,
              role: item.role,
              isSuperAdmin: item.isSuperAdmin,
              hasIsSuperAdmin: 'isSuperAdmin' in item
            });

            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                whileHover={hoverEffect}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 25 
                }}
                className="bg-white rounded-2xl border border-[#2245ae]/10 p-6 transition-all duration-300 group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="relative"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2245ae]/10 to-[#1a3a9c]/10 flex items-center justify-center text-[#2245ae] font-bold text-lg">
                        {item.username?.charAt(0).toUpperCase() || item.email.charAt(0).toUpperCase()}
                      </div>
                      {'status' in item && item.status === 'active' && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </motion.div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                        <h4 className="text-lg font-bold text-[#1a3a9c] truncate">
                          {item.username || 'Unnamed User'}
                        </h4>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm">
                        <p className="text-gray-600 flex items-center">
                          <FiMail className="w-4 h-4 mr-2 text-[#2245ae]" />
                          {item.email}
                        </p>
                        
                        {/* Role Badge - FIXED: Now shows proper role */}
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          getRoleColor(item.role)
                        }`}>
                          {item?.role?.replace('_', ' ').toUpperCase() || 'Referrer'}
                        </span>
                        
                        {'status' in item ? (
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            item.status === 'active' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {item.status === 'active' ? (
                              <FiCheckCircle className="w-3 h-3 mr-1" />
                            ) : (
                              <FiXCircle className="w-3 h-3 mr-1" />
                            )}
                            {item.status}
                          </span>
                        ) : (
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            item.onboardingStatus === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {item.onboardingStatus === 'completed' ? (
                              <FiCheckCircle className="w-3 h-3 mr-1" />
                            ) : (
                              <FiClock className="w-3 h-3 mr-1" />
                            )}
                            {item.onboardingStatus}
                          </span>
                        )}
                      </div>

                      {/* Referrer Specific Details */}
                      {'referrerDetails' in item && item.referrerDetails && (
                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
                          {item.referrerDetails.company && (
                            <span className="flex items-center">
                              <FiTarget className="w-3 h-3 mr-1" />
                              {item.referrerDetails.company}
                            </span>
                          )}
                          {item.referrerDetails.position && (
                            <span>{item.referrerDetails.position}</span>
                          )}
                          {item.workDetails?.jobTitle && (
                            <span>{item.workDetails.jobTitle}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Edit Button - Only show for users (not referrers) and if current user is super admin */}
                  {'role' in item && isSuperAdmin && (
                    <div className="flex items-center gap-3">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Link href={`/admin/edit-user/${item._id}`} passHref>
                          <button className="p-3 bg-[#2245ae]/10 text-[#2245ae] rounded-xl hover:bg-[#2245ae]/20 transition-all duration-200 group" title="Edit">
                            <FiEdit className="w-5 h-5" />
                          </button>
                        </Link>
                      </motion.div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    );
  };

  if (authLoading || checkingSuperAdmin || !isAuthenticated || !user || user.firstLogin || user.role !== 'admin') {
    return (
      <div className={`flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[${lightBlue}] justify-center items-center font-inter`}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center"
        >
          <motion.div
            animate={pulseEffect}
            className="rounded-full p-4 bg-[#2245ae]/10 shadow-inner"
          >
            <FiLoader className="text-[#2245ae] h-12 w-12 animate-spin" />
          </motion.div>
          <p className="mt-6 text-lg font-medium text-[#1a3a9c]">
            {checkingSuperAdmin ? 'Checking permissions...' : 'Loading admin panel...'}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[${lightBlue}] overflow-hidden font-inter`}>
      <Sidebar userRole={actualUserRole} onLogout={logout} isOpen={mobileSidebarOpen} setIsOpen={setMobileSidebarOpen} userEmail={user?.email}/>

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden bg-white/95 backdrop-blur-md shadow-sm p-4 flex items-center justify-between sticky top-0 z-10 border-b border-[#2245ae]/10">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-xl text-[#2245ae] hover:bg-[#2245ae]/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#2245ae] transition-all duration-200"
            aria-label="Open sidebar"
          >
            <FiMenu className="h-6 w-6" />
          </motion.button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] bg-clip-text text-transparent">
            {isSuperAdmin ? 'Super Admin Panel' : 'Admin Panel'}
          </h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            className="p-2 rounded-xl text-[#2245ae] hover:bg-[#2245ae]/10 transition-all duration-200"
          >
            <FiRefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
            {/* Header Section */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
            >
              <div className="flex-1">
                <motion.h1 
                  className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1a3a9c] leading-tight"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] bg-clip-text text-transparent">
                    Welcome back, {user.username || (isSuperAdmin ? 'Super Admin' : 'Admin')}!
                  </span>
                </motion.h1>
                <motion.p 
                  className="text-[#2245ae] text-lg md:text-xl mt-2 md:mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {isSuperAdmin 
                    ? 'Full system access - Manage users, referrers, and platform settings' 
                    : 'Manage your users, referrers and platform settings with ease'
                  }
                </motion.p>
                
                {/* Super Admin Badge */}
                {isSuperAdmin && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="inline-flex items-center mt-3 px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-full text-sm font-bold"
                  >
                    <FiShield className="w-4 h-4 mr-2" />
                    SUPER ADMINISTRATOR
                  </motion.div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRefresh}
                  className="flex items-center justify-center px-6 py-3 bg-white border border-[#2245ae]/20 rounded-xl shadow-sm text-base font-medium text-[#1a3a9c] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2245ae] transition-all duration-200"
                >
                  <FiRefreshCw className={`w-5 h-5 mr-3 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh Data
                </motion.button>
                
                {isSuperAdmin && (
                  <Link href="/admin/create-user" passHref>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-[#2a55cc] hover:to-[#2242a8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2245ae] transition-all duration-200"
                    >
                      <FiPlus className="w-5 h-5 mr-3" />
                      New User
                    </motion.button>
                  </Link>
                )}

                <Link href="/admin/generate-referral" passHref>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-center px-6 py-3 bg-white border border-[#2245ae]/20 rounded-xl shadow-sm text-base font-medium text-[#1a3a9c] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2245ae] transition-all duration-200"
                  >
                    <FiZap className="w-5 h-5 mr-3 text-[#2245ae]" />
                    Referral Codes
                  </motion.button>
                </Link>
              </div>
            </motion.div>

            {/* Stats Cards */}
            {renderStatsCards()}

            {/* Users/Referrers Section */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg border border-[#2245ae]/10 overflow-hidden"
            >
              {/* Section Header with Tabs */}
              <div className="px-6 py-5 border-b border-[#2245ae]/10 bg-gradient-to-r from-[#2245ae]/5 to-transparent">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-[#1a3a9c] flex items-center">
                      {activeTab === 'users' ? (
                        <FiUsers className="mr-3 text-[#2245ae]" />
                      ) : (
                        <FiUserPlus className="mr-3 text-[#2245ae]" />
                      )}
                      {activeTab === 'users' ? 'User Management' : 'Referrer Management'}
                    </h2>
                    <p className="text-[#2245ae] text-sm mt-1">
                      {activeTab === 'users' 
                        ? 'Manage all platform users and their permissions' 
                        : 'View job referrers and their onboarding status'
                      }
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Tab Switcher */}
                    <div className="flex bg-gray-100 rounded-xl p-1">
                      <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          activeTab === 'users'
                            ? 'bg-white text-[#2245ae] shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        <FiUsers className="inline w-4 h-4 mr-2" />
                        Users ({users.length})
                      </button>
                      <button
                        onClick={() => setActiveTab('referrers')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          activeTab === 'referrers'
                            ? 'bg-white text-[#2245ae] shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        <FiUserPlus className="inline w-4 h-4 mr-2" />
                        Referrers ({referrers.length})
                      </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full sm:w-80">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#2245ae]">
                        <FiSearch className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        className="block w-full p-3 pl-10 text-base text-[#1a3a9c] border border-[#2245ae]/20 rounded-xl bg-white focus:ring-2 focus:ring-[#2245ae] focus:border-[#2245ae] shadow-sm transition-all duration-200"
                        placeholder={`Search ${activeTab}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    {/* Status Filter - Only for users tab */}
                    {activeTab === 'users' && (
                      <div className="relative w-full sm:w-48">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#2245ae]">
                          <FiFilter className="h-5 w-5" />
                        </div>
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                          className="block appearance-none w-full bg-white border border-[#2245ae]/20 text-[#1a3a9c] py-3 px-4 pl-10 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2245ae] focus:border-[#2245ae] transition-all shadow-sm cursor-pointer"
                        >
                          <option value="all">All Statuses</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#2245ae]">
                          <FiChevronDown className="h-5 w-5" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Users/Referrers List */}
              <div className="p-6">
                {renderUsersList()}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}