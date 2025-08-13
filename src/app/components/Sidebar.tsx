// app/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiHome, FiPlusSquare, FiBriefcase, FiUsers, FiUser, FiFileText, FiLink, FiLogOut, FiSave } from 'react-icons/fi'; // CORRECTED: Added FiSave to the import list

interface NavItem {
    href: string;
    icon: JSX.Element;
    text: string;
}

interface SidebarProps {
    userRole: "job_poster" | "job_seeker" | "admin" | "job_referrer";
    onLogout: () => void;
    userDisplayName: string;
    userEmail: string;
}

export default function Sidebar({
    userRole,
    onLogout,
    userDisplayName,
    userEmail,
}: SidebarProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [activeHover, setActiveHover] = useState<string | null>(null);
    const pathname = usePathname();

    const getUserInitials = (name: string): string => {
        if (!name) return "U";
        const parts = name.split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.charAt(0).toUpperCase();
    };

    const initials = getUserInitials(userDisplayName);

    const roleColors = {
        job_poster: {
            bg: "bg-gradient-to-b from-blue-800 to-blue-950",
            hover: "hover:bg-blue-700",
            active: "bg-blue-600",
            text: "text-blue-100",
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

    const roleTitles = {
        job_poster: "Job Poster",
        job_seeker: "Job Seeker",
        admin: "Administrator",
        job_referrer: "Job Referrer",
    };

    const currentTheme = roleColors[userRole];

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
                { href: "/admin/generate-referral", icon: <FiLink className="h-5 w-5" />, text: "Generate Referral" },
                { href: "/admin/my-created-users", icon: <FiUsers className="h-5 w-5" />, text: "My Created Users" },
            ]
            : []),
        ...(userRole === "job_referrer"
            ? [
                { href: "/referrer/dashboard", icon: <FiHome className="h-5 w-5" />, text: "Referral Dashboard" },
                { href: "/referrer/generate", icon: <FiLink className="h-6 w-6" />, text: "Generate Referral Link" },
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

    const navItemVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0 },
    };

    return (
        <>
            <div className="md:hidden fixed top-4 left-4 z-50">
                <motion.button
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9, rotate: -5 }}
                    onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                    className={`p-3 rounded-full ${currentTheme.mobileButton} shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none flex items-center justify-center`}
                    aria-label="Toggle sidebar"
                >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </motion.button>
            </div>

            <motion.div
                initial={{ width: 256 }}
                animate={{ width: sidebarOpen ? 256 : 80 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`hidden md:flex flex-shrink-0 ${currentTheme.bg} ${currentTheme.text} transition-all duration-300 ease-in-out flex-col h-full shadow-2xl relative border-r ${currentTheme.border}`}
                style={{ fontFamily: "Inter, sans-serif" }}
            >
                <div className={`flex items-center justify-between p-4 ${currentTheme.border} ${sidebarOpen ? "border-b" : "border-b-0"}`}>
                    {sidebarOpen ? (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex items-center space-x-3"
                        >
                            <div className={`w-10 h-10 rounded-full ${currentTheme.active} flex items-center justify-center text-white font-bold text-lg shadow-inner`}>
                                {initials}
                            </div>
                            <div>
                                <h1 className="text-xl font-extrabold tracking-wide">
                                    {roleTitles[userRole]}
                                </h1>
                                <p className="text-sm opacity-80 truncate w-40">{userEmail}</p>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="mx-auto">
                            <div className={`w-12 h-12 rounded-full ${currentTheme.active} flex items-center justify-center text-white font-bold text-xl shadow-inner`}>
                                {initials}
                            </div>
                        </div>
                    )}
                    <motion.button
                        whileHover={{ scale: 1.1, rotate: sidebarOpen ? 0 : 180 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className={`p-2 rounded-full ${currentTheme.hover} transition-colors duration-200 focus:outline-none text-white`}
                        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
                        </svg>
                    </motion.button>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
                    <motion.div
                        className="space-y-1 px-2"
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
                                        className={`relative flex items-center p-3 mx-2 rounded-lg mb-1 transition-all duration-200 ${pathname === item.href ? currentTheme.active : currentTheme.hover} cursor-pointer overflow-hidden`}
                                    >
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
                                        <div className={`relative z-10 ${pathname === item.href ? "text-white" : "text-white/80"}`}>
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

                <div className={`p-4 ${currentTheme.border} ${sidebarOpen ? "border-t" : "border-t-0"}`}>
                    <motion.button
                        whileHover={{
                            scale: 1.03,
                            boxShadow: "0 5px 10px rgba(0,0,0,0.2)",
                        }}
                        whileTap={{ scale: 0.97 }}
                        onClick={onLogout}
                        className={`flex items-center w-full p-2 rounded-lg ${currentTheme.hover} transition-colors ${sidebarOpen ? "justify-start" : "justify-center"} font-medium`}
                    >
                        <FiLogOut className="w-5 h-5 relative z-10" />
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

            <AnimatePresence>
                {mobileSidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black bg-opacity-60 z-40 backdrop-blur-sm"
                            onClick={() => setMobileSidebarOpen(false)}
                        ></motion.div>

                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className={`fixed inset-y-0 left-0 w-72 max-w-full ${currentTheme.bg} ${currentTheme.text} z-50 shadow-2xl rounded-r-xl`}
                            style={{ fontFamily: "Inter, sans-serif" }}
                        >
                            <div className={`flex items-center justify-between p-6 border-b ${currentTheme.border}`}>
                                <div className="flex items-center space-x-3">
                                    <div className={`w-12 h-12 rounded-full ${currentTheme.active} flex items-center justify-center text-white font-bold text-xl shadow-inner`}>
                                        {initials}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-extrabold tracking-wide">
                                            {roleTitles[userRole]}
                                        </h2>
                                        <p className="text-sm opacity-80 truncate w-40">
                                            {userEmail}
                                        </p>
                                    </div>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setMobileSidebarOpen(false)}
                                    className="p-2 rounded-full hover:bg-white/10 transition-colors duration-200 focus:outline-none text-white"
                                    aria-label="Close sidebar"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </motion.button>
                            </div>
                            <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
                                <div className="space-y-1 px-2">
                                    {navItems.map((item) => (
                                        <Link href={item.href} key={item.href} passHref>
                                            <motion.div
                                                whileHover={{ scale: 1.03 }}
                                                whileTap={{ scale: 0.98 }}
                                                className={`flex items-center p-3 mx-2 rounded-lg mb-1 transition-colors duration-200 ${pathname === item.href ? currentTheme.active : currentTheme.hover}`}
                                                onClick={() => setMobileSidebarOpen(false)}
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
                            <div className="p-4 border-t border-gray-700">
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => {
                                        onLogout();
                                        setMobileSidebarOpen(false);
                                    }}
                                    className={`flex items-center w-full p-2 rounded-lg ${currentTheme.hover} transition-colors font-medium`}
                                >
                                    <FiLogOut className="w-5 h-5" />
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