'use client';

import { motion } from 'framer-motion';
import { FiBookOpen, FiMapPin, FiGlobe, FiLoader, FiRefreshCw, FiXCircle, FiChevronDown, FiUsers, FiHome } from 'react-icons/fi';
import { Organization } from '@/types/organization';

interface OrganizationHierarchyProps {
  organizations: Organization[];
  loadingHierarchy: boolean;
  hierarchyError: string | null;
  vibhaaga: string;
  khanda: string;
  valaya: string;
  milan: string;
  ghata: string;
  onVibhaagaChange: (vibhaagaId: string) => void;
  onKhandaChange: (khandaId: string) => void;
  onValayaChange: (valayaId: string) => void;
  onMilanChange: (milanId: string) => void;
  onGhataChange: (ghataId: string) => void;
  onRetry: () => void;
  isLoading: boolean;
  isRequired: boolean;
}

export default function OrganizationHierarchy({
  organizations,
  loadingHierarchy,
  hierarchyError,
  vibhaaga,
  khanda,
  valaya,
  milan,
  ghata,
  onVibhaagaChange,
  onKhandaChange,
  onValayaChange,
  onMilanChange,
  onGhataChange,
  onRetry,
  isLoading,
  isRequired
}: OrganizationHierarchyProps) {
  
  // Get available vibhaagas - since we have only one organization, treat it as vibhaaga
  const getVibhaagas = () => {
    if (!organizations.length) return [];
    // Treat each organization as a vibhaaga
    return organizations.map(org => ({
      _id: org._id,
      name: org.name,
      khandas: org.khandas || []
    }));
  };

  // Get khandas for selected vibhaaga
  const getKhandas = () => {
    if (!vibhaaga) return [];
    const vibhaagaObj = getVibhaagas().find(v => v._id === vibhaaga);
    return vibhaagaObj?.khandas || [];
  };

  // Get valayas for selected khanda
  const getValayas = () => {
    if (!khanda) return [];
    const khandaObj = getKhandas().find(k => k._id === khanda);
    return khandaObj?.valays || khandaObj?.valayas || [];
  };

  // Get milans for selected valaya
  const getMilans = () => {
    if (!valaya) return [];
    const valayaObj = getValayas().find(v => v._id === valaya);
    return valayaObj?.milans || [];
  };

  // Get ghatas for selected milan
  const getGhatas = () => {
    if (!milan) return [];
    const milanObj = getMilans().find(m => m._id === milan);
    return milanObj?.ghatas || [];
  };

  if (!isRequired) return null;

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
      className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 shadow-lg"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-600 rounded-xl">
            <FiBookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Organization Hierarchy</h3>
            <p className="text-blue-600 text-sm">
              Mandatory information for this role
            </p>
          </div>
        </div>

        {hierarchyError && (
          <motion.button
            onClick={onRetry}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors"
          >
            <FiRefreshCw className="h-4 w-4" />
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
            <FiXCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Note: Organization data issue</p>
              <p className="text-xs mt-1">{hierarchyError}</p>
            </div>
          </div>
        </motion.div>
      )}

      {loadingHierarchy ? (
        <div className="flex justify-center items-center py-8">
          <FiLoader className="animate-spin h-8 w-8 text-blue-600 mr-3" />
          <span className="text-gray-700 font-medium">Loading organization hierarchy...</span>
        </div>
      ) : organizations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FiBookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
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
            <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center space-x-2">
              <FiGlobe className="h-4 w-4 text-blue-600" />
              <span>Vibhaaga</span>
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <select
                required
                className="block w-full px-4 py-3 border-2 border-blue-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-gray-900 transition-all duration-200 hover:border-blue-300 appearance-none bg-white cursor-pointer"
                value={vibhaaga}
                onChange={(e) => onVibhaagaChange(e.target.value)}
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
                <FiChevronDown className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {getVibhaagas().length} vibhaagas available
            </p>
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
            <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center space-x-2">
              <FiUsers className="h-4 w-4 text-blue-600" />
              <span>Khanda</span>
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <select
                required
                className="block w-full px-4 py-3 border-2 border-blue-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-gray-900 transition-all duration-200 hover:border-blue-300 appearance-none bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                value={khanda}
                onChange={(e) => onKhandaChange(e.target.value)}
                disabled={isLoading || !vibhaaga || getKhandas().length === 0}
              >
                <option value="">Select Khanda</option>
                {getKhandas().map((khanda) => (
                  <option key={khanda._id} value={khanda._id}>
                    {khanda.name} ({khanda.code})
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <FiChevronDown className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {vibhaaga ? `${getKhandas().length} khandas available` : 'Select vibhaaga first'}
            </p>
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
            <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center space-x-2">
              <FiMapPin className="h-4 w-4 text-blue-600" />
              <span>Valaya</span>
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <select
                required
                className="block w-full px-4 py-3 border-2 border-blue-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-gray-900 transition-all duration-200 hover:border-blue-300 appearance-none bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                value={valaya}
                onChange={(e) => onValayaChange(e.target.value)}
                disabled={isLoading || !khanda || getValayas().length === 0}
              >
                <option value="">Select Valaya</option>
                {getValayas().map((valaya) => (
                  <option key={valaya._id} value={valaya._id}>
                    {valaya.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <FiChevronDown className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {khanda ? `${getValayas().length} valayas available` : 'Select khanda first'}
            </p>
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
            <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center space-x-2">
              <FiBookOpen className="h-4 w-4 text-blue-600" />
              <span>Milan</span>
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <select
                required
                className="block w-full px-4 py-3 border-2 border-blue-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-gray-900 transition-all duration-200 hover:border-blue-300 appearance-none bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                value={milan}
                onChange={(e) => onMilanChange(e.target.value)}
                disabled={isLoading || !valaya || getMilans().length === 0}
              >
                <option value="">Select Milan</option>
                {getMilans().map((milan) => (
                  <option key={milan._id} value={milan._id}>
                    {milan.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <FiChevronDown className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {valaya ? `${getMilans().length} milans available` : 'Select valaya first'}
            </p>
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
            <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center space-x-2">
              <FiHome className="h-4 w-4 text-blue-600" />
              <span>Ghata</span>
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <select
                required
                className="block w-full px-4 py-3 border-2 border-blue-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-gray-900 transition-all duration-200 hover:border-blue-300 appearance-none bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                value={ghata}
                onChange={(e) => onGhataChange(e.target.value)}
                disabled={isLoading || !milan || getGhatas().length === 0}
              >
                <option value="">Select Ghata</option>
                {getGhatas().map((ghata) => (
                  <option key={ghata._id} value={ghata._id}>
                    {ghata.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <FiChevronDown className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {milan ? `${getGhatas().length} ghatas available` : 'Select milan first'}
            </p>
          </motion.div>
        </div>
      )}

      {/* Current Selection Display */}
      {(vibhaaga || khanda || valaya || milan || ghata) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-white rounded-xl border border-blue-200"
        >
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Current Selection:</h4>
          <div className="flex flex-wrap gap-2">
            {vibhaaga && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                Vibhaaga: {getVibhaagas().find(v => v._id === vibhaaga)?.name}
              </span>
            )}
            {khanda && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Khanda: {getKhandas().find(k => k._id === khanda)?.name}
              </span>
            )}
            {valaya && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Valaya: {getValayas().find(v => v._id === valaya)?.name}
              </span>
            )}
            {milan && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Milan: {getMilans().find(m => m._id === milan)?.name}
              </span>
            )}
            {ghata && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                Ghata: {getGhatas().find(g => g._id === ghata)?.name}
              </span>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}