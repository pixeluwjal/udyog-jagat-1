"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { salaryRanges } from "@/lib/constants";

// Import icons for better aesthetics
import {
  FiBriefcase,
  FiMapPin,
  FiType,
  FiUsers,
  FiXCircle,
  FiCheckCircle,
  FiLoader,
  FiChevronLeft,
  FiMenu,
  FiClock,
  FiSearch,
  FiChevronDown,
  FiDollarSign,
  FiZap,
  FiPlus,
  FiEdit3,
  FiFileText,
} from "react-icons/fi";

// Updated brand colors with #2245ae
const primaryBlue = "#2245ae";
const darkBlue = "#1a3a9c";
const lightBlue = "#eef2ff";

// Animation variants for smooth entry
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
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
  y: -4,
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

interface JobFormData {
  title: string;
  description: string;
  location: string;
  salary: string;
  company: string;
  jobType:
    | "Full-time"
    | "Part-time"
    | "Contract"
    | "Temporary"
    | "Internship"
    | "";
  numberOfOpenings: number | "";
  skills: string;
}

export default function NewJobPage() {
  const {
    user,
    loading: authLoading,
    isAuthenticated,
    logout,
    token,
  } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<JobFormData>({
    title: "",
    description: "",
    location: "",
    salary: "",
    company: "",
    jobType: "",
    numberOfOpenings: "",
    skills: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
        const response = await fetch("/api/cities");
        if (!response.ok) {
          throw new Error("Failed to fetch cities");
        }
        const data = await response.json();
        if (Array.isArray(data.cities)) {
          setAllCities(data.cities);
        }
      } catch (err) {
        console.error("Error fetching cities:", err);
      }
    };
    fetchCities();
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }

    if (user.firstLogin) {
      router.push("/change-password");
      return;
    }

    if (user.role !== "job_poster") {
      if (user.role === "admin") {
        router.push("/admin/dashboard");
      } else if (user.role === "job_seeker") {
        router.push("/seeker/dashboard");
      } else {
        router.push("/");
      }
      return;
    }
  }, [authLoading, isAuthenticated, user, router]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]:
        name === "numberOfOpenings"
          ? value === ""
            ? ""
            : Number(value)
          : value,
    }));

    if (name === "location") {
      if (value.length > 1) {
        const filteredCities = allCities.filter((city) =>
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
    setError("");
    setSuccess("");
    setFormLoading(true);

    if (!token) {
      setError("Authentication token missing. Please log in again.");
      setFormLoading(false);
      return;
    }

    if (
      !formData.title ||
      !formData.description ||
      !formData.location ||
      !formData.company ||
      !formData.jobType ||
      formData.numberOfOpenings === ""
    ) {
      setError(
        "All required fields must be filled: Job Title, Description, Location, Company, Job Type, and No. of Openings."
      );
      setFormLoading(false);
      return;
    }

    if (
      typeof formData.numberOfOpenings === "number" &&
      formData.numberOfOpenings <= 0
    ) {
      setError("Number of Openings must be a positive number.");
      setFormLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          salaryOriginal: formData.salary || null,
          skills: formData.skills
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s !== ""),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create job");
      }

      setSuccess("Job posted successfully!");
      setFormData({
        title: "",
        description: "",
        location: "",
        salary: "",
        company: "",
        jobType: "",
        numberOfOpenings: "",
        skills: "",
      });
      
      // Redirect after a short delay to show success message
      setTimeout(() => {
        router.push("/poster/dashboard");
      }, 1500);
    } catch (err: unknown) {
      console.error("Error posting job:", err);
      let errorMessage = "Failed to post job.";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      }
      setError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  if (
    authLoading ||
    !isAuthenticated ||
    !user ||
    user.firstLogin ||
    user.role !== "job_poster"
  ) {
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

  return (
    <div className={`flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[${lightBlue}] overflow-hidden font-inter`}>
      <Sidebar
        userRole={user.role}
        onLogout={logout}
        userEmail={user.email}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden bg-white/95 backdrop-blur-md shadow-sm p-4 flex items-center justify-between sticky top-0 z-10 border-b border-[#2245ae]/10">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-xl text-[#2245ae] hover:bg-[#2245ae]/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#2245ae] transition-all duration-200"
            aria-label="Open sidebar"
          >
            <FiMenu className="h-6 w-6" />
          </motion.button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] bg-clip-text text-transparent">
            Post Job
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
                    Post a New Job
                  </span>
                </motion.h1>
                <motion.p 
                  className="text-[#2245ae] text-lg md:text-xl mt-2 md:mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Fill out the details to create a new job listing and attract top talent
                </motion.p>
              </div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full lg:w-auto"
              >
                <Link href="/poster/dashboard" passHref>
                  <button className="flex items-center justify-center w-full lg:w-auto px-6 py-3 bg-white border border-[#2245ae]/20 rounded-xl shadow-sm text-base font-medium text-[#1a3a9c] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2245ae] transition-all duration-200 group">
                    <FiChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                  </button>
                </Link>
              </motion.div>
            </motion.div>

            {/* Messages */}
            <AnimatePresence>
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
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg shadow-sm"
                >
                  <div className="flex items-center">
                    <FiCheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <p className="text-green-700 font-medium">{success}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Form */}
            <motion.form
              onSubmit={handleSubmit}
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="bg-white shadow-lg rounded-2xl border border-[#2245ae]/10 overflow-hidden"
            >
              {/* Form Header */}
              <div className="bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] px-6 py-5 border-b border-[#2245ae]/20">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <FiPlus className="w-6 h-6 text-blue-200 mr-3" />
                  Create New Job Listing
                </h2>
                <p className="text-blue-200 text-sm mt-1">
                  Fill in the details below to post your job opportunity
                </p>
              </div>

              {/* Form Content */}
              <div className="p-6 md:p-8 space-y-8">
                {/* Job Title */}
                <motion.div
                  variants={cardAnimation}
                  whileHover={hoverEffect}
                  className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-200/50"
                >
                  <label htmlFor="title" className="block text-sm font-semibold text-[#1a3a9c] flex items-center">
                    <FiType className="mr-2 text-[#2245ae]" />
                    Job Title <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2245ae] focus:border-[#2245ae] placeholder-gray-400 transition-all duration-200 bg-white shadow-sm"
                      placeholder="e.g. Senior Frontend Developer"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <FiBriefcase className="h-5 w-5 text-[#2245ae]/70" />
                    </div>
                  </div>
                </motion.div>

                {/* Company Name */}
                <motion.div
                  variants={cardAnimation}
                  whileHover={hoverEffect}
                  className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-200/50"
                >
                  <label htmlFor="company" className="block text-sm font-semibold text-[#1a3a9c] flex items-center">
                    <FiUsers className="mr-2 text-[#2245ae]" />
                    Company Name <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2245ae] focus:border-[#2245ae] placeholder-gray-400 transition-all duration-200 bg-white shadow-sm"
                      placeholder="e.g. Acme Corp"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <FiUsers className="h-5 w-5 text-[#2245ae]/70" />
                    </div>
                  </div>
                </motion.div>

                {/* Job Description */}
                <motion.div
                  variants={cardAnimation}
                  whileHover={hoverEffect}
                  className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-200/50"
                >
                  <label htmlFor="description" className="block text-sm font-semibold text-[#1a3a9c] flex items-center">
                    <FiFileText className="mr-2 text-[#2245ae]" />
                    Job Description <span className="text-red-500 ml-1">*</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2245ae] focus:border-[#2245ae] placeholder-gray-400 transition-all duration-200 bg-white shadow-sm min-h-[150px] resize-none"
                    placeholder="Describe the responsibilities, requirements, and benefits of this position..."
                    rows={6}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Be specific about requirements and what makes this role special
                  </p>
                </motion.div>

                {/* Location and Job Type */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Location with Autocomplete */}
                  <motion.div
                    variants={cardAnimation}
                    whileHover={hoverEffect}
                    className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-200/50 relative"
                  >
                    <label htmlFor="location" className="block text-sm font-semibold text-[#1a3a9c] flex items-center">
                      <FiMapPin className="mr-2 text-[#2245ae]" />
                      Location <span className="text-red-500 ml-1">*</span>
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
                        className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2245ae] focus:border-[#2245ae] placeholder-gray-400 transition-all duration-200 bg-white shadow-sm"
                        placeholder="e.g. New York, NY or Remote"
                        required
                        autoComplete="off"
                        ref={locationInputRef}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <FiMapPin className="h-5 w-5 text-[#2245ae]/70" />
                      </div>
                    </div>
                    {showSuggestions && locationSuggestions.length > 0 && (
                      <ul className="absolute z-10 w-full bg-white border border-[#2245ae]/20 rounded-lg shadow-xl max-h-60 overflow-y-auto mt-1 top-full">
                        {locationSuggestions.map((city) => (
                          <li
                            key={city}
                            onMouseDown={() => handleSuggestionClick(city)}
                            className="px-4 py-3 cursor-pointer hover:bg-[#2245ae]/5 text-sm text-[#1a3a9c] border-b border-gray-100 last:border-b-0"
                          >
                            {city}
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>

                  {/* Job Type */}
                  <motion.div
                    variants={cardAnimation}
                    whileHover={hoverEffect}
                    className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-200/50"
                  >
                    <label htmlFor="jobType" className="block text-sm font-semibold text-[#1a3a9c] flex items-center">
                      <FiBriefcase className="mr-2 text-[#2245ae]" />
                      Job Type <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="jobType"
                        name="jobType"
                        value={formData.jobType}
                        onChange={handleInputChange}
                        className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2245ae] focus:border-[#2245ae] placeholder-gray-400 transition-all duration-200 bg-white shadow-sm appearance-none pr-10"
                        required
                      >
                        <option value="">Select Job Type</option>
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
                </div>

                {/* Salary and Openings */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Salary Range */}
                  <motion.div
                    variants={cardAnimation}
                    whileHover={hoverEffect}
                    className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-200/50"
                  >
                    <label htmlFor="salary" className="block text-sm font-semibold text-[#1a3a9c] flex items-center">
                      <FiDollarSign className="mr-2 text-[#2245ae]" />
                      Salary Range (Optional)
                    </label>
                    <div className="relative">
                      <select
                        id="salary"
                        name="salary"
                        value={formData.salary}
                        onChange={handleInputChange}
                        className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2245ae] focus:border-[#2245ae] placeholder-gray-400 transition-all duration-200 bg-white shadow-sm appearance-none pr-10"
                      >
                        <option value="">Select a Salary Range</option>
                        {salaryRanges.map((range) => (
                          <option key={range} value={range}>
                            {range}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#2245ae]">
                        <FiChevronDown className="h-5 w-5" />
                      </div>
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
                      Number of Openings <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiUsers className="h-5 w-5 text-[#2245ae]/70" />
                      </div>
                      <input
                        type="number"
                        id="numberOfOpenings"
                        name="numberOfOpenings"
                        value={formData.numberOfOpenings}
                        onChange={handleInputChange}
                        className="block w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2245ae] focus:border-[#2245ae] placeholder-gray-400 transition-all duration-200 bg-white shadow-sm"
                        placeholder="e.g. 5"
                        min="1"
                        required
                      />
                    </div>
                  </motion.div>
                </div>

                {/* Skills */}
                <motion.div
                  variants={cardAnimation}
                  whileHover={hoverEffect}
                  className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-200/50"
                >
                  <label htmlFor="skills" className="block text-sm font-semibold text-[#1a3a9c] flex items-center">
                    <FiZap className="mr-2 text-[#2245ae]" />
                    Required Skills (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="skills"
                      name="skills"
                      value={formData.skills}
                      onChange={handleInputChange}
                      className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2245ae] focus:border-[#2245ae] placeholder-gray-400 transition-all duration-200 bg-white shadow-sm"
                      placeholder="e.g. React, Node.js, MongoDB, TypeScript"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <FiZap className="h-5 w-5 text-[#2245ae]/70" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter skills separated by commas. This helps candidates understand the technical requirements.
                  </p>
                </motion.div>

                {/* Form Actions */}
                <motion.div
                  variants={fadeIn}
                  className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-gray-200"
                >
                  <Link href="/poster/dashboard" passHref className="w-full sm:w-auto">
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
                    disabled={formLoading}
                    whileHover={formLoading ? {} : { scale: 1.02 }}
                    whileTap={formLoading ? {} : { scale: 0.98 }}
                    className={`w-full sm:w-auto flex items-center justify-center px-8 py-3 border border-transparent rounded-xl font-medium text-white bg-gradient-to-r from-[#2245ae] to-[#1a3a9c] hover:from-[#2a55cc] hover:to-[#2242a8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2245ae] shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-[#2245ae] disabled:hover:to-[#1a3a9c]`}
                  >
                    {formLoading ? (
                      <>
                        <FiLoader className="animate-spin mr-3 h-5 w-5" />
                        Posting Job...
                      </>
                    ) : (
                      <>
                        <FiPlus className="mr-3 h-5 w-5" />
                        Post Job Listing
                      </>
                    )}
                  </motion.button>
                </motion.div>
              </div>
            </motion.form>
          </div>
        </div>
      </div>
    </div>
  );
}