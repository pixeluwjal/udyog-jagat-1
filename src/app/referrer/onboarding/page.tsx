// app/referrer/onboarding/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUser,
  FiMail,
  FiPhone,
  FiBriefcase,
  FiNavigation,
  FiAward,
  FiCheckCircle,
  FiXCircle,
  FiLoader,
  FiArrowRight,
  FiArrowLeft,
  FiHome,
  FiMapPin,
  FiSearch
} from 'react-icons/fi';

// Brand colors
const primaryBlue = "#165BF8";
const darkBlue = "#1C3991";

interface Company {
  name: string;
  domain?: string;
  logo?: string;
}

interface AddressSuggestion {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
}

// Define steps array outside the component
const steps = [
  { number: 1, title: 'Personal Info', description: 'Your basic details' },
  { number: 2, title: 'Work Details', description: 'Professional information' },
  { number: 3, title: 'Review & Complete', description: 'Confirm your information' }
];

export default function ReferrerOnboardingPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    mobileNumber: '',
    personalEmail: '',
    residentialAddress: '',
    companyName: '',
    workLocation: '',
    designation: ''
  });
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  
  const { user, token, login, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const addressInputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch companies from external API
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://autocomplete.clearbit.com/v1/companies/suggest?query=tech');
        
        if (response.ok) {
          const data = await response.json();
          setCompanies(data || []);
        } else {
          setCompanies([
            { name: 'Google' }, { name: 'Microsoft' }, { name: 'Amazon' }, { name: 'Meta' },
            { name: 'Apple' }, { name: 'Netflix' }, { name: 'Uber' }, { name: 'Airbnb' },
            { name: 'Salesforce' }, { name: 'Adobe' }, { name: 'Tesla' }, { name: 'Spotify' }
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch companies:', error);
        setCompanies([
          { name: 'Google' }, { name: 'Microsoft' }, { name: 'Amazon' }, { name: 'Meta' },
          { name: 'Apple' }, { name: 'Netflix' }, { name: 'Uber' }, { name: 'Airbnb' },
          { name: 'Salesforce' }, { name: 'Adobe' }, { name: 'Tesla' }, { name: 'Spotify' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  // Search companies when user types
  useEffect(() => {
    const searchCompanies = async () => {
      if (searchQuery.length < 2) return;

      try {
        const response = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setCompanies(data || []);
        }
      } catch (error) {
        console.error('Failed to search companies:', error);
      }
    };

    const debounceTimer = setTimeout(searchCompanies, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Search addresses using OpenStreetMap Nominatim API
  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    setIsSearchingAddress(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`
      );
      if (response.ok) {
        const data = await response.json();
        setAddressSuggestions(data);
      }
    } catch (error) {
      console.error('Failed to search address:', error);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handleAddressSelect = (address: AddressSuggestion) => {
    setFormData(prev => ({
      ...prev,
      residentialAddress: address.display_name
    }));
    setShowAddressDropdown(false);
    setAddressSuggestions([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'residentialAddress') {
      searchAddress(value);
    }
  };

  const handleCompanySelect = (companyName: string) => {
    setFormData(prev => ({
      ...prev,
      companyName
    }));
    setShowCompanyDropdown(false);
    setSearchQuery('');
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        return formData.fullName && formData.mobileNumber && formData.personalEmail && formData.residentialAddress;
      case 2:
        return formData.companyName && formData.workLocation && formData.designation;
      default:
        return true;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!token) {
      setError('Authentication token missing. Please log in again.');
      setIsSubmitting(false);
      router.push('/login');
      return;
    }

    try {
      const response = await fetch('/api/referrer/onboarding', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.token) {
          login(data.token, '/referrer/dashboard');
        } else {
          router.push('/referrer/dashboard');
        }
      } else {
        setError(data.error || 'Failed to complete onboarding. Please try again.');
      }
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || !user || user.onboardingStatus === 'completed') {
    return (
      <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 justify-center items-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center"
        >
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 180, 360],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="rounded-full p-8 bg-gradient-to-br from-[#165BF8] to-[#1C3991] shadow-2xl"
          >
            <FiLoader className="text-white h-16 w-16" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-2xl font-bold text-[#1C3991]"
          >
            Preparing Your Onboarding...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 font-inter">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-1/2 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#165BF8] to-[#1C3991] rounded-3xl shadow-2xl mb-6">
            <FiUser className="text-white h-10 w-10" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#165BF8] to-[#1C3991] bg-clip-text text-transparent mb-4">
            Welcome to Udyog Jagat
          </h1>
          <p className="text-xl text-blue-600 font-medium max-w-2xl mx-auto">
            Complete your referrer profile and start connecting talent with opportunities
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Progress Steps - Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3"
          >
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-blue-200/50">
              <h3 className="text-2xl font-black text-[#1C3991] mb-6">Onboarding Steps</h3>
              <div className="space-y-6">
                {steps.map((step, index) => (
                  <div key={step.number} className="flex items-start space-x-4">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                      currentStep >= step.number
                        ? 'bg-gradient-to-br from-[#165BF8] to-[#1C3991] text-white shadow-lg scale-110'
                        : 'bg-blue-100 text-blue-400 border-2 border-blue-200'
                    }`}>
                      {currentStep > step.number ? (
                        <FiCheckCircle className="h-6 w-6" />
                      ) : (
                        step.number
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-bold text-lg transition-all duration-300 ${
                        currentStep >= step.number ? 'text-[#1C3991]' : 'text-blue-300'
                      }`}>
                        {step.title}
                      </h4>
                      <p className={`text-sm transition-all duration-300 ${
                        currentStep >= step.number ? 'text-blue-600' : 'text-blue-300'
                      }`}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress Bar */}
              <div className="mt-8">
                <div className="flex justify-between text-sm text-blue-600 mb-2">
                  <span>Progress</span>
                  <span>{Math.round((currentStep / steps.length) * 100)}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentStep / steps.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                    className="bg-gradient-to-r from-[#165BF8] to-[#1C3991] h-3 rounded-full shadow-lg"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Main Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-9"
          >
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-blue-200/50 overflow-hidden">
              {/* Form Header */}
              <div className="bg-gradient-to-r from-[#165BF8] to-[#1C3991] p-8 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-black mb-2">
                      {steps[currentStep - 1].title}
                    </h2>
                    <p className="text-blue-100 text-lg">
                      {steps[currentStep - 1].description}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black">{currentStep}/{steps.length}</div>
                    <div className="text-blue-200 text-sm">Step</div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-8">
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl shadow-sm text-red-700 font-medium flex items-center space-x-3 mb-8"
                    >
                      <FiXCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                      <span className="text-sm">{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Step 1: Personal Information */}
                {currentStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="grid md:grid-cols-2 gap-8"
                  >
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-[#1C3991] mb-3 flex items-center space-x-2">
                          <FiUser className="h-5 w-5 text-[#165BF8]" />
                          <span>Full Name *</span>
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          className="w-full px-4 py-4 border-2 border-blue-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-[#165BF8] text-[#1C3991] transition-all duration-200 bg-white/80"
                          placeholder="Enter your full name"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-[#1C3991] mb-3 flex items-center space-x-2">
                          <FiPhone className="h-5 w-5 text-[#165BF8]" />
                          <span>Mobile Number *</span>
                        </label>
                        <input
                          type="tel"
                          name="mobileNumber"
                          value={formData.mobileNumber}
                          onChange={handleInputChange}
                          className="w-full px-4 py-4 border-2 border-blue-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-[#165BF8] text-[#1C3991] transition-all duration-200 bg-white/80"
                          placeholder="10-digit mobile number"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-[#1C3991] mb-3 flex items-center space-x-2">
                          <FiMail className="h-5 w-5 text-[#165BF8]" />
                          <span>Personal Email *</span>
                        </label>
                        <input
                          type="email"
                          name="personalEmail"
                          value={formData.personalEmail}
                          onChange={handleInputChange}
                          className="w-full px-4 py-4 border-2 border-blue-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-[#165BF8] text-[#1C3991] transition-all duration-200 bg-white/80"
                          placeholder="Your personal email address"
                          required
                        />
                      </div>

                      <div className="relative">
                        <label className="block text-sm font-bold text-[#1C3991] mb-3 flex items-center space-x-2">
                          <FiHome className="h-5 w-5 text-[#165BF8]" />
                          <span>Residential Address *</span>
                        </label>
                        <div className="relative">
                          <textarea
                            ref={addressInputRef}
                            name="residentialAddress"
                            value={formData.residentialAddress}
                            onChange={handleInputChange}
                            onFocus={() => setShowAddressDropdown(true)}
                            rows={3}
                            className="w-full px-4 py-4 border-2 border-blue-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-[#165BF8] text-[#1C3991] transition-all duration-200 bg-white/80 resize-none pr-12"
                            placeholder="Start typing your address..."
                            required
                          />
                          {isSearchingAddress && (
                            <div className="absolute right-4 top-4">
                              <FiLoader className="h-5 w-5 text-blue-500 animate-spin" />
                            </div>
                          )}
                        </div>
                        
                        {showAddressDropdown && addressSuggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-2 bg-white border border-blue-200 rounded-2xl shadow-2xl max-h-60 overflow-auto">
                            {addressSuggestions.map((address) => (
                              <button
                                key={address.place_id}
                                type="button"
                                onClick={() => handleAddressSelect(address)}
                                className="w-full px-4 py-4 text-left hover:bg-blue-50 transition-all duration-200 border-b border-blue-100 last:border-b-0 flex items-center space-x-3"
                              >
                                <FiMapPin className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                <div>
                                  <div className="font-medium text-[#1C3991] text-sm">
                                    {address.display_name.split(',').slice(0, 3).join(',')}
                                  </div>
                                  <div className="text-blue-500 text-xs mt-1">
                                    {address.display_name.split(',').slice(3).join(',')}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Work Information */}
                {currentStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="grid md:grid-cols-2 gap-8"
                  >
                    <div className="space-y-6">
                      <div className="relative">
                        <label className="block text-sm font-bold text-[#1C3991] mb-3 flex items-center space-x-2">
                          <FiBriefcase className="h-5 w-5 text-[#165BF8]" />
                          <span>Company Name *</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            name="companyName"
                            value={formData.companyName}
                            onChange={(e) => {
                              setFormData(prev => ({ ...prev, companyName: e.target.value }));
                              setSearchQuery(e.target.value);
                              setShowCompanyDropdown(true);
                            }}
                            onFocus={() => setShowCompanyDropdown(true)}
                            className="w-full px-4 py-4 border-2 border-blue-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-[#165BF8] text-[#1C3991] transition-all duration-200 bg-white/80 pr-12"
                            placeholder="Search for your company"
                            required
                          />
                          <FiSearch className="absolute right-4 top-4 h-5 w-5 text-blue-400" />
                        </div>
                        
                        {showCompanyDropdown && filteredCompanies.length > 0 && (
                          <div className="absolute z-10 w-full mt-2 bg-white border border-blue-200 rounded-2xl shadow-2xl max-h-60 overflow-auto">
                            {filteredCompanies.map((company, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => handleCompanySelect(company.name)}
                                className="w-full px-4 py-4 text-left hover:bg-blue-50 transition-all duration-200 border-b border-blue-100 last:border-b-0 flex items-center space-x-3"
                              >
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <FiBriefcase className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                  <div className="font-medium text-[#1C3991]">{company.name}</div>
                                  {company.domain && (
                                    <div className="text-blue-500 text-sm">{company.domain}</div>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-[#1C3991] mb-3 flex items-center space-x-2">
                          <FiNavigation className="h-5 w-5 text-[#165BF8]" />
                          <span>Work Location *</span>
                        </label>
                        <input
                          type="text"
                          name="workLocation"
                          value={formData.workLocation}
                          onChange={handleInputChange}
                          className="w-full px-4 py-4 border-2 border-blue-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-[#165BF8] text-[#1C3991] transition-all duration-200 bg-white/80"
                          placeholder="Your work location/city"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-[#1C3991] mb-3 flex items-center space-x-2">
                          <FiAward className="h-5 w-5 text-[#165BF8]" />
                          <span>Designation *</span>
                        </label>
                        <input
                          type="text"
                          name="designation"
                          value={formData.designation}
                          onChange={handleInputChange}
                          className="w-full px-4 py-4 border-2 border-blue-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-[#165BF8] text-[#1C3991] transition-all duration-200 bg-white/80"
                          placeholder="Your job title/designation"
                          required
                        />
                      </div>

                      <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                        <h4 className="font-bold text-blue-900 mb-2 flex items-center space-x-2">
                          <FiCheckCircle className="h-5 w-5 text-green-500" />
                          <span>Why we need this?</span>
                        </h4>
                        <p className="text-blue-700 text-sm">
                          Your professional details help us verify your credentials and match you with relevant referral opportunities.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Review */}
                {currentStep === 3 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 border border-blue-200">
                      <h3 className="text-2xl font-black text-[#1C3991] mb-6 text-center">Review Your Information</h3>
                      
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-200">
                          <h4 className="text-lg font-black text-blue-900 mb-4 flex items-center space-x-2">
                            <FiUser className="h-5 w-5 text-blue-600" />
                            <span>Personal Details</span>
                          </h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between py-2 border-b border-blue-100">
                              <span className="font-semibold text-blue-700">Full Name:</span>
                              <span className="text-blue-900">{formData.fullName}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-blue-100">
                              <span className="font-semibold text-blue-700">Mobile:</span>
                              <span className="text-blue-900">{formData.mobileNumber}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-blue-100">
                              <span className="font-semibold text-blue-700">Email:</span>
                              <span className="text-blue-900">{formData.personalEmail}</span>
                            </div>
                            <div className="py-2">
                              <span className="font-semibold text-blue-700 block mb-1">Address:</span>
                              <span className="text-blue-900 text-sm">{formData.residentialAddress}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-200">
                          <h4 className="text-lg font-black text-blue-900 mb-4 flex items-center space-x-2">
                            <FiBriefcase className="h-5 w-5 text-blue-600" />
                            <span>Work Details</span>
                          </h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between py-2 border-b border-blue-100">
                              <span className="font-semibold text-blue-700">Company:</span>
                              <span className="text-blue-900">{formData.companyName}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-blue-100">
                              <span className="font-semibold text-blue-700">Location:</span>
                              <span className="text-blue-900">{formData.workLocation}</span>
                            </div>
                            <div className="flex justify-between py-2">
                              <span className="font-semibold text-blue-700">Designation:</span>
                              <span className="text-blue-900">{formData.designation}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl p-6 border border-yellow-200">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-white font-bold text-sm">💡</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-yellow-800 mb-1">Ready to Start Referring?</h4>
                          <p className="text-yellow-700 text-sm">
                            Please review all information carefully. Once submitted, you'll gain access to your referrer dashboard where you can start referring candidates and tracking your referrals.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center pt-8 mt-8 border-t border-blue-200">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className={`flex items-center px-8 py-4 rounded-2xl font-bold transition-all duration-200 ${
                      currentStep === 1
                        ? 'opacity-50 cursor-not-allowed text-gray-400'
                        : 'text-[#165BF8] hover:bg-blue-50 hover:shadow-lg hover:scale-105 border-2 border-blue-200'
                    }`}
                  >
                    <FiArrowLeft className="mr-3 h-5 w-5" />
                    Previous
                  </button>

                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      disabled={!validateStep(currentStep)}
                      className={`flex items-center px-8 py-4 rounded-2xl font-bold text-white transition-all duration-200 ${
                        !validateStep(currentStep)
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-[#165BF8] to-[#1C3991] hover:from-blue-600 hover:to-indigo-800 hover:shadow-2xl hover:scale-105 shadow-lg'
                      }`}
                    >
                      Next Step
                      <FiArrowRight className="ml-3 h-5 w-5" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`flex items-center px-12 py-4 rounded-2xl font-bold text-white transition-all duration-200 ${
                        isSubmitting
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 hover:shadow-2xl hover:scale-105 shadow-lg'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <FiLoader className="animate-spin mr-3 h-5 w-5" />
                          Completing Onboarding...
                        </>
                      ) : (
                        <>
                          Complete Onboarding
                          <FiCheckCircle className="ml-3 h-5 w-5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}