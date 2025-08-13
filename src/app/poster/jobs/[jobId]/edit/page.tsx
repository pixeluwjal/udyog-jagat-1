'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Sidebar from '@/app/components/Sidebar';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Head from 'next/head';

import { FiBriefcase, FiMapPin, FiUsers, FiMenu, FiXCircle, FiSave, FiChevronLeft, FiLoader, FiCheckCircle, FiChevronDown } from 'react-icons/fi';

// Brand colors
const primaryBlue = "#165BF8";
const darkBlue = "#1C3991";
const lightBlue = "#E9F2FF";
const blueGray900 = "#1F2937";
const blueGray600 = "#4B5563";

// Interface for job data - should match IJob from models/Job.ts
interface JobData {
    _id: string;
    title: string;
    description: string;
    location: string;
    salary?: number;
    status: 'active' | 'inactive' | 'closed';
    numberOfOpenings: number;
    company: string;
    jobType: 'Full-time' | 'Part-time' | 'Contract' | 'Temporary' | 'Internship';
    skills: string[];
    companyLogo?: string;
    postedBy: string;
    createdAt: string;
    updatedAt: string;
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

const pulseEffect = {
    scale: [1, 1.03, 1],
    opacity: [0.8, 1, 0.8],
    transition: { 
        duration: 1.2, 
        repeat: Infinity, 
        ease: "easeInOut" 
    }
};

export default function EditJobPage() {
    const { user, loading: authLoading, isAuthenticated, token, logout } = useAuth();
    const router = useRouter();
    const params = useParams();
    const jobId = params.jobId as string;

    const [job, setJob] = useState<JobData | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Form states
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [salary, setSalary] = useState<number | ''>('');
    const [company, setCompany] = useState('');
    const [jobType, setJobType] = useState<JobData['jobType']>('Full-time');
    const [skills, setSkills] = useState(''); // Comma-separated string for input
    const [numberOfOpenings, setNumberOfOpenings] = useState<number | ''>('');
    const [status, setStatus] = useState<JobData['status']>('active');

    // Redirection and Auth Check
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

        if (user.role !== 'job_poster' && user.role !== 'admin') {
            router.push('/'); // Redirect if not authorized
            return;
        }
    }, [authLoading, isAuthenticated, user, router]);

    // Fetch Job Data
    const fetchJob = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token || !jobId) {
                throw new Error('Authentication token or Job ID not available.');
            }

            const response = await fetch(`/api/jobs/${jobId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch job details');
            }

            if (!data.job) {
                throw new Error('Job data not found in the server response, even though request was successful.');
            }
            
            // Check if the current user is authorized to edit this job
            if (user?.role !== 'admin' && data.job.postedBy !== user?._id) {
                router.push('/poster/dashboard');
                return;
            }

            setJob(data.job);
            // Pre-populate form fields
            setTitle(data.job.title);
            setDescription(data.job.description);
            setLocation(data.job.location);
            setSalary(data.job.salary || '');
            setCompany(data.job.company);
            setJobType(data.job.jobType);
            setSkills(data.job.skills ? data.job.skills.join(', ') : '');
            setNumberOfOpenings(data.job.numberOfOpenings);
            setStatus(data.job.status);

        } catch (err: any) {
            console.error('Error fetching job:', err);
            setError(err.message || 'Failed to load job details.');
        } finally {
            setLoading(false);
        }
    }, [token, jobId, user, router]);

    useEffect(() => {
        if (!authLoading && (user?.role === 'job_poster' || user?.role === 'admin') && jobId) {
            fetchJob();
        }
    }, [authLoading, user, jobId, fetchJob]);

    // Handle Form Submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        if (!jobId) {
            setError('Job ID is missing.');
            setSubmitting(false);
            return;
        }

        const updatedSkills = skills.split(',').map(s => s.trim()).filter(s => s.length > 0);
        
        const updatedJobData: Partial<JobData> = {
            title,
            description,
            location,
            company,
            jobType,
            skills: updatedSkills,
            numberOfOpenings: Number(numberOfOpenings),
            status, // Now always included in the payload
        };
        
        if (salary !== '') {
            updatedJobData.salary = Number(salary);
        }

        try {
            const response = await fetch(`/api/jobs/${jobId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(updatedJobData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update job');
            }

            setSuccessMessage('Job updated successfully!');
            fetchJob();
        } catch (err: any) {
            console.error('Error updating job:', err);
            setError(err.message || 'An unexpected error occurred during update.');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    if (authLoading || !isAuthenticated || !user || user.firstLogin || (user.role !== 'job_poster' && user.role !== 'admin')) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] justify-center items-center font-inter">
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
                        Loading page...
                    </p>
                </motion.div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] justify-center items-center font-inter">
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
                        Fetching job details...
                    </p>
                </motion.div>
            </div>
        );
    }

    if (error && !job) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] justify-center items-center font-inter">
                <div className="text-center bg-white p-8 rounded-2xl shadow-lg border border-red-200">
                    <FiXCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
                    <h3 className="mt-2 text-xl font-semibold text-[#1C3991]">Error Loading Job</h3>
                    <p className="mt-1 text-base text-gray-600">{error}</p>
                    <div className="mt-6">
                        <Link href="/poster/posted-jobs" passHref>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-xl text-white bg-[#165BF8] hover:bg-[#1a65ff] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#165BF8]/50 transition-all duration-200"
                            >
                                <FiChevronLeft className="-ml-1 mr-2 h-5 w-5" />
                                Back to Posted Jobs
                            </motion.button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] overflow-hidden font-inter">
            <Head>
                <title>Edit Job - {job?.title || 'JobConnect'}</title>
            </Head>
            <Sidebar userRole={user.role} onLogout={logout} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex-1 flex flex-col overflow-y-auto">
                {/* Mobile Header */}
                <div className="md:hidden bg-white/95 backdrop-blur-md shadow-sm p-4 flex items-center justify-between relative z-10">
                    <button
                        onClick={toggleSidebar}
                        className="p-2 rounded-lg text-[#165BF8] hover:bg-[#165BF8]/10 focus:outline-none"
                        aria-label="Open sidebar"
                    >
                        <FiMenu className="h-6 w-6" />
                    </button>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent text-center absolute left-1/2 -translate-x-1/2">
                        Edit Job
                    </h1>
                    <div className="h-6 w-6"></div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-4xl mx-auto">
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={fadeIn}
                            className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4"
                        >
                            <div>
                                <h1 className="text-3xl md:text-4xl font-extrabold text-[#1F2937] leading-tight">
                                    <span className="bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent">
                                        Edit Job
                                    </span>
                                </h1>
                                <p className="text-gray-500 text-lg mt-1">Update the details of your job posting</p>
                            </div>
                            <Link href="/poster/posted-jobs" passHref>
                                <motion.button
                                    whileHover={{ scale: 1.02, boxShadow: `0 8px 16px ${primaryBlue}20` }}
                                    whileTap={{ scale: 0.98 }}
                                    className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-xl text-white bg-gradient-to-r from-[#165BF8] to-[#1C3991] hover:from-[#1a65ff] hover:to-[#2242a8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#165BF8]/50 transition-all duration-200 w-full sm:w-auto"
                                >
                                    <FiChevronLeft className="-ml-1 mr-2 h-5 w-5" />
                                    Back to Posted Jobs
                                </motion.button>
                            </Link>
                        </motion.div>

                        <AnimatePresence>
                            {successMessage && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-green-50 border-l-4 border-green-400 p-4 mb-6 rounded-lg text-green-700 font-medium"
                                >
                                    <div className="flex items-center">
                                        <FiCheckCircle className="h-5 w-5 text-green-400 mr-2" />
                                        <p className="text-sm">{successMessage}</p>
                                    </div>
                                </motion.div>
                            )}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-lg text-red-700 font-medium"
                                >
                                    <div className="flex items-center">
                                        <FiXCircle className="h-5 w-5 text-red-400 mr-2" />
                                        <p className="text-sm">{error}</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {job && (
                            <motion.form
                                onSubmit={handleSubmit}
                                initial="hidden"
                                animate="visible"
                                variants={fadeIn}
                                className="bg-white shadow-lg rounded-2xl p-6 md:p-8 border border-[#165BF8]/10"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Job Title */}
                                    <div className="space-y-2">
                                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Job Title</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiBriefcase className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="text"
                                                name="title"
                                                id="title"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                required
                                                className="block w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#165BF8] focus:border-[#165BF8] placeholder-gray-400 transition duration-200 shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Company Name */}
                                    <div className="space-y-2">
                                        <label htmlFor="company" className="block text-sm font-medium text-gray-700">Company Name</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiUsers className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="text"
                                                name="company"
                                                id="company"
                                                value={company}
                                                onChange={(e) => setCompany(e.target.value)}
                                                required
                                                className="block w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#165BF8] focus:border-[#165BF8] placeholder-gray-400 transition duration-200 shadow-sm"
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Location */}
                                    <div className="space-y-2">
                                        <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiMapPin className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="text"
                                                name="location"
                                                id="location"
                                                value={location}
                                                onChange={(e) => setLocation(e.target.value)}
                                                required
                                                className="block w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#165BF8] focus:border-[#165BF8] placeholder-gray-400 transition duration-200 shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Job Type */}
                                    <div className="space-y-2">
                                        <label htmlFor="jobType" className="block text-sm font-medium text-gray-700">Job Type</label>
                                        <div className="relative">
                                            <select
                                                id="jobType"
                                                name="jobType"
                                                value={jobType}
                                                onChange={(e) => setJobType(e.target.value as JobData['jobType'])}
                                                required
                                                className="block w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#165BF8] focus:border-[#165BF8] placeholder-gray-400 transition duration-200 shadow-sm appearance-none pr-10"
                                            >
                                                <option value="Full-time">Full-time</option>
                                                <option value="Part-time">Part-time</option>
                                                <option value="Contract">Contract</option>
                                                <option value="Temporary">Temporary</option>
                                                <option value="Internship">Internship</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                                <FiChevronDown className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Salary */}
                                    <div className="space-y-2">
                                        <label htmlFor="salary" className="block text-sm font-medium text-gray-700">Salary (INR, optional)</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-gray-400">₹</span>
                                            </div>
                                            <input
                                                type="number"
                                                name="salary"
                                                id="salary"
                                                value={salary}
                                                onChange={(e) => setSalary(e.target.value === '' ? '' : Number(e.target.value))}
                                                min="0"
                                                className="block w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#165BF8] focus:border-[#165BF8] placeholder-gray-400 transition duration-200 shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Number of Openings */}
                                    <div className="space-y-2">
                                        <label htmlFor="numberOfOpenings" className="block text-sm font-medium text-gray-700">No. of Openings</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiUsers className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="number"
                                                name="numberOfOpenings"
                                                id="numberOfOpenings"
                                                value={numberOfOpenings}
                                                onChange={(e) => setNumberOfOpenings(e.target.value === '' ? '' : Number(e.target.value))}
                                                required
                                                min="0"
                                                className="block w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#165BF8] focus:border-[#165BF8] placeholder-gray-400 transition duration-200 shadow-sm"
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Skills */}
                                    <div className="space-y-2 col-span-1 md:col-span-2">
                                        <label htmlFor="skills" className="block text-sm font-medium text-gray-700">Skills (comma-separated)</label>
                                        <textarea
                                            name="skills"
                                            id="skills"
                                            rows={2}
                                            value={skills}
                                            onChange={(e) => setSkills(e.target.value)}
                                            placeholder="e.g., JavaScript, React, Node.js"
                                            className="block w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#165BF8] focus:border-[#165BF8] placeholder-gray-400 transition duration-200 shadow-sm"
                                        ></textarea>
                                    </div>

                                    {/* Job Status - Now editable for all users */}
                                    <div className="space-y-2 col-span-1 md:col-span-2">
                                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">Job Status</label>
                                        <div className="relative">
                                            <select
                                                id="status"
                                                name="status"
                                                value={status}
                                                onChange={(e) => setStatus(e.target.value as JobData['status'])}
                                                className="block w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#165BF8] focus:border-[#165BF8] placeholder-gray-400 transition duration-200 shadow-sm appearance-none pr-10"
                                            >
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                                <option value="closed">Closed</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                                <FiChevronDown className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Description */}
                                    <div className="mt-6 col-span-1 md:col-span-2">
                                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Job Description</label>
                                        <textarea
                                            name="description"
                                            id="description"
                                            rows={6}
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            required
                                            className="block w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#165BF8] focus:border-[#165BF8] placeholder-gray-400 transition duration-200 shadow-sm"
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="mt-8 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 border-t border-gray-100 pt-6">
                                    <Link href="/poster/posted-jobs" passHref>
                                        <motion.button
                                            type="button"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="px-6 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#165BF8]/50 transition-all duration-200 w-full sm:w-auto"
                                        >
                                            Cancel
                                        </motion.button>
                                    </Link>
                                    <motion.button
                                        type="submit"
                                        disabled={submitting}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={`inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-xl font-medium text-white bg-gradient-to-r from-[#165BF8] to-[#1C3991] hover:from-[#1a65ff] hover:to-[#2242a8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#165BF8]/50 shadow-sm transition-all duration-200 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {submitting ? (
                                            <>
                                                <FiLoader className="animate-spin -ml-1 mr-3 h-5 w-5" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <FiSave className="-ml-1 mr-3 h-5 w-5" />
                                                Save Changes
                                            </>
                                        )}
                                    </motion.button>
                                </div>
                            </motion.form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}