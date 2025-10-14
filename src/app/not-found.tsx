'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiHome, FiArrowLeft, FiAlertCircle } from 'react-icons/fi';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-24 h-24 bg-red-50 rounded-2xl flex items-center justify-center mx-auto"
          >
            <FiAlertCircle className="w-12 h-12 text-red-500" />
          </motion.div>

          {/* Content */}
          <div className="space-y-4">
            <h1 className="text-6xl font-bold text-gray-900">404</h1>
            <h2 className="text-2xl font-semibold text-gray-800">Page not found</h2>
            <p className="text-gray-600">
              Sorry, we couldn't find the page you're looking for.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/" passHref>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-6 py-3 bg-[#2245ae] text-white rounded-lg font-medium hover:bg-[#1a3a9c] transition-colors"
              >
                <FiHome className="w-4 h-4" />
                Go Home
              </motion.button>
            </Link>
            
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              <FiArrowLeft className="w-4 h-4" />
              Go Back
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}