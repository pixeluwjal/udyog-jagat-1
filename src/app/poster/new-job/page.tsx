'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// Import icons for better aesthetics
import {
  FiBriefcase, FiMapPin, FiDollarSign, FiType, FiUsers, FiXCircle, FiCheckCircle, FiLoader, FiChevronLeft, FiMenu, FiClock, FiSearch, FiChevronDown
} from 'react-icons/fi';

// Brand colors
const primaryBlue = "#165BF8";
const darkBlue = "#1C3991";

interface JobFormData {
  title: string;
  description: string;
  location: string;
  salary: number | '';
  company: string;
  jobType: 'Full-time' | 'Part-time' | 'Contract' | 'Temporary' | 'Internship' | '';
  numberOfOpenings: number | '';
}

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
    numberOfOpenings: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const [allCities, setAllCities] = useState<string[]>([]);

  // Effect to fetch the city list on component mount
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await fetch('/api/cities');
        if (!response.ok) {
          throw new Error('Failed to fetch cities');
        }
        const data = await response.json();
        if (Array.isArray(data.cities)) {
          setAllCities(data.cities);
        }
      } catch (err) {
        console.error('Error fetching cities:', err);
      }
    };
    fetchCities();
  }, []);

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

    // Handle location suggestions based on fetched data
    if (name === 'location') {
      if (value.length > 1) {
        // This is where case-insensitivity is handled
        const filteredCities = allCities.filter(city =>
          city.toLowerCase().startsWith(value.toLowerCase())
        );
        setLocationSuggestions(filteredCities);
        setShowSuggestions(true);
      } else {
        setLocationSuggestions([]);
        setShowSuggestions(false);
      }
    }
  };

  const handleSuggestionClick = (city: string) => {
    setFormData((prev) => ({ ...prev, location: city }));
    setShowSuggestions(false);
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

    if (!formData.title || !formData.description || !formData.location ||
      formData.salary === '' || !formData.company || !formData.jobType ||
      formData.numberOfOpenings === '') {
      setError('All required fields must be filled: Job Title, Description, Location, Salary, Company, Job Type, and No. of Openings.');
      setFormLoading(false);
      return;
    }

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

  if (authLoading || !isAuthenticated || !user || user.firstLogin || user.role !== 'job_poster') {
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
            Loading page...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] overflow-hidden font-inter">
      <Sidebar userRole={user.role} onLogout={logout} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden bg-white/95 backdrop-blur-md shadow-sm p-4 flex items-center justify-between z-10 sticky top-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg text-[#165BF8] hover:bg-[#165BF8]/10 focus:outline-none"
            aria-label="Open sidebar"
          >
            <FiMenu className="h-6 w-6" />
          </motion.button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent">
            Post a Job
          </h1>
          <div className="h-6 w-6"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4"
            >
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-[#1C3991] leading-tight">
                  Post a New Job
                </h1>
                <p className="text-[#165BF8] text-lg mt-1">Fill out the details to create a new job listing.</p>
              </div>
              <Link href="/poster/dashboard" passHref>
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: `0 8px 16px ${primaryBlue}20` }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center px-4 py-2 bg-[#165BF8] text-white rounded-xl font-semibold shadow-md transition-all duration-300 w-full md:w-auto justify-center"
                >
                  <FiChevronLeft className="w-5 h-5 mr-2" />
                  Back to Dashboard
                </motion.button>
              </Link>
            </motion.div>

            <AnimatePresence>
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
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-green-50 border-l-4 border-green-400 p-4 mb-6 rounded-lg text-green-700 font-medium"
                >
                  <div className="flex items-center">
                    <FiCheckCircle className="h-5 w-5 text-green-400 mr-2" />
                    <p className="text-sm">{success}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="bg-white rounded-2xl shadow-lg border border-[#165BF8]/10 overflow-hidden"
            >
              {/* Form Header */}
              <div className="bg-gradient-to-r from-[#165BF8] to-[#1C3991] px-6 py-4 border-b border-[#165BF8]/20">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <FiBriefcase className="w-5 h-5 text-blue-200 mr-2" />
                  Job Details
                </h2>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Job Title Field */}
                <div className="space-y-2">
                  <label htmlFor="title" className="block text-sm font-medium text-[#1C3991]">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="block w-full px-4 py-3 rounded-xl border border-[#165BF8]/20 focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] placeholder-gray-400 transition duration-200 shadow-sm"
                      placeholder="e.g. Senior Frontend Developer"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <FiBriefcase className="h-5 w-5 text-[#165BF8]/70" />
                    </div>
                  </div>
                </div>

                {/* Company Field */}
                <div className="space-y-2">
                  <label htmlFor="company" className="block text-sm font-medium text-[#1C3991]">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      className="block w-full px-4 py-3 rounded-xl border border-[#165BF8]/20 focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] placeholder-gray-400 transition duration-200 shadow-sm"
                      placeholder="e.g. Acme Corp"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <FiUsers className="h-5 w-5 text-[#165BF8]/70" />
                    </div>
                  </div>
                </div>

                {/* Job Description Field */}
                <div className="space-y-2">
                  <label htmlFor="description" className="block text-sm font-medium text-[#1C3991]">
                    Job Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 rounded-xl border border-[#165BF8]/20 focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] placeholder-gray-400 transition duration-200 shadow-sm min-h-[150px]"
                    placeholder="Describe the responsibilities, requirements, and benefits of this position..."
                    rows={6}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Markdown formatting supported</p>
                </div>

                {/* Location and Job Type - Side by Side on Desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Location Field with Autocomplete */}
                  <div className="space-y-2 relative">
                    <label htmlFor="location" className="block text-sm font-medium text-[#1C3991]">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        className="block w-full px-4 py-3 rounded-xl border border-[#165BF8]/20 focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] placeholder-gray-400 transition duration-200 shadow-sm"
                        placeholder="e.g. New York, NY or Remote"
                        required
                        autoComplete="off"
                        ref={locationInputRef}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <FiMapPin className="h-5 w-5 text-[#165BF8]/70" />
                      </div>
                    </div>
                    {showSuggestions && locationSuggestions.length > 0 && (
                      <ul className="absolute z-10 w-full bg-white border border-[#165BF8]/20 rounded-xl shadow-lg max-h-60 overflow-y-auto mt-1">
                        {locationSuggestions.map((city) => (
                          <li
                            key={city}
                            onMouseDown={() => handleSuggestionClick(city)}
                            className="px-4 py-2 cursor-pointer hover:bg-[#165BF8]/5 text-sm text-[#1C3991]"
                          >
                            {city}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Job Type Field */}
                  <div className="space-y-2">
                    <label htmlFor="jobType" className="block text-sm font-medium text-[#1C3991]">
                      Job Type <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="jobType"
                        name="jobType"
                        value={formData.jobType}
                        onChange={handleInputChange}
                        className="block w-full px-4 py-3 rounded-xl border border-[#165BF8]/20 focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] placeholder-gray-400 transition duration-200 shadow-sm appearance-none pr-10"
                        required
                      >
                        <option value="">Select Job Type</option>
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Contract">Contract</option>
                        <option value="Temporary">Temporary</option>
                        <option value="Internship">Internship</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <FiChevronDown className="h-5 w-5 text-[#165BF8]/70" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Salary and Number of Openings - Side by Side on Desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Salary Field */}
                  <div className="space-y-2">
                    <label htmlFor="salary" className="block text-sm font-medium text-[#1C3991]">
                      Salary (INR) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-[#1C3991]">₹</span>
                      </div>
                      <input
                        type="number"
                        id="salary"
                        name="salary"
                        value={formData.salary}
                        onChange={handleInputChange}
                        className="block w-full pl-8 pr-4 py-3 rounded-xl border border-[#165BF8]/20 focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] placeholder-gray-400 transition duration-200 shadow-sm"
                        placeholder="e.g. 850000"
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  {/* Number of Openings Field */}
                  <div className="space-y-2">
                    <label htmlFor="numberOfOpenings" className="block text-sm font-medium text-[#1C3991]">
                      No. of Openings <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiUsers className="h-5 w-5 text-[#165BF8]/70" />
                      </div>
                      <input
                        type="number"
                        id="numberOfOpenings"
                        name="numberOfOpenings"
                        value={formData.numberOfOpenings}
                        onChange={handleInputChange}
                        className="block w-full pl-10 pr-4 py-3 rounded-xl border border-[#165BF8]/20 focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] placeholder-gray-400 transition duration-200 shadow-sm"
                        placeholder="e.g. 5"
                        min="1"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-[#165BF8]/10">
                  <Link href="/poster/dashboard" passHref>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-6 py-3 border border-gray-300 rounded-xl font-medium text-[#1C3991] hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#165BF8]/50 transition-all duration-200"
                    >
                      Cancel
                    </motion.button>
                  </Link>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-3 border border-transparent rounded-xl font-medium text-white bg-gradient-to-r from-[#165BF8] to-[#1C3991] hover:from-[#1a65ff] hover:to-[#2242a8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#165BF8]/50 shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
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
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
