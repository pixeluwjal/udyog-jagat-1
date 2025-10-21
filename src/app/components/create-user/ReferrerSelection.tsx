'use client';

import { motion } from 'framer-motion';
import { FiUser, FiMail, FiPhone, FiMapPin, FiBriefcase, FiLoader, FiUsers, FiCalendar } from 'react-icons/fi';

interface FormResponse {
  fieldId: string;
  fieldType: string;
  fieldLabel: string;
  value: any;
  _id: string;
}

export interface ReferrerResponse {
  _id: string;
  formId: string;
  formTitle: string;
  responses: FormResponse[];
  submittedAt: string;
  ipAddress: string;
  userAgent: string;
}

interface ReferrerSelectionProps {
  referrerResponses: ReferrerResponse[];
  loadingReferrers: boolean;
  selectedReferrer: string;
  onReferrerChange: (referrerId: string) => void;
  isLoading: boolean;
  referrerError: string | null;
  onRetryReferrers: () => void;
}

export default function ReferrerSelection({
  referrerResponses,
  loadingReferrers,
  selectedReferrer,
  onReferrerChange,
  isLoading,
  referrerError,
  onRetryReferrers
}: ReferrerSelectionProps) {

  const getFieldValue = (responses: FormResponse[], fieldLabel: string) => {
    const field = responses.find(r => r.fieldLabel === fieldLabel);
    return field?.value || 'Not provided';
  };

  const getEmail = (responses: FormResponse[]) => {
    return getFieldValue(responses, 'Email');
  };

  const getName = (responses: FormResponse[]) => {
    return getFieldValue(responses, 'Name');
  };

  const getPhone = (responses: FormResponse[]) => {
    return getFieldValue(responses, 'Contact Number');
  };

  const getAddress = (responses: FormResponse[]) => {
    const address1 = getFieldValue(responses, 'Residential Address Line 1');
    const address2 = getFieldValue(responses, 'Residential Address Line 2');
    const locality = getFieldValue(responses, 'Locality');
    return `${address1} ${address2} ${locality}`.trim();
  };

  const getEducation = (responses: FormResponse[]) => {
    const degree = getFieldValue(responses, 'Degree');
    const course = getFieldValue(responses, 'Course');
    const college = getFieldValue(responses, 'College');
    
    let education = '';
    if (degree && course) education = `${degree} in ${course}`;
    if (college && education) education += ` at ${college}`;
    else if (college) education = `Studies at ${college}`;
    
    return education || 'Education details not provided';
  };

  const getCurrentStatus = (responses: FormResponse[]) => {
    return getFieldValue(responses, 'Current Status');
  };

  if (loadingReferrers) {
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
            <h3 className="text-xl font-bold text-purple-900">Select Referrer</h3>
            <p className="text-purple-700 text-sm">Loading available referrers from registration forms</p>
          </div>
        </div>
        <div className="flex justify-center items-center py-8">
          <FiLoader className="animate-spin h-8 w-8 text-purple-500 mr-3" />
          <span className="text-purple-900 font-medium">Loading referrer data...</span>
        </div>
      </motion.div>
    );
  }

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
          <h3 className="text-xl font-bold text-purple-900">Select Referrer</h3>
          <p className="text-purple-700 text-sm">
            Choose from existing Swayamsevak registration forms
          </p>
        </div>
        {referrerError && (
          <motion.button
            onClick={onRetryReferrers}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="ml-auto flex items-center space-x-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors"
          >
            <FiLoader className="h-4 w-4" />
            <span>Retry</span>
          </motion.button>
        )}
      </div>

      {referrerError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm"
        >
          <div className="flex items-start space-x-2">
            <FiXCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Failed to load referrer data</p>
              <p className="text-xs mt-1">{referrerError}</p>
            </div>
          </div>
        </motion.div>
      )}

      {referrerResponses.length === 0 && !referrerError ? (
        <div className="text-center py-8 text-purple-700">
          <FiUser className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No referrer registration forms found.</p>
          <p className="text-sm mt-1">Please ensure forms are submitted in the Swayamsevak Registration system.</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {referrerResponses.map((response, index) => (
            <motion.div
              key={response._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <input
                type="radio"
                id={`referrer-${response._id}`}
                name="referrer"
                value={response._id}
                checked={selectedReferrer === response._id}
                onChange={() => onReferrerChange(response._id)}
                className="hidden peer"
                disabled={isLoading}
              />
              <label
                htmlFor={`referrer-${response._id}`}
                className={`block p-4 border-2 rounded-xl cursor-pointer transition-all duration-300
                  ${selectedReferrer === response._id
                    ? 'border-purple-500 bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-xl'
                    : 'border-purple-500/20 bg-white text-purple-900 hover:border-purple-500/40 hover:shadow-lg'
                  }
                  ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`
                }
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-lg ${selectedReferrer === response._id ? 'bg-white/20' : 'bg-purple-500/10'}`}>
                    <FiUser className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-bold text-lg">
                        {getName(response.responses)}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        selectedReferrer === response._id 
                          ? 'bg-white/20 text-white' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {getCurrentStatus(response.responses)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center space-x-2">
                        <FiMail className="h-4 w-4 opacity-70 flex-shrink-0" />
                        <span className="truncate">{getEmail(response.responses)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FiPhone className="h-4 w-4 opacity-70 flex-shrink-0" />
                        <span>{getPhone(response.responses)}</span>
                      </div>
                      <div className="flex items-start space-x-2 md:col-span-2">
                        <FiMapPin className="h-4 w-4 opacity-70 mt-0.5 flex-shrink-0" />
                        <span className="flex-1">{getAddress(response.responses) || 'Address not provided'}</span>
                      </div>
                      <div className="flex items-center space-x-2 md:col-span-2">
                        <FiBriefcase className="h-4 w-4 opacity-70 flex-shrink-0" />
                        <span className="flex-1">{getEducation(response.responses)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-3 text-xs opacity-70">
                      <div className="flex items-center space-x-1">
                        <FiCalendar className="h-3 w-3" />
                        <span>Submitted: {new Date(parseInt(response.submittedAt)).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </label>
            </motion.div>
          ))}
        </div>
      )}
      
      {referrerResponses.length > 0 && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-purple-700 font-medium mt-4"
        >
          Selected referrer will be created with their form data
        </motion.p>
      )}
    </motion.div>
  );
}