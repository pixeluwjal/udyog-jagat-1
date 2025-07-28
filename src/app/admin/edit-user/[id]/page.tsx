// app/admin/edit-user/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiMail, FiTag, FiSave, FiArrowLeft, FiHardDrive, FiMenu } from 'react-icons/fi';
import Sidebar from '@/app/components/Sidebar';

// Re-using the User interface from AuthContext for consistency
interface UserDisplay {
    _id: string;
    username: string;
    email: string;
    role: 'job_seeker' | 'job_poster' | 'admin';
    // Removed: firstLogin: boolean;
    // Removed: isSuperAdmin: boolean;
    // Removed: onboardingStatus: 'pending' | 'completed';
    resumeGridFsId?: string; // Changed to string for display/handling
    candidateDetails?: {
        fullName?: string;
        phone?: string;
        skills?: string[];
        experience?: string;
    };
    jobPosterDetails?: {
        companyName?: string;
        // ... other job poster specific fields
    };
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

            // Ensure the fetched user data matches the `UserDisplay` interface
            // by picking only the necessary fields
            const fetchedUser: UserDisplay = {
                _id: data.user._id,
                username: data.user.username,
                email: data.user.email,
                role: data.user.role,
                // These fields are no longer expected or editable by this form:
                // isSuperAdmin: data.user.isSuperAdmin,
                // firstLogin: data.user.firstLogin,
                // onboardingStatus: data.user.onboardingStatus,
                resumeGridFsId: data.user.resumeGridFsId,
                candidateDetails: data.user.candidateDetails,
                jobPosterDetails: data.user.jobPosterDetails,
            };

            setUserData(fetchedUser);
        } catch (err: any) {
            console.error('Failed to fetch user data:', err);
            setError(err.message || 'Failed to fetch user data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [id, isAuthenticated, token, currentUser]);

    useEffect(() => {
        if (!authLoading) {
            // NOTE: The firstLogin and role-based redirects logic
            // is still in AuthContext.tsx. This page assumes it's handled there
            // and an admin has successfully reached here.
            if (!isAuthenticated || !currentUser || currentUser.role !== 'admin') {
                router.push('/login'); // Redirect if not authenticated or not an admin
            } else {
                fetchUserData();
            }
        }
    }, [authLoading, isAuthenticated, currentUser, router, fetchUserData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target; // Removed 'type' and 'checked' as checkboxes are removed

        if (!userData) return;

        // Email field is locked, so no need to handle its change
        // Removed: isSuperAdmin and firstLogin handling

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
            setUserData({ ...userData, [name]: value });
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

        // Prepare data to send, excluding the removed fields
        const dataToSend = {
            username: userData.username,
            // Email is not editable, so don't send it unless explicitly allowed by API for non-edits
            // For now, we'll exclude it from the direct payload if not changed by user input.
            // If your API expects it on every PUT, ensure it's included.
            // For this setup, we assume the API handles it being absent or keeps existing.
            // email: userData.email, // If API requires email to be sent back
            role: userData.role,
            candidateDetails: userData.candidateDetails,
            jobPosterDetails: userData.jobPosterDetails,
            // Removed: isSuperAdmin, firstLogin, onboardingStatus
        };

        try {
            const response = await fetch(`/api/admin/users/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dataToSend) // Send only allowed data
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update user.');
            }

            setMessage('User updated successfully!');
            // fetchUserData(); // Refresh data to show any server-side changes
        } catch (err: any) {
            console.error('Error updating user:', err);
            setError(err.message || 'An unexpected error occurred during update.');
        } finally {
            setIsSaving(false);
        }
    };

    if (authLoading || loading) {
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
                    Loading user data...
                </motion.p>
            </div>
        );
    }

    if (error && !userData) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-blue-50 to-blue-200 justify-center items-center">
                <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-red-100">
                    <FiXCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-700 mb-2">Error</h2>
                    <p className="text-gray-600">{error}</p>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => router.back()}
                        className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors flex items-center mx-auto"
                    >
                        <FiArrowLeft className="mr-2" /> Go Back
                    </motion.button>
                </div>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-blue-50 to-blue-200 justify-center items-center">
                <div className="text-center p-8 bg-white rounded-xl shadow-lg">
                    <h2 className="text-xl font-bold text-gray-700 mb-2">User Not Found</h2>
                    <p className="text-gray-600">The user you are trying to edit does not exist.</p>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => router.push('/admin/dashboard')}
                        className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors flex items-center mx-auto"
                    >
                        <FiArrowLeft className="mr-2" /> Back to Dashboard
                    </motion.button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-blue-50 to-blue-100 overflow-hidden font-sans">
            <Sidebar
                userRole={currentUser?.role || 'job_seeker'}
                onLogout={() => { /* logout handled by context */ }}
                mobileOpen={mobileSidebarOpen}
                setMobileOpen={setMobileSidebarOpen}
            />

            <div className="flex-1 flex flex-col overflow-y-auto">
                {/* Mobile header */}
                <div className="md:hidden bg-white/95 backdrop-blur-md shadow-lg p-4 flex justify-between items-center z-10 sticky top-0">
                    <button
                        onClick={() => setMobileSidebarOpen(true)}
                        className="text-blue-800 hover:text-blue-600 transition-colors p-2 rounded-md hover:bg-blue-50"
                    >
                        <FiMenu className="w-7 h-7" />
                    </button>
                    <div className="flex-1 text-center">
                        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
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
                            className="bg-white rounded-2xl shadow-xl border border-blue-100 p-6 md:p-8 mb-8"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <motion.h1
                                    className="text-3xl md:text-4xl font-extrabold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-900"
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
                                    className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
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
                                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FiUser className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                        </div>
                                        <input
                                            type="text"
                                            name="username"
                                            id="username"
                                            value={userData.username}
                                            onChange={handleChange}
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200"
                                            placeholder="User's name"
                                            required
                                        />
                                    </div>
                                </motion.div>

                                {/* Email (Locked) */}
                                <motion.div variants={fadeIn}>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FiMail className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                        </div>
                                        <input
                                            type="email"
                                            name="email"
                                            id="email"
                                            value={userData.email}
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-100 cursor-not-allowed text-gray-600 sm:text-sm transition-all duration-200"
                                            readOnly // Make it read-only
                                            disabled // Visually indicate it's disabled
                                        />
                                    </div>
                                </motion.div>

                                {/* Role */}
                                <motion.div variants={fadeIn}>
                                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FiTag className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                        </div>
                                        <select
                                            name="role"
                                            id="role"
                                            value={userData.role}
                                            onChange={handleChange}
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm appearance-none transition-all duration-200"
                                            required
                                        >
                                            <option value="job_seeker">Job Seeker</option>
                                            <option value="job_poster">Job Poster</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                </motion.div>

                                {/* Removed: isSuperAdmin checkbox */}
                                {/* Removed: firstLogin checkbox */}
                                {/* Removed: Onboarding Status dropdown */}

                                {/* Resume GridFS ID (Display only for Job Seeker) */}
                                {userData.role === 'job_seeker' && userData.resumeGridFsId && (
                                    <motion.div variants={fadeIn}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Resume ID</label>
                                        <div className="mt-1 relative rounded-md shadow-sm bg-gray-50 p-2 border border-gray-200 text-gray-700 text-sm flex items-center">
                                            <FiHardDrive className="h-5 w-5 text-gray-400 mr-2" />
                                            {userData.resumeGridFsId}
                                            <span className="ml-2 text-xs text-gray-500">(Not editable here)</span>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Candidate Details */}
                                {userData.role === 'job_seeker' && (
                                    <div className="pt-6 border-t border-blue-100 mt-6">
                                        <h3 className="text-xl font-semibold text-gray-800 mb-4">Candidate Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <motion.div variants={fadeIn}>
                                                <label htmlFor="candidateDetails.fullName" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                                <input
                                                    type="text"
                                                    name="candidateDetails.fullName"
                                                    id="candidateDetails.fullName"
                                                    value={userData.candidateDetails?.fullName || ''}
                                                    onChange={handleChange}
                                                    className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    placeholder="Full Name"
                                                />
                                            </motion.div>
                                            <motion.div variants={fadeIn}>
                                                <label htmlFor="candidateDetails.phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                                <input
                                                    type="text"
                                                    name="candidateDetails.phone"
                                                    id="candidateDetails.phone"
                                                    value={userData.candidateDetails?.phone || ''}
                                                    onChange={handleChange}
                                                    className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    placeholder="Phone Number"
                                                />
                                            </motion.div>
                                            <motion.div variants={fadeIn} className="col-span-full">
                                                <label htmlFor="candidateDetails.skills" className="block text-sm font-medium text-gray-700 mb-1">Skills (comma-separated)</label>
                                                <input
                                                    type="text"
                                                    name="candidateDetails.skills"
                                                    id="candidateDetails.skills"
                                                    value={userData.candidateDetails?.skills?.join(', ') || ''}
                                                    onChange={handleChange}
                                                    className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    placeholder="e.g., React, Node.js, AWS"
                                                />
                                            </motion.div>
                                            <motion.div variants={fadeIn} className="col-span-full">
                                                <label htmlFor="candidateDetails.experience" className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
                                                <textarea
                                                    name="candidateDetails.experience"
                                                    id="candidateDetails.experience"
                                                    value={userData.candidateDetails?.experience || ''}
                                                    onChange={handleChange}
                                                    rows={3}
                                                    className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    placeholder="Brief summary of experience"
                                                />
                                            </motion.div>
                                        </div>
                                    </div>
                                )}

                                {/* Job Poster Details */}
                                {userData.role === 'job_poster' && (
                                    <div className="pt-6 border-t border-blue-100 mt-6">
                                        <h3 className="text-xl font-semibold text-gray-800 mb-4">Job Poster Details</h3>
                                        <motion.div variants={fadeIn}>
                                            <label htmlFor="jobPosterDetails.companyName" className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                            <input
                                                type="text"
                                                name="jobPosterDetails.companyName"
                                                id="jobPosterDetails.companyName"
                                                value={userData.jobPosterDetails?.companyName || ''}
                                                onChange={handleChange}
                                                className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                placeholder="Company Name"
                                            />
                                        </motion.div>
                                        {/* Add other job poster fields here as needed */}
                                    </div>
                                )}

                                {/* Submit Button */}
                                <motion.div variants={fadeIn} className="pt-6 border-t border-blue-100 mt-6 flex justify-end">
                                    <motion.button
                                        type="submit"
                                        whileHover={{ scale: 1.03, boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)" }}
                                        whileTap={{ scale: 0.98 }}
                                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={isSaving}
                                    >
                                        {isSaving ? (
                                            <>
                                                <motion.span
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                    className="rounded-full h-5 w-5 border-t-2 border-white-500 border-solid animate-spin mr-2"
                                                />
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