// src/app/admin/create-user/page.tsx
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiXCircle, FiCheckCircle, FiLoader, FiMenu, 
  FiPlus, FiUser, FiBriefcase, FiShield, FiZap,
  FiAward, FiStar, FiSettings, FiInfo
} from 'react-icons/fi';
import Sidebar from '@/app/components/Sidebar';
import BasicInfoSection from '@/app/components/create-user/BasicInfoSection';
import OrganizationHierarchy from '@/app/components/create-user/OrganizationHierarchy';
import ReferrerSelection, { ReferrerFormData } from '@/app/components/create-user/ReferrerSelection';
import { Organization, OrganizationResponse } from '@/types/organization';

// Initial referrer data
const initialReferrerData: ReferrerFormData = {
  fullName: '',
  email: '',
  mobileNumber: '',
  residentialAddress: '',
  companyName: '',
  workLocation: '',
  designation: '',
  milan: '',
  valaya: '',
  khanda: '',
  vibhaaga: '',
  ghata: ''
};

export default function CreateUserPage() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'job_poster' | 'job_seeker' | 'job_referrer' | 'admin' | 'super_admin'>('job_seeker');
  const [ghata, setGhata] = useState('');
  const [milan, setMilan] = useState('');
  const [valaya, setValaya] = useState('');
  const [khanda, setKhanda] = useState('');
  const [vibhaaga, setVibhaaga] = useState('');
  const [referrerData, setReferrerData] = useState<ReferrerFormData>(initialReferrerData);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState(true);
  const [hierarchyError, setHierarchyError] = useState<string | null>(null);

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

  // Retry function for hierarchy
  const retryFetchHierarchy = () => {
    fetchOrganizations();
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  // Reset referrer data when role changes away from referrer
  useEffect(() => {
    if (role !== 'job_referrer') {
      setReferrerData(initialReferrerData);
    }
  }, [role]);

  // Auto-fill email in referrer data when email changes
  useEffect(() => {
    if (role === 'job_referrer' && email) {
      setReferrerData(prev => ({
        ...prev,
        email: email
      }));
    }
  }, [email, role]);

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
        value: 'job_poster', 
        label: 'Job Poster', 
        icon: <FiBriefcase className="h-6 w-6" />,
        description: 'Post and manage job listings',
        gradient: 'from-green-500 to-emerald-500',
        color: '#10B981'
      },
      { 
        value: 'job_referrer', 
        label: 'Referrer', 
        icon: <FiAward className="h-6 w-6" />,
        description: 'Refer candidates to jobs',
        gradient: 'from-purple-500 to-violet-500',
        color: '#8B5CF6'
      },
    ];

    // Only show job seeker and admin options for super admins
    if (currentUser?.isSuperAdmin) {
      baseOptions.unshift(
        { 
          value: 'job_seeker', 
          label: 'Job Seeker', 
          icon: <FiUser className="h-6 w-6" />,
          description: 'Browse and apply for jobs',
          gradient: 'from-blue-500 to-cyan-500',
          color: '#3B82F6'
        }
      );
      
      baseOptions.push(
        { 
          value: 'admin', 
          label: 'Admin', 
          icon: <FiShield className="h-6 w-6" />,
          description: 'Full system access',
          gradient: 'from-red-500 to-rose-500',
          color: '#EF4444'
        },
        { 
          value: 'super_admin', 
          label: 'Super Admin', 
          icon: <FiStar className="h-6 w-6" />,
          description: 'Complete system control',
          gradient: 'from-amber-500 to-orange-500',
          color: '#F59E0B'
        }
      );
    }

    return baseOptions;
  };

  // Set default role based on user privileges
  useEffect(() => {
    if (currentUser) {
      const roleOptions = getRoleOptions();
      if (roleOptions.length > 0) {
        // Set default role to first available option
        setRole(roleOptions[0].value as any);
      }
    }
  }, [currentUser]);

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

  // Helper function to get organization name by ID
  const getOrgNameById = (id: string, organizations: Organization[]): string => {
    if (!id) return '';
    
    // Search through all levels of organization hierarchy
    for (const vibhaaga of organizations) {
      if (vibhaaga._id === id) return vibhaaga.name;
      
      for (const khanda of vibhaaga.khandas || []) {
        if (khanda._id === id) return khanda.name;
        
        for (const valaya of khanda.valayas || khanda.valays || []) {
          if (valaya._id === id) return valaya.name;
          
          for (const milan of valaya.milans || []) {
            if (milan._id === id) return milan.name;
            
            for (const ghata of milan.ghatas || []) {
              if (ghata._id === id) return ghata.name;
            }
          }
        }
      }
    }
    return '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log('🎯 SUBMIT BUTTON CLICKED - Starting form submission');
    console.log('🔍 Current state:', {
      email,
      role,
      referrerData,
      isLoading,
      hasToken: !!token
    });
    
    setError(null);
    setMessage(null);
    setIsLoading(true);

    if (!token) {
      console.error('❌ No token found');
      setError('Authentication token missing. Please log in again.');
      setIsLoading(false);
      return;
    }

    if (!email || !role) {
      console.error('❌ Missing email or role:', { email, role });
      setError('Please provide an email and select a role.');
      setIsLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error('❌ Invalid email format:', email);
      setError('Invalid email format.');
      setIsLoading(false);
      return;
    }

    // For referrers, validate all required fields
    if (role === 'job_referrer') {
      console.log('🔍 Validating referrer data:', referrerData);
      
      const requiredFields: (keyof ReferrerFormData)[] = [
        'fullName', 'mobileNumber', 'residentialAddress', 
        'companyName', 'workLocation', 'designation',
        'milan', 'valaya', 'khanda' // Added hierarchy fields
      ];

      const missingFields = requiredFields.filter(field => !referrerData[field]?.trim());
      
      if (missingFields.length > 0) {
        console.error('❌ Missing referrer fields:', missingFields);
        setError(`Please fill in all required referrer fields: ${missingFields.join(', ')}`);
        setIsLoading(false);
        return;
      }

      // Validate mobile number format
      const mobileRegex = /^[0-9]{10}$/;
      if (!mobileRegex.test(referrerData.mobileNumber.replace(/\D/g, ''))) {
        console.error('❌ Invalid mobile number:', referrerData.mobileNumber);
        setError('Please enter a valid 10-digit mobile number.');
        setIsLoading(false);
        return;
      }

      console.log('✅ All referrer validations passed');
    }

    try {
      let apiEndpoint = '/api/admin/create-user';
      let payload: any = {
        email,
        role: role === 'super_admin' ? 'admin' : role,
      };

      // Set super admin flag for super_admin role
      if (role === 'super_admin') {
        payload.isSuperAdmin = true;
      }

      console.log('🔍 === FRONTEND PAYLOAD CONSTRUCTION ===');
      console.log('📧 Email:', email);
      console.log('🎯 Role:', role);
      console.log('👑 isSuperAdmin:', role === 'super_admin');

      // For referrers, use the dedicated referrer endpoint
      if (role === 'job_referrer') {
        apiEndpoint = '/api/admin/create-referrer';
        
        console.log('🏛️ Referrer Hierarchy VALUES:', {
          milan: referrerData.milan,
          valaya: referrerData.valaya,
          khanda: referrerData.khanda,
          vibhaaga: referrerData.vibhaaga,
          ghata: referrerData.ghata
        });

        // Create payload for referrer creation - USE DIRECT VALUES
        payload = {
          email,
          // Main hierarchy fields (REQUIRED - use values directly from referrerData)
          milan: referrerData.milan,
          valaya: referrerData.valaya,
          khanda: referrerData.khanda,
          vibhaaga: referrerData.vibhaaga || '',
          ghata: referrerData.ghata || '',
          // Referrer data (personal and work details)
          referrerData: {
            name: referrerData.fullName,
            phone: referrerData.mobileNumber,
            email: referrerData.email,
            address: referrerData.residentialAddress,
            companyName: referrerData.companyName,
            workLocation: referrerData.workLocation,
            designation: referrerData.designation,
          }
        };

        console.log('🚀 REFERRER PAYLOAD READY');
      } 
      // For admin and super_admin roles, include hierarchy data
      else if (role === 'admin' || role === 'super_admin') {
        // Get organization NAMES from IDs
        const milanName = getOrgNameById(milan, organizations);
        const valayaName = getOrgNameById(valaya, organizations);
        const khandaName = getOrgNameById(khanda, organizations);
        const vibhaagaName = getOrgNameById(vibhaaga, organizations);
        const ghataName = ghata ? getOrgNameById(ghata, organizations) : '';

        console.log('🏛️ Admin Hierarchy NAMES:', {
          milan: milanName,
          valaya: valayaName,
          khanda: khandaName,
          vibhaaga: vibhaagaName,
          ghata: ghataName
        });

        // Include hierarchy fields using NAMES
        payload.milan = milanName;
        payload.valaya = valayaName;
        payload.khanda = khandaName;
        payload.vibhaaga = vibhaagaName;
        if (ghataName) payload.ghata = ghataName;
      }
      // For job_seeker and job_poster roles, include hierarchy data if available
      else {
        const milanName = getOrgNameById(milan, organizations);
        const valayaName = getOrgNameById(valaya, organizations);
        const khandaName = getOrgNameById(khanda, organizations);
        const vibhaagaName = getOrgNameById(vibhaaga, organizations);
        const ghataName = ghata ? getOrgNameById(ghata, organizations) : '';

        // Include hierarchy fields using NAMES if they exist
        if (milanName) payload.milan = milanName;
        if (valayaName) payload.valaya = valayaName;
        if (khandaName) payload.khanda = khandaName;
        if (vibhaagaName) payload.vibhaaga = vibhaagaName;
        if (ghataName) payload.ghata = ghataName;
      }

      console.log('🚀 === FINAL PAYLOAD TO BACKEND ===');
      console.log('📤 API Endpoint:', apiEndpoint);
      console.log('🔍 Role:', role);
      console.log('📦 Payload:', JSON.stringify(payload, null, 2));
      console.log('🔑 Has token:', !!token);
      console.log('🚀 === END PAYLOAD ===');

      console.log('📡 Making API call to:', apiEndpoint);
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log('📨 Response Status:', response.status);
      console.log('📨 Response OK:', response.ok);

      const responseText = await response.text();
      console.log('📨 Response Text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse response as JSON:', parseError);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        console.error('❌ API Error Response:', data);
        throw new Error(data.error || `Failed to create user: ${response.status}`);
      }

      console.log('✅ API Success Response:', data);
      setMessage(data.message || 'User created successfully! A temporary password has been sent to their email.');
      
      // Reset form
      console.log('🔄 Resetting form...');
      setEmail('');
      
      // Set default role based on available options
      const roleOptions = getRoleOptions();
      if (roleOptions.length > 0) {
        setRole(roleOptions[0].value as any);
      } else {
        setRole('job_poster');
      }
      
      setGhata('');
      setMilan('');
      setValaya('');
      setKhanda('');
      setVibhaaga('');
      setReferrerData(initialReferrerData);

    } catch (err: any) {
      console.error('❌ Create user error:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      console.log('🏁 Form submission completed');
      setIsLoading(false);
    }
  };

  // Animation Variants
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
            className="max-w-7xl mx-auto"
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
                      : "Create Job Posters and Referrers to expand your talent network"
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

                  {/* Referrer Details Section (only for referrer role) */}
                  {role === 'job_referrer' && (
                    <ReferrerSelection
                      referrerData={referrerData}
                      onReferrerDataChange={setReferrerData}
                      isLoading={isLoading}
                      organizations={organizations}
                      loadingHierarchy={loadingHierarchy}
                      hierarchyError={hierarchyError}
                      onRetry={retryFetchHierarchy}
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
                        (role === 'job_referrer' && (
                          !referrerData.fullName?.trim() ||
                          !referrerData.mobileNumber?.trim() ||
                          !referrerData.residentialAddress?.trim() ||
                          !referrerData.companyName?.trim() ||
                          !referrerData.workLocation?.trim() ||
                          !referrerData.designation?.trim() ||
                          !referrerData.milan?.trim() ||
                          !referrerData.valaya?.trim() ||
                          !referrerData.khanda?.trim()
                        )) ||
                        ((role === 'admin' || role === 'super_admin') && (
                          !milan.trim() || !valaya.trim() || !khanda.trim() || !vibhaaga.trim()
                        ))
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
                      ? "Referrer account will be created with the provided details and a temporary password will be sent via email"
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