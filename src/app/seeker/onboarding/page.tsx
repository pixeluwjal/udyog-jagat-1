'use client';

import { useState, FormEvent, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUser,
  FiPhone,
  FiAward,
  FiFileText,
  FiUploadCloud,
  FiCheckCircle,
  FiXCircle,
  FiLoader,
  FiArrowLeft,
  FiMail,
  FiBriefcase
} from 'react-icons/fi';

// Brand colors
const primaryBlue = "#165BF8";
const darkBlue = "#1C3991";

// Animation variants
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

export default function SeekerOnboardingPage() {
  const { user, loading: authLoading, isAuthenticated, token, logout, login } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [skills, setSkills] = useState('');
  const [experience, setExperience] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Redirect logic
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'job_seeker') {
      if (user.role === 'admin') router.push('/admin/dashboard');
      else if (user.role === 'job_poster') router.push('/poster/dashboard');
      else router.push('/');
      return;
    }

    if (user.onboardingStatus === 'completed') {
      router.push('/seeker/dashboard');
      return;
    }

    if (user.candidateDetails) {
      setFullName(user.candidateDetails.fullName || '');
      setPhone(user.candidateDetails.phone || '');
      setSkills(user.candidateDetails.skills?.join(', ') || '');
      setExperience(user.candidateDetails.experience || '');
    }
  }, [authLoading, user, isAuthenticated, router]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setResumeFile(e.target.files[0]);
    } else {
      setResumeFile(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (!token) {
      setError('Authentication token missing. Please log in again.');
      setLoading(false);
      return;
    }

    if (!fullName || !phone || !skills || !experience || !resumeFile) {
      setError('All fields are required, including resume upload.');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('phone', phone);
    formData.append('skills', skills);
    formData.append('experience', experience);
    formData.append('resume', resumeFile);

    try {
      const response = await fetch('/api/seeker/onboarding', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      setMessage(data.message || 'Onboarding completed successfully!');
      if (data.token) {
        await login(data.token);
      }

      router.push('/seeker/dashboard');
    } catch (err: any) {
      console.error('Onboarding submission error:', err);
      setError(err.message || 'An unexpected error occurred during onboarding.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user || user.role !== 'job_seeker' || user.onboardingStatus === 'completed') {
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
            Loading Onboarding...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#f6f9ff] to-[#eef2ff] overflow-hidden font-inter">
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Header Section */}
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
                <FiUser className="h-10 w-10 text-white" />
              </motion.div>
              <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent mb-4">
                Complete Your Profile
              </h1>
              <p className="text-lg text-[#165BF8] font-medium max-w-2xl mx-auto">
                Set up your professional profile to unlock amazing job opportunities
              </p>
            </motion.div>

            {/* Progress Steps */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              transition={{ delay: 0.1 }}
              className="flex justify-center"
            >
              <div className="flex items-center space-x-8">
                {[
                  { step: 1, label: "Personal Info", completed: true },
                  { step: 2, label: "Professional", completed: false },
                  { step: 3, label: "Resume", completed: false }
                ].map((item, index) => (
                  <div key={item.step} className="flex items-center">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold text-sm ${
                      item.completed 
                        ? 'bg-[#165BF8] border-[#165BF8] text-white' 
                        : 'border-[#165BF8]/30 text-[#165BF8]'
                    }`}>
                      {item.completed ? <FiCheckCircle className="w-5 h-5" /> : item.step}
                    </div>
                    <span className="ml-2 text-sm font-medium text-[#1C3991]">{item.label}</span>
                    {index < 2 && (
                      <div className="ml-8 w-12 h-0.5 bg-[#165BF8]/30"></div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Main Form Card */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={cardAnimation}
              className="bg-white rounded-3xl shadow-2xl border border-[#165BF8]/10 overflow-hidden"
            >
              <div className="p-8 border-b border-[#165BF8]/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-[#165BF8] to-[#1C3991] text-white shadow-lg">
                      <FiBriefcase className="h-7 w-7" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-[#1C3991]">Professional Profile</h2>
                      <p className="text-[#165BF8] font-medium">Tell us about your skills and experience</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl shadow-sm text-red-700 font-medium flex items-center space-x-3 mb-6"
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
                      className="p-4 bg-green-50 border-l-4 border-green-500 rounded-xl shadow-sm text-green-700 font-medium flex items-center space-x-3 mb-6"
                    >
                      <FiCheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                      <span className="font-semibold">{message}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Name Field */}
                    <motion.div variants={cardAnimation}>
                      <label className="block text-sm font-bold text-[#1C3991] mb-3 uppercase tracking-wide">
                        <FiUser className="inline-block mr-2 text-[#165BF8]" /> Full Name
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <FiUser className="h-5 w-5 text-[#165BF8]/70" />
                        </div>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="block w-full pl-12 pr-4 py-3.5 text-lg border-2 border-[#165BF8]/20 rounded-2xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] text-[#1C3991] bg-white transition-all duration-300 group-hover:border-[#165BF8]/40"
                          placeholder="John Doe"
                          required
                        />
                      </div>
                    </motion.div>

                    {/* Phone Field */}
                    <motion.div variants={cardAnimation}>
                      <label className="block text-sm font-bold text-[#1C3991] mb-3 uppercase tracking-wide">
                        <FiPhone className="inline-block mr-2 text-[#165BF8]" /> Phone Number
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <FiPhone className="h-5 w-5 text-[#165BF8]/70" />
                        </div>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="block w-full pl-12 pr-4 py-3.5 text-lg border-2 border-[#165BF8]/20 rounded-2xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] text-[#1C3991] bg-white transition-all duration-300 group-hover:border-[#165BF8]/40"
                          placeholder="+1 (555) 123-4567"
                          required
                        />
                      </div>
                    </motion.div>
                  </div>

                  {/* Skills Field */}
                  <motion.div variants={cardAnimation}>
                    <label className="block text-sm font-bold text-[#1C3991] mb-3 uppercase tracking-wide">
                      <FiAward className="inline-block mr-2 text-[#165BF8]" /> Skills & Expertise
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiAward className="h-5 w-5 text-[#165BF8]/70" />
                      </div>
                      <input
                        type="text"
                        value={skills}
                        onChange={(e) => setSkills(e.target.value)}
                        className="block w-full pl-12 pr-4 py-3.5 text-lg border-2 border-[#165BF8]/20 rounded-2xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] text-[#1C3991] bg-white transition-all duration-300 group-hover:border-[#165BF8]/40"
                        placeholder="JavaScript, React, Node.js, Python, etc."
                        required
                      />
                    </div>
                    <p className="mt-2 text-sm text-[#165BF8] font-medium">Separate skills with commas</p>
                  </motion.div>

                  {/* Experience Field */}
                  <motion.div variants={cardAnimation}>
                    <label className="block text-sm font-bold text-[#1C3991] mb-3 uppercase tracking-wide">
                      <FiBriefcase className="inline-block mr-2 text-[#165BF8]" /> Professional Experience
                    </label>
                    <textarea
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      className="block w-full px-4 py-3.5 text-lg border-2 border-[#165BF8]/20 rounded-2xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] text-[#1C3991] bg-white transition-all duration-300 min-h-[150px] resize-none"
                      placeholder="Describe your professional background, key achievements, and career journey..."
                      required
                    />
                  </motion.div>

                  {/* Resume Upload Field */}
                  <motion.div variants={cardAnimation}>
                    <label className="block text-sm font-bold text-[#1C3991] mb-3 uppercase tracking-wide">
                      <FiFileText className="inline-block mr-2 text-[#165BF8]" /> Upload Resume
                    </label>
                    
                    <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 group ${
                      resumeFile 
                        ? 'border-[#165BF8] bg-[#165BF8]/5' 
                        : 'border-[#165BF8]/30 hover:border-[#165BF8] hover:bg-[#165BF8]/5'
                    }`}>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        className="hidden"
                        id="resume-upload"
                        required
                      />
                      
                      <label htmlFor="resume-upload" className="cursor-pointer">
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <div className="p-4 rounded-2xl bg-[#165BF8]/10 text-[#165BF8] group-hover:scale-110 transition-transform duration-300">
                            <FiUploadCloud className="h-8 w-8" />
                          </div>
                          
                          <div className="text-center">
                            <p className="text-lg font-bold text-[#1C3991] mb-2">
                              {resumeFile ? 'Resume Selected' : 'Upload Your Resume'}
                            </p>
                            <p className="text-[#165BF8] font-medium">
                              {resumeFile ? resumeFile.name : 'Click to browse or drag and drop'}
                            </p>
                            <p className="text-sm text-[#165BF8]/70 mt-2">
                              PDF, DOC, DOCX up to 10MB
                            </p>
                          </div>

                          {!resumeFile && (
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="px-6 py-3 bg-[#165BF8]/10 text-[#165BF8] rounded-xl font-bold hover:bg-[#165BF8]/20 transition-all duration-300"
                            >
                              Choose File
                            </motion.div>
                          )}
                        </div>
                      </label>
                    </div>

                    {resumeFile && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-xl flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <FiCheckCircle className="h-6 w-6 text-green-500" />
                          <div>
                            <p className="font-bold text-green-800">{resumeFile.name}</p>
                            <p className="text-sm text-green-600">
                              {(resumeFile.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setResumeFile(null)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors duration-200"
                        >
                          <FiXCircle className="h-5 w-5" />
                        </button>
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Form Actions */}
                  <motion.div
                    variants={cardAnimation}
                    className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 pt-8 border-t border-[#165BF8]/10"
                  >
                    <motion.button
                      type="button"
                      onClick={() => router.push('/seeker/dashboard')}
                      whileHover={{ scale: 1.05, boxShadow: "0 8px 25px rgba(22, 91, 248, 0.2)" }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center px-6 py-3.5 bg-white text-[#165BF8] rounded-2xl hover:bg-[#165BF8]/10 transition-all duration-300 font-bold shadow-lg border-2 border-[#165BF8]/20"
                    >
                      <FiArrowLeft className="mr-2 w-5 h-5" /> Back to Dashboard
                    </motion.button>

                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: 1.02, boxShadow: "0 15px 30px rgba(22, 91, 248, 0.3)" }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        flex items-center px-8 py-3.5 rounded-2xl shadow-xl text-lg font-black text-white
                        bg-gradient-to-r from-[#165BF8] to-[#1C3991]
                        hover:from-[#1a65ff] hover:to-[#2242a8]
                        focus:outline-none focus:ring-4 focus:ring-[#165BF8]/30
                        transition-all duration-300
                        ${loading ? "opacity-70 cursor-not-allowed" : ""}
                      `}
                    >
                      {loading ? (
                        <>
                          <FiLoader className="animate-spin mr-3 h-6 w-6" />
                          Completing Profile...
                        </>
                      ) : (
                        <>
                          <FiCheckCircle className="mr-3 h-6 w-6" />
                          Complete Onboarding
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                </form>
              </div>
            </motion.div>

            {/* Help Text */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <p className="text-sm text-[#165BF8] font-medium">
                Need help? Contact our support team at{" "}
                <a href="mailto:support@udyogjagat.com" className="font-bold hover:underline">
                  support@udyogjagat.com
                </a>
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}