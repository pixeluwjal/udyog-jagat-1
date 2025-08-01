// app/admin/my-created-users/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar'; // Assuming you have a Sidebar component
import {
  FiMenu, FiUser, FiMail, FiCheckCircle, FiXCircle, FiLoader, FiChevronLeft, FiTag
} from 'react-icons/fi'; // Added FiCheckCircle, FiXCircle, FiTag for status icons

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

export default function MyCreatedUsersPage() {
  const { user, loading: authLoading, isAuthenticated, logout, token } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserDisplay[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for mobile sidebar

  useEffect(() => {
    // Redirection logic for this specific page
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

  // Fetch users created by the current admin
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
      params.append('createdBy', user._id); // Filter by current admin's ID
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

  if (authLoading || !isAuthenticated || !user || user.firstLogin || user.role !== 'admin') {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="m-auto flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4F39F6]"></div>
          <p className="mt-4 text-gray-700">Loading or redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden font-sans">
      {/* Sidebar - Conditionally render for mobile or use Tailwind's hidden/block */}
      <Sidebar userRole={user.role} onLogout={logout} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile Header (visible only on small screens) */}
        <div className="md:hidden bg-white shadow-sm p-4 flex items-center justify-between relative">
          {/* Hamburger Icon */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 -ml-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#4F39F6]"
            aria-label="Toggle sidebar"
          >
            <FiMenu className="w-6 h-6" />
          </button>
          {/* Centered Title */}
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            Created Users
          </h1>
          {/* Empty div for spacing on the right to balance the hamburger */}
          <div className="w-6 h-6"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Desktop Header (hidden on small screens) */}
            <div className="hidden md:flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-[#1A3BAD]">My Created Users</h1>
                <p className="text-gray-600 text-lg">Manage users you have created</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-lg md:text-xl font-semibold text-[#1A3BAD] flex-shrink-0">Your Created Users List</h2>
                
                {/* Search Bar & Back to All Users Button - Flex Container for horizontal alignment on desktop */}
                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-grow w-full md:w-auto">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                      </svg>
                    </div>
                    <input
                      type="text"
                      className="block w-full p-3 pl-10 text-base text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-[#4F39F6] focus:border-[#4F39F6] shadow-sm transition-all duration-200 ease-in-out hover:border-[#4F39F6]"
                      placeholder="Search users by email or username"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          fetchMyCreatedUsers();
                        }
                      }}
                    />
                  </div>
                  <Link href="/admin/dashboard" passHref>
                    <button className="flex items-center px-4 py-2 bg-[#1A3BAD] text-white rounded-lg hover:bg-[#4F39F6] transition-colors w-full md:w-auto justify-center shadow-sm whitespace-nowrap">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      <span className="text-sm md:text-base">Back to All Users</span>
                    </button>
                  </Link>
                </div>
              </div>

              {fetchError && (
                <div className="p-4 mx-4 mb-4 bg-red-100 text-red-700 border-l-4 border-red-500 rounded-r-lg" role="alert">
                  {fetchError}
                </div>
              )}
              {message && (
                <div className="p-4 mx-4 mb-4 bg-green-100 text-green-700 border-l-4 border-green-500 rounded-r-lg" role="alert">
                  {message}
                </div>
              )}

              {fetchLoading ? (
                <div className="p-8 flex justify-center items-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#4F39F6]"></div>
                  <p className="ml-4 text-gray-700">Loading users...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No users found that you have created.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th scope="col" className="px-4 py-3 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th scope="col" className="px-4 py-3 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th scope="col" className="px-4 py-3 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th> {/* NEW: Status Header */}
                        <th scope="col" className="px-4 py-3 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((u) => (
                        <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-4 md:px-6 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 md:h-12 md:w-12 rounded-full bg-indigo-100 flex items-center justify-center text-[#4F39F6] font-bold text-base">
                                {u.username?.charAt(0).toUpperCase() || u.email.charAt(0).toUpperCase()}
                              </div>
                              <div className="ml-3 md:ml-4">
                                <div className="text-sm font-medium text-gray-900">{u.username || 'N/A'}</div>
                                <div className="text-xs md:text-sm text-gray-500">{u.isSuperAdmin ? 'Super Admin' : (u.firstLogin ? 'First Login' : '')}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 md:px-6 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                          <td className="px-4 py-4 md:px-6 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize
                                ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                  u.role === 'job_poster' ? 'bg-blue-100 text-blue-800' :
                                  u.role === 'job_seeker' ? 'bg-green-100 text-green-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}
                            >
                              {u.role.replace('_', ' ')}
                            </span>
                          </td>
                          {/* NEW: Status Display */}
                          <td className="px-4 py-4 md:px-6 whitespace-nowrap text-sm text-gray-600">
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
                          <td className="px-4 py-4 md:px-6 whitespace-nowrap text-sm text-gray-500">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
