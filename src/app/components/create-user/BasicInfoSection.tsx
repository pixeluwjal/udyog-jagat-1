'use client';

import { motion } from 'framer-motion';
import { FiMail, FiUser, FiBriefcase, FiLink, FiShield, FiZap } from 'react-icons/fi';

interface RoleOption {
  value: string;
  label: string;
  icon: JSX.Element;
  description: string;
  gradient: string;
  color: string;
}

interface BasicInfoSectionProps {
  email: string;
  role: string;
  onEmailChange: (email: string) => void;
  onRoleChange: (role: string) => void;
  isLoading: boolean;
  roleOptions: RoleOption[];
}

export default function BasicInfoSection({
  email,
  role,
  onEmailChange,
  onRoleChange,
  isLoading,
  roleOptions
}: BasicInfoSectionProps) {

  const cardHover = {
    scale: 1.02,
    y: -5,
    boxShadow: "0 20px 40px rgba(22, 91, 248, 0.15)",
    transition: { type: "spring", stiffness: 300, damping: 20 }
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
      className="bg-gradient-to-br from-[#165BF8]/5 to-[#1C3991]/5 rounded-2xl p-6 border border-[#165BF8]/10"
    >
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-[#165BF8] rounded-xl">
          <FiUser className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[#1C3991]">Basic Information</h3>
          <p className="text-[#165BF8] text-sm">Enter user's email and select their role</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Email Field */}
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
        >
          <label className="block text-sm font-bold text-[#1C3991] mb-3 uppercase tracking-wide">
            Email Address
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FiMail className="h-6 w-6 text-[#165BF8]/70" />
            </div>
            <input
              type="email"
              required
              className="block w-full pl-12 pr-4 py-4 text-lg border-2 border-[#165BF8]/20 rounded-2xl shadow-sm placeholder-[#165BF8]/50 focus:outline-none focus:ring-4 focus:ring-[#165BF8]/20 focus:border-[#165BF8] text-[#1C3991] bg-white transition-all duration-300 group-hover:border-[#165BF8]/40"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              disabled={isLoading}
              placeholder="Enter email address"
            />
          </div>
        </motion.div>

        {/* Role Selection */}
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
        >
          <label className="block text-sm font-bold text-[#1C3991] mb-4 uppercase tracking-wide">
            Select Role
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {roleOptions.map((option) => (
              <motion.div
                key={option.value}
                whileHover={cardHover}
                whileTap={{ scale: 0.95 }}
              >
                <input
                  type="radio"
                  id={`role-${option.value}`}
                  name="role"
                  value={option.value}
                  checked={role === option.value}
                  onChange={() => onRoleChange(option.value)}
                  className="hidden peer"
                  disabled={isLoading}
                />
                <label
                  htmlFor={`role-${option.value}`}
                  className={`block p-4 border-2 rounded-xl cursor-pointer transition-all duration-300
                    ${role === option.value
                      ? `border-[${option.color}] bg-gradient-to-br ${option.gradient} text-white shadow-xl`
                      : 'border-[#165BF8]/20 bg-white text-[#1C3991] hover:border-[#165BF8]/40 hover:shadow-lg'
                    }
                    ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`
                  }
                  style={role === option.value ? { borderColor: option.color } : {}}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${role === option.value ? 'bg-white/20' : 'bg-[#165BF8]/10'}`}>
                      {option.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{option.label}</div>
                      <div className={`text-xs mt-1 ${role === option.value ? 'text-white/90' : 'text-gray-600'}`}>
                        {option.description}
                      </div>
                    </div>
                  </div>
                </label>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}