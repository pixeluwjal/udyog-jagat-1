// app/poster/new-job/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';
import Link from 'next/link';

// Import icons for better aesthetics
import {
  FiBriefcase, FiMapPin, FiDollarSign, FiType, FiUsers, FiXCircle, FiCheckCircle, FiLoader, FiChevronLeft, FiMenu
} from 'react-icons/fi';

interface JobFormData {
  title: string;
  description: string;
  location: string;
  salary: number | '';
  company: string;
  jobType: 'Full-time' | 'Part-time' | 'Contract' | 'Temporary' | 'Internship' | '';
  numberOfOpenings: number | ''; // NEW: Add number of openings field
}

export default function NewJobPage() {
  const { user, loading: authLoading, isAuthenticated, logout, token } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    description: '',
    location: '',
    salary: '',
    company: '',
    jobType: '',
    numberOfOpenings: '', // Initialize new field
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for mobile sidebar

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

    if (user.role !== 'job_poster') {
      if (user.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (user.role === 'job_seeker') {
        router.push('/seeker/dashboard');
      } else {
        router.push('/');
      }
      return;
    }
  }, [authLoading, isAuthenticated, user, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: (name === 'salary' || name === 'numberOfOpenings') ? (value === '' ? '' : Number(value)) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setFormLoading(true);

    if (!token) {
      setError('Authentication token missing. Please log in again.');
      setFormLoading(false);
      return;
    }

    // Validate all required fields, including the new 'numberOfOpenings'
    if (!formData.title || !formData.description || !formData.location ||
      formData.salary === '' || !formData.company || !formData.jobType ||
      formData.numberOfOpenings === '') { // Added validation for numberOfOpenings
      setError('All required fields must be filled: Job Title, Description, Location, Salary, Company, Job Type, and No. of Openings.');
      setFormLoading(false);
      return;
    }

    // Additional validation for numberOfOpenings
    if (typeof formData.numberOfOpenings === 'number' && formData.numberOfOpenings <= 0) {
      setError('Number of Openings must be a positive number.');
      setFormLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create job');
      }

      setSuccess('Job posted successfully!');
      // Reset form data after successful submission
      setFormData({ title: '', description: '', location: '', salary: '', company: '', jobType: '', numberOfOpenings: '' });
      router.push('/poster/dashboard');
    } catch (err: unknown) {
      console.error('Error posting job:', err);
      let errorMessage = 'Failed to post job.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      setError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (authLoading || !isAuthenticated || !user || user.firstLogin || user.role !== 'job_poster') {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="m-auto">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1938A8]"></div>
          <p className="mt-4 text-gray-700">Loading page...</p>
        </div>
      </div>
    );
  }

  return (
    // Main container uses your requested background gradient
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden font-inter">
      {/* Pass isOpen and toggleSidebar to the Sidebar component for mobile responsiveness */}
      <Sidebar userRole={user.role} onLogout={logout} isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile Header: Centered Hamburger and Text, now with white background and specific title color */}
        <div className="md:hidden bg-white shadow-lg p-4 flex items-center justify-between relative z-10">
          {/* Hamburger Icon */}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md text-[#1938A8] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#1938A8]"
            aria-label="Open sidebar"
          >
            <FiMenu className="h-6 w-6" />
          </button>
          {/* Centered Header Text */}
         <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            Post a Job
          </h1>
          {/* Placeholder for spacing on the right, equivalent to hamburger icon size */}
          <div className="h-6 w-6"></div> {/* This helps balance the header */}
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-3xl mx-auto">
            {/* Desktop Header Section (still using original gray/indigo text for contrast against light page background) */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">
                  Post a New Job
                </h1>
                <p className="text-gray-500 text-lg">Fill out the details to create a new job listing.</p>
              </div>
              <Link href="/poster/dashboard" passHref>
                <button className="flex items-center px-4 py-2 bg-[#1938A8] text-white rounded-lg hover:bg-[#182E78] transition-colors shadow-md w-full md:w-auto justify-center">
                  <FiChevronLeft className="w-5 h-5 mr-2" />
                  Back to Dashboard
                </button>
              </Link>
            </div>

            {error && (
              <div className="bg-red-700 border-l-4 border-red-900 p-4 mb-6 rounded-r-lg text-white">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <FiXCircle className="h-5 w-5 text-red-200" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-700 border-l-4 border-green-900 p-4 mb-6 rounded-r-lg text-white">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <FiCheckCircle className="h-5 w-5 text-green-200" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm">{success}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Form Card with new colors */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              {/* Form Header */}
              <div className="bg-[#1938A8] px-6 py-4 border-b border-[#182E78]">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <FiBriefcase className="w-5 h-5 text-blue-200 mr-2" />
                  Job Details
                </h2>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Job Title Field */}
                <div className="space-y-2">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#1938A8] focus:border-[#1938A8] placeholder-gray-400 transition duration-200"
                      placeholder="e.g. Senior Frontend Developer"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <FiBriefcase className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Company Field */}
                <div className="space-y-2">
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#1938A8] focus:border-[#1938A8] placeholder-gray-400 transition duration-200"
                      placeholder="e.g. Acme Corp"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <FiUsers className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Job Description Field */}
                <div className="space-y-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Job Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#1938A8] focus:border-[#1938A8] placeholder-gray-400 transition duration-200 min-h-[150px]"
                    placeholder="Describe the responsibilities, requirements, and benefits of this position..."
                    rows={6}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Markdown formatting supported</p>
                </div>

                {/* Location and Job Type - Side by Side on Desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Location Field */}
                  <div className="space-y-2">
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#1938A8] focus:border-[#1938A8] placeholder-gray-400 transition duration-200"
                        placeholder="e.g. New York, NY or Remote"
                        required
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <FiMapPin className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {/* Job Type Field */}
                  <div className="space-y-2">
                    <label htmlFor="jobType" className="block text-sm font-medium text-gray-700">
                      Job Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="jobType"
                      name="jobType"
                      value={formData.jobType}
                      onChange={handleInputChange}
                      className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#1938A8] focus:border-[#1938A8] placeholder-gray-400 transition duration-200"
                      required
                    >
                      <option value="">Select Job Type</option>
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Temporary">Temporary</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>
                </div>

                {/* Salary Field */}
                <div className="space-y-2">
                  <label htmlFor="salary" className="block text-sm font-medium text-gray-700">
                    Salary (INR) <span className="text-red-500">*</span> {/* Updated label */}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">₹</span> {/* Updated currency symbol */}
                    </div>
                    <input
                      type="number"
                      id="salary"
                      name="salary"
                      value={formData.salary}
                      onChange={handleInputChange}
                      className="block w-full pl-8 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#1938A8] focus:border-[#1938A8] placeholder-gray-400 transition duration-200"
                      placeholder="e.g. 850000"
                      min="0"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-gray-500">per year</span>
                    </div>
                  </div>
                </div>

                {/* NEW: Number of Openings Field */}
                <div className="space-y-2">
                  <label htmlFor="numberOfOpenings" className="block text-sm font-medium text-gray-700">
                    No. of Openings for this position <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiUsers className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      id="numberOfOpenings"
                      name="numberOfOpenings"
                      value={formData.numberOfOpenings}
                      onChange={handleInputChange}
                      className="block w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#1938A8] focus:border-[#1938A8] placeholder-gray-400 transition duration-200"
                      placeholder="e.g. 5"
                      min="1" // Ensure at least 1 opening
                      required
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => router.push('/poster/dashboard')}
                    className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1938A8] transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 border border-transparent rounded-lg font-medium text-white bg-[#1938A8] hover:bg-[#182E78] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1938A8] shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={formLoading}
                  >
                    {formLoading ? (
                      <span className="flex items-center justify-center">
                        <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                        Posting Job...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <FiBriefcase className="-ml-1 mr-2 h-4 w-4" />
                        Post Job
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
