'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Sidebar from '@/app/components/Sidebar';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiMenu,
    FiArrowLeft,
    FiLoader,
    FiXCircle,
    FiUser,
    FiMessageSquare,
    FiChevronRight,
    FiMail
} from 'react-icons/fi';
import ChatModal from '../../seeker/find-referrer/ChatModal';

interface ChatPartner {
    _id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
}

interface ChatPreview {
    id: string;
    chatPartner: ChatPartner;
    lastMessage?: string;
    lastMessageTimestamp?: Date;
}

const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const pulseEffect = {
    scale: [1, 1.05, 1],
    opacity: [1, 0.7, 1],
    transition: { duration: 0.8, repeat: Infinity, ease: "easeInOut" },
};

export default function ReferrerMessagesPage() {
    const { user: currentUser, loading: authLoading, isAuthenticated, logout, token } = useAuth();
    const router = useRouter();

    const [chats, setChats] = useState<ChatPreview[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [selectedChatPartner, setSelectedChatPartner] = useState<ChatPartner | null>(null);

    const fetchChats = useCallback(async () => {
        if (!token || !currentUser?._id) {
            setError('Authentication token or user ID not available.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // New API route to fetch chats for the current user
            const response = await fetch(`/api/chats?userId=${currentUser._id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch conversations.');
            }
            
            setChats(data.chats);
        } catch (err: any) {
            console.error('Error fetching chats:', err);
            setError(err.message || 'An unexpected error occurred while loading conversations.');
            setChats([]);
        } finally {
            setLoading(false);
        }
    }, [token, currentUser]);

    const handleOpenChat = (chatPartner: ChatPartner) => {
        setSelectedChatPartner(chatPartner);
        setIsChatOpen(true);
    };

    const handleCloseChat = () => {
        setIsChatOpen(false);
        setSelectedChatPartner(null);
    };

    useEffect(() => {
        if (authLoading) return;

        if (!isAuthenticated || !currentUser) {
            router.push('/login');
            return;
        }

        if (currentUser.role !== 'job_referrer') {
            if (currentUser.role === 'admin') router.push('/admin/dashboard');
            else if (currentUser.role === 'job_poster') router.push('/poster/dashboard');
            else if (currentUser.role === 'job_seeker') router.push('/seeker/dashboard');
            else router.push('/');
        }
        
        // Fetch chats only if the user is a referrer and authenticated
        if (currentUser.role === 'job_referrer' && currentUser._id && token) {
            fetchChats();
        }

    }, [authLoading, isAuthenticated, currentUser, router, token, fetchChats]);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    if (
        authLoading ||
        !isAuthenticated ||
        !currentUser ||
        currentUser.firstLogin ||
        currentUser.role !== 'job_referrer'
    ) {
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
                        Loading messages...
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
                <div className="md:hidden bg-white/95 backdrop-blur-md shadow-lg p-4 flex justify-between items-center z-10 sticky top-0">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <FiMenu className="h-6 w-6" />
                    </motion.button>
                    <h1 className="text-2xl font-extrabold bg-gradient-to-r from-[#4F39F6] to-[#1A3BAD] bg-clip-text text-transparent absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        Messages
                    </h1>
                    <div className="w-6 h-6"></div>
                </div>

                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-7xl mx-auto space-y-10">
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={fadeIn}
                            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                        >
                            <div>
                                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">
                                    Your Conversations
                                </h1>
                                <p className="text-gray-600 text-lg mt-2">
                                    Talk to candidates who have used your referral codes.
                                </p>
                            </div>
                            <Link href="/referrer/dashboard" passHref>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex items-center gap-2 px-5 py-3 bg-white border border-indigo-200 text-indigo-700 rounded-lg shadow-sm hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-200 font-medium"
                                >
                                    <FiArrowLeft className="h-5 w-5" />
                                    Back to Dashboard
                                </motion.button>
                            </Link>
                        </motion.div>

                        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-8">
                            {loading ? (
                                <div className="flex justify-center items-center py-8">
                                    <FiLoader className="animate-spin text-blue-500 h-8 w-8" />
                                    <p className="ml-3 text-gray-600 text-lg">Loading conversations...</p>
                                </div>
                            ) : error ? (
                                <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-lg shadow-sm flex items-center">
                                    <FiXCircle className="h-5 w-5 text-red-500 mr-2" />
                                    <span>Error loading conversations: {error}</span>
                                </div>
                            ) : chats.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 text-lg">
                                    You have no active conversations.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {chats.map((chat) => (
                                        <motion.button
                                            key={chat.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleOpenChat(chat.chatPartner)}
                                            className="w-full text-left p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between transition-all duration-200"
                                        >
                                            <div className="flex items-center space-x-4">
                                                <div className="flex-shrink-0 h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium text-lg">
                                                    {chat.chatPartner.firstName?.charAt(0).toUpperCase() || chat.chatPartner.username?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                                                        {chat.chatPartner.firstName} {chat.chatPartner.lastName}
                                                    </h3>
                                                    <p className="text-sm text-gray-500 truncate">
                                                        {chat.lastMessage || 'Start a new conversation'}
                                                    </p>
                                                </div>
                                            </div>
                                            <FiChevronRight className="h-6 w-6 text-gray-400" />
                                        </motion.button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
            
            <ChatModal 
                isOpen={isChatOpen} 
                onClose={handleCloseChat} 
                referrer={selectedChatPartner} 
                currentUserId={currentUser._id} 
                currentUsername={currentUser.username || 'Referrer'}
            />
        </div>
    );
}
