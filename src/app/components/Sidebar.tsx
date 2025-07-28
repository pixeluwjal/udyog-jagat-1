// app/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface NavItem {
    href: string;
    icon: JSX.Element;
    text: string;
}

interface SidebarProps {
    userRole: "job_poster" | "job_seeker" | "admin" | "job_referrer";
    onLogout: () => void;
    // These props are now expected to be provided by the parent component
    userDisplayName: string; // Could be username or first/last name
    userEmail: string;
}

export default function Sidebar({
    userRole,
    onLogout,
    userDisplayName, // Now directly used
    userEmail,       // Now directly used
}: SidebarProps) {
    // State to control the desktop sidebar's open/collapsed state
    const [sidebarOpen, setSidebarOpen] = useState(true);
    // State to control the MOBILE sidebar's open/closed state
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    // State to track which navigation item is being hovered over (for tooltip in collapsed state)
    const [activeHover, setActiveHover] = useState<string | null>(null);
    // Get the current pathname for active link highlighting
    const pathname = usePathname();

    // Generate initials from the display name for the avatar
    const getUserInitials = (name: string): string => {
        if (!name) return "U"; // Default if name is empty
        const parts = name.split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.charAt(0).toUpperCase();
    };

    const initials = getUserInitials(userDisplayName);

    // Define color themes based on user role for a dynamic and personalized look
    const roleColors = {
        job_poster: {
            bg: "bg-gradient-to-b from-blue-800 to-blue-950", // Deeper, richer blue gradient
            hover: "hover:bg-blue-700",
            active: "bg-blue-600", // Stronger active state
            text: "text-blue-100", // Lighter text for contrast
            border: "border-blue-700",
            mobileButton: "bg-blue-700",
        },
        job_seeker: {
            bg: "bg-gradient-to-b from-indigo-800 to-indigo-950",
            hover: "hover:bg-indigo-700",
            active: "bg-indigo-600",
            text: "text-indigo-100",
            border: "border-indigo-700",
            mobileButton: "bg-indigo-700",
        },
        admin: {
            bg: "bg-gradient-to-b from-indigo-800 to-indigo-950",
            hover: "hover:bg-indigo-700",
            active: "bg-indigo-600",
            text: "text-indigo-100",
            border: "border-indigo-700",
            mobileButton: "bg-indigo-700",
        },
        job_referrer: {
            bg: "bg-gradient-to-b from-indigo-800 to-indigo-950",
            hover: "hover:bg-indigo-700",
            active: "bg-indigo-600",
            text: "text-indigo-100",
            border: "border-indigo-700",
            mobileButton: "bg-indigo-700",
        },
    };

    // Select the current theme based on the user's role
    const currentTheme = roleColors[userRole];

    // Common profile link for all users
    const profileLink = {
        href: "/profile",
        icon: (
            <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
            </svg>
        ),
        text: "My Profile",
    };

    // Define navigation items based on user role
    const navItems: NavItem[] = [
        // Job Poster specific links
        ...(userRole === "job_poster"
            ? [
                  {
                      href: "/poster/dashboard",
                      icon: (
                          <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                          >
                              <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                              />
                          </svg>
                      ),
                      text: "Dashboard",
                  },
                  {
                      href: "/poster/new-job",
                      icon: (
                          <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                          >
                              <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                              />
                          </svg>
                      ),
                      text: "Post New Job",
                  },
                  {
                      href: "/poster/posted-jobs",
                      icon: (
                          <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                          >
                              <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                              />
                          </svg>
                      ),
                      text: "Posted Jobs",
                  },
                  {
                      href: "/poster/applications",
                      icon: (
                          <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                          >
                              <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                              />
                          </svg>
                      ),
                      text: "Applications",
                  },
              ]
            : []),
        // Job Seeker specific links
        ...(userRole === "job_seeker"
            ? [
                  {
                      href: "/seeker/dashboard",
                      icon: (
                          <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                          >
                              <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m0 0l-7 7m7-7v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                              />
                          </svg>
                      ),
                      text: "Dashboard",
                  },
                  {
                      href: "/seeker/job",
                      icon: (
                          <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                          >
                              <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M21 13.255A23.55 23.55 0 0112 15c-1.606 0-3.14-.153-4.59-.445M21 4.87V11m0 0h-7.5M21 11l-3.25-3.25M12 3a9 9 0 100 18 9 9 0 000-18z"
                              />
                          </svg>
                      ),
                      text: "Browse Jobs",
                  },
                  {
                      href: "/seeker/applications",
                      icon: (
                          <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                          >
                              <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                              />
                          </svg>
                      ),
                      text: "My Applications",
                  },
                  {
                      href: "/seeker/saved-jobs",
                      icon: (
                          <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                          >
                              <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                              />
                          </svg>
                      ),
                      text: "Saved Jobs",
                  },
              ]
            : []),
        // Admin specific links
        ...(userRole === "admin"
            ? [
                  {
                      href: "/admin/dashboard",
                      icon: (
                          <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                          >
                              <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                              />
                          </svg>
                      ),
                      text: "Dashboard",
                  },
                  {
                      href: "/admin/create-user",
                      icon: (
                          <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                          >
                              <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM12 14v1.5a2.5 2.5 0 005 0V14m-5 0H5a2 2 0 00-2 2v3a2 2 0 002 2h10a2 2 0 002-2v-3a2 2 0 00-2-2h-2z"
                              />
                          </svg>
                      ),
                      text: "Create User",
                  },
                  {
                      href: "/admin/generate-referral",
                      icon: (
                          <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                          >
                              <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                              />
                          </svg>
                      ),
                      text: "Generate Referral",
                  },
                  {
                      href: "/admin/my-created-users",
                      icon: (
                          <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                          >
                              <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17 20h2a2 2 0 002-2V7a2 2 0 00-2-2h-2V3m-2 16h-4m-2 0h-2a2 2 0 01-2-2v-7a2 2 0 012-2h2m-4 5l4-4 4 4m-6 6h6"
                              />
                          </svg>
                      ),
                      text: "My Created Users",
                  },
              ]
            : []),
        // Job Referrer specific links
        ...(userRole === "job_referrer"
            ? [
                  {
                      href: "/referrer/dashboard",
                      icon: (
                          <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                          >
                              <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17 20h5v-2a3 3 0 015.356-1.857M17 20H2v-2a3 3 0 015.356-1.857M17 20v-9a2 2 0 00-2-2H9a2 2 0 00-2 2v9M4 10V4a2 2 0 012-2h2"
                              />
                          </svg>
                      ),
                      text: "Referral Dashboard",
                  },
                  {
                      href: "/referrer/generate",
                      icon: (
                          <svg
                              className="h-6 w-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                          >
                              <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101m-1.721 2.875a.5.5 0 00.354.854H17a.5.5 0 00.354-.854l-2.875-2.875z"
                              />
                          </svg>
                      ),
                      text: "Generate Referral Link",
                  },
              ]
            : []),
        // Add profile link for all users
        profileLink,
    ];

    // Map user roles to display titles
    const roleTitles = {
        job_poster: "Job Poster",
        job_seeker: "Job Seeker",
        admin: "Administrator",
        job_referrer: "Job Referrer",
    };

    // Close mobile sidebar if screen is large enough
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) { // md breakpoint
                setMobileSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Variants for staggered animations in navigation
    const navItemVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0 },
    };

    return (
        <>
            {/* Mobile sidebar toggle - Now a sleek hamburger icon */}
            <div className="md:hidden fixed top-4 left-4 z-50">
                <motion.button
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9, rotate: -5 }}
                    onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} // Use internal state
                    className={`p-3 rounded-full ${currentTheme.mobileButton} shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none flex items-center justify-center`}
                    aria-label="Toggle sidebar"
                >
                    {/* Hamburger Icon SVG */}
                    <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16M4 18h16"
                        />
                    </svg>
                </motion.button>
            </div>

            {/* Desktop Sidebar */}
            <motion.div
                // Animate width based on sidebarOpen state
                initial={{ width: 256 }} // Corresponds to w-64
                animate={{ width: sidebarOpen ? 256 : 80 }} // Corresponds to w-20
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`hidden md:flex flex-shrink-0 ${currentTheme.bg} ${currentTheme.text} transition-all duration-300 ease-in-out flex-col h-full shadow-2xl relative border-r ${currentTheme.border}`}
                style={{ fontFamily: "Inter, sans-serif" }} // Ensure Inter font is applied
            >
                {/* Sidebar header with beautiful gradient and user info */}
                <div
                    className={`flex items-center justify-between p-4 ${
                        currentTheme.border
                    } ${sidebarOpen ? "border-b" : "border-b-0"}`}
                >
                    {sidebarOpen ? (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex items-center space-x-3"
                        >
                            <div
                                className={`w-10 h-10 rounded-full ${currentTheme.active} flex items-center justify-center text-white font-bold text-lg shadow-inner`}
                            >
                                {initials} {/* Use generated initials */}
                            </div>
                            <div>
                                <h1 className="text-xl font-extrabold tracking-wide">
                                    {roleTitles[userRole]}
                                </h1>
                                <p className="text-sm opacity-80 truncate w-40">{userEmail}</p> {/* Use passed userEmail */}
                            </div>
                        </motion.div>
                    ) : (
                        <div className="mx-auto">
                            <div
                                className={`w-12 h-12 rounded-full ${currentTheme.active} flex items-center justify-center text-white font-bold text-xl shadow-inner`}
                            >
                                {initials} {/* Use generated initials */}
                            </div>
                        </div>
                    )}
                    {/* Toggle button for desktop sidebar collapse/expand */}
                    <motion.button
                        whileHover={{ scale: 1.1, rotate: sidebarOpen ? 0 : 180 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className={`p-2 rounded-full ${currentTheme.hover} transition-colors duration-200 focus:outline-none text-white`}
                        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d={sidebarOpen ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}
                            />
                        </svg>
                    </motion.button>
                </div>

                {/* Navigation items with beautiful hover effects and active indicator */}
                <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
                    {/* Added custom-scrollbar class */}
                    <motion.div
                        className="space-y-1 px-2"
                        initial="hidden"
                        animate="visible"
                        variants={{
                            visible: {
                                transition: {
                                    staggerChildren: 0.05, // Stagger animation for each nav item
                                },
                            },
                        }}
                    >
                        {navItems.map((item, index) => (
                            <motion.div key={item.href} variants={navItemVariants}>
                                <Link href={item.href} passHref>
                                    <motion.div
                                        whileHover={{
                                            scale: 1.03,
                                            boxShadow: "0 8px 15px rgba(0,0,0,0.2)",
                                        }}
                                        whileTap={{ scale: 0.98 }}
                                        onHoverStart={() => setActiveHover(item.href)}
                                        onHoverEnd={() => setActiveHover(null)}
                                        className={`relative flex items-center p-3 mx-2 rounded-lg mb-1 transition-all duration-200 ${
                                            pathname === item.href
                                                ? currentTheme.active
                                                : currentTheme.hover
                                        } cursor-pointer overflow-hidden`}
                                    >
                                        {/* Active indicator with layoutId for smooth transition */}
                                        {pathname === item.href && (
                                            <motion.div
                                                layoutId="activeSidebarItem"
                                                className={`absolute inset-0 rounded-lg ${currentTheme.active} opacity-70`}
                                                transition={{
                                                    type: "spring",
                                                    stiffness: 300,
                                                    damping: 30,
                                                }}
                                            />
                                        )}
                                        <div
                                            className={`relative z-10 ${
                                                pathname === item.href ? "text-white" : "text-white/80"
                                            }`}
                                        >
                                            {item.icon}
                                        </div>
                                        {sidebarOpen && (
                                            <motion.span
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.1 }}
                                                className="ml-3 relative z-10 font-medium"
                                            >
                                                {item.text}
                                            </motion.span>
                                        )}
                                        {/* Tooltip for collapsed sidebar */}
                                        {activeHover === item.href && !sidebarOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="absolute left-full ml-2 px-3 py-1 bg-white text-gray-800 text-sm rounded-md shadow-lg whitespace-nowrap z-50"
                                            >
                                                {item.text}
                                            </motion.div>
                                        )}
                                    </motion.div>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                </nav>

                {/* Logout Button with beautiful animation */}
                <div
                    className={`p-4 ${currentTheme.border} ${
                        sidebarOpen ? "border-t" : "border-t-0"
                    }`}
                >
                    <motion.button
                        whileHover={{
                            scale: 1.03,
                            boxShadow: "0 5px 10px rgba(0,0,0,0.2)",
                        }}
                        whileTap={{ scale: 0.97 }}
                        onClick={onLogout}
                        className={`flex items-center w-full p-2 rounded-lg ${currentTheme.hover} transition-colors ${sidebarOpen ? "justify-start" : "justify-center"} font-medium`}
                    >
                        <svg
                            className="w-5 h-5 relative z-10"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                        </svg>
                        {sidebarOpen && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="ml-3 relative z-10"
                            >
                                Logout
                            </motion.span>
                        )}
                    </motion.button>
                </div>
            </motion.div>

            {/* Mobile Sidebar Overlay with beautiful animations */}
            <AnimatePresence>
                {mobileSidebarOpen && (
                    <>
                        {/* Overlay background with fade animation */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black bg-opacity-60 z-40 backdrop-blur-sm" // Added backdrop-blur
                            onClick={() => setMobileSidebarOpen(false)} // Use internal state
                        ></motion.div>

                        {/* Actual mobile sidebar with slide animation */}
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className={`fixed inset-y-0 left-0 w-72 max-w-full ${currentTheme.bg} ${currentTheme.text} z-50 shadow-2xl rounded-r-xl`} // Rounded corner
                            style={{ fontFamily: "Inter, sans-serif" }}
                        >
                            {/* Mobile Sidebar Header with user info */}
                            <div
                                className={`flex items-center justify-between p-6 border-b ${currentTheme.border}`}
                            >
                                <div className="flex items-center space-x-3">
                                    <div
                                        className={`w-12 h-12 rounded-full ${currentTheme.active} flex items-center justify-center text-white font-bold text-xl shadow-inner`}
                                    >
                                        {initials} {/* Use generated initials */}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-extrabold tracking-wide">
                                            {roleTitles[userRole]}
                                        </h2>
                                        <p className="text-sm opacity-80 truncate w-40">
                                            {userEmail} {/* Use passed userEmail */}
                                        </p>
                                    </div>
                                </div>
                                {/* Close button for mobile sidebar */}
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setMobileSidebarOpen(false)} // Use internal state
                                    className="p-2 rounded-full hover:bg-white/10 transition-colors duration-200 focus:outline-none text-white"
                                    aria-label="Close sidebar"
                                >
                                    <svg
                                        className="w-6 h-6"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </motion.button>
                            </div>
                            {/* Mobile Navigation items */}
                            <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
                                <div className="space-y-1 px-2">
                                    {navItems.map((item, index) => (
                                        <Link href={item.href} key={item.href} passHref>
                                            <motion.div
                                                whileHover={{ scale: 1.03 }}
                                                whileTap={{ scale: 0.98 }}
                                                className={`flex items-center p-3 mx-2 rounded-lg mb-1 transition-colors duration-200 ${
                                                    pathname === item.href
                                                        ? currentTheme.active
                                                        : currentTheme.hover
                                                }`}
                                                onClick={() => setMobileSidebarOpen(false)} // Close sidebar on link click
                                            >
                                                {item.icon}
                                                <span className="ml-3 font-medium">
                                                    {item.text}
                                                </span>
                                            </motion.div>
                                        </Link>
                                    ))}
                                </div>
                            </nav>
                            {/* Mobile Logout Button */}
                            <div className="p-4 border-t border-gray-700">
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => {
                                        onLogout();
                                        setMobileSidebarOpen(false); // Close sidebar on logout
                                    }}
                                    className={`flex items-center w-full p-2 rounded-lg ${currentTheme.hover} transition-colors font-medium`}
                                >
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                        />
                                    </svg>
                                    <span className="ml-3">Logout</span>
                                </motion.button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
