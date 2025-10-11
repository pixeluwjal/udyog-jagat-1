'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Sidebar from '@/app/components/Sidebar';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Head from 'next/head';

import { FiBriefcase, FiMapPin, FiUsers, FiMenu, FiXCircle, FiSave, FiChevronLeft, FiLoader, FiCheckCircle, FiChevronDown, FiDollarSign, FiEdit3, FiType, FiBuilding } from 'react-icons/fi';

// Updated brand colors with #2245ae
const primaryBlue = "#2245ae";
const darkBlue = "#1a3a9c";
const lightBlue = "#eef2ff";

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

const pulseEffect = {
    scale: [1, 1.03, 1],
    opacity: [0.8, 1, 0.8],
    transition: { 
        duration: 1.2, 
        repeat: Infinity, 
        ease: "easeInOut" 
    }
};

const hoverEffect = {
    y: -4,
    scale: 1.02,
    boxShadow: "0 20px 40px rgba(34, 69, 174, 0.15)",
    transition: {
        type: "spring",
        stiffness: 300,
        damping: 20
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
            router.push('/');
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
            status,
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
                        Loading page...
                    </p>
                </motion.div>
            </div>
        );
    }

    if (loading) {
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
                        Fetching job details...
                    </p>
                </motion.div>
            </div>
        );
    }

    if (error && !job) {
        return (
            <div className={`flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[${lightBlue}] justify-center items-center font-inter`}>
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={fadeIn}
                    className="text-center bg-white p-8 rounded-2xl shadow-lg border border-[#2245ae]/10 max-w-md w-full mx-4"
                >
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
                        <FiXCircle className="h-8 w-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-[#1a3a9c] mb-2">Error Loading Job</h3>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link href="/poster/posted-jobs" passHref>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="inline-flex items-center px-6 py-3 border border-[#2245ae] text-[#2245ae] rounded-xl font-medium hover:bg-[#2245ae] hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2245ae] transition-all duration-200"
                            >
                                <FiChevronLeft className="mr-2 h-5 w-5" />
                                Back to Jobs
                            </motion.button>
                        </Link>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={fetchJob}
                            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] text-white rounded-xl font-medium hover:from-[#2a55cc] hover:to-[#2242a8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2245ae] transition-all duration-200 shadow-lg"
                        >
                            <FiLoader className="mr-2 h-5 w-5" />
                            Try Again
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className={`flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[${lightBlue}] overflow-hidden font-inter`}>
            <Head>
                <title>Edit Job - {job?.title || 'JobConnect'}</title>
            </Head>
            <Sidebar userRole={user.role} onLogout={logout} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex-1 flex flex-col overflow-y-auto">
                {/* Mobile Header */}
                <div className="md:hidden bg-white/95 backdrop-blur-md shadow-sm p-4 flex items-center justify-between sticky top-0 z-10 border-b border-[#2245ae]/10">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={toggleSidebar}
                        className="p-2 rounded-xl text-[#2245ae] hover:bg-[#2245ae]/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#2245ae] transition-all duration-200"
                        aria-label="Open sidebar"
                    >
                        <FiMenu className="h-6 w-6" />
                    </motion.button>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] bg-clip-text text-transparent">
                        Edit Job
                    </h1>
                    <div className="w-6 h-6"></div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    <div className="max-w-4xl mx-auto">
                        {/* Header Section */}
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={fadeIn}
                            className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6"
                        >
                            <div className="flex-1">
                                <motion.h1 
                                    className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1a3a9c] leading-tight"
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <span className="bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] bg-clip-text text-transparent">
                                        Edit Job
                                    </span>
                                </motion.h1>
                                <motion.p 
                                    className="text-[#2245ae] text-lg md:text-xl mt-2 md:mt-4"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    Update the details of your job posting
                                </motion.p>
                            </div>
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full lg:w-auto"
                            >
                                <Link href="/poster/posted-jobs" passHref>
                                    <button className="inline-flex items-center justify-center w-full lg:w-auto px-6 py-3 bg-white border border-[#2245ae]/20 rounded-xl shadow-sm text-base font-medium text-[#1a3a9c] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2245ae] transition-all duration-200 group">
                                        <FiChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                                        Back to Posted Jobs
                                    </button>
                                </Link>
                            </motion.div>
                        </motion.div>

                        {/* Messages */}
                        <AnimatePresence>
                            {successMessage && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg shadow-sm"
                                >
                                    <div className="flex items-center">
                                        <FiCheckCircle className="h-5 w-5 text-green-500 mr-3" />
                                        <p className="text-green-700 font-medium">{successMessage}</p>
                                    </div>
                                </motion.div>
                            )}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg shadow-sm"
                                >
                                    <div className="flex items-center">
                                        <FiXCircle className="h-5 w-5 text-red-500 mr-3" />
                                        <p className="text-red-700 font-medium">{error}</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {job && (
                            <motion.form
                                onSubmit={handleSubmit}
                                initial="hidden"
                                animate="visible"
                                variants={staggerContainer}
                                className="bg-white shadow-lg rounded-2xl p-6 md:p-8 border border-[#2245ae]/10"
                            >
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                                    {/* Job Title */}
                                    <motion.div
                                        variants={cardAnimation}
                                        whileHover={hoverEffect}
                                        className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-200/50"
                                    >
                                        <label htmlFor="title" className="block text-sm font-semibold text-[#1a3a9c] flex items-center">
                                            <FiType className="mr-2 text-[#2245ae]" />
                                            Job Title
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiBriefcase className="h-5 w-5 text-[#2245ae]/70" />
                                            </div>
                                            <input
                                                type="text"
                                                name="title"
                                                id="title"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                required
                                                className="block w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2245ae] focus:border-[#2245ae] placeholder-gray-400 transition-all duration-200 bg-white shadow-sm"
                                                placeholder="Enter job title"
                                            />
                                        </div>
                                    </motion.div>

                                    {/* Company Name */}
                                    <motion.div
                                        variants={cardAnimation}
                                        whileHover={hoverEffect}
                                        className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-200/50"
                                    >
                                        <label htmlFor="company" className="block text-sm font-semibold text-[#1a3a9c] flex items-center">
                                            <FiBuilding className="mr-2 text-[#2245ae]" />
                                            Company Name
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiUsers className="h-5 w-5 text-[#2245ae]/70" />
                                            </div>
                                            <input
                                                type="text"
                                                name="company"
                                                id="company"
                                                value={company}
                                                onChange={(e) => setCompany(e.target.value)}
                                                required
                                                className="block w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2245ae] focus:border-[#2245ae] placeholder-gray-400 transition-all duration-200 bg-white shadow-sm"
                                                placeholder="Enter company name"
                                            />
                                        </div>
                                    </motion.div>
                                    
                                    {/* Location */}
                                    <motion.div
                                        variants={cardAnimation}
                                        whileHover={hoverEffect}
                                        className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-200/50"
                                    >
                                        <label htmlFor="location" className="block text-sm font-semibold text-[#1a3a9c] flex items-center">
                                            <FiMapPin className="mr-2 text-[#2245ae]" />
                                            Location
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiMapPin className="h-5 w-5 text-[#2245ae]/70" />
                                            </div>
                                            <input
                                                type="text"
                                                name="location"
                                                id="location"
                                                value={location}
                                                onChange={(e) => setLocation(e.target.value)}
                                                required
                                                className="block w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2245ae] focus:border-[#2245ae] placeholder-gray-400 transition-all duration-200 bg-white shadow-sm"
                                                placeholder="Enter job location"
                                            />
                                        </div>
                                    </motion.div>

                                    {/* Job Type */}
                                    <motion.div
                                        variants={cardAnimation}
                                        whileHover={hoverEffect}
                                        className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-200/50"
                                    >
                                        <label htmlFor="jobType" className="block text-sm font-semibold text-[#1a3a9c] flex items-center">
                                            <FiBriefcase className="mr-2 text-[#2245ae]" />
                                            Job Type
                                        </label>
                                        <div className="relative">
                                            <select
                                                id="jobType"
                                                name="jobType"
                                                value={jobType}
                                                onChange={(e) => setJobType(e.target.value as JobData['jobType'])}
                                                required
                                                className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2245ae] focus:border-[#2245ae] placeholder-gray-400 transition-all duration-200 bg-white shadow-sm appearance-none pr-10"
                                            >
                                                <option value="Full-time">Full-time</option>
                                                <option value="Part-time">Part-time</option>
                                                <option value="Contract">Contract</option>
                                                <option value="Temporary">Temporary</option>
                                                <option value="Internship">Internship</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#2245ae]">
                                                <FiChevronDown className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </motion.div>
                                    
                                    {/* Salary */}
                                    <motion.div
                                        variants={cardAnimation}
                                        whileHover={hoverEffect}
                                        className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-200/50"
                                    >
                                        <label htmlFor="salary" className="block text-sm font-semibold text-[#1a3a9c] flex items-center">
                                            <FiDollarSign className="mr-2 text-[#2245ae]" />
                                            Salary (INR, optional)
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-[#2245ae]/70 font-medium">₹</span>
                                            </div>
                                            <input
                                                type="number"
                                                name="salary"
                                                id="salary"
                                                value={salary}
                                                onChange={(e) => setSalary(e.target.value === '' ? '' : Number(e.target.value))}
                                                min="0"
                                                className="block w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2245ae] focus:border-[#2245ae] placeholder-gray-400 transition-all duration-200 bg-white shadow-sm"
                                                placeholder="Enter salary amount"
                                            />
                                        </div>
                                    </motion.div>

                                    {/* Number of Openings */}
                                    <motion.div
                                        variants={cardAnimation}
                                        whileHover={hoverEffect}
                                        className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-200/50"
                                    >
                                        <label htmlFor="numberOfOpenings" className="block text-sm font-semibold text-[#1a3a9c] flex items-center">
                                            <FiUsers className="mr-2 text-[#2245ae]" />
                                            Number of Openings
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <FiUsers className="h-5 w-5 text-[#2245ae]/70" />
                                            </div>
                                            <input
                                                type="number"
                                                name="numberOfOpenings"
                                                id="numberOfOpenings"
                                                value={numberOfOpenings}
                                                onChange={(e) => setNumberOfOpenings(e.target.value === '' ? '' : Number(e.target.value))}
                                                required
                                                min="0"
                                                className="block w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2245ae] focus:border-[#2245ae] placeholder-gray-400 transition-all duration-200 bg-white shadow-sm"
                                                placeholder="Enter number of openings"
                                            />
                                        </div>
                                    </motion.div>

                                    {/* Job Status */}
                                    <motion.div
                                        variants={cardAnimation}
                                        whileHover={hoverEffect}
                                        className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-200/50"
                                    >
                                        <label htmlFor="status" className="block text-sm font-semibold text-[#1a3a9c] flex items-center">
                                            <FiEdit3 className="mr-2 text-[#2245ae]" />
                                            Job Status
                                        </label>
                                        <div className="relative">
                                            <select
                                                id="status"
                                                name="status"
                                                value={status}
                                                onChange={(e) => setStatus(e.target.value as JobData['status'])}
                                                className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2245ae] focus:border-[#2245ae] placeholder-gray-400 transition-all duration-200 bg-white shadow-sm appearance-none pr-10"
                                            >
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                                <option value="closed">Closed</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#2245ae]">
                                                <FiChevronDown className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </motion.div>
                                    
                                    {/* Skills */}
                                    <motion.div
                                        variants={cardAnimation}
                                        whileHover={hoverEffect}
                                        className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-200/50 lg:col-span-2"
                                    >
                                        <label htmlFor="skills" className="block text-sm font-semibold text-[#1a3a9c]">
                                            Required Skills (comma-separated)
                                        </label>
                                        <textarea
                                            name="skills"
                                            id="skills"
                                            rows={3}
                                            value={skills}
                                            onChange={(e) => setSkills(e.target.value)}
                                            placeholder="e.g., JavaScript, React, Node.js, Python"
                                            className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2245ae] focus:border-[#2245ae] placeholder-gray-400 transition-all duration-200 bg-white shadow-sm resize-none"
                                        ></textarea>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Separate multiple skills with commas
                                        </p>
                                    </motion.div>
                                    
                                    {/* Description */}
                                    <motion.div
                                        variants={cardAnimation}
                                        whileHover={hoverEffect}
                                        className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-200/50 lg:col-span-2"
                                    >
                                        <label htmlFor="description" className="block text-sm font-semibold text-[#1a3a9c]">
                                            Job Description
                                        </label>
                                        <textarea
                                            name="description"
                                            id="description"
                                            rows={6}
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            required
                                            className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2245ae] focus:border-[#2245ae] placeholder-gray-400 transition-all duration-200 bg-white shadow-sm resize-none"
                                            placeholder="Describe the job responsibilities, requirements, and what you're looking for in a candidate..."
                                        ></textarea>
                                    </motion.div>
                                </div>

                                {/* Action Buttons */}
                                <motion.div
                                    variants={fadeIn}
                                    className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-4"
                                >
                                    <Link href="/poster/posted-jobs" passHref className="w-full sm:w-auto">
                                        <motion.button
                                            type="button"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="w-full flex items-center justify-center px-6 py-3 border border-[#2245ae] text-[#2245ae] rounded-xl font-medium hover:bg-[#2245ae] hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2245ae] transition-all duration-200"
                                        >
                                            Cancel
                                        </motion.button>
                                    </Link>
                                    <motion.button
                                        type="submit"
                                        disabled={submitting}
                                        whileHover={submitting ? {} : { scale: 1.02 }}
                                        whileTap={submitting ? {} : { scale: 0.98 }}
                                        className={`w-full sm:w-auto flex items-center justify-center px-8 py-3 border border-transparent rounded-xl font-medium text-white bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] hover:from-[#2a55cc] hover:to-[#2242a8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2245ae] shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-[#2245ae] disabled:hover:to-[#1a3a9c]`}
                                    >
                                        {submitting ? (
                                            <>
                                                <FiLoader className="animate-spin mr-3 h-5 w-5" />
                                                Saving Changes...
                                            </>
                                        ) : (
                                            <>
                                                <FiSave className="mr-3 h-5 w-5" />
                                                Save Changes
                                            </>
                                        )}
                                    </motion.button>
                                </motion.div>
                            </motion.form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}