// src/app/components/create-user/ReferrerSelection.tsx
'use client';

import { motion } from 'framer-motion';
import { FiUser, FiMail, FiPhone, FiMapPin, FiBriefcase, FiLoader, FiUsers, FiHome, FiAward, FiChevronDown, FiInfo } from 'react-icons/fi';

export interface ReferrerFormData {
  fullName: string;
  email: string;
  mobileNumber: string;
  residentialAddress: string;
  companyName: string;
  workLocation: string;
  designation: string;
  milan: string;
  valaya: string;
  khanda: string;
  vibhaaga?: string;
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
}

interface ReferrerSelectionProps {
  referrerData: ReferrerFormData;
  onReferrerDataChange: (data: ReferrerFormData) => void;
  isLoading: boolean;
  organizations: Organization[];
  loadingHierarchy: boolean;
  hierarchyError: string | null;
  onRetry: () => void;
}

export default function ReferrerSelection({
  referrerData,
  onReferrerDataChange,
  isLoading,
  organizations,
  loadingHierarchy,
  hierarchyError,
  onRetry
}: ReferrerSelectionProps) {

  const handleInputChange = (field: keyof ReferrerFormData, value: string) => {
    console.log(`🔄 Updating ${field}:`, value);
    onReferrerDataChange({
      ...referrerData,
      [field]: value
    });
  };

  // Get available vibhaagas (organizations)
  const getVibhaagas = () => {
    if (!organizations || !Array.isArray(organizations)) return [];
    return organizations.map(org => ({
      _id: org._id,
      name: org.name,
      khandas: org.khandas || []
    }));
  };

  // Get khandas for selected vibhaaga
  const getKhandas = () => {
    if (!referrerData.vibhaaga) return [];
    const vibhaagaObj = getVibhaagas().find(v => v._id === referrerData.vibhaaga);
    return vibhaagaObj?.khandas || [];
  };

  // Get valayas for selected khanda
  const getValayas = () => {
    if (!referrerData.khanda) return [];
    const khandaObj = getKhandas().find(k => k._id === referrerData.khanda);
    return khandaObj?.valays || khandaObj?.valayas || [];
  };

  // Get milans for selected valaya
  const getMilans = () => {
    if (!referrerData.valaya) return [];
    const valayaObj = getValayas().find(v => v._id === referrerData.valaya);
    return valayaObj?.milans || [];
  };

  // Handle organization selection changes
  const handleVibhaagaChange = (vibhaagaId: string) => {
    console.log('🏛️ Vibhaaga selected:', vibhaagaId);
    const vibhaaga = getVibhaagas().find(v => v._id === vibhaagaId);
    
    onReferrerDataChange({
      ...referrerData,
      vibhaaga: vibhaagaId,
      khanda: '',
      valaya: '',
      milan: ''
    });
  };

  const handleKhandaChange = (khandaId: string) => {
    console.log('🏛️ Khanda selected:', khandaId);
    const khanda = getKhandas().find(k => k._id === khandaId);
    
    onReferrerDataChange({
      ...referrerData,
      khanda: khandaId,
      valaya: '',
      milan: ''
    });
  };

  const handleValayaChange = (valayaId: string) => {
    console.log('🏛️ Valaya selected:', valayaId);
    const valaya = getValayas().find(v => v._id === valayaId);
    
    onReferrerDataChange({
      ...referrerData,
      valaya: valayaId,
      milan: ''
    });
  };

  const handleMilanChange = (milanId: string) => {
    console.log('🏛️ Milan selected:', milanId);
    const milan = getMilans().find(m => m._id === milanId);
    
    onReferrerDataChange({
      ...referrerData,
      milan: milanId
    });
  };

  // Debug: Log current referrerData state
  console.log('📊 Current Referrer Data:', referrerData);

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
        {hierarchyError && (
          <motion.button
            onClick={onRetry}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="ml-auto flex items-center space-x-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors"
          >
            <FiLoader className="h-4 w-4" />
            <span>Retry</span>
          </motion.button>
        )}
      </div>

      {hierarchyError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm"
        >
          <div className="flex items-start space-x-2">
            <FiInfo className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Note: Organization data issue</p>
              <p className="text-xs mt-1">{hierarchyError}</p>
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
          
          {loadingHierarchy ? (
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Vibhaaga Dropdown */}
              <div>
                <label className="block text-sm font-semibold text-purple-900 mb-2 flex items-center space-x-2">
                  <FiUsers className="h-4 w-4 text-purple-600" />
                  <span>Vibhaaga</span>
                </label>
                <div className="relative">
                  <select
                    className="block w-full px-4 py-3 border-2 border-purple-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-gray-900 transition-all duration-200 hover:border-purple-300 appearance-none bg-white cursor-pointer"
                    value={referrerData.vibhaaga || ''}
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
              </div>

              {/* Khanda Dropdown */}
              <div>
                <label className="block text-sm font-semibold text-purple-900 mb-2 flex items-center space-x-2">
                  <FiUsers className="h-4 w-4 text-purple-600" />
                  <span>Khanda *</span>
                </label>
                <div className="relative">
                  <select
                    required
                    className="block w-full px-4 py-3 border-2 border-purple-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-gray-900 transition-all duration-200 hover:border-purple-300 appearance-none bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    value={referrerData.khanda || ''}
                    onChange={(e) => handleKhandaChange(e.target.value)}
                    disabled={isLoading || !referrerData.vibhaaga || getKhandas().length === 0}
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
              </div>

              {/* Valaya Dropdown */}
              <div>
                <label className="block text-sm font-semibold text-purple-900 mb-2 flex items-center space-x-2">
                  <FiMapPin className="h-4 w-4 text-purple-600" />
                  <span>Valaya *</span>
                </label>
                <div className="relative">
                  <select
                    required
                    className="block w-full px-4 py-3 border-2 border-purple-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-gray-900 transition-all duration-200 hover:border-purple-300 appearance-none bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    value={referrerData.valaya || ''}
                    onChange={(e) => handleValayaChange(e.target.value)}
                    disabled={isLoading || !referrerData.khanda || getValayas().length === 0}
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
              </div>

              {/* Milan Dropdown */}
              <div>
                <label className="block text-sm font-semibold text-purple-900 mb-2 flex items-center space-x-2">
                  <FiUsers className="h-4 w-4 text-purple-600" />
                  <span>Milan *</span>
                </label>
                <div className="relative">
                  <select
                    required
                    className="block w-full px-4 py-3 border-2 border-purple-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-gray-900 transition-all duration-200 hover:border-purple-300 appearance-none bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    value={referrerData.milan || ''}
                    onChange={(e) => handleMilanChange(e.target.value)}
                    disabled={isLoading || !referrerData.valaya || getMilans().length === 0}
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
              </div>
            </div>
          )}

          {/* Current Selection Display */}
          {(referrerData.vibhaaga || referrerData.khanda || referrerData.valaya || referrerData.milan) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-purple-50 rounded-xl border border-purple-200"
            >
              <h4 className="text-sm font-semibold text-purple-900 mb-2">Current Selection:</h4>
              <div className="flex flex-wrap gap-2">
                {referrerData.vibhaaga && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Vibhaaga: {getVibhaagas().find(v => v._id === referrerData.vibhaaga)?.name}
                  </span>
                )}
                {referrerData.khanda && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    Khanda: {getKhandas().find(k => k._id === referrerData.khanda)?.name}
                  </span>
                )}
                {referrerData.valaya && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                    Valaya: {getValayas().find(v => v._id === referrerData.valaya)?.name}
                  </span>
                )}
                {referrerData.milan && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Milan: {getMilans().find(m => m._id === referrerData.milan)?.name}
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