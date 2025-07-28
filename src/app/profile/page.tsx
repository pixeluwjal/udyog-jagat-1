// app/profile/page.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Sidebar from "@/app/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiUser,
  FiMail,
  FiEdit,
  FiSave,
  FiXCircle,
  FiCheckCircle,
  FiLoader,
  FiMenu, // Removed unnecessary icons
} from "react-icons/fi";

// Framer Motion Variants for animations
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const pulseEffect = {
  scale: [1, 1.05, 1],
  opacity: [1, 0.7, 1],
  transition: { duration: 0.8, repeat: Infinity, ease: "easeInOut" },
};

export default function ProfilePage() {
  const {
    user: currentUser,
    loading: authLoading,
    isAuthenticated,
    token,
    updateUser,
    logout,
  } = useAuth();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  // Simplified formData to only include username and email
  const [formData, setFormData] = useState({
    username: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for mobile sidebar

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !currentUser) {
        router.push("/login");
      } else {
        // Initialize form data with current user data, only for username and email
        setFormData({
          username: currentUser.username || "",
          email: currentUser.email || "",
        });
      }
    }
  }, [authLoading, isAuthenticated, currentUser, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Changed type to HTMLInputElement as textarea is removed
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!token) {
      setError("Authentication token missing. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      // Only send username for update, email is read-only and handled by backend
      const payload = {
        username: formData.username,
        // Do NOT send email in the payload if it's not meant to be updated
        // The backend already has logic to prevent email changes.
        // If you send it, ensure the backend explicitly ignores it.
        // For clarity, we're only sending what the user can change.
      };

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload), // Send only the username
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      // Update user in AuthContext with the new data from the response
      updateUser(data.user);
      setMessage("Profile updated successfully!");
      setIsEditing(false); // Exit editing mode
    } catch (err: any) {
      console.error("Profile update error:", err);
      setError(
        err.message || "An unexpected error occurred during profile update."
      );
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !isAuthenticated || !currentUser) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 justify-center items-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center"
        >
          <motion.div
            animate={pulseEffect}
            className="rounded-full p-3 bg-indigo-200"
          >
            <FiLoader className="text-indigo-600 h-10 w-10" />
          </motion.div>
          <p className="mt-4 text-lg font-medium text-gray-700">
            Loading profile...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden font-inter">
      <Sidebar
        userRole={currentUser.role}
        onLogout={logout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile header */}
        <div className="md:hidden bg-white/95 backdrop-blur-md shadow-lg p-4 flex justify-between items-center z-10 sticky top-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <FiMenu className="h-6 w-6" />
          </motion.button>
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            My Profile
          </h1>
          <div className="w-6 h-6"></div> {/* Placeholder for alignment */}
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-8 transform hover:shadow-2xl transition-all duration-300 ease-out"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h1 className="text-3xl font-extrabold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-700">
                My Profile
              </h1>
              <motion.button
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0 4px 15px rgba(99, 102, 241, 0.3)",
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm font-medium shadow-sm"
              >
                {isEditing ? (
                  <>
                    <FiXCircle className="mr-2 w-5 h-5" /> Cancel Edit
                  </>
                ) : (
                  <>
                    <FiEdit className="mr-2 w-5 h-5" /> Edit Profile
                  </>
                )}
              </motion.button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="p-3 bg-red-100 border-l-4 border-red-500 rounded-r-lg shadow-sm text-sm text-red-700 font-medium flex items-center mb-4"
                  role="alert"
                >
                  <FiXCircle className="h-5 w-5 text-red-500 mr-2" /> {error}
                </motion.div>
              )}
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="p-3 bg-green-100 border-l-4 border-green-500 rounded-r-lg shadow-sm text-sm text-green-700 font-medium flex items-center mb-4"
                  role="alert"
                >
                  <FiCheckCircle className="h-5 w-5 text-green-500 mr-2" />{" "}
                  {message}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                {" "}
                {/* Simplified to 1 column */}
                {/* Username */}
                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    <FiUser className="inline-block mr-2 text-gray-500" />{" "}
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    readOnly={!isEditing} // Editable when in editing mode
                    className={`block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                      !isEditing ? "bg-gray-50 cursor-not-allowed" : ""
                    }`}
                  />
                </div>
                {/* Email - Always Read-Only */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    <FiMail className="inline-block mr-2 text-gray-500" /> Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    readOnly={true} // Always read-only
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm bg-gray-50 cursor-not-allowed" // Always styled as read-only
                  />
                </div>
              </div>

              {isEditing && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{
                      scale: 1.02,
                      boxShadow: "0 10px 20px rgba(0, 0, 0, 0.15)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-lg font-semibold text-white bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 ${
                      loading ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                  >
                    {loading ? (
                      <>
                        <FiLoader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FiSave className="-ml-1 mr-3 h-5 w-5" />
                        Save Changes
                      </>
                    )}
                  </motion.button>
                </motion.div>
              )}
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
