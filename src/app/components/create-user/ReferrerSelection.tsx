// src/app/components/create-user/ReferrerSelection.tsx
'use client';

import { motion } from 'framer-motion';
import { FiUser, FiMail, FiPhone, FiMapPin, FiBriefcase, FiLoader, FiUsers, FiHome, FiAward, FiChevronDown, FiInfo } from 'react-icons/fi';
import { useState, useEffect } from 'react';

interface ReferrerFormData {
  fullName: string;
  email: string;
  mobileNumber: string;
  residentialAddress: string;
  companyName: string;
  workLocation: string;
  designation: string;
  milanShakaBhaga: string;
  valayaNagar: string;
  khandaBhaga: string;
  vibhaaga?: string;
  ghata?: string;
  milan?: string;
  valaya?: string;
  khanda?: string;
}

interface Organization {
  _id: string;
  name: string;
  khandas?: Khanda[];
}

interface Khanda {
  _id: string;
  name: string;
  code: string;
  valays?: Valaya[];
  valayas?: Valaya[];
}

interface Valaya {
  _id: string;
  name: string;
  milans?: Milan[];
}

interface Milan {
  _id: string;
  name: string;
  ghatas?: Ghata[];
}

interface Ghata {
  _id: string;
  name: string;
}

interface ReferrerSelectionProps {
  referrerData: ReferrerFormData;
  onReferrerDataChange: (data: ReferrerFormData) => void;
  isLoading: boolean;
}

export default function ReferrerSelection({
  referrerData,
  onReferrerDataChange,
  isLoading
}: ReferrerSelectionProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(true);
  const [organizationError, setOrganizationError] = useState<string | null>(null);
  const [selectedVibhaaga, setSelectedVibhaaga] = useState('');
  const [selectedKhanda, setSelectedKhanda] = useState('');
  const [selectedValaya, setSelectedValaya] = useState('');
  const [selectedMilan, setSelectedMilan] = useState('');
  const [selectedGhata, setSelectedGhata] = useState('');

  // Fetch organizations from API
  const fetchOrganizations = async () => {
    try {
      setLoadingOrganizations(true);
      setOrganizationError(null);
      
      const response = await fetch('/api/admin/organizations');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.organizations) {
        setOrganizations(data.organizations);
      } else {
        throw new Error(data.error || 'Invalid response format from organization API');
      }
    } catch (err: any) {
      console.error('Error fetching organizations:', err);
      setOrganizationError(err.message || 'Failed to load organization data');
    } finally {
      setLoadingOrganizations(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleInputChange = (field: keyof ReferrerFormData, value: string) => {
    onReferrerDataChange({
      ...referrerData,
      [field]: value
    });
  };

  // Get available vibhaagas (organizations)
  const getVibhaagas = () => {
    if (!organizations.length) return [];
    return organizations.map(org => ({
      _id: org._id,
      name: org.name,
      khandas: org.khandas || []
    }));
  };

  // Get khandas for selected vibhaaga
  const getKhandas = () => {
    if (!selectedVibhaaga) return [];
    const vibhaagaObj = getVibhaagas().find(v => v._id === selectedVibhaaga);
    return vibhaagaObj?.khandas || [];
  };

  // Get valayas for selected khanda
  const getValayas = () => {
    if (!selectedKhanda) return [];
    const khandaObj = getKhandas().find(k => k._id === selectedKhanda);
    return khandaObj?.valays || khandaObj?.valayas || [];
  };

  // Get milans for selected valaya
  const getMilans = () => {
    if (!selectedValaya) return [];
    const valayaObj = getValayas().find(v => v._id === selectedValaya);
    return valayaObj?.milans || [];
  };

  // Get ghatas for selected milan
  const getGhatas = () => {
    if (!selectedMilan) return [];
    const milanObj = getMilans().find(m => m._id === selectedMilan);
    return milanObj?.ghatas || [];
  };

  // Handle organization selection changes
  const handleVibhaagaChange = (vibhaagaId: string) => {
    setSelectedVibhaaga(vibhaagaId);
    setSelectedKhanda('');
    setSelectedValaya('');
    setSelectedMilan('');
    setSelectedGhata('');
    
    const vibhaaga = getVibhaagas().find(v => v._id === vibhaagaId);
    if (vibhaaga) {
      handleInputChange('vibhaaga', vibhaaga.name);
    }
  };

  const handleKhandaChange = (khandaId: string) => {
    setSelectedKhanda(khandaId);
    setSelectedValaya('');
    setSelectedMilan('');
    setSelectedGhata('');
    
    const khanda = getKhandas().find(k => k._id === khandaId);
    if (khanda) {
      handleInputChange('khanda', khanda.name);
      handleInputChange('khandaBhaga', khanda.name);
    }
  };

  const handleValayaChange = (valayaId: string) => {
    setSelectedValaya(valayaId);
    setSelectedMilan('');
    setSelectedGhata('');
    
    const valaya = getValayas().find(v => v._id === valayaId);
    if (valaya) {
      handleInputChange('valaya', valaya.name);
      handleInputChange('valayaNagar', valaya.name);
    }
  };

  const handleMilanChange = (milanId: string) => {
    setSelectedMilan(milanId);
    setSelectedGhata('');
    
    const milan = getMilans().find(m => m._id === milanId);
    if (milan) {
      handleInputChange('milan', milan.name);
      handleInputChange('milanShakaBhaga', milan.name);
    }
  };

  const handleGhataChange = (ghataId: string) => {
    setSelectedGhata(ghataId);
    
    const ghata = getGhatas().find(g => g._id === ghataId);
    if (ghata) {
      handleInputChange('ghata', ghata.name);
    }
  };

  const retryFetchOrganizations = () => {
    fetchOrganizations();
  };

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        visible: { 
          opacity: 1, 
          y: 0, 
          scale: 1, 
          transition: { 
            duration: 0.5, 
            ease: [0.16, 1, 0.3, 1] 
          } 
        },
      }}
      className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-2xl p-6 border border-purple-500/10"
    >
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-purple-500 rounded-xl">
          <FiUsers className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-purple-900">Referrer Details</h3>
          <p className="text-purple-700 text-sm">Enter referrer personal and work information</p>
        </div>
        {organizationError && (
          <motion.button
            onClick={retryFetchOrganizations}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="ml-auto flex items-center space-x-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors"
          >
            <FiLoader className="h-4 w-4" />
            <span>Retry</span>
          </motion.button>
        )}
      </div>

      {organizationError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm"
        >
          <div className="flex items-start space-x-2">
            <FiInfo className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Note: Organization data issue</p>
              <p className="text-xs mt-1">{organizationError}</p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="space-y-6">
        {/* Personal Information Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 border border-purple-200 shadow-sm"
        >
          <h4 className="text-lg font-semibold text-purple-800 mb-4 flex items-center">
            <FiUser className="mr-2 h-5 w-5" />
            Personal Information
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Full Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="h-5 w-5 text-purple-400" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-10 pr-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-gray-900 transition-all duration-200"
                  placeholder="Enter full name"
                  value={referrerData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="h-5 w-5 text-purple-400" />
                </div>
                <input
                  type="email"
                  required
                  className="block w-full pl-10 pr-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-gray-900 transition-all duration-200"
                  placeholder="Enter email address"
                  value={referrerData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Mobile Number *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiPhone className="h-5 w-5 text-purple-400" />
                </div>
                <input
                  type="tel"
                  required
                  className="block w-full pl-10 pr-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-gray-900 transition-all duration-200"
                  placeholder="Enter mobile number"
                  value={referrerData.mobileNumber}
                  onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Residential Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Residential Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 pt-3 flex items-start pointer-events-none">
                  <FiHome className="h-5 w-5 text-purple-400" />
                </div>
                <textarea
                  required
                  rows={3}
                  className="block w-full pl-10 pr-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-gray-900 transition-all duration-200 resize-none"
                  placeholder="Enter complete residential address"
                  value={referrerData.residentialAddress}
                  onChange={(e) => handleInputChange('residentialAddress', e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Work Information Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 border border-purple-200 shadow-sm"
        >
          <h4 className="text-lg font-semibold text-purple-800 mb-4 flex items-center">
            <FiBriefcase className="mr-2 h-5 w-5" />
            Work Information
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Company Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiBriefcase className="h-5 w-5 text-purple-400" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-10 pr-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-gray-900 transition-all duration-200"
                  placeholder="Enter company name"
                  value={referrerData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Work Location */}
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Work Location *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMapPin className="h-5 w-5 text-purple-400" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-10 pr-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-gray-900 transition-all duration-200"
                  placeholder="Enter work location"
                  value={referrerData.workLocation}
                  onChange={(e) => handleInputChange('workLocation', e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Designation */}
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Designation *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiAward className="h-5 w-5 text-purple-400" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-10 pr-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-gray-900 transition-all duration-200"
                  placeholder="Enter designation"
                  value={referrerData.designation}
                  onChange={(e) => handleInputChange('designation', e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Organization Hierarchy Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 border border-purple-200 shadow-sm"
        >
          <h4 className="text-lg font-semibold text-purple-800 mb-4 flex items-center">
            <FiUsers className="mr-2 h-5 w-5" />
            Organization Hierarchy *
          </h4>
          <p className="text-sm text-purple-600 mb-4">
            Khanda, Valaya, and Milan are required for Referrer roles
          </p>
          
          {loadingOrganizations ? (
            <div className="flex justify-center items-center py-8">
              <FiLoader className="animate-spin h-8 w-8 text-purple-500 mr-3" />
              <span className="text-purple-900 font-medium">Loading organization data...</span>
            </div>
          ) : organizations.length === 0 ? (
            <div className="text-center py-8 text-purple-700">
              <FiUsers className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No organization data available.</p>
              <p className="text-sm mt-1">Please check if organization data is properly configured.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {/* Vibhaaga Dropdown */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { 
                    opacity: 1, 
                    y: 0, 
                    transition: { 
                      duration: 0.5, 
                      ease: [0.16, 1, 0.3, 1] 
                    } 
                  },
                }}
                className="md:col-span-2 lg:col-span-3 xl:col-span-1"
              >
                <label className="block text-sm font-semibold text-purple-900 mb-2 flex items-center space-x-2">
                  <FiUsers className="h-4 w-4 text-purple-600" />
                  <span>Vibhaaga</span>
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    className="block w-full px-4 py-3 border-2 border-purple-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-gray-900 transition-all duration-200 hover:border-purple-300 appearance-none bg-white cursor-pointer"
                    value={selectedVibhaaga}
                    onChange={(e) => handleVibhaagaChange(e.target.value)}
                    disabled={isLoading}
                  >
                    <option value="">Select Vibhaaga</option>
                    {getVibhaagas().map((vibhaaga) => (
                      <option key={vibhaaga._id} value={vibhaaga._id}>
                        {vibhaaga.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <FiChevronDown className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </motion.div>

              {/* Khanda Dropdown */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { 
                    opacity: 1, 
                    y: 0, 
                    transition: { 
                      duration: 0.5, 
                      delay: 0.1,
                      ease: [0.16, 1, 0.3, 1] 
                    } 
                  },
                }}
                className="md:col-span-2 lg:col-span-3 xl:col-span-1"
              >
                <label className="block text-sm font-semibold text-purple-900 mb-2 flex items-center space-x-2">
                  <FiUsers className="h-4 w-4 text-purple-600" />
                  <span>Khanda</span>
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    className="block w-full px-4 py-3 border-2 border-purple-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-gray-900 transition-all duration-200 hover:border-purple-300 appearance-none bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    value={selectedKhanda}
                    onChange={(e) => handleKhandaChange(e.target.value)}
                    disabled={isLoading || !selectedVibhaaga || getKhandas().length === 0}
                  >
                    <option value="">Select Khanda</option>
                    {getKhandas().map((khanda) => (
                      <option key={khanda._id} value={khanda._id}>
                        {khanda.name} ({khanda.code})
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <FiChevronDown className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </motion.div>

              {/* Valaya Dropdown */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { 
                    opacity: 1, 
                    y: 0, 
                    transition: { 
                      duration: 0.5, 
                      delay: 0.2,
                      ease: [0.16, 1, 0.3, 1] 
                    } 
                  },
                }}
                className="md:col-span-2 lg:col-span-3 xl:col-span-1"
              >
                <label className="block text-sm font-semibold text-purple-900 mb-2 flex items-center space-x-2">
                  <FiMapPin className="h-4 w-4 text-purple-600" />
                  <span>Valaya</span>
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    className="block w-full px-4 py-3 border-2 border-purple-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-gray-900 transition-all duration-200 hover:border-purple-300 appearance-none bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    value={selectedValaya}
                    onChange={(e) => handleValayaChange(e.target.value)}
                    disabled={isLoading || !selectedKhanda || getValayas().length === 0}
                  >
                    <option value="">Select Valaya</option>
                    {getValayas().map((valaya) => (
                      <option key={valaya._id} value={valaya._id}>
                        {valaya.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <FiChevronDown className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </motion.div>

              {/* Milan Dropdown */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { 
                    opacity: 1, 
                    y: 0, 
                    transition: { 
                      duration: 0.5, 
                      delay: 0.3,
                      ease: [0.16, 1, 0.3, 1] 
                    } 
                  },
                }}
                className="md:col-span-2 lg:col-span-3 xl:col-span-1"
              >
                <label className="block text-sm font-semibold text-purple-900 mb-2 flex items-center space-x-2">
                  <FiUsers className="h-4 w-4 text-purple-600" />
                  <span>Milan</span>
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    className="block w-full px-4 py-3 border-2 border-purple-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-gray-900 transition-all duration-200 hover:border-purple-300 appearance-none bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    value={selectedMilan}
                    onChange={(e) => handleMilanChange(e.target.value)}
                    disabled={isLoading || !selectedValaya || getMilans().length === 0}
                  >
                    <option value="">Select Milan</option>
                    {getMilans().map((milan) => (
                      <option key={milan._id} value={milan._id}>
                        {milan.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <FiChevronDown className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </motion.div>

              {/* Ghata Dropdown */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { 
                    opacity: 1, 
                    y: 0, 
                    transition: { 
                      duration: 0.5, 
                      delay: 0.4,
                      ease: [0.16, 1, 0.3, 1] 
                    } 
                  },
                }}
                className="md:col-span-2 lg:col-span-3 xl:col-span-1"
              >
                <label className="block text-sm font-semibold text-purple-900 mb-2 flex items-center space-x-2">
                  <FiHome className="h-4 w-4 text-purple-600" />
                  <span>Ghata</span>
                </label>
                <div className="relative">
                  <select
                    className="block w-full px-4 py-3 border-2 border-purple-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-gray-900 transition-all duration-200 hover:border-purple-300 appearance-none bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    value={selectedGhata}
                    onChange={(e) => handleGhataChange(e.target.value)}
                    disabled={isLoading || !selectedMilan || getGhatas().length === 0}
                  >
                    <option value="">Select Ghata</option>
                    {getGhatas().map((ghata) => (
                      <option key={ghata._id} value={ghata._id}>
                        {ghata.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <FiChevronDown className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Current Selection Display */}
          {(selectedVibhaaga || selectedKhanda || selectedValaya || selectedMilan || selectedGhata) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-purple-50 rounded-xl border border-purple-200"
            >
              <h4 className="text-sm font-semibold text-purple-900 mb-2">Current Selection:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedVibhaaga && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Vibhaaga: {getVibhaagas().find(v => v._id === selectedVibhaaga)?.name}
                  </span>
                )}
                {selectedKhanda && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    Khanda: {getKhandas().find(k => k._id === selectedKhanda)?.name}
                  </span>
                )}
                {selectedValaya && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                    Valaya: {getValayas().find(v => v._id === selectedValaya)?.name}
                  </span>
                )}
                {selectedMilan && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Milan: {getMilans().find(m => m._id === selectedMilan)?.name}
                  </span>
                )}
                {selectedGhata && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Ghata: {getGhatas().find(g => g._id === selectedGhata)?.name}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Information Note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-xl"
      >
        <div className="flex items-start space-x-3">
          <FiInfo className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-purple-800 font-medium">
              Referrer Account Creation
            </p>
            <p className="text-xs text-purple-600 mt-1">
              A referrer account will be created with these details. The referrer will receive a temporary password via email and can complete their profile during first login.
              Organization hierarchy will be automatically populated based on your selections.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}