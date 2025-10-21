'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiXCircle, FiCheckCircle, FiLoader, FiChevronLeft, FiMenu, 
  FiPlus, FiUser, FiBriefcase, FiLink, FiShield, FiZap,
  FiAward, FiStar, FiSettings
} from 'react-icons/fi';
import BasicInfoSection from '@/app/components/create-user/BasicInfoSection';
import OrganizationHierarchy from '@/app/components/create-user/OrganizationHierarchy';
import ReferrerSelection, { ReferrerResponse } from '@/app/components/create-user/ReferrerSelection';
import { Organization, OrganizationResponse } from '@/types/organization';

export default function CreateUserPage() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'job_poster' | 'job_seeker' | 'job_referrer' | 'admin' | 'super_admin'>('job_seeker');
  const [ghata, setGhata] = useState('');
  const [milan, setMilan] = useState('');
  const [valaya, setValaya] = useState('');
  const [khanda, setKhanda] = useState('');
  const [vibhaaga, setVibhaaga] = useState('');
  const [selectedReferrer, setSelectedReferrer] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState(true);
  const [hierarchyError, setHierarchyError] = useState<string | null>(null);
  const [referrerResponses, setReferrerResponses] = useState<ReferrerResponse[]>([]);
  const [loadingReferrers, setLoadingReferrers] = useState(false);
  const [referrerError, setReferrerError] = useState<string | null>(null);

  const { user: currentUser, loading: authLoading, isAuthenticated, token, logout } = useAuth();
  const router = useRouter();

  // Fetch organization hierarchy from our API
  const fetchOrganizations = async () => {
    try {
      setLoadingHierarchy(true);
      setHierarchyError(null);
      
      console.log('Fetching organization hierarchy from internal API...');
      
      const response = await fetch('/api/admin/organizations');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: OrganizationResponse = await response.json();
      
      if (data.success && data.organizations) {
        setOrganizations(data.organizations);
        console.log('Organization hierarchy loaded successfully');
      } else {
        throw new Error(data.error || 'Invalid response format from organization API');
      }
    } catch (err: any) {
      console.error('Error fetching organizations:', err);
      
      let errorMessage = 'Failed to load organization hierarchy. ';
      errorMessage += err.message || 'Unknown error occurred. ';
      errorMessage += 'Please try again or contact support.';
      
      setHierarchyError(errorMessage);
      setOrganizations([]);
    } finally {
      setLoadingHierarchy(false);
    }
  };

  // Fetch referrer responses from form submissions
  const fetchReferrerResponses = async () => {
    try {
      setLoadingReferrers(true);
      setReferrerError(null);
      
      if (!token) {
        throw new Error('Authentication token missing');
      }

      console.log('Fetching referrer responses...');
      
      const response = await fetch('/api/admin/referrer-responses', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.responses) {
        setReferrerResponses(data.responses);
        console.log('Referrer responses loaded successfully:', data.responses.length);
      } else {
        throw new Error(data.error || 'Invalid response format from referrer API');
      }
    } catch (err: any) {
      console.error('Error fetching referrer responses:', err);
      
      let errorMessage = 'Failed to load referrer data. ';
      errorMessage += err.message || 'Unknown error occurred. ';
      errorMessage += 'Please try again or contact support.';
      
      setReferrerError(errorMessage);
      setReferrerResponses([]);
    } finally {
      setLoadingReferrers(false);
    }
  };

  // Retry functions
  const retryFetchHierarchy = () => {
    fetchOrganizations();
  };

  const retryFetchReferrers = () => {
    fetchReferrerResponses();
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  // Fetch referrer responses when role is set to referrer
  useEffect(() => {
    if (role === 'job_referrer' && token) {
      fetchReferrerResponses();
    } else {
      setReferrerResponses([]);
      setSelectedReferrer('');
    }
  }, [role, token]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !currentUser) {
      router.push('/login');
      return;
    }

    if (currentUser.firstLogin) {
      router.push('/change-password');
      return;
    }

    if (currentUser.role !== 'admin') {
      if (currentUser.role === 'job_poster') router.push('/poster/dashboard');
      else if (currentUser.role === 'job_seeker') router.push('/seeker/dashboard');
      else router.push('/');
      return;
    }
  }, [authLoading, isAuthenticated, currentUser, router]);

  // Define role options based on current user's privileges
  const getRoleOptions = () => {
    const baseOptions = [
      { 
        value: 'job_seeker', 
        label: 'Job Seeker', 
        icon: <FiUser className="h-6 w-6" />,
        description: 'Browse and apply for jobs',
        gradient: 'from-blue-500 to-cyan-500',
        color: '#3B82F6',
        badge: 'Applicant'
      },
      { 
        value: 'job_poster', 
        label: 'Job Poster', 
        icon: <FiBriefcase className="h-6 w-6" />,
        description: 'Post and manage job listings',
        gradient: 'from-green-500 to-emerald-500',
        color: '#10B981',
        badge: 'Recruiter'
      },
      { 
        value: 'job_referrer', 
        label: 'Referrer', 
        icon: <FiAward className="h-6 w-6" />,
        description: 'Refer candidates to jobs',
        gradient: 'from-purple-500 to-violet-500',
        color: '#8B5CF6',
        badge: 'Connector'
      },
    ];

    // Only show admin option for super admins
    if (currentUser?.isSuperAdmin) {
      baseOptions.push(
        { 
          value: 'admin', 
          label: 'Admin', 
          icon: <FiShield className="h-6 w-6" />,
          description: 'Full system access',
          gradient: 'from-red-500 to-rose-500',
          color: '#EF4444',
          badge: 'Manager'
        },
        { 
          value: 'super_admin', 
          label: 'Super Admin', 
          icon: <FiStar className="h-6 w-6" />,
          description: 'Complete system control',
          gradient: 'from-amber-500 to-orange-500',
          color: '#F59E0B',
          badge: 'Owner'
        }
      );
    }

    return baseOptions;
  };

  // Helper function to get field values from form responses
  const getFieldValue = (responses: any[], fieldLabel: string) => {
    const field = responses.find((r: any) => r.fieldLabel === fieldLabel);
    return field?.value || '';
  };

  // Get available vibhaagas from the organization data
  const getVibhaagas = () => {
    if (!organizations.length) return [];
    return organizations[0].vibhaagas || [];
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
    return khandaObj?.valayas || [];
  };

  // Get milans for selected valay
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

  // Reset dependent fields when parent field changes
  const handleVibhaagaChange = (vibhaagaId: string) => {
    setVibhaaga(vibhaagaId);
    setKhanda('');
    setValaya('');
    setMilan('');
    setGhata('');
  };

  const handleKhandaChange = (khandaId: string) => {
    setKhanda(khandaId);
    setValaya('');
    setMilan('');
    setGhata('');
  };

  const handleValayaChange = (valayaId: string) => {
    setValaya(valayaId);
    setMilan('');
    setGhata('');
  };

  const handleMilanChange = (milanId: string) => {
    setMilan(milanId);
    setGhata('');
  };

  const handleReferrerChange = (referrerId: string) => {
    setSelectedReferrer(referrerId);
    // Auto-fill email from selected referrer
    const selectedResponse = referrerResponses.find(r => r._id === referrerId);
    if (selectedResponse) {
      const referrerEmail = getFieldValue(selectedResponse.responses, 'Email');
      if (referrerEmail) {
        setEmail(referrerEmail);
      }
    }
  };

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  setError(null);
  setMessage(null);
  setIsLoading(true);

  if (!token) {
    setError('Authentication token missing. Please log in again.');
    setIsLoading(false);
    return;
  }

  if (!email || !role) {
    setError('Please provide an email and select a role.');
    setIsLoading(false);
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setError('Invalid email format.');
    setIsLoading(false);
    return;
  }

  // For referrers, validate that a referrer is selected
  if (role === 'job_referrer') {
    if (!selectedReferrer) {
      setError('Please select a referrer from the available options.');
      setIsLoading(false);
      return;
    }
  }

  // Validate organization hierarchy for non-poster roles ONLY
  // Referrers get their hierarchy from the form response, so don't validate here
  // GHATA IS NOT MANDATORY - REMOVE GHATA VALIDATION
  if (role !== 'job_poster' && role !== 'job_referrer') {
    if (!milan.trim()) {
      setError('Please select a Milan.');
      setIsLoading(false);
      return;
    }
    if (!valaya.trim()) {
      setError('Please select a Valaya.');
      setIsLoading(false);
      return;
    }
    if (!khanda.trim()) {
      setError('Please select a Khanda.');
      setIsLoading(false);
      return;
    }
    if (!vibhaaga.trim()) {
      setError('Please select a Vibhaaga.');
      setIsLoading(false);
      return;
    }
    // GHATA IS OPTIONAL - NO VALIDATION FOR GHATA
  }

  try {
    const payload: any = {
      email,
      role: role === 'super_admin' ? 'admin' : role,
    };

    // Set super admin flag for super_admin role
    if (role === 'super_admin') {
      payload.isSuperAdmin = true;
    }

    // For referrers, include the selected referrer data WITH hierarchy from form response
    if (role === 'job_referrer') {
      const selectedResponse = referrerResponses.find(r => r._id === selectedReferrer);
      if (selectedResponse) {
        // Extract hierarchy data from the form responses
        const getHierarchyValue = (fieldLabel: string) => {
          const field = selectedResponse.responses.find(r => 
            r.fieldLabel && r.fieldLabel.includes(fieldLabel)
          );
          return field?.value || '';
        };

        // Get the actual names for the hierarchy from the organization data
        const selectedKhandaId = getHierarchyValue('khanda');
        const selectedValayaId = getHierarchyValue('valaya'); 
        const selectedMilanId = getHierarchyValue('milan');
        const selectedGhataId = getHierarchyValue('ghata');

        // Find the actual names from organization data
        const allKhandas = organizations[0]?.khandas || [];
        const selectedKhanda = allKhandas.find(k => k._id === selectedKhandaId);
        const selectedValaya = selectedKhanda?.valays?.find(v => v._id === selectedValayaId) || 
                              selectedKhanda?.valayas?.find(v => v._id === selectedValayaId);
        const selectedMilan = selectedValaya?.milans?.find(m => m._id === selectedMilanId);
        const selectedGhata = selectedMilan?.ghatas?.find(g => g._id === selectedGhataId);

        payload.referrerData = {
          formResponseId: selectedResponse._id,
          name: getFieldValue(selectedResponse.responses, 'Name'),
          phone: getFieldValue(selectedResponse.responses, 'Contact Number'),
          address: `${getFieldValue(selectedResponse.responses, 'Residential Address Line 1')} ${getFieldValue(selectedResponse.responses, 'Residential Address Line 2')}`.trim(),
          education: `${getFieldValue(selectedResponse.responses, 'Degree')} in ${getFieldValue(selectedResponse.responses, 'Course')}`,
          college: getFieldValue(selectedResponse.responses, 'College'),
          currentStatus: getFieldValue(selectedResponse.responses, 'Current Status'),
          gender: getFieldValue(selectedResponse.responses, 'Gender'),
          birthYear: getFieldValue(selectedResponse.responses, 'Birth Year'),
          submittedAt: selectedResponse.submittedAt,
          // Include hierarchy data - GHATA IS OPTIONAL
          khanda: selectedKhanda?.name || '',
          valaya: selectedValaya?.name || '',
          milan: selectedMilan?.name || '',
          ghata: selectedGhata?.name || '', // This can be empty
          vibhaaga: organizations[0]?.name || 'Bengaluru Dakshina Vibhaaga'
        };
      }
    } else if (role !== 'job_poster') {
      // For other non-poster roles, use the manually selected hierarchy
      const selectedVibhaaga = getVibhaagas().find(v => v._id === vibhaaga);
      const selectedKhanda = getKhandas().find(k => k._id === khanda);
      const selectedValaya = getValayas().find(v => v._id === valaya);
      const selectedMilan = getMilans().find(m => m._id === milan);
      const selectedGhata = getGhatas().find(g => g._id === ghata);

      // GHATA IS OPTIONAL - only include if selected
      if (selectedGhata) payload.ghata = selectedGhata.name;
      if (selectedMilan) payload.milan = selectedMilan.name;
      if (selectedValaya) payload.valaya = selectedValaya.name;
      if (selectedKhanda) payload.khanda = selectedKhanda.name;
      if (selectedVibhaaga) payload.vibhaaga = selectedVibhaaga.name;
    }

    const response = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create user');
    }

    setMessage(data.message || 'User created successfully! A temporary password has been sent to their email.');
    
    // Reset form
    setEmail('');
    setRole('job_seeker');
    setGhata('');
    setMilan('');
    setValaya('');
    setKhanda('');
    setVibhaaga('');
    setSelectedReferrer('');

  } catch (err: any) {
    console.error('Create user error:', err);
    setError(err.message || 'An unexpected error occurred.');
  } finally {
    setIsLoading(false);
  }
};
  // Enhanced Animation Variants
  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.6, 
        ease: [0.16, 1, 0.3, 1],
        staggerChildren: 0.1
      } 
    },
  };

  const itemVariants = {
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
  };

  const pulseEffect = {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
  };

  const isRequiredForNonPoster = role !== 'job_poster' && role !== 'job_referrer';
  const roleOptions = getRoleOptions();

  if (authLoading || !isAuthenticated || !currentUser || currentUser.firstLogin || currentUser.role !== 'admin') {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 justify-center items-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center"
        >
          <motion.div
            animate={pulseEffect}
            className="rounded-full p-6 bg-gradient-to-br from-blue-600 to-purple-700 shadow-2xl"
          >
            <FiLoader className="text-white h-12 w-12 animate-spin" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-xl font-semibold text-gray-800"
          >
            Loading Admin Panel...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden font-inter">
      <Sidebar 
        userRole={currentUser.role} 
        onLogout={logout} 
        isOpen={mobileSidebarOpen} 
        setIsOpen={setMobileSidebarOpen} 
        userEmail={currentUser?.email} 
      />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Enhanced Mobile Header */}
        <div className="lg:hidden bg-white/95 backdrop-blur-md shadow-2xl p-4 flex items-center justify-between z-10 sticky top-0 border-b border-blue-200">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setMobileSidebarOpen(true)}
            className="p-3 rounded-xl bg-blue-100 text-blue-600 hover:bg-blue-200 transition-all duration-200"
          >
            <FiMenu className="h-6 w-6" />
          </motion.button>
          
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-black bg-gradient-to-r from-blue-600 to-purple-700 bg-clip-text text-transparent"
          >
            Create User
          </motion.h1>
          
          <div className="w-12"></div>
        </div>


        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="max-w-7xl mx-auto" // Increased max-width
          >
            {/* Welcome Card */}
            <motion.div
              variants={itemVariants}
              className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-3xl shadow-2xl p-8 mb-8 text-white"
            >
              <div className="flex flex-col lg:flex-row items-center justify-between">
                <div className="text-center lg:text-left mb-6 lg:mb-0">
                  <h1 className="text-4xl lg:text-5xl font-black mb-4">
                    Create New User
                  </h1>
                  <p className="text-blue-100 text-lg lg:text-xl max-w-2xl">
                    {currentUser.isSuperAdmin 
                      ? "Create user accounts with appropriate roles and permissions across the platform"
                      : "Create Job Seekers, Job Posters, and Referrers to expand your talent network"
                    }
                  </p>
                </div>
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="flex items-center justify-center w-20 h-20 lg:w-24 lg:h-24 bg-white/20 rounded-2xl backdrop-blur-sm"
                >
                  <FiPlus className="h-10 w-10 lg:h-12 lg:w-12 text-white" />
                </motion.div>
              </div>
            </motion.div>

            {/* Form Container */}
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-3xl shadow-2xl border border-blue-100 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">User Information</h2>
                    <p className="text-gray-600 mt-2">Fill in the details to create a new user account</p>
                  </div>
                  <div className="hidden lg:flex items-center space-x-4">
                    <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-xl">
                      <FiSettings className="h-5 w-5 text-blue-600" />
                      <span className="text-blue-700 font-medium">Admin Panel</span>
                    </div>
                  </div>
                </div>

                <form className="space-y-8" onSubmit={handleSubmit}>
                  {/* Basic Information Section */}
                  <BasicInfoSection
                    email={email}
                    role={role}
                    onEmailChange={setEmail}
                    onRoleChange={setRole}
                    isLoading={isLoading}
                    roleOptions={roleOptions}
                  />

                  {/* Referrer Selection Section (only for referrer role) */}
                  {role === 'job_referrer' && (
                    <ReferrerSelection
                      referrerResponses={referrerResponses}
                      loadingReferrers={loadingReferrers}
                      selectedReferrer={selectedReferrer}
                      onReferrerChange={handleReferrerChange}
                      isLoading={isLoading}
                      referrerError={referrerError}
                      onRetryReferrers={retryFetchReferrers}
                    />
                  )}

                  {/* Organization Details Section (for non-poster and non-referrer roles) */}
                  {(role !== 'job_poster' && role !== 'job_referrer') && (
                    <OrganizationHierarchy
                      organizations={organizations}
                      loadingHierarchy={loadingHierarchy}
                      hierarchyError={hierarchyError}
                      vibhaaga={vibhaaga}
                      khanda={khanda}
                      valaya={valaya}
                      milan={milan}
                      ghata={ghata}
                      onVibhaagaChange={handleVibhaagaChange}
                      onKhandaChange={handleKhandaChange}
                      onValayaChange={handleValayaChange}
                      onMilanChange={handleMilanChange}
                      onGhataChange={setGhata}
                      onRetry={retryFetchHierarchy}
                      isLoading={isLoading}
                      isRequired={isRequiredForNonPoster}
                    />
                  )}

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
                        <span>{error}</span>
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
                        <span>{message}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit Button */}
                  <motion.div variants={itemVariants} className="pt-6">
                    <motion.button
                      type="submit"
                      disabled={isLoading || 
                        (role === 'job_referrer' && (!referrerResponses.length || referrerError)) ||
                        (isRequiredForNonPoster && (!organizations.length || hierarchyError))
                      }
                      whileHover={{ 
                        scale: isLoading ? 1 : 1.02, 
                        boxShadow: isLoading ? "none" : "0 20px 40px rgba(59, 130, 246, 0.4)" 
                      }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full flex justify-center items-center py-5 px-8 border border-transparent rounded-2xl shadow-2xl text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all duration-300 ${
                        isLoading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <FiLoader className="animate-spin mr-3 h-6 w-6" />
                          Creating User Account...
                        </>
                      ) : (
                        <>
                          <FiPlus className="mr-3 h-6 w-6" />
                          Create User Account
                        </>
                      )}
                    </motion.button>
                  </motion.div>

                  <motion.p 
                    variants={itemVariants} 
                    className="text-center text-sm text-gray-600 font-medium"
                  >
                    {role === 'job_referrer' 
                      ? "Selected referrer will be created with their form data and a temporary password will be sent to their email"
                      : "A secure temporary password will be generated and sent to the user's email address"
                    }
                  </motion.p>
                </form>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}