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
  FiRefreshCw,
  FiClock
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
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.6, 
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
      duration: 0.7, 
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.15
    }
  }
};

const pulseEffect = {
  scale: [1, 1.05, 1],
  opacity: [1, 0.8, 1],
  transition: { 
    duration: 1.5, 
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
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`block appearance-none w-full bg-white border-2 border-[#165BF8]/20 text-[#1C3991] py-3.5 px-4 pl-10 pr-10 rounded-2xl leading-tight focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] transition-all duration-300 shadow-sm cursor-pointer flex items-center justify-between hover:border-[#165BF8]/40 group`}
      >
        <div className="flex items-center">
          <Icon className={`h-5 w-5 text-[#165BF8] mr-3`} />
          <span className="truncate font-medium">{selectedOption ? selectedOption.username : placeholder}</span>
        </div>
        <FiChevronDown className={`h-5 w-5 text-[#165BF8] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-50 w-full mt-2 bg-white border-2 border-[#165BF8]/20 rounded-2xl shadow-2xl max-h-60 overflow-y-auto backdrop-blur-sm"
          >
            <div className="p-3 border-b border-[#165BF8]/10 sticky top-0 bg-white/95 z-20">
              <div className="relative">
                <FiSearch className="absolute inset-y-0 left-3 h-full w-5 text-[#165BF8]/70" />
                <input
                  type="text"
                  placeholder="Search admins..."
                  className={`w-full pl-10 pr-3 py-2.5 border border-[#165BF8]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#165BF8]/30 text-sm bg-white/80 text-[#1C3991] font-medium transition-all duration-200`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <ul className="divide-y divide-[#165BF8]/10">
              <motion.li
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key="all"
                onClick={() => handleSelect('all')}
                className="px-4 py-3 cursor-pointer hover:bg-[#165BF8]/5 flex items-center text-[#165BF8] font-bold transition-all duration-200 hover:pl-6 group"
              >
                <FiUsers className="mr-3 h-5 w-5" />
                All Admins/Referrers
              </motion.li>
              {filteredOptions.map((option, index) => (
                <motion.li
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={option._id}
                  onClick={() => handleSelect(option._id)}
                  className="px-4 py-3 cursor-pointer hover:bg-[#165BF8]/5 flex items-center text-[#1C3991] transition-all duration-200 hover:pl-6 group"
                >
                  <FiUser className="mr-3 h-5 w-5 text-[#165BF8]" />
                  <span className="font-medium">{option.username}</span>
                </motion.li>
              ))}
            </ul>
            {filteredOptions.length === 0 && searchTerm && (
              <div className="px-4 py-3 text-sm text-[#1C3991]/70 font-medium text-center">No matching users found</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function GenerateReferralPage() {
  const [email, setEmail] = useState("");
  const [durationValue, setDurationValue] = useState(60);
  const [durationUnit, setDurationUnit] = useState('days');
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
  }, [token, filterStatus, filterGeneratedBy]);

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
            className="rounded-full p-6 bg-gradient-to-br from-[#165BF8] to-[#1C3991] shadow-2xl"
          >
            <FiLoader className="text-white h-12 w-12 animate-spin" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-xl font-semibold text-[#1C3991]"
          >
            Loading Admin Panel...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] overflow-hidden font-inter">
      <Sidebar
        userRole={currentUser.role}
        onLogout={logout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        userEmail={currentUser?.email}
      />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Enhanced Mobile Header */}
        <div className="md:hidden bg-white/95 backdrop-blur-md shadow-2xl p-4 flex items-center justify-between z-10 sticky top-0 border-b border-[#165BF8]/10">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSidebarOpen(true)}
            className="p-3 rounded-xl bg-[#165BF8]/10 text-[#165BF8] hover:bg-[#165BF8]/20 transition-all duration-200"
          >
            <FiMenu className="h-6 w-6" />
          </motion.button>
          
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-black bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent"
          >
            Referral Manager
          </motion.h1>
          
          <div className="w-12"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Page Header */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="text-center"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#165BF8] to-[#1C3991] rounded-3xl shadow-2xl mb-6"
              >
                <FiCode className="h-10 w-10 text-white" />
              </motion.div>
              <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent mb-4">
                Referral Code Manager
              </h1>
              <p className="text-lg text-[#165BF8] font-medium max-w-2xl mx-auto">
                Generate and manage candidate referral codes with advanced tracking and analytics
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-1 gap-8">
              {/* Generate Code Section */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={cardAnimation}
              >
                <div className="bg-white rounded-3xl shadow-2xl border border-[#165BF8]/10 overflow-hidden">
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-[#165BF8] to-[#1C3991] text-white shadow-lg">
                          <FiCode className="h-7 w-7" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-[#1C3991]">Generate New Code</h2>
                          <p className="text-[#165BF8] font-medium">Create referral codes for candidates</p>
                        </div>
                      </div>
                      <button 
                        onClick={fetchReferralCodes}
                        className="p-3 rounded-2xl bg-[#165BF8]/10 text-[#165BF8] hover:bg-[#165BF8]/20 transition-all duration-300 shadow-sm"
                        title="Refresh codes"
                      >
                        <FiRefreshCw className={`h-5 w-5 ${loadingReferrals ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    
                    <form className="space-y-6" onSubmit={handleSubmit}>
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Email Field */}
                        <motion.div variants={cardAnimation}>
                          <label className="block text-sm font-bold text-[#1C3991] mb-3 uppercase tracking-wide">
                            Candidate Email
                          </label>
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <FiMail className="h-6 w-6 text-[#165BF8]/70" />
                            </div>
                            <input
                              type="email"
                              autoComplete="off"
                              required
                              className="block w-full pl-12 pr-4 py-4 text-lg border-2 border-[#165BF8]/20 rounded-2xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] text-[#1C3991] bg-white transition-all duration-300 group-hover:border-[#165BF8]/40"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="candidate@example.com"
                            />
                          </div>
                        </motion.div>

                        {/* Validity Duration */}
                        <motion.div variants={cardAnimation}>
                          <label className="block text-sm font-bold text-[#1C3991] mb-3 uppercase tracking-wide">
                            Validity Duration
                          </label>
                          <div className="flex gap-4">
                            <div className="relative flex-1 group">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <FiZap className="h-6 w-6 text-[#165BF8]/70" />
                              </div>
                              <input
                                type="number"
                                autoComplete="off"
                                required
                                min="1"
                                className="block w-full pl-12 pr-4 py-4 text-lg border-2 border-[#165BF8]/20 rounded-2xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] text-[#1C3991] bg-white transition-all duration-300 group-hover:border-[#165BF8]/40"
                                value={durationValue}
                                onChange={(e) => setDurationValue(Number(e.target.value))}
                                placeholder="e.g., 60"
                              />
                            </div>

                            <div className="relative w-40">
                              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-[#165BF8]">
                                <FiClock className="h-5 w-5" />
                              </div>
                              <select
                                value={durationUnit}
                                onChange={(e) => setDurationUnit(e.target.value)}
                                className="block appearance-none w-full bg-white border-2 border-[#165BF8]/20 text-[#1C3991] py-4 px-4 pl-12 pr-8 rounded-2xl leading-tight focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] transition-all duration-300 shadow-sm cursor-pointer hover:border-[#165BF8]/40 font-medium"
                              >
                                <option value="minutes">Minutes</option>
                                <option value="hours">Hours</option>
                                <option value="days">Days</option>
                              </select>
                            </div>
                          </div>
                        </motion.div>
                      </div>

                      {/* Messages */}
                      <AnimatePresence>
                        {error && (
                          <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl shadow-sm text-red-700 font-medium flex items-center space-x-3"
                          >
                            <FiXCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                            <span className="font-semibold">{error}</span>
                          </motion.div>
                        )}
                        {message && (
                          <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="p-4 bg-green-50 border-l-4 border-green-500 rounded-xl shadow-sm text-green-700 font-medium flex items-center space-x-3"
                          >
                            <FiCheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                            <span className="font-semibold">{message}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Generated Code Display */}
                      <AnimatePresence>
                        {generatedCode && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-gradient-to-r from-[#165BF8]/5 to-[#1C3991]/5 border-2 border-[#165BF8]/20 text-[#1C3991] p-6 rounded-2xl shadow-inner flex flex-col md:flex-row items-center justify-between gap-6"
                          >
                            <div className="flex items-center flex-grow">
                              <div className="bg-gradient-to-br from-[#165BF8] to-[#1C3991] p-3 rounded-xl mr-4 shadow-lg">
                                <FiCode className="h-7 w-7 text-white" />
                              </div>
                              <div className="flex-grow">
                                <p className="text-sm text-[#165BF8] font-bold mb-2">
                                  GENERATED REFERRAL CODE:
                                </p>
                                <code className="font-mono text-xl md:text-2xl break-all text-[#1C3991] bg-white/50 p-4 rounded-xl border-2 border-[#165BF8]/10 inline-block font-black tracking-wider">
                                  {generatedCode}
                                </code>
                              </div>
                            </div>
                            <div className="flex flex-col items-center md:items-end space-y-3">
                              <motion.button
                                type="button"
                                onClick={() => handleCopyCode(generatedCode)}
                                whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(22, 91, 248, 0.3)" }}
                                whileTap={{ scale: 0.95 }}
                                className="flex items-center px-5 py-3 bg-gradient-to-r from-[#165BF8] to-[#1C3991] rounded-xl text-white hover:from-[#1a65ff] hover:to-[#2242a8] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/30 text-sm font-bold shadow-lg"
                              >
                                <FiCopy className="w-5 h-5 mr-2" /> Copy Code
                              </motion.button>
                              <p className="text-sm text-[#165BF8] flex items-center font-semibold">
                                <FiCalendar className="mr-2" /> 
                                <span>Expires: {formatDate(expiresAt || new Date().toISOString())}</span>
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Submit Button */}
                      <motion.div variants={cardAnimation}>
                        <motion.button
                          type="submit"
                          disabled={loading}
                          whileHover={{ scale: 1.02, boxShadow: "0 15px 30px rgba(22, 91, 248, 0.3)" }}
                          whileTap={{ scale: 0.98 }}
                          className={`
                            w-full flex justify-center items-center py-4 px-6 rounded-2xl shadow-xl text-lg font-black text-white
                            bg-gradient-to-r from-[#165BF8] to-[#1C3991]
                            hover:from-[#1a65ff] hover:to-[#2242a8]
                            focus:outline-none focus:ring-4 focus:ring-[#165BF8]/30
                            transition-all duration-300
                            ${loading ? "opacity-80 cursor-not-allowed" : ""}
                          `}
                        >
                          {loading ? (
                            <>
                              <FiLoader className="animate-spin mr-3 h-6 w-6" />
                              Generating Code...
                            </>
                          ) : (
                            <>
                              <FiSend className="mr-3 h-6 w-6" />
                              Generate & Email Code
                            </>
                          )}
                        </motion.button>
                      </motion.div>
                    </form>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* All Generated Referral Codes Section */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-3xl shadow-2xl border border-[#165BF8]/10 overflow-hidden"
            >
              <div className="p-8 border-b border-[#165BF8]/10">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-2 gap-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-[#165BF8] to-[#1C3991] text-white shadow-lg">
                      <FiUsers className="h-7 w-7" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-[#1C3991]">Generated Referral Codes</h2>
                      <p className="text-[#165BF8] font-medium">Track and manage all your referral codes</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                    {/* Status Filter */}
                    <div className="relative w-full sm:w-48">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-[#165BF8]">
                        <FiFilter className="h-5 w-5" />
                      </div>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="block appearance-none w-full bg-white border-2 border-[#165BF8]/20 text-[#1C3991] py-3.5 px-4 pl-12 pr-8 rounded-2xl leading-tight focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] transition-all duration-300 shadow-sm cursor-pointer hover:border-[#165BF8]/40 font-medium"
                      >
                        <option value="all">All Statuses</option>
                        <option value="used and valid">Used and Valid</option>
                        <option value="used and expired">Used and Expired</option>
                        <option value="unused and expired">Unused and Expired</option>
                        <option value="unused and valid">Unused and Valid</option>
                      </select>
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
              </div>

              <div className="p-8">
                {loadingReferrals ? (
                  <div className="flex justify-center items-center py-16">
                    <motion.div
                      animate={pulseEffect}
                      className="rounded-full p-4 bg-gradient-to-br from-[#165BF8] to-[#1C3991] shadow-lg"
                    >
                      <FiLoader className="text-white h-8 w-8 animate-spin" />
                    </motion.div>
                  </div>
                ) : referralsError ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-5 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-xl flex items-center space-x-3 shadow-sm"
                  >
                    <FiXCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                    <span className="font-semibold">{referralsError}</span>
                  </motion.div>
                ) : generatedReferrals.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-16"
                  >
                    <div className="mx-auto w-24 h-24 bg-gradient-to-br from-[#165BF8]/10 to-[#1C3991]/10 rounded-3xl flex items-center justify-center mb-6">
                      <FiCode className="h-12 w-12 text-[#165BF8]" />
                    </div>
                    <h3 className="text-2xl font-black text-[#1C3991] mb-3">No referral codes found</h3>
                    <p className="text-[#165BF8] font-medium">Generate your first referral code to get started</p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: {
                        transition: { staggerChildren: 0.15 },
                      },
                    }}
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                  >
                    {generatedReferrals.map((referral) => (
                      <motion.div
                        key={referral._id}
                        variants={cardAnimation}
                        whileHover={{ 
                          y: -8, 
                          scale: 1.02,
                          boxShadow: "0 20px 40px rgba(22, 91, 248, 0.15)" 
                        }}
                        className="bg-white border-2 border-[#165BF8]/10 rounded-2xl shadow-lg p-6 flex flex-col hover:border-[#165BF8]/30 transition-all duration-300 relative overflow-hidden group"
                      >
                        {/* Gradient overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#165BF8]/5 to-[#1C3991]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                        
                        <div className="flex-grow relative z-10">
                          {/* Header */}
                          <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center">
                              <div className="bg-gradient-to-br from-[#165BF8] to-[#1C3991] p-2 rounded-xl mr-3 shadow-lg">
                                <FiCode className="text-white h-5 w-5" />
                              </div>
                              <h3 className="font-black text-[#1C3991] text-lg">Referral Code</h3>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleCopyCode(referral.code)}
                              className="p-2 rounded-xl text-[#165BF8] bg-[#165BF8]/10 hover:bg-[#165BF8]/20 transition-all duration-200 shadow-sm"
                              title="Copy code"
                            >
                              <FiCopy className="w-5 h-5" />
                            </motion.button>
                          </div>
                          
                          {/* Code */}
                          <code className="font-mono text-xl text-[#1C3991] break-all bg-[#165BF8]/5 p-4 rounded-xl border-2 border-[#165BF8]/10 block mb-6 font-black tracking-wide">
                            {referral.code}
                          </code>
                          
                          {/* Details */}
                          <div className="space-y-4 text-sm">
                            <div className="flex gap-3">
                              <FiMail className="h-5 w-5 text-[#165BF8] shrink-0 mt-0.5" />
                              <div>
                                <p className="text-[#165BF8] font-bold">Candidate</p>
                                <p className="text-[#1C3991] font-semibold break-words">
                                  {referral.candidateEmail}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex gap-3">
                              <FiUser className="h-5 w-5 text-[#165BF8] shrink-0 mt-0.5" />
                              <div>
                                <p className="text-[#165BF8] font-bold">Referrer</p>
                                <p className="text-[#1C3991] font-semibold">
                                  {referral.generatedByAdminUsername}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex gap-3">
                              <FiCalendar className="h-5 w-5 text-[#165BF8] shrink-0 mt-0.5" />
                              <div>
                                <p className="text-[#165BF8] font-bold">Expires</p>
                                <p className="text-[#1C3991] font-semibold">
                                  {formatDate(referral.expiresAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Status Badge */}
                        <div className={`mt-5 px-4 py-2 text-sm font-black rounded-full inline-flex items-center self-start relative z-10
                          ${
                            referral.status === "used and valid"
                              ? "bg-green-100 text-green-800 border-2 border-green-200"
                              : referral.status === "unused and expired"
                              ? "bg-red-100 text-red-800 border-2 border-red-200"
                              : referral.status === "unused and valid"
                              ? "bg-amber-100 text-amber-800 border-2 border-amber-200"
                              : referral.status === "used and expired"
                              ? "bg-gray-100 text-gray-800 border-2 border-gray-200"
                              : "bg-gray-100 text-gray-800 border-2 border-gray-200"
                          }`}
                        >
                          <FiTag className="mr-2 h-4 w-4" />
                          {referral.status.toUpperCase()}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Copy Success Notification */}
      <AnimatePresence>
        {copySuccess && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-[#165BF8] to-[#1C3991] text-white px-6 py-3 rounded-xl shadow-2xl flex items-center space-x-3 z-50 font-bold"
          >
            <FiClipboard className="w-6 h-6" />
            <span>{copySuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}