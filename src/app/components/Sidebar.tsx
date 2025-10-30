// app/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiHome, 
  FiPlusSquare, 
  FiBriefcase, 
  FiUsers, 
  FiUser, 
  FiFileText, 
  FiLink, 
  FiLogOut, 
  FiSave,
  FiAward,
  FiTrendingUp,
  FiShield
} from 'react-icons/fi';

interface NavItem {
    href: string;
    icon: JSX.Element;
    text: string;
    badge?: number;
}

interface SidebarProps {
    userRole: "job_poster" | "job_seeker" | "admin" | "job_referrer";
    onLogout: () => void;
    userDisplayName?: string;
    userEmail?: string;
    unreadCount?: number;
    isOpen?: boolean;
    setIsOpen?: (open: boolean) => void;
}

export default function Sidebar({
    userRole: initialUserRole,
    onLogout,
    userDisplayName = "User",
    userEmail = "user@example.com",
    unreadCount = 0,
    isOpen,
    setIsOpen
}: SidebarProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [activeHover, setActiveHover] = useState<string | null>(null);
    const [hasUnread, setHasUnread] = useState(unreadCount > 0);
    const [userRole, setUserRole] = useState(initialUserRole);
    const [isLoading, setIsLoading] = useState(false);
    const pathname = usePathname();

    // Check if user is super admin
    useEffect(() => {
        const checkSuperAdmin = async () => {
            // Only check if initial role is admin (potential super admin)
            if (initialUserRole === 'admin') {
                setIsLoading(true);
                try {
                    const token = localStorage.getItem('token');
                    if (!token) {
                        console.error('No token found for super admin check');
                        return;
                    }

                    const response = await fetch('/api/auth/me', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('User data from /api/auth/me:', data.user);
                        
                        // Check if user is super admin based on the data
                        if (data.user.role === 'admin' && data.user.isSuperAdmin === true) {
                            setUserRole('super_admin');
                        }
                    } else {
                        console.error('Failed to fetch user data:', response.status);
                    }
                } catch (error) {
                    console.error('Failed to fetch user data:', error);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        checkSuperAdmin();
    }, [initialUserRole]);

    const getUserInitials = (name: string): string => {
        if (!name || typeof name !== 'string') return "U";
        
        const trimmedName = name.trim();
        if (trimmedName.length === 0) return "U";
        
        const parts = trimmedName.split(' ').filter(part => part.length > 0);
        
        if (parts.length > 1) {
            const firstChar = parts[0][0] || '';
            const lastChar = parts[parts.length - 1][0] || '';
            return (firstChar + lastChar).toUpperCase();
        }
        
        return trimmedName.charAt(0).toUpperCase();
    };

    const initials = getUserInitials(userDisplayName);

    // Modern blue color theme (#2245ae)
    const blueTheme = {
        bg: "bg-gradient-to-br from-[#2245ae] via-[#1a3a9c] to-[#162f8a]",
        hover: "hover:bg-[#2245ae]/90",
        active: "bg-[#2a55cc]",
        text: "text-white",
        border: "border-[#2245ae]/40",
        mobileButton: "bg-[#2245ae]",
        glow: "shadow-lg shadow-[#2245ae]/30",
        accent: "bg-gradient-to-r from-[#2245ae] to-[#3a65ff]"
    };

    const roleTitles = {
        job_poster: "Job Poster",
        job_seeker: "Job Seeker",
        admin: "Administrator",
        job_referrer: "Job Referrer",
        super_admin: "Super Administrator"
    };

    const currentTheme = blueTheme;

    const profileLink = {
        href: "/profile",
        icon: <FiUser className="w-5 h-5" />,
        text: "My Profile",
    };

    const navItems: NavItem[] = [
        ...(userRole === "job_poster"
            ? [
                { href: "/poster/dashboard", icon: <FiHome className="w-5 h-5" />, text: "Dashboard" },
                { href: "/poster/new-job", icon: <FiPlusSquare className="w-5 h-5" />, text: "Post New Job" },
                { href: "/poster/posted-jobs", icon: <FiBriefcase className="w-5 h-5" />, text: "Posted Jobs" },
                { href: "/poster/applications", icon: <FiFileText className="w-5 h-5" />, text: "Applications" },
            ]
            : []),
        ...(userRole === "job_seeker"
            ? [
                { href: "/seeker/dashboard", icon: <FiHome className="h-5 w-5" />, text: "Dashboard" },
                { href: "/seeker/job", icon: <FiBriefcase className="h-5 w-5" />, text: "Browse Jobs" },
                { href: "/seeker/applications", icon: <FiFileText className="h-5 w-5" />, text: "My Applications" },
                { href: "/seeker/saved-jobs", icon: <FiSave className="h-5 w-5" />, text: "Saved Jobs" },
                { href: "/seeker/find-referrer", icon: <FiUsers className="h-5 w-5" />, text: "Find Referrer" },
            ]
            : []),
        ...(userRole === "admin"
            ? [
                { href: "/admin/dashboard", icon: <FiHome className="h-5 w-5" />, text: "Dashboard" },
                { href: "/admin/create-user", icon: <FiUser className="h-5 w-5" />, text: "Create User" },
                { href: "/admin/generate-referral", icon: <FiLink className="h-5 w-5" />, text: "Generate Access Code" },
                { href: "/admin/my-created-users", icon: <FiUsers className="h-5 w-5" />, text: "My Created Users" },
            ]
            : []),
        ...(userRole === "super_admin"
            ? [
                { href: "/admin/dashboard", icon: <FiHome className="h-5 w-5" />, text: "Dashboard" },
                { href: "/admin/create-user", icon: <FiUser className="h-5 w-5" />, text: "Create User" },
                { href: "/admin/generate-referral", icon: <FiLink className="h-5 w-5" />, text: "Generate Access Code" },
                { href: "/admin/my-created-users", icon: <FiUsers className="h-5 w-5" />, text: "My Created Users" },
            ]
            : []),
        ...(userRole === "job_referrer"
            ? [
                { href: "/referrer/dashboard", icon: <FiTrendingUp className="h-5 w-5" />, text: "Messages", badge: unreadCount },
            ]
            : []),
        profileLink,
    ];

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setMobileSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        setHasUnread(unreadCount > 0);
    }, [unreadCount]);

    const navItemVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0 },
    };

    const badgeVariants = {
        initial: { scale: 0, rotate: -180 },
        animate: { 
            scale: 1, 
            rotate: 0,
            transition: { type: "spring", stiffness: 500, damping: 15 }
        },
        pulse: {
            scale: [1, 1.1, 1],
            transition: { duration: 1, repeat: Infinity }
        }
    };

    return (
        <>
            {/* Mobile Menu Button */}
            <div className="md:hidden fixed top-4 left-4 z-50">
                <motion.button
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9, rotate: -5 }}
                    onClick={() => setIsOpen ? setIsOpen(true) : setMobileSidebarOpen(!mobileSidebarOpen)}
                    className={`p-3 rounded-2xl ${currentTheme.mobileButton} ${currentTheme.glow} shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none flex items-center justify-center relative`}
                    aria-label="Toggle sidebar"
                >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    {hasUnread && (
                        <motion.div
                            variants={badgeVariants}
                            initial="initial"
                            animate={["animate", "pulse"]}
                            className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"
                        />
                    )}
                </motion.button>
            </div>

            {/* Desktop Sidebar */}
            <motion.div
                initial={{ width: 280 }}
                animate={{ width: sidebarOpen ? 280 : 88 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`hidden md:flex flex-shrink-0 ${currentTheme.bg} ${currentTheme.text} ${currentTheme.glow} transition-all duration-300 ease-in-out flex-col h-full shadow-2xl relative border-r ${currentTheme.border} backdrop-blur-sm bg-opacity-95`}
                style={{ fontFamily: "Inter, sans-serif" }}
            >
                {/* Header */}
                <div className={`flex items-center justify-between p-6 ${currentTheme.border} ${sidebarOpen ? "border-b" : "border-b-0"}`}>
                    {sidebarOpen ? (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex items-center space-x-4"
                        >
                            <motion.div 
                                whileHover={{ scale: 1.05, rotate: 5 }}
                                className={`w-12 h-12 rounded-2xl ${currentTheme.accent} flex items-center justify-center text-white font-bold text-lg shadow-lg relative`}
                            >
                                {initials}
                                {hasUnread && (
                                    <motion.div
                                        variants={badgeVariants}
                                        initial="initial"
                                        animate={["animate", "pulse"]}
                                        className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"
                                    />
                                )}
                                {isLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </motion.div>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-xl font-bold tracking-tight truncate">
                                    {userDisplayName}
                                </h1>
                                <p className="text-sm opacity-90 truncate">{userEmail}</p>
                                <div className="flex items-center mt-1">
                                    <div className={`w-2 h-2 rounded-full ${currentTheme.active} mr-2`}></div>
                                    <span className="text-xs opacity-75">
                                        {isLoading ? "Checking..." : roleTitles[userRole]}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="mx-auto relative">
                            <motion.div 
                                whileHover={{ scale: 1.05, rotate: 5 }}
                                className={`w-12 h-12 rounded-2xl ${currentTheme.accent} flex items-center justify-center text-white font-bold text-xl shadow-lg`}
                            >
                                {initials}
                                {isLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </motion.div>
                            {hasUnread && (
                                <motion.div
                                    variants={badgeVariants}
                                    initial="initial"
                                    animate={["animate", "pulse"]}
                                    className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"
                                />
                            )}
                        </div>
                    )}
                    <motion.button
                        whileHover={{ scale: 1.1, rotate: sidebarOpen ? 0 : 180 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className={`p-2 rounded-xl ${currentTheme.hover} transition-colors duration-200 focus:outline-none text-white backdrop-blur-sm`}
                        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
                        </svg>
                    </motion.button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-6 custom-scrollbar">
                    <motion.div
                        className="space-y-2 px-3"
                        initial="hidden"
                        animate="visible"
                        variants={{
                            visible: {
                                transition: {
                                    staggerChildren: 0.05,
                                },
                            },
                        }}
                    >
                        {navItems.map((item) => (
                            <motion.div key={item.href} variants={navItemVariants}>
                                <Link href={item.href} passHref>
                                    <motion.div
                                        whileHover={{
                                            scale: 1.02,
                                            x: 4,
                                            boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
                                        }}
                                        whileTap={{ scale: 0.98 }}
                                        onHoverStart={() => setActiveHover(item.href)}
                                        onHoverEnd={() => setActiveHover(null)}
                                        className={`relative flex items-center p-4 mx-1 rounded-2xl mb-1 transition-all duration-200 ${
                                            pathname === item.href 
                                                ? `${currentTheme.active} shadow-lg` 
                                                : `${currentTheme.hover} hover:shadow-md`
                                        } cursor-pointer overflow-hidden group backdrop-blur-sm`}
                                    >
                                        {pathname === item.href && (
                                            <motion.div
                                                layoutId="activeSidebarItem"
                                                className={`absolute inset-0 rounded-2xl ${currentTheme.accent} opacity-90`}
                                                transition={{
                                                    type: "spring",
                                                    stiffness: 300,
                                                    damping: 30,
                                                }}
                                            />
                                        )}
                                        <div className={`relative z-10 ${pathname === item.href ? "text-white" : "text-white/90"} group-hover:text-white transition-colors`}>
                                            {item.icon}
                                        </div>
                                        {sidebarOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.1 }}
                                                className="ml-4 relative z-10 font-medium flex-1 flex items-center justify-between"
                                            >
                                                <span>{item.text}</span>
                                                {item.badge !== undefined && item.badge > 0 && (
                                                    <motion.span
                                                        variants={badgeVariants}
                                                        initial="initial"
                                                        animate={["animate", "pulse"]}
                                                        className="px-2 py-1 bg-red-500 text-white text-xs rounded-full min-w-6 text-center"
                                                    >
                                                        {item.badge > 99 ? '99+' : item.badge}
                                                    </motion.span>
                                                )}
                                            </motion.div>
                                        )}
                                        {activeHover === item.href && !sidebarOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="absolute left-full ml-3 px-3 py-2 bg-white text-gray-800 text-sm rounded-lg shadow-xl whitespace-nowrap z-50 font-medium"
                                            >
                                                {item.text}
                                                {item.badge !== undefined && item.badge > 0 && (
                                                    <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </motion.div>
                                        )}
                                        {!sidebarOpen && item.badge !== undefined && item.badge > 0 && (
                                            <motion.div
                                                variants={badgeVariants}
                                                initial="initial"
                                                animate={["animate", "pulse"]}
                                                className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white z-20"
                                            />
                                        )}
                                    </motion.div>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                </nav>

                {/* Footer */}
                <div className={`p-6 ${currentTheme.border} ${sidebarOpen ? "border-t" : "border-t-0"}`}>
                    <motion.button
                        whileHover={{
                            scale: 1.02,
                            x: 4,
                            boxShadow: "0 5px 15px rgba(0,0,0,0.2)",
                        }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onLogout}
                        className={`flex items-center w-full p-4 rounded-2xl ${currentTheme.hover} transition-all duration-200 ${
                            sidebarOpen ? "justify-start" : "justify-center"
                        } font-medium backdrop-blur-sm group`}
                    >
                        <FiLogOut className="w-5 h-5 relative z-10 group-hover:rotate-12 transition-transform" />
                        {sidebarOpen && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="ml-4 relative z-10"
                            >
                                Logout
                            </motion.span>
                        )}
                    </motion.button>
                </div>
            </motion.div>

            {/* Mobile Sidebar */}
            <AnimatePresence>
                {(isOpen !== undefined ? isOpen : mobileSidebarOpen) && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black bg-opacity-60 z-40 backdrop-blur-sm"
                            onClick={() => setIsOpen ? setIsOpen(false) : setMobileSidebarOpen(false)}
                        ></motion.div>

                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className={`fixed inset-y-0 left-0 w-80 max-w-full ${currentTheme.bg} ${currentTheme.text} ${currentTheme.glow} z-50 shadow-2xl rounded-r-3xl overflow-hidden`}
                            style={{ fontFamily: "Inter, sans-serif" }}
                        >
                            {/* Mobile Header */}
                            <div className={`flex items-center justify-between p-6 border-b ${currentTheme.border} backdrop-blur-sm`}>
                                <div className="flex items-center space-x-4">
                                    <div className={`w-14 h-14 rounded-2xl ${currentTheme.accent} flex items-center justify-center text-white font-bold text-xl shadow-lg relative`}>
                                        {initials}
                                        {hasUnread && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                                        )}
                                        {isLoading && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-xl font-bold tracking-tight truncate">
                                            {userDisplayName}
                                        </h2>
                                        <p className="text-sm opacity-90 truncate">{userEmail}</p>
                                        <div className="flex items-center mt-1">
                                            <div className={`w-2 h-2 rounded-full ${currentTheme.active} mr-2`}></div>
                                            <span className="text-xs opacity-75">
                                                {isLoading ? "Checking..." : roleTitles[userRole]}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setIsOpen ? setIsOpen(false) : setMobileSidebarOpen(false)}
                                    className="p-2 rounded-xl hover:bg-white/10 transition-colors duration-200 focus:outline-none text-white"
                                    aria-label="Close sidebar"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </motion.button>
                            </div>

                            {/* Mobile Navigation */}
                            <nav className="flex-1 overflow-y-auto py-6 custom-scrollbar">
                                <div className="space-y-2 px-4">
                                    {navItems.map((item) => (
                                        <Link href={item.href} key={item.href} passHref>
                                            <motion.div
                                                whileHover={{ scale: 1.02, x: 4 }}
                                                whileTap={{ scale: 0.98 }}
                                                className={`flex items-center p-4 mx-1 rounded-2xl mb-1 transition-all duration-200 ${
                                                    pathname === item.href 
                                                        ? `${currentTheme.active} shadow-lg` 
                                                        : `${currentTheme.hover}`
                                                }`}
                                                onClick={() => setIsOpen ? setIsOpen(false) : setMobileSidebarOpen(false)}
                                            >
                                                {item.icon}
                                                <span className="ml-4 font-medium flex-1 flex items-center justify-between">
                                                    {item.text}
                                                    {item.badge !== undefined && item.badge > 0 && (
                                                        <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full min-w-6 text-center">
                                                            {item.badge > 99 ? '99+' : item.badge}
                                                        </span>
                                                    )}
                                                </span>
                                            </motion.div>
                                        </Link>
                                    ))}
                                </div>
                            </nav>

                            {/* Mobile Footer */}
                            <div className="p-6 border-t border-gray-700/50">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        onLogout();
                                        setIsOpen ? setIsOpen(false) : setMobileSidebarOpen(false);
                                    }}
                                    className={`flex items-center w-full p-4 rounded-2xl ${currentTheme.hover} transition-colors font-medium`}
                                >
                                    <FiLogOut className="w-5 h-5" />
                                    <span className="ml-4">Logout</span>
                                </motion.button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}