'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUsers, FiActivity, FiClock, FiSearch, FiPlus, FiZap, FiEdit, FiMail, FiMenu, FiCheckCircle, FiXCircle, FiFilter } from 'react-icons/fi'; // Added FiFilter
import Sidebar from '@/app/components/Sidebar';

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
const spring = {
  type: "spring",
  damping: 20,
  stiffness: 300
};

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const stagger = {
  visible: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function AdminDashboardPage() {
  const { user, loading: authLoading, isAuthenticated, logout, token } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserDisplay[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all'); // NEW: State for status filter
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

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to fetch users');

      if (Array.isArray(data.users)) {
        // Filter out the currently logged-in admin
        let filteredUsers = data.users.filter((u: UserDisplay) => u._id !== user._id);

        // Apply status filter based on selected option
        if (filterStatus === 'active') {
          filteredUsers = filteredUsers.filter(u => u.status === 'active');
        } else if (filterStatus === 'inactive') {
          filteredUsers = filteredUsers.filter(u => u.status === 'inactive');
        }
        // If 'all', no further filtering needed here

        setUsers(filteredUsers);
      } else {
        console.error('Invalid data format from server');
        setFetchError('Failed to fetch users: Invalid data format from server.');
        setUsers([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      setFetchError(err.message || 'Failed to fetch users. Please check your network connection.');
    } finally {
      setFetchLoading(false);
    }
  }, [isAuthenticated, token, user, searchQuery, filterStatus]); // Added filterStatus to dependencies

  // Debounce the search query and re-fetch on filterStatus change
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && user.role === 'admin') {
      const handler = setTimeout(() => fetchUsers(), 500);
      return () => clearTimeout(handler);
    }
  }, [authLoading, isAuthenticated, user, fetchUsers, searchQuery, filterStatus]); // Added filterStatus to dependencies

  // Handle redirects on initial load
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

  // --- Loading and Unauthorized States ---

  if (authLoading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-blue-50 to-blue-200 justify-center items-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="ml-4 text-xl font-medium text-gray-700"
        >
          Loading admin dashboard...
        </motion.p>
      </div>
    );
  }

  if (!isAuthenticated || !user || user.firstLogin || user.role !== 'admin') {
    return (
      <div className="flex h-screen bg-gradient-to-br from-blue-50 to-blue-200 justify-center items-center">
        <div className="m-auto text-center p-6 bg-white rounded-xl shadow-lg">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={spring}
            className="text-red-600 text-lg font-semibold mb-2"
          >
            Unauthorized access or password change required
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-gray-600"
          >
            Redirecting...
          </motion.div>
        </div>
      </div>
    );
  }

  // Helper function to render the statistics cards
  const renderStatsCards = () => {
    // Calculate new users this week dynamically
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsersThisWeek = users.filter(u => new Date(u.createdAt) > oneWeekAgo).length;

    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6 md:p-8"
      >
        {/* Total Users (Filtered) */}
        <motion.div
          variants={fadeIn}
          whileHover={{ y: -8, boxShadow: "0 10px 20px rgba(0, 0, 0, 0.1)" }}
          className="bg-white p-6 rounded-xl shadow-md border border-blue-100 flex flex-col justify-between transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Users ({filterStatus === 'all' ? 'All' : filterStatus === 'active' ? 'Active' : 'Inactive'})</p> {/* Dynamic label */}
              <h3 className="text-3xl font-bold mt-1 text-gray-900">{users.length}</h3>
            </div>
            <div className="p-4 rounded-full bg-blue-100 text-blue-600">
              <FiUsers className="w-7 h-7" />
            </div>
          </div>
          <div className="mt-4 text-xs text-blue-600 font-medium">
            <span className="text-green-500 mr-1">&#9650;</span>
            <span>12% growth from last month</span>
          </div>
        </motion.div>

        {/* Active Today (Mock Data) */}
        <motion.div
          variants={fadeIn}
          whileHover={{ y: -8, boxShadow: "0 10px 20px rgba(0, 0, 0, 0.1)" }}
          className="bg-white p-6 rounded-xl shadow-md border border-blue-100 flex flex-col justify-between transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Active Today</p>
              <h3 className="text-3xl font-bold mt-1 text-gray-900">{users.filter(u => u.status === 'active').length}</h3>
            </div>
            <div className="p-4 rounded-full bg-green-100 text-green-600">
              <FiActivity className="w-7 h-7" />
            </div>
          </div>
          <div className="mt-4 text-xs text-green-600 font-medium">
            <span className="text-green-500 mr-1">&#9650;</span>
            <span>8% more than yesterday</span>
          </div>
        </motion.div>

        {/* New This Week */}
        <motion.div
          variants={fadeIn}
          whileHover={{ y: -8, boxShadow: "0 10px 20px rgba(0, 0, 0, 0.1)" }}
          className="bg-white p-6 rounded-xl shadow-md border border-blue-100 flex flex-col justify-between transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">New This Week</p>
              <h3 className="text-3xl font-bold mt-1 text-gray-900">{newUsersThisWeek}</h3>
            </div>
            <div className="p-4 rounded-full bg-indigo-100 text-indigo-600">
              <FiClock className="w-7 h-7" />
            </div>
          </div>
          <div className="mt-4 text-xs text-indigo-600 font-medium">
            <span className="text-green-500 mr-1">&#9650;</span>
            <span>3% up from last week</span>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // Helper function to render the users table
  const renderUsersTable = () => {
    if (fetchLoading) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-12 flex flex-col justify-center items-center text-blue-600"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600"
          />
          <p className="ml-4 mt-4 text-lg font-medium text-gray-700">Fetching user data...</p>
        </motion.div>
      );
    }

    if (users.length === 0) {
      const noUsersMessage = filterStatus === 'active'
        ? 'No active users found. Try adjusting your search or filter.'
        : filterStatus === 'inactive'
        ? 'No inactive users found. Try adjusting your search or filter.'
        : 'No users found. Try adjusting your search.';

      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-12 text-center text-gray-500 text-lg"
        >
          <FiUsers className="w-16 h-16 text-blue-300 mx-auto mb-4" />
          {noUsersMessage}
        </motion.div>
      );
    }

    return (
      <div className="overflow-x-auto pb-6 px-6 md:px-8">
        <table className="min-w-full divide-y divide-blue-100">
          <thead className="bg-blue-50/70">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">User</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">Email</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">Role</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-blue-50">
            {users.map((u) => (
              <motion.tr
                key={u._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                whileHover={{ backgroundColor: 'rgba(239, 246, 255, 0.7)', x: 5 }}
                className="transition-all duration-200"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <motion.div
                      whileHover={{ scale: 1.15, rotate: 5 }}
                      className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-tr from-blue-200 to-blue-300 flex items-center justify-center text-blue-800 font-bold text-lg shadow-sm"
                    >
                      {u.username?.charAt(0).toUpperCase() || u.email.charAt(0).toUpperCase()}
                    </motion.div>
                    <div className="ml-4">
                      <div className="text-base font-medium text-gray-900">{u.username || 'N/A'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  <div className="flex items-center">
                    <FiMail className="mr-2 text-blue-500" />
                    {u.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <motion.span
                    whileHover={{ scale: 1.08 }}
                    className={`px-3 py-1.5 inline-flex text-xs leading-5 font-semibold rounded-full capitalize shadow-sm
                    ${u.role === 'admin' ? 'bg-blue-200 text-blue-800' :
                      u.role === 'job_poster' ? 'bg-indigo-100 text-indigo-700' :
                      u.role === 'job_seeker' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {u.role.replace('_', ' ')}
                  </motion.span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    {u.status === 'active' ? (
                      <span className="text-green-600 font-semibold">
                        <FiCheckCircle className="inline-block mr-1" /> Active
                      </span>
                    ) : (
                      <span className="text-red-600 font-semibold">
                        <FiXCircle className="inline-block mr-1" /> Inactive
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-4">
                    <Link href={`/admin/edit-user/${u._id}`} passHref>
                      <motion.button
                        whileHover={{ scale: 1.2, color: '#3b82f6' }}
                        whileTap={{ scale: 0.9 }}
                        className="text-blue-500 hover:text-blue-700 transition-all duration-200 p-2 rounded-full hover:bg-blue-50"
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

  // --- Main Render Logic ---

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-blue-100 overflow-hidden font-sans">
      <Sidebar
        userRole={user.role}
        onLogout={logout}
        isSidebarOpen={mobileSidebarOpen}
        setIsOpen={setMobileSidebarOpen}
      />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile header */}
        <div className="md:hidden bg-white/95 backdrop-blur-md shadow-lg p-4 flex items-center justify-between relative">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 -ml-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Toggle sidebar"
          >
            <FiMenu className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            Admin Panel
          </h1>
          <div className="w-6 h-6"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-10 gap-4"
            >
              <motion.div variants={fadeIn}>
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 leading-tight">
                  Welcome back, <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">{user.username || 'Admin'}</span>!
                </h1>
                <p className="text-lg text-gray-600 mt-2">Manage your users and platform settings with ease.</p>
              </motion.div>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden mb-8"
            >
              <div className="p-6 md:p-8 border-b border-blue-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex flex-col md:flex-row items-start md:items-center w-full md:w-auto gap-4"> {/* Added gap-4 */}
                  <h2 className="text-2xl font-bold text-gray-800">Users List</h2> {/* Changed heading */}
                  <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto"> {/* Group search and filter */}
                    <div className="relative w-full sm:w-80">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-blue-500">
                        <FiSearch className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        className="block w-full p-3 pl-12 text-base text-gray-900 border border-blue-200 rounded-lg bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200 hover:border-blue-300"
                        placeholder="Search users by email or username..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                      />
                    </div>
                    {/* NEW: Status Filter Dropdown */}
                    <div className="relative w-full sm:w-48">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-blue-500">
                        <FiFilter className="w-5 h-5" />
                      </div>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                        className="block w-full p-3 pl-12 text-base text-gray-900 border border-blue-200 rounded-lg bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200 hover:border-blue-300 appearance-none pr-8"
                      >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
                  <Link href="/admin/create-user" passHref>
                    <motion.button
                      whileHover={{ scale: 1.03, boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)" }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg font-semibold shadow-md transition-all duration-300 transform hover:-translate-y-1 w-full justify-center"
                    >
                      <FiPlus className="w-5 h-5 mr-3" />
                      <span>New User</span>
                    </motion.button>
                  </Link>
                  <Link href="/admin/generate-referral" passHref>
                    <motion.button
                      whileHover={{ scale: 1.03, boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)" }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-800 to-blue-900 text-white rounded-lg font-semibold shadow-md transition-all duration-300 transform hover:-translate-y-1 w-full justify-center"
                    >
                      <FiZap className="w-5 h-5 mr-3" />
                      <span>Referral Codes</span>
                    </motion.button>
                  </Link>
                </div>
              </div>

              <AnimatePresence>
                {fetchError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-red-100/70 text-red-800 border-l-4 border-red-500 rounded-r-lg mx-6 mb-4 text-sm font-medium"
                    role="alert"
                  >
                    {fetchError}
                  </motion.div>
                )}
                {message && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-green-100/70 text-green-800 border-l-4 border-green-500 rounded-r-lg mx-6 mb-4 text-sm font-medium"
                    role="alert"
                  >
                    {message}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {renderStatsCards()}
              
              {renderUsersTable()}

            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
