"use client";

import { useState, FormEvent, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";
import Sidebar from "@/app/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiMail,
  FiCode,
  FiCalendar,
  FiCopy,
  FiCheckCircle,
  FiXCircle,
  FiLoader,
  FiChevronLeft,
  FiClipboard,
  FiFilter,
  FiUser,
  FiSend,
  FiTag,
  FiMenu,
  FiUsers,
  FiZap,
  FiChevronDown,
  FiSearch,
  FiRefreshCw
} from "react-icons/fi";

// Brand colors
const primaryBlue = "#165BF8";
const darkBlue = "#1C3991";

interface ReferralCode {
  _id: string;
  code: string;
  candidateEmail: string;
  expiresAt: string;
  isUsed: boolean;
  createdAt: string;
  generatedByAdminUsername: string;
  generatedByAdminId: string;
  status: string;
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

const cardAnimation = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { 
      duration: 0.6, 
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.1
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

const SearchableDropdown: React.FC<{
  options: { _id: string; username: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: React.ElementType;
}> = ({ options, value, onChange, placeholder, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null); 

  const selectedOption = options.find(opt => opt._id === value);
  const filteredOptions = options.filter(opt =>
    opt.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
    setSearchTerm('');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`block appearance-none w-full bg-white border border-[#165BF8]/20 text-[#1C3991] py-3 px-4 pl-10 pr-10 rounded-xl leading-tight focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] transition-all duration-200 shadow-sm cursor-pointer flex items-center justify-between hover:border-[#165BF8]/30`}
      >
        <div className="flex items-center">
          <Icon className={`h-5 w-5 text-[#165BF8] mr-2`} />
          <span className="truncate">{selectedOption ? selectedOption.username : placeholder}</span>
        </div>
        <FiChevronDown className={`h-5 w-5 text-[#165BF8] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-20 w-full mt-1 bg-white border border-[#165BF8]/20 rounded-xl shadow-lg max-h-60 overflow-y-auto backdrop-blur-sm"
          >
            <div className="p-2 border-b border-[#165BF8]/10 sticky top-0 bg-white/95 z-20">
              <div className="relative">
                <FiSearch className="absolute inset-y-0 left-3 h-full w-5 text-[#165BF8]/70" />
                <input
                  type="text"
                  placeholder="Search..."
                  className={`w-full pl-10 pr-3 py-2 border border-[#165BF8]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 text-sm bg-white/80 text-[#1C3991]`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <ul className="divide-y divide-[#165BF8]/10">
              <li
                key="all"
                onClick={() => handleSelect('all')}
                className="px-4 py-2 cursor-pointer hover:bg-[#165BF8]/5 flex items-center text-[#165BF8] font-medium"
              >
                All Admins/Referrers
              </li>
              {filteredOptions.map((option) => (
                <li
                  key={option._id}
                  onClick={() => handleSelect(option._id)}
                  className="px-4 py-2 cursor-pointer hover:bg-[#165BF8]/5 flex items-center text-[#1C3991] transition-colors"
                >
                  {option.username}
                </li>
              ))}
            </ul>
            {filteredOptions.length === 0 && searchTerm && (
              <div className="px-4 py-2 text-sm text-[#1C3991]/70">No matching users found.</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function GenerateReferralPage() {
  const [email, setEmail] = useState("");
  const [durationValue, setDurationValue] = useState(60); // The number part of the duration
  const [durationUnit, setDurationUnit] = useState('days'); // The unit part ('minutes', 'hours', 'days')
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedReferrals, setGeneratedReferrals] = useState<ReferralCode[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(true);
  const [referralsError, setReferralsError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterGeneratedBy, setFilterGeneratedBy] = useState<string>("all");
  const [adminUsers, setAdminUsers] = useState<{ _id: string; username: string }[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { user: currentUser, loading: authLoading, isAuthenticated, token, logout } = useAuth();
  const router = useRouter();

  // Updated to also show the time
  const formatDate = (isoString: string): string => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const fetchAdminUsers = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/admin/users?roles=admin,job_referrer', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data.users)) {
        setAdminUsers(data.users.map((u: any) => ({ _id: u._id, username: u.username || u.email })));
      }
    } catch (err) {
      console.error('Error fetching admin users:', err);
    }
  }, [token]);

  // Updated fetch to include status and referrer filters in the API call
  const fetchReferralCodes = useCallback(async () => {
    setLoadingReferrals(true);
    setReferralsError(null);

    if (!token) {
      setReferralsError("Authentication token missing.");
      setLoadingReferrals(false);
      return;
    }

    try {
      const params = new URLSearchParams();
      // Use a consistent name for the status filter that the API understands
      if (filterStatus !== 'all') {
        params.append('status', filterStatus); 
      }
      if (filterGeneratedBy !== 'all') {
        params.append('generatedByAdminId', filterGeneratedBy);
      }

      const response = await fetch(`/api/admin/referral-codes?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to fetch referral codes.");
      setGeneratedReferrals(data.referralCodes);
    } catch (err: any) {
      setReferralsError(err.message || "An error occurred while fetching codes.");
    } finally {
      setLoadingReferrals(false);
    }
  }, [token, filterStatus, filterGeneratedBy]); // CRITICAL FIX: Add filterStatus and filterGeneratedBy to dependencies

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !currentUser) {
      router.push("/login");
      return;
    }
    if (currentUser.firstLogin) {
      router.push("/change-password");
      return;
    }
    if (currentUser.role !== "admin") {
      if (currentUser.role === "job_poster") router.push("/poster/dashboard");
      else if (currentUser.role === "job_seeker") router.push("/seeker/dashboard");
      else router.push("/");
      return;
    }

    fetchAdminUsers();
    fetchReferralCodes();
  }, [authLoading, isAuthenticated, currentUser, router, fetchReferralCodes, fetchAdminUsers]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setGeneratedCode(null);
    setExpiresAt(null);
    setLoading(true);

    if (!token) {
      setError("Authentication token missing. Please log in again.");
      setLoading(false);
      return;
    }

    if (!email) {
      setError("Please provide an email address.");
      setLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Invalid email format.");
      setLoading(false);
      return;
    }

    if (durationValue <= 0) {
      setError("Please enter a valid duration greater than 0.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/generate-referral-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
            candidateEmail: email, 
            durationValue: durationValue,
            durationUnit: durationUnit
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to generate referral code");

      setMessage(data.message || "Referral code generated successfully!");
      setGeneratedCode(data.code);
      setExpiresAt(data.expiresAt);
      setEmail("");
      setDurationValue(60);
      setDurationUnit('days');
      fetchReferralCodes();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
      .then(() => {
        setCopySuccess("Code copied to clipboard!");
        setTimeout(() => setCopySuccess(null), 2000);
      })
      .catch(() => {
        const el = document.createElement("textarea");
        el.value = code;
        document.body.appendChild(el);
        document.execCommand("copy");
        document.body.removeChild(el);
        setCopySuccess("Code copied!");
        setTimeout(() => setCopySuccess(null), 2000);
      });
  };

  if (authLoading || !isAuthenticated || !currentUser || currentUser.firstLogin || currentUser.role !== "admin") {
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
            Loading admin panel...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] overflow-hidden">
      <Sidebar
        userRole={currentUser.role}
        onLogout={logout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        userEmail={currentUser?.email}
      />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden bg-white/95 backdrop-blur-md shadow-sm p-4 flex justify-between items-center z-10 sticky top-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg text-[#165BF8] hover:bg-[#165BF8]/10 focus:outline-none"
          >
            <FiMenu className="h-6 w-6" />
          </motion.button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent">
            Referral Manager
          </h1>
          <div className="w-6 h-6"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Page Header */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-[#1C3991] leading-tight">
                  <span className="bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent">
                    Referral Code Manager
                  </span>
                </h1>
                <p className="text-[#165BF8] mt-2">
                  Generate and manage candidate referral codes
                </p>
              </div>
              <Link href="/admin/dashboard" passHref>
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: `0 4px 15px ${primaryBlue}30` }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center px-5 py-2.5 bg-white text-[#165BF8] rounded-xl hover:bg-[#165BF8]/10 transition-all text-sm font-medium shadow-sm border border-[#165BF8]/20"
                >
                  <FiChevronLeft className="mr-2 w-5 h-5" /> Dashboard
                </motion.button>
              </Link>
            </motion.div>

            {/* Generate Code Section */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={cardAnimation}
              className="bg-white rounded-2xl shadow-lg border border-[#165BF8]/10 p-6 md:p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#1C3991] flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#165BF8]/10 text-[#165BF8]">
                    <FiCode className="h-6 w-6" />
                  </div>
                  Generate New Code
                </h2>
                <button 
                  onClick={fetchReferralCodes}
                  className="p-2 rounded-lg bg-[#165BF8]/10 text-[#165BF8] hover:bg-[#165BF8]/20 transition-colors"
                  title="Refresh codes"
                >
                  <FiRefreshCw className={`h-5 w-5 ${loadingReferrals ? 'animate-spin' : ''}`} />
                </button>
              </div>
              
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-medium text-[#1C3991] mb-2">
                    Candidate Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiMail className="h-5 w-5 text-[#165BF8]/70" />
                    </div>
                    <input
                      type="email"
                      autoComplete="off"
                      required
                      className="block w-full pl-10 pr-4 py-3 border border-[#165BF8]/20 rounded-xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] text-[#1C3991] bg-white transition-all duration-200"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="candidate@example.com"
                    />
                  </div>
                </div>

                {/* Validity Duration Inputs */}
                <div>
                    <label className="block text-sm font-medium text-[#1C3991] mb-2">
                        Validity Duration
                    </label>
                    <div className="flex gap-3">
                        {/* Number Input for Duration Value */}
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FiZap className="h-5 w-5 text-[#165BF8]/70" />
                            </div>
                            <input
                                type="number"
                                autoComplete="off"
                                required
                                min="1"
                                className="block w-full pl-10 pr-4 py-3 border border-[#165BF8]/20 rounded-xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] text-[#1C3991] bg-white transition-all duration-200"
                                value={durationValue}
                                onChange={(e) => setDurationValue(Number(e.target.value))}
                                placeholder="e.g., 60"
                            />
                        </div>

                        {/* Dropdown for Time Unit */}
                        <div className="relative w-32">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#165BF8]">
                                <FiChevronDown className="h-5 w-5" />
                            </div>
                            <select
                                value={durationUnit}
                                onChange={(e) => setDurationUnit(e.target.value)}
                                className="block appearance-none w-full bg-white border border-[#165BF8]/20 text-[#1C3991] py-3 px-4 pl-10 pr-8 rounded-xl leading-tight focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] transition-all shadow-sm cursor-pointer hover:border-[#165BF8]/30"
                            >
                                <option value="minutes">Minutes</option>
                                <option value="hours">Hours</option>
                                <option value="days">Days</option>
                            </select>
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 bg-red-50 border-l-4 border-red-400 rounded-lg text-sm text-red-700 font-medium flex items-center"
                    >
                      <FiXCircle className="h-5 w-5 text-red-500 mr-2" />
                      {error}
                    </motion.div>
                  )}
                  {message && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 bg-green-50 border-l-4 border-green-400 rounded-lg text-sm text-green-700 font-medium flex items-center"
                    >
                      <FiCheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      {message}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {generatedCode && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-gradient-to-r from-[#165BF8]/5 to-[#1C3991]/5 border border-[#165BF8]/20 text-[#1C3991] p-5 rounded-xl shadow-inner flex flex-col md:flex-row items-center justify-between gap-4"
                    >
                      <div className="flex items-center flex-grow">
                        <div className="bg-[#165BF8]/10 p-2 rounded-lg mr-4">
                          <FiCode className="h-6 w-6 text-[#165BF8]" />
                        </div>
                        <div className="flex-grow">
                          <p className="text-sm text-[#165BF8] font-medium mb-1">
                            Generated Referral Code:
                          </p>
                          <code className="font-mono text-xl md:text-2xl break-all text-[#1C3991] bg-[#165BF8]/5 p-3 rounded-lg border border-[#165BF8]/10 inline-block">
                            {generatedCode}
                          </code>
                        </div>
                      </div>
                      <div className="flex flex-col items-center md:items-end space-y-2">
                        <motion.button
                          type="button"
                          onClick={() => handleCopyCode(generatedCode)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex items-center px-4 py-2 bg-[#165BF8] rounded-xl text-white hover:bg-[#1a65ff] transition-colors focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:ring-offset-2 text-sm font-medium shadow-md"
                        >
                          <FiCopy className="w-4 h-4 mr-2" /> Copy Code
                        </motion.button>
                        <p className="text-xs text-[#165BF8] flex items-center">
                          <FiCalendar className="mr-1.5" /> 
                          <span className="font-semibold">Expires: {formatDate(expiresAt || new Date().toISOString())}</span>
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-md text-lg font-semibold text-white
                      bg-gradient-to-r from-[#165BF8] to-[#1C3991]
                      hover:from-[#1a65ff] hover:to-[#2242a8]
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#165BF8]/50
                      transition-all duration-200
                      ${loading ? "opacity-80 cursor-not-allowed" : ""}
                    `}
                  >
                    {loading ? (
                      <>
                        <FiLoader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FiSend className="-ml-1 mr-3 h-5 w-5" />
                        Generate & Email Code
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>

            {/* All Generated Referral Codes Section */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg border border-[#165BF8]/10 p-6 md:p-8"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-[#1C3991] flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#165BF8]/10 text-[#165BF8]">
                    <FiUsers className="h-6 w-6" />
                  </div>
                  Generated Referral Codes
                </h2>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  {/* Status Filter */}
                  <div className="relative w-full sm:w-48">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#165BF8]">
                      <FiFilter className="h-5 w-5" />
                    </div>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="block appearance-none w-full bg-white border border-[#165BF8]/20 text-[#1C3991] py-3 px-4 pl-10 pr-8 rounded-xl leading-tight focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 focus:border-[#165BF8] transition-all shadow-sm cursor-pointer hover:border-[#165BF8]/30"
                    >
                      <option value="all">All Statuses</option>
                      <option value="used and valid">Used and Valid</option>
                      <option value="used and expired">Used and Expired</option>
                      <option value="unused and expired">Unused and Expired</option>
                      <option value="unused and valid">Unused and Valid</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#165BF8]">
                      <FiChevronDown className="h-5 w-5" />
                    </div>
                  </div>
                  {/* Referrer Filter */}
                  <SearchableDropdown
                    options={[{ _id: 'all', username: 'All Admins/Referrers' }, ...adminUsers]}
                    value={filterGeneratedBy}
                    onChange={setFilterGeneratedBy}
                    placeholder="Filter by Referrer"
                    icon={FiUser}
                  />
                </div>
              </div>

              {loadingReferrals ? (
                <div className="flex justify-center items-center py-12">
                  <motion.div
                    animate={pulseEffect}
                    className="p-3 bg-[#165BF8]/10 rounded-full"
                  >
                    <FiLoader className="animate-spin text-[#165BF8] h-8 w-8" />
                  </motion.div>
                </div>
              ) : referralsError ? (
                <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-lg flex items-center">
                  <FiXCircle className="h-5 w-5 text-red-500 mr-2" />
                  <span>{referralsError}</span>
                </div>
              ) : generatedReferrals.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-24 h-24 bg-[#165BF8]/5 rounded-full flex items-center justify-center mb-4">
                    <FiCode className="h-10 w-10 text-[#165BF8]/70" />
                  </div>
                  <h3 className="text-lg font-medium text-[#1C3991]">No referral codes found</h3>
                  <p className="text-[#165BF8] mt-1">Generate your first referral code above</p>
                </div>
              ) : (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: {
                      transition: { staggerChildren: 0.1 },
                    },
                  }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                >
                  {generatedReferrals.map((referral) => (
                    <motion.div
                      key={referral._id}
                      variants={cardAnimation}
                      whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(22, 91, 248, 0.1)" }}
                      className="bg-white border border-[#165BF8]/10 rounded-xl shadow-sm p-5 flex flex-col hover:shadow-md transition-all duration-200 hover:border-[#165BF8]/20 relative overflow-hidden group"
                    >
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-[#165BF8]/5 to-[#1C3991]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                      
                      <div className="flex-grow relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <div className="bg-[#165BF8]/10 p-2 rounded-lg mr-3">
                              <FiCode className="text-[#165BF8] h-5 w-5" />
                            </div>
                            <h3 className="font-bold text-[#1C3991]">Referral Code</h3>
                          </div>
                          <button
                            onClick={() => handleCopyCode(referral.code)}
                            className="p-1.5 rounded-lg text-[#165BF8] bg-[#165BF8]/10 hover:bg-[#165BF8]/20 transition-colors"
                            title="Copy code"
                          >
                            <FiCopy className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <code className="font-mono text-lg text-[#1C3991] break-all bg-[#165BF8]/5 p-3 rounded-lg border border-[#165BF8]/10 block mb-5 font-semibold">
                          {referral.code}
                        </code>
                        
                        <div className="space-y-3 text-sm">
                          <div className="flex gap-3">
                            <FiMail className="h-5 w-5 text-[#165BF8] shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[#165BF8] font-medium">Candidate</p>
                              <p className="text-[#1C3991] font-medium break-words">
                                {referral.candidateEmail}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex gap-3">
                            <FiUser className="h-5 w-5 text-[#165BF8] shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[#165BF8] font-medium">Referrer</p>
                              <p className="text-[#1C3991] font-medium">
                                {referral.generatedByAdminUsername}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex gap-3">
                            <FiCalendar className="h-5 w-5 text-[#165BF8] shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[#165BF8] font-medium">Expires</p>
                              <p className="text-[#1C3991] font-medium">
                                {formatDate(referral.expiresAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* NEW LOGIC: Dynamic status display based on API response */}
                      <div className={`mt-4 px-3 py-1.5 text-xs font-bold rounded-full inline-flex items-center self-start
                        ${
                          referral.status === "used and valid"
                            ? "bg-green-100 text-green-800"
                            : referral.status === "unused and expired"
                            ? "bg-red-100 text-red-800"
                            : referral.status === "unused and valid"
                            ? "bg-amber-100 text-amber-800"
                            : referral.status === "used and expired"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-gray-100 text-gray-800" // Fallback
                        }`}
                      >
                        <FiTag className="mr-2 h-3 w-3" />
                        {referral.status}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Copy Success Notification */}
      <AnimatePresence>
        {copySuccess && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#165BF8] text-white px-4 py-2.5 rounded-lg shadow-xl flex items-center space-x-2 z-50"
          >
            <FiClipboard className="w-5 h-5" />
            <span>{copySuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
