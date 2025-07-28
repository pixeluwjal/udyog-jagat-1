// app/admin/dashboard/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUsers, FiActivity, FiClock, FiSearch, FiPlus, FiZap, FiTrash2, FiEdit, FiMail, FiMenu } from 'react-icons/fi';
import Sidebar from '@/app/components/Sidebar';

interface UserDisplay {
  _id: string;
  username?: string;
  email: string;
  role: string;
  firstLogin: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
}

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
  const { user, loading: authLoading, isAuthenticated, logout, token } = useAuth(); // Removed isSuperAdmin from destructuring as it's not directly used for filtering here
  const router = useRouter();

  const [users, setUsers] = useState<UserDisplay[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deletingUserEmail, setDeletingUserEmail] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
      // Request all users, including admins. The filtering for current admin will happen client-side.
      params.append('all', 'true');
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to fetch users');

      if (Array.isArray(data.users)) {
        // Filter out the currently logged-in admin from the displayed list
        // This ensures an admin cannot see their own account in the table,
        // but other admins will be visible.
        const filteredUsers = data.users.filter((u: UserDisplay) => u._id !== user._id);
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
  }, [isAuthenticated, token, user, searchQuery]); // user dependency is important for user._id in filter

  useEffect(() => {
    if (!authLoading && isAuthenticated && user && user.role === 'admin') {
      const handler = setTimeout(() => fetchUsers(), 500);
      return () => clearTimeout(handler);
    }
  }, [authLoading, isAuthenticated, user, fetchUsers, searchQuery]);

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

  // Handle Delete User Confirmation - Now allows deleting any user including admins
  const handleDeleteClick = (userId: string, userEmail: string, userRole: string) => {
    // No client-side role check here, as per requirement to allow admin deletion.
    // However, it's highly recommended to have robust server-side checks for this.
    setDeletingUserId(userId);
    setDeletingUserEmail(userEmail);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deletingUserId || !token) {
      setFetchError('Error: User ID or token missing for deletion.');
      setShowDeleteConfirm(false);
      return;
    }

    setFetchLoading(true);
    setFetchError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${deletingUserId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to delete user');

      // If the deleted user was the currently logged-in user, force logout.
      // This is a critical edge case for self-deletion.
      if (deletingUserId === user?._id) {
        setMessage('Your own account was deleted. Logging out...');
        setTimeout(() => {
          logout(); // This will clear token and redirect to login
        }, 1500); // Give time for message to be seen
      } else {
        setUsers(prevUsers => prevUsers.filter(u => u._id !== deletingUserId));
        setMessage('User deleted successfully!');
      }
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setFetchError(err.message || 'An unexpected error occurred during deletion.');
    } finally {
      // Only reset loading/modal states if not self-deleting (as self-deletion leads to logout)
      if (deletingUserId !== user?._id) {
        setFetchLoading(false);
        setShowDeleteConfirm(false);
        setDeletingUserId(null);
        setDeletingUserEmail(null);
      }
    }
  };

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

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-blue-100 overflow-hidden font-sans">
      <Sidebar
        userRole={user.role}
        onLogout={logout}
        isSidebarOpen={mobileSidebarOpen} // Corrected prop name to match Sidebar component
        setIsOpen={setMobileSidebarOpen} // Corrected prop name to match Sidebar component
      />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile header */}
        <div className="md:hidden bg-white/95 backdrop-blur-md shadow-lg p-4 flex items-center justify-between relative">
          {/* Hamburger Icon */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 -ml-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Toggle sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {/* Centered Title */}
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            Admin Panel
          </h1>
          {/* Empty div for spacing if needed on the right, or remove if not necessary */}
          <div className="w-6 h-6"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
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

            {/* User Management Header with Search and Actions */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden mb-8"
            >
              <div className="p-6 md:p-8 border-b border-blue-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex flex-col md:flex-row items-start md:items-center w-full md:w-auto">
                  <h2 className="text-2xl font-bold text-gray-800 md:mr-6 mb-4 md:mb-0">User Management</h2>
                  <div className="relative w-full md:w-80">
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

              {/* Messages */}
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

              {/* Stats Cards */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={stagger}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6 md:p-8"
              >
                {/* Total Users */}
                <motion.div
                  variants={fadeIn}
                  whileHover={{ y: -8, boxShadow: "0 10px 20px rgba(0, 0, 0, 0.1)" }}
                  className="bg-white p-6 rounded-xl shadow-md border border-blue-100 flex flex-col justify-between transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Total Users</p>
                      {/* Note: users.length here will be the count of users *excluding* the current admin */}
                      <h3 className="text-3xl font-bold mt-1 text-gray-900">{users.length}</h3>
                    </div>
                    <div className="p-4 rounded-full bg-blue-100 text-blue-600">
                      <FiUsers className="w-7 h-7" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center text-xs text-blue-600 font-medium">
                      <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                      <span>12% growth from last month</span>
                    </div>
                  </div>
                </motion.div>

                {/* Active Today */}
                <motion.div
                  variants={fadeIn}
                  whileHover={{ y: -8, boxShadow: "0 10px 20px rgba(0, 0, 0, 0.1)" }}
                  className="bg-white p-6 rounded-xl shadow-md border border-blue-100 flex flex-col justify-between transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Active Today</p>
                      <h3 className="text-3xl font-bold mt-1 text-gray-900">{users.filter(u => !u.firstLogin).length}</h3>
                    </div>
                    <div className="p-4 rounded-full bg-green-100 text-green-600">
                      <FiActivity className="w-7 h-7" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center text-xs text-green-600 font-medium">
                      <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                      <span>8% more than yesterday</span>
                    </div>
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
                      <h3 className="text-3xl font-bold mt-1 text-gray-900">
                        {users.filter(u => new Date(u.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                      </h3>
                    </div>
                    <div className="p-4 rounded-full bg-indigo-100 text-indigo-600">
                      <FiClock className="w-7 h-7" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center text-xs text-indigo-600 font-medium">
                      <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                      <span>3% up from last week</span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Users Table */}
              {fetchLoading ? (
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
              ) : users.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-12 text-center text-gray-500 text-lg"
                >
                  <FiUsers className="w-16 h-16 text-blue-300 mx-auto mb-4" />
                  No users found matching your criteria. Try adjusting your search or add new users.
                </motion.div>
              ) : (
                <div className="overflow-x-auto pb-6 px-6 md:px-8">
                  <table className="min-w-full divide-y divide-blue-100">
                    <thead className="bg-blue-50/70">
                      <tr>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">User</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">Email</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">Role</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider">Created On</th>
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
                            {new Date(u.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
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
                              {/* Delete button is now always visible for all users in the list */}
                              <motion.button
                                whileHover={{ scale: 1.2, color: '#ef4444' }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleDeleteClick(u._id, u.email, u.role)}
                                className="text-red-500 hover:text-red-700 transition-all duration-200 p-2 rounded-full hover:bg-red-50"
                                title="Delete User"
                              >
                                <FiTrash2 className="w-5 h-5" />
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={spring}
              className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-auto border border-blue-100"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Confirm Deletion</h3>
              <p className="text-base text-gray-700 mb-8 text-center">
                Are you sure you want to delete user <span className="font-semibold text-blue-700">{deletingUserEmail}</span>?
                {deletingUserId === user?._id && (
                  <span className="font-bold text-red-600 ml-1">You are about to delete your own account. This will log you out immediately.</span>
                )}
                <br/> This action is irreversible.
              </p>
              <div className="flex justify-center space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-5 py-2.5 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors duration-200"
                  disabled={fetchLoading}
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={confirmDelete}
                  className="flex-1 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold hover:from-red-700 hover:to-red-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={fetchLoading}
                >
                  {fetchLoading ? 'Deleting...' : 'Delete Permanently'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}