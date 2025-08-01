// app/poster/jobs/[jobId]/edit/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Sidebar from '@/app/components/Sidebar';
import Link from 'next/link';
import { FiBriefcase, FiMapPin, FiDollarSign, FiUsers, FiMenu, FiXCircle, FiSave, FiChevronLeft, FiLoader, FiCheckCircle } from 'react-icons/fi';

// Interface for job data - should match IJob from models/Job.ts
interface JobData {
    _id: string;
    title: string;
    description: string;
    location: string;
    salary: number;
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
            console.log('API Response Data for Job Fetch:', data); // <-- ADDED FOR DEBUGGING

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch job details');
            }

            // Ensure data.job exists before setting state and pre-populating form fields
            if (!data.job) {
                // If response.ok is true but data.job is missing, it means the server returned an unexpected structure.
                throw new Error('Job data not found in the server response, even though request was successful.');
            }

            setJob(data.job);
            // Pre-populate form fields
            setTitle(data.job.title);
            setDescription(data.job.description);
            setLocation(data.job.location);
            setSalary(data.job.salary);
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
    }, [token, jobId, user]);

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

        const updatedJobData = {
            title,
            description,
            location,
            salary: Number(salary),
            company,
            jobType,
            skills: updatedSkills,
            numberOfOpenings: Number(numberOfOpenings),
            status,
        };

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
            fetchJob(); // Re-fetch to show updated status/openings if changed by backend logic
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

    // Loading and Unauthorized State Display
    if (authLoading || !isAuthenticated || !user || user.firstLogin || (user.role !== 'job_poster' && user.role !== 'admin')) {
        return (
            <div className="flex h-screen bg-gray-50 justify-center items-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1938A8] mx-auto"></div>
                    <p className="mt-4 text-gray-700">Loading page...</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 justify-center items-center font-inter">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1938A8] mx-auto"></div>
                    <p className="mt-4 text-gray-700">Fetching job details...</p>
                </div>
            </div>
        );
    }

    if (error && !job) { // Only show full error if job data couldn't be loaded at all
        return (
            <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 justify-center items-center font-inter">
                <div className="text-center bg-white p-8 rounded-lg shadow-lg border border-red-200">
                    <FiXCircle className="mx-auto h-16 w-16 text-red-500" />
                    <h3 className="mt-2 text-xl font-semibold text-gray-900">Error Loading Job</h3>
                    <p className="mt-1 text-base text-gray-600">{error}</p>
                    <div className="mt-6">
                        <Link href="/poster/posted-jobs" passHref>
                            <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#1938A8] hover:bg-[#182E78] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1938A8]">
                                <FiChevronLeft className="-ml-1 mr-2 h-5 w-5" />
                                Back to Posted Jobs
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden font-inter">
            <Sidebar userRole={user.role} onLogout={logout} isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile Header */}
                <div className="md:hidden bg-white shadow-lg p-4 flex items-center justify-between relative z-10">
                    <button
                        onClick={toggleSidebar}
                        className="p-2 rounded-md text-[#1938A8] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#182E78]"
                        aria-label="Open sidebar"
                    >
                        <FiMenu className="h-6 w-6" />
                    </button>
                    <h1 className="text-lg font-bold text-[#1938A8] text-center absolute left-1/2 -translate-x-1/2">
                        Edit Job
                    </h1>
                    <div className="h-6 w-6"></div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">Edit Job: {job?.title}</h1>
                                <p className="text-gray-500 text-lg mt-2">Update the details of your job posting</p>
                            </div>
                            <Link
                                href="/poster/posted-jobs"
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1938A8] transition-all duration-200 flex items-center justify-center w-full sm:w-auto"
                            >
                                <FiChevronLeft className="w-5 h-5 mr-2" />
                                Back to Posted Jobs
                            </Link>
                        </div>

                        {successMessage && (
                            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6 rounded-r-lg shadow-md" role="alert">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <FiCheckCircle className="h-5 w-5 text-green-500" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-green-700 font-medium">{successMessage}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg shadow-md" role="alert">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <FiXCircle className="h-5 w-5 text-red-500" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-red-700 font-medium">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {job && (
                            <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-xl p-6 md:p-8 border border-gray-100">
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    {/* Job Title */}
                                    <div>
                                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Job Title</label>
                                        <input
                                            type="text"
                                            name="title"
                                            id="title"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            required
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#1938A8] focus:border-[#1938A8] sm:text-sm"
                                        />
                                    </div>

                                    {/* Company Name */}
                                    <div>
                                        <label htmlFor="company" className="block text-sm font-medium text-gray-700">Company Name</label>
                                        <input
                                            type="text"
                                            name="company"
                                            id="company"
                                            value={company}
                                            onChange={(e) => setCompany(e.target.value)}
                                            required
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#1938A8] focus:border-[#1938A8] sm:text-sm"
                                        />
                                    </div>

                                    {/* Location */}
                                    <div>
                                        <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
                                        <input
                                            type="text"
                                            name="location"
                                            id="location"
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                            required
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#1938A8] focus:border-[#1938A8] sm:text-sm"
                                        />
                                    </div>

                                    {/* Salary */}
                                    <div>
                                        <label htmlFor="salary" className="block text-sm font-medium text-gray-700">Salary (INR)</label>
                                        <input
                                            type="number"
                                            name="salary"
                                            id="salary"
                                            value={salary}
                                            onChange={(e) => setSalary(e.target.value === '' ? '' : Number(e.target.value))}
                                            required
                                            min="0"
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#1938A8] focus:border-[#1938A8] sm:text-sm"
                                        />
                                    </div>

                                    {/* Job Type */}
                                    <div>
                                        <label htmlFor="jobType" className="block text-sm font-medium text-gray-700">Job Type</label>
                                        <select
                                            id="jobType"
                                            name="jobType"
                                            value={jobType}
                                            onChange={(e) => setJobType(e.target.value as JobData['jobType'])}
                                            required
                                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#1938A8] focus:border-[#1938A8] sm:text-sm rounded-md"
                                        >
                                            <option value="Full-time">Full-time</option>
                                            <option value="Part-time">Part-time</option>
                                            <option value="Contract">Contract</option>
                                            <option value="Temporary">Temporary</option>
                                            <option value="Internship">Internship</option>
                                        </select>
                                    </div>

                                    {/* Number of Openings */}
                                    <div>
                                        <label htmlFor="numberOfOpenings" className="block text-sm font-medium text-gray-700">Number of Openings</label>
                                        <input
                                            type="number"
                                            name="numberOfOpenings"
                                            id="numberOfOpenings"
                                            value={numberOfOpenings}
                                            onChange={(e) => setNumberOfOpenings(e.target.value === '' ? '' : Number(e.target.value))}
                                            required
                                            min="0"
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#1938A8] focus:border-[#1938A8] sm:text-sm"
                                        />
                                    </div>

                                    {/* Current Status (Read-only or limited edit for poster) */}
                                    <div>
                                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">Job Status</label>
                                        {user?.role === 'admin' ? (
                                            <select
                                                id="status"
                                                name="status"
                                                value={status}
                                                onChange={(e) => setStatus(e.target.value as JobData['status'])}
                                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#1938A8] focus:border-[#1938A8] sm:text-sm rounded-md"
                                            >
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                                <option value="closed">Closed</option>
                                            </select>
                                        ) : (
                                            <p className="mt-1 p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 text-sm">
                                                {status.charAt(0).toUpperCase() + status.slice(1)}
                                            </p>
                                        )}
                                        <p className="mt-1 text-xs text-gray-500">
                                            Job status can be changed by an Admin. It also automatically changes to 'Closed' if openings reach 0.
                                        </p>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="mt-6">
                                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Job Description</label>
                                    <textarea
                                        name="description"
                                        id="description"
                                        rows={6}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        required
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#1938A8] focus:border-[#1938A8] sm:text-sm"
                                    ></textarea>
                                </div>

                                {/* Skills */}
                                <div className="mt-6">
                                    <label htmlFor="skills" className="block text-sm font-medium text-gray-700">Skills (comma-separated)</label>
                                    <input
                                        type="text"
                                        name="skills"
                                        id="skills"
                                        value={skills}
                                        onChange={(e) => setSkills(e.target.value)}
                                        placeholder="e.g., JavaScript, React, Node.js"
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#1938A8] focus:border-[#1938A8] sm:text-sm"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Separate multiple skills with commas (e.g., "Python, SQL, Data Analysis").</p>
                                </div>

                                <div className="mt-8 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1938A8] hover:bg-[#182E78]'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1938A8] transition-all duration-200`}
                                    >
                                        {submitting ? (
                                            <>
                                                <FiLoader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <FiSave className="-ml-1 mr-3 h-5 w-5" />
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
