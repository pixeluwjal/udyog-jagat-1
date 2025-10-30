// app/seeker/find-referrer/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch,
  FiBriefcase,
  FiMapPin,
  FiAward,
  FiMessageCircle,
  FiUser,
  FiX,
  FiChevronLeft,
  FiUsers,
  FiMail,
  FiInbox,
  FiClock,
  FiSend,
  FiPaperclip,
  FiSmile,
  FiMoreVertical,
  FiHome,
  FiMenu
} from 'react-icons/fi';
import {
  Chat,
  Channel,
  MessageList,
  MessageInput,
  useMessageContext,
  MessageSimple,
  Avatar
} from 'stream-chat-react';
import 'stream-chat-react/dist/css/v2/index.css';
import Sidebar from '@/app/components/Sidebar';
import { useStreamChat } from '@/hooks/useStreamChat';

interface Referrer {
  _id: string;
  username: string;
  email: string;
  referralCode?: string;
  referrerDetails?: {
    fullName: string;
    mobileNumber: string;
    personalEmail: string;
    residentialAddress: string;
  };
  workDetails?: {
    companyName: string;
    workLocation: string;
    designation: string;
  };
  jobReferrerDetails?: {
    totalReferrals?: number;
    successfulReferrals?: number;
    commissionEarned?: number;
  };
  isOnline?: boolean;
}

interface ChatChannel {
  id: string;
  referrer: Referrer;
  lastMessage?: string;
  timestamp?: string;
  unreadCount: number;
  isOnline?: boolean;
}

type ViewMode = 'search' | 'results' | 'chat' | 'inbox';

// Custom Message Component with better styling
// Replace the CustomMessage component with this fixed version:

// Custom Message Component with better styling and error handling
const CustomMessage = (props: any) => {
  const { message, isMyMessage } = props;
  
  // Safe access to user properties with fallbacks
  const userName = message.user?.name || message.user?.username || message.user?.id || 'User';
  const userInitial = userName.charAt(0).toUpperCase();
  
  return (
    <div className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-[70%] ${isMyMessage ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
        {!isMyMessage && (
          <div className="w-8 h-8 bg-gradient-to-br from-[#2042AA] to-[#3B82F6] rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {userInitial}
          </div>
        )}
        <div className={`rounded-2xl px-4 py-2 ${
          isMyMessage 
            ? 'bg-gradient-to-r from-[#2042AA] to-[#3B82F6] text-white rounded-br-none' 
            : 'bg-gray-100 text-gray-800 rounded-bl-none'
        }`}>
          <p className="text-sm">{message.text}</p>
          <p className={`text-xs mt-1 ${isMyMessage ? 'text-blue-100' : 'text-gray-500'}`}>
            {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
          </p>
        </div>
      </div>
    </div>
  );
};

// Custom Message Input with better styling
const CustomMessageInput = () => {
  const [message, setMessage] = useState('');

  const sendMessage = () => {
    if (message.trim()) {
      // This would be handled by Stream Chat's MessageInput normally
      setMessage('');
    }
  };

  return (
    <div className="p-4 bg-white border-t border-gray-200">
      <div className="flex items-center space-x-3">
        <button className="p-2 text-gray-500 hover:text-[#2042AA] hover:bg-gray-100 rounded-xl transition-colors">
          <FiPaperclip className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="w-full px-4 py-3 bg-gray-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2042AA] resize-none text-sm lg:text-base"
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
        </div>
        <button className="p-2 text-gray-500 hover:text-[#2042AA] hover:bg-gray-100 rounded-xl transition-colors">
          <FiSmile className="h-5 w-5" />
        </button>
        <button
          onClick={sendMessage}
          className="p-3 bg-gradient-to-r from-[#2042AA] to-[#3B82F6] text-white rounded-xl hover:shadow-lg transition-all duration-300"
        >
          <FiSend className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default function FindReferrerPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [recentChats, setRecentChats] = useState<ChatChannel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [referrersLoading, setReferrersLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('search');
  const [selectedReferrer, setSelectedReferrer] = useState<Referrer | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const {
    chatClient,
    isConnected,
    connectionError,
    connectUser,
    disconnectUser,
    startChannel,
    setConnectionError
  } = useStreamChat();

  // Ensure user exists in Stream Chat
  const ensureStreamUser = async (userId: string, userData: any) => {
    try {
      const response = await fetch('/api/chat/ensure-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          name: userData.candidateDetails?.fullName || userData.username,
          role: userData.role
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to ensure Stream user');
      }

      return result;
    } catch (error) {
      console.error('Ensure Stream user error:', error);
      return { success: false };
    }
  };

  // Fetch referrers
  const fetchReferrers = async () => {
    try {
      setReferrersLoading(true);
      const response = await fetch('/api/referrers');
      if (response.ok) {
        const data = await response.json();
        
        // Ensure all referrers exist in Stream Chat
        if (data.referrers && data.referrers.length > 0) {
          for (const referrer of data.referrers) {
            try {
              await ensureStreamUser(referrer._id, referrer);
            } catch (error) {
              console.error(`Failed to ensure Stream user for referrer ${referrer._id}:`, error);
            }
          }
        }
        
        setReferrers(data.referrers || []);
      } else {
        throw new Error('Failed to fetch referrers');
      }
    } catch (error) {
      console.error('Failed to fetch referrers:', error);
      setReferrers([]);
    } finally {
      setReferrersLoading(false);
    }
  };

  // Get real channels and update recent chats
  const updateRecentChats = async () => {
    if (!chatClient || !user) return;

    try {
      const filter = { 
        type: 'messaging', 
        members: { $in: [user._id] } 
      };
      const sort = { last_message_at: -1 };
      
      const channels = await chatClient.queryChannels(filter, sort, {
        watch: true,
        state: true,
        messages: { limit: 1 },
      });

      const updatedChats: ChatChannel[] = [];
      const seenUserIds = new Set();

      for (const channel of channels) {
        const otherMembers = Object.values(channel.state.members).filter(
          (member: any) => member.user.id !== user._id
        );
        
        if (otherMembers.length === 0) continue;

        const otherMember = otherMembers[0];
        const userId = otherMember.user.id;
        
        if (seenUserIds.has(userId)) continue;
        seenUserIds.add(userId);

        let referrer = referrers.find(r => r._id === userId);
        
        if (!referrer) {
          referrer = {
            _id: userId,
            username: otherMember.user.username || userId,
            email: otherMember.user.email || '',
            referrerDetails: {
              fullName: otherMember.user.name || otherMember.user.username || 'Unknown Referrer',
            },
            isOnline: otherMember.user.online
          };
        }

        const lastMessage = channel.state.messages[channel.state.messages.length - 1];
        const lastMessageText = lastMessage?.text || 'Start a conversation...';

        updatedChats.push({
          id: channel.id,
          referrer,
          lastMessage: lastMessageText,
          timestamp: channel.state.last_message_at?.toISOString(),
          unreadCount: channel.countUnread(),
          isOnline: otherMember.user.online
        });
      }

      setRecentChats(updatedChats);
    } catch (error) {
      console.error('Error updating recent chats:', error);
    }
  };

  // Start chat with a referrer
  const startChatWithReferrer = async (referrer: Referrer) => {
    try {
      setConnectionError('');
      setSelectedReferrer(referrer);
      
      if (!isConnected) {
        await connectUser(user._id, user);
      }

      const existingChat = recentChats.find(chat => chat.referrer._id === referrer._id);
      
      let channel;
      
      if (existingChat) {
        channel = await startChannel(existingChat.id);
      } else {
        const response = await fetch('/api/chat/create-channel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId1: user._id,
            userId2: referrer._id,
            userName1: user.candidateDetails?.fullName || user.username,
            userName2: referrer.referrerDetails?.fullName || referrer.username,
          }),
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to create channel');
        }

        channel = await startChannel(result.channelId);
        
        const newChat: ChatChannel = {
          id: result.channelId,
          referrer,
          lastMessage: 'Start a conversation...',
          timestamp: new Date().toISOString(),
          unreadCount: 0,
          isOnline: referrer.isOnline
        };
        
        setRecentChats(prev => [newChat, ...prev]);
      }

      setCurrentChannel(channel);
      setViewMode('chat');
      setMobileMenuOpen(false);
      
    } catch (error: any) {
      console.error('Failed to create channel with referrer:', error);
      setConnectionError('Failed to start chat. Please try again.');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setViewMode('results');
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    if (viewMode === 'results') {
      setViewMode('search');
    }
  };

  const goBackToResults = () => {
    setViewMode('results');
    setSelectedReferrer(null);
    setCurrentChannel(null);
  };

  const goBackToSearch = () => {
    setViewMode('search');
    setSearchTerm('');
    setSelectedReferrer(null);
    setCurrentChannel(null);
  };

  const goToInbox = () => {
    setViewMode('inbox');
    setSelectedReferrer(null);
    setCurrentChannel(null);
  };

  // Format time for chat list
  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Filter referrers based on search
  const filteredReferrers = referrers.filter(referrer => {
    if (!searchTerm.trim() && viewMode === 'results') return true;
    if (!searchTerm.trim()) return false;
    
    const searchLower = searchTerm.toLowerCase();
    const fullName = referrer.referrerDetails?.fullName?.toLowerCase() || '';
    const company = referrer.workDetails?.companyName?.toLowerCase() || '';
    const location = referrer.workDetails?.workLocation?.toLowerCase() || '';
    const designation = referrer.workDetails?.designation?.toLowerCase() || '';
    const username = referrer.username.toLowerCase();
    
    return fullName.includes(searchLower) || 
           company.includes(searchLower) || 
           designation.includes(searchLower) ||
           username.includes(searchLower) ||
           location.includes(searchLower);
  });

  // Filter recent chats based on search
  const filteredChats = recentChats.filter((chat, index, self) => {
    const isDuplicate = self.findIndex(c => c.referrer._id === chat.referrer._id) !== index;
    if (isDuplicate) return false;
    
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const fullName = chat.referrer.referrerDetails?.fullName?.toLowerCase() || '';
    
    return fullName.includes(searchLower) || 
           chat.referrer.username.toLowerCase().includes(searchLower) ||
           chat.lastMessage?.toLowerCase().includes(searchLower);
  });

  // Total unread count for inbox badge
  const totalUnread = recentChats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  // Redirect if not authenticated or not a job seeker
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'job_seeker') {
      router.push('/');
      return;
    }
  }, [authLoading, user, router]);

  // Initialize Stream Chat and fetch referrers
  useEffect(() => {
    const initializeChat = async () => {
      if (!user) return;

      try {
        await connectUser(user._id, user);
        await ensureStreamUser(user._id, user);
        await fetchReferrers();
      } catch (error) {
        console.error('Failed to initialize chat:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      initializeChat();
    }
  }, [user]);

  // Update recent chats when chat client and referrers are ready
  useEffect(() => {
    if (chatClient && user && referrers.length > 0) {
      updateRecentChats();
      
      const interval = setInterval(updateRecentChats, 30000);
      
      return () => clearInterval(interval);
    }
  }, [chatClient, user, referrers]);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 justify-center items-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center"
        >
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 180, 360],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="rounded-full p-8 bg-gradient-to-br from-[#2042AA] to-[#3B82F6] shadow-2xl"
          >
            <FiUsers className="text-white h-16 w-16" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-2xl font-black bg-gradient-to-r from-[#2042AA] to-[#3B82F6] bg-clip-text text-transparent"
          >
            Finding Referrers...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 font-inter overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-1/2 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Sidebar */}
      <Sidebar
        userRole="job_seeker"
        onLogout={logout}
        userDisplayName={user?.candidateDetails?.fullName || user?.username}
        userEmail={user?.email}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-gradient-to-r from-[#2042AA] to-[#3B82F6] text-white"
          >
            <FiMenu className="h-5 w-5" />
          </button>
          
          <h1 className="text-lg font-black bg-gradient-to-r from-[#2042AA] to-[#3B82F6] bg-clip-text text-transparent">
            Find Referrers
          </h1>

          <button
            onClick={goToInbox}
            className="relative p-2 text-[#2042AA]"
          >
            <FiInbox className="h-5 w-5" />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {totalUnread}
              </span>
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white border-t border-gray-200"
            >
              <div className="p-4 space-y-2">
                <button
                  onClick={() => {
                    setViewMode('search');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 p-3 rounded-xl bg-blue-50 text-[#2042AA] font-semibold"
                >
                  <FiSearch className="h-5 w-5" />
                  <span>Find Referrers</span>
                </button>
                
                <button
                  onClick={() => {
                    goToInbox();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 text-gray-700"
                >
                  <FiInbox className="h-5 w-5" />
                  <span>Inbox {totalUnread > 0 && `(${totalUnread})`}</span>
                </button>
                
                <button
                  onClick={() => {
                    setViewMode('search');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 text-gray-700"
                >
                  <FiHome className="h-5 w-5" />
                  <span>Home</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative lg:ml-0 pt-16 lg:pt-0">
        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* SEARCH VIEW */}
            {viewMode === 'search' && (
              <motion.div
                key="search"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="h-full flex flex-col items-center justify-center p-4 lg:p-6"
              >
                {/* Header */}
                <div className="text-center mb-8 lg:mb-12">
                  <h1 className="text-3xl lg:text-5xl font-black bg-gradient-to-r from-[#2042AA] to-[#3B82F6] bg-clip-text text-transparent mb-4">
                    Find Your Referrer
                  </h1>
                  <p className="text-base lg:text-lg text-gray-600 max-w-2xl mx-auto px-4">
                    Connect with experienced professionals who can refer you to top companies. 
                    Search by name, company, position, or location.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8 w-full max-w-md">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setViewMode('search')}
                    className="bg-[#2042AA] text-white px-6 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Find New Referrers
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={goToInbox}
                    className="bg-white text-[#2042AA] border-2 border-[#2042AA] px-6 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <FiInbox className="h-5 w-5" />
                    <span>Inbox</span>
                    {totalUnread > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {totalUnread}
                      </span>
                    )}
                  </motion.button>
                </div>

                {/* Big Search Bar */}
                <div className="w-full max-w-4xl mx-auto px-4">
                  <form onSubmit={handleSearch} className="relative">
                    <motion.div
                      animate={{
                        scale: searchFocused ? 1.02 : 1,
                      }}
                      transition={{ duration: 0.2 }}
                      className="relative"
                    >
                      <FiSearch className="absolute left-4 lg:left-6 top-1/2 transform -translate-y-1/2 h-5 lg:h-6 w-5 lg:w-6 text-[#2042AA] z-10" />
                      <input
                        type="text"
                        placeholder="Search referrers by name, company, position, or username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        className="w-full pl-12 lg:pl-16 pr-24 lg:pr-32 py-4 lg:py-6 bg-white/90 backdrop-blur-lg rounded-2xl border-2 border-[#2042AA]/20 focus:outline-none focus:border-[#2042AA] focus:ring-4 focus:ring-[#2042AA]/20 text-base lg:text-lg text-gray-800 placeholder-gray-500 transition-all duration-300 shadow-2xl"
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={clearSearch}
                          className="absolute right-20 lg:right-28 top-1/2 transform -translate-y-1/2 p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <FiX className="h-4 w-4 lg:h-5 lg:w-5 text-gray-500" />
                        </button>
                      )}
                    </motion.div>

                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-[#2042AA] to-[#3B82F6] text-white px-4 lg:px-8 py-3 lg:py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 text-sm lg:text-base"
                    >
                      Search
                    </motion.button>
                  </form>

                  {/* Search Tips */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-6 lg:mt-8 text-center"
                  >
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 max-w-2xl mx-auto">
                      {[
                        { icon: FiUser, text: 'Name' },
                        { icon: FiBriefcase, text: 'Company' },
                        { icon: FiAward, text: 'Position' },
                        { icon: FiMapPin, text: 'Location' }
                      ].map((item, index) => (
                        <motion.div
                          key={item.text}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                          className="flex items-center justify-center space-x-2 p-3 bg-white/50 rounded-lg backdrop-blur-sm"
                        >
                          <item.icon className="h-4 w-4 text-[#2042AA]" />
                          <span className="text-sm text-gray-600">{item.text}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* RESULTS VIEW */}
            {viewMode === 'results' && (
              <motion.div
                key="results"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="h-full flex flex-col p-4 lg:p-6"
              >
                {/* Back Button and Header */}
                <div className="flex items-center justify-between mb-6 lg:mb-8">
                  <button
                    onClick={goBackToSearch}
                    className="flex items-center space-x-2 px-3 lg:px-4 py-2 text-[#2042AA] hover:bg-[#2042AA]/10 rounded-xl transition-colors"
                  >
                    <FiChevronLeft className="h-4 w-4 lg:h-5 lg:w-5" />
                    <span className="text-sm lg:text-base">Back</span>
                  </button>
                  
                  <div className="text-center flex-1 max-w-2xl">
                    <h2 className="text-xl lg:text-2xl font-black bg-gradient-to-r from-[#2042AA] to-[#3B82F6] bg-clip-text text-transparent">
                      Search Results
                    </h2>
                    <p className="text-gray-600 text-sm lg:text-base">
                      Found {filteredReferrers.length} referrers {searchTerm && `matching "${searchTerm}"`}
                    </p>
                  </div>

                  <button
                    onClick={goToInbox}
                    className="flex items-center space-x-2 px-3 lg:px-4 py-2 text-[#2042AA] hover:bg-[#2042AA]/10 rounded-xl transition-colors"
                  >
                    <FiInbox className="h-4 w-4 lg:h-5 lg:w-5" />
                    <span className="text-sm lg:text-base">Inbox {totalUnread > 0 && `(${totalUnread})`}</span>
                  </button>
                </div>

                {/* Referrers Grid */}
                <div className="flex-1 overflow-auto">
                  {referrersLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2042AA]"></div>
                    </div>
                  ) : filteredReferrers.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <FiUser className="h-12 w-12 lg:h-16 lg:w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-base lg:text-lg">No referrers found</p>
                      <p className="text-sm mt-2">Try different search terms</p>
                      <button
                        onClick={goBackToSearch}
                        className="mt-4 px-6 py-2 bg-[#2042AA] text-white rounded-lg hover:bg-[#1a3688] transition-colors"
                      >
                        Back to Search
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 pb-6">
                      {filteredReferrers.map((referrer, index) => (
                        <motion.div
                          key={referrer._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#2042AA]/20 p-4 lg:p-6 hover:shadow-xl transition-all duration-300"
                        >
                          <div className="flex items-start space-x-3 lg:space-x-4 mb-4">
                            <div className="relative">
                              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-[#2042AA] to-[#3B82F6] rounded-2xl flex items-center justify-center text-white font-bold text-lg lg:text-xl shadow-md flex-shrink-0">
                                {referrer.referrerDetails?.fullName?.charAt(0) || referrer.username.charAt(0)}
                              </div>
                              {referrer.isOnline && (
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-[#2042AA] text-base lg:text-lg truncate">
                                {referrer.referrerDetails?.fullName || referrer.username}
                              </h3>
                              {referrer.workDetails?.designation && (
                                <p className="text-gray-600 font-medium text-sm lg:text-base truncate">
                                  {referrer.workDetails.designation}
                                </p>
                              )}
                              {referrer.workDetails?.companyName && (
                                <p className="text-gray-500 text-xs lg:text-sm truncate">
                                  {referrer.workDetails.companyName}
                                </p>
                              )}
                            </div>
                          </div>

                          {referrer.workDetails?.workLocation && (
                            <div className="flex items-center space-x-2 text-gray-500 mb-4">
                              <FiMapPin className="h-3 w-3 lg:h-4 lg:w-4" />
                              <span className="text-xs lg:text-sm">{referrer.workDetails.workLocation}</span>
                            </div>
                          )}

                          {referrer.jobReferrerDetails && (
                            <div className="flex items-center justify-between text-xs lg:text-sm text-gray-600 mb-4">
                              <span>Referrals: {referrer.jobReferrerDetails.successfulReferrals || 0}/{referrer.jobReferrerDetails.totalReferrals || 0}</span>
                              <span>Success: {Math.round(((referrer.jobReferrerDetails.successfulReferrals || 0) / (referrer.jobReferrerDetails.totalReferrals || 1)) * 100)}%</span>
                            </div>
                          )}

                          <button
                            onClick={() => startChatWithReferrer(referrer)}
                            className="w-full bg-gradient-to-r from-[#2042AA] to-[#3B82F6] text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2"
                          >
                            <FiMessageCircle className="h-4 w-4" />
                            <span>Start Chat</span>
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* INBOX VIEW */}
            {viewMode === 'inbox' && (
              <motion.div
                key="inbox"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="h-full flex flex-col p-4 lg:p-6"
              >
                {/* Back Button and Header */}
                <div className="flex items-center justify-between mb-6 lg:mb-8">
                  <button
                    onClick={goBackToSearch}
                    className="flex items-center space-x-2 px-3 lg:px-4 py-2 text-[#2042AA] hover:bg-[#2042AA]/10 rounded-xl transition-colors"
                  >
                    <FiChevronLeft className="h-4 w-4 lg:h-5 lg:w-5" />
                    <span className="text-sm lg:text-base">Back</span>
                  </button>
                  
                  <div className="text-center flex-1 max-w-2xl">
                    <h2 className="text-xl lg:text-2xl font-black bg-gradient-to-r from-[#2042AA] to-[#3B82F6] bg-clip-text text-transparent">
                      Your Inbox
                    </h2>
                    <p className="text-gray-600 text-sm lg:text-base">
                      {filteredChats.length} conversation{filteredChats.length !== 1 ? 's' : ''} • {totalUnread} unread
                    </p>
                  </div>

                  <div className="w-20 lg:w-32"></div>
                </div>

                {/* Recent Chats List */}
                <div className="flex-1 overflow-auto">
                  {filteredChats.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <FiInbox className="h-12 w-12 lg:h-16 lg:w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-base lg:text-lg">No conversations yet</p>
                      <p className="text-sm mt-2">Start chatting with referrers to see them here</p>
                      <button
                        onClick={goBackToSearch}
                        className="mt-4 px-6 py-2 bg-[#2042AA] text-white rounded-lg hover:bg-[#1a3688] transition-colors"
                      >
                        Find Referrers
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 lg:space-y-4 max-w-4xl mx-auto">
                      {filteredChats.map((chat, index) => (
                        <motion.button
                          key={`${chat.id}-${chat.referrer._id}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => startChatWithReferrer(chat.referrer)}
                          className="w-full text-left bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#2042AA]/20 p-4 lg:p-6 hover:shadow-xl transition-all duration-300"
                        >
                          <div className="flex items-start space-x-3 lg:space-x-4">
                            <div className="relative">
                              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-[#2042AA] to-[#3B82F6] rounded-2xl flex items-center justify-center text-white font-bold text-lg lg:text-xl shadow-md">
                                {chat.referrer.referrerDetails?.fullName?.charAt(0) || chat.referrer.username.charAt(0)}
                              </div>
                              {chat.isOnline && (
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-[#2042AA] text-base lg:text-lg truncate">
                                  {chat.referrer.referrerDetails?.fullName || chat.referrer.username}
                                </h3>
                                <div className="flex items-center space-x-2">
                                  {chat.timestamp && (
                                    <span className="text-xs lg:text-sm text-gray-500 flex items-center space-x-1">
                                      <FiClock className="h-3 w-3" />
                                      <span>{formatTime(chat.timestamp)}</span>
                                    </span>
                                  )}
                                  {chat.unreadCount > 0 && (
                                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                      {chat.unreadCount}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <p className="text-gray-600 mb-2 line-clamp-2 text-sm lg:text-base">
                                {chat.lastMessage}
                              </p>
                              
                              {chat.referrer.workDetails && (
                                <div className="flex items-center space-x-2 lg:space-x-4 text-xs lg:text-sm text-gray-500">
                                  {chat.referrer.workDetails.designation && (
                                    <span className="flex items-center space-x-1">
                                      <FiBriefcase className="h-3 w-3" />
                                      <span className="truncate">{chat.referrer.workDetails.designation}</span>
                                    </span>
                                  )}
                                  {chat.referrer.workDetails.companyName && (
                                    <span className="truncate">at {chat.referrer.workDetails.companyName}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* CHAT VIEW - FULL WIDTH & CUSTOM STYLING */}
         {/* CHAT VIEW - SIMPLE & WORKING */}
{viewMode === 'chat' && selectedReferrer && (
  <motion.div
    key="chat"
    initial={{ opacity: 0, x: 50 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -50 }}
    className="h-full flex flex-col bg-white w-full"
  >
    {/* Chat Header */}
    <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-[#2042AA] to-[#3B82F6] text-white shadow-lg w-full">
      <div className="flex items-center space-x-3 lg:space-x-4">
        <button
          onClick={recentChats.length > 0 ? goToInbox : goBackToResults}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
        >
          <FiChevronLeft className="h-5 w-5 lg:h-6 lg:w-6" />
        </button>
        
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/20 rounded-xl flex items-center justify-center text-white font-bold text-base lg:text-lg border-2 border-white/30">
              {selectedReferrer.referrerDetails?.fullName?.charAt(0) || selectedReferrer.username.charAt(0)}
            </div>
            {selectedReferrer.isOnline && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-[#2042AA]"></div>
            )}
          </div>
          <div>
            <h4 className="font-bold text-base lg:text-lg">
              {selectedReferrer.referrerDetails?.fullName || selectedReferrer.username}
            </h4>
            <p className="text-white/80 text-xs lg:text-sm">
              {selectedReferrer.workDetails?.designation} • {selectedReferrer.workDetails?.companyName}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
          <FiMoreVertical className="h-4 w-4 lg:h-5 lg:w-5" />
        </button>
      </div>
    </div>

    {/* Chat Container - Full Width */}
    <div className="flex-1 overflow-hidden bg-gradient-to-br from-blue-50/50 to-indigo-50/50 w-full">
      {connectionError ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-8 w-full">
          <div className="w-16 h-16 lg:w-20 lg:h-20 bg-red-100 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <FiMessageCircle className="h-8 w-8 lg:h-10 lg:w-10 text-red-500" />
          </div>
          <h3 className="text-lg lg:text-xl font-bold text-red-600 mb-2 text-center">Connection Error</h3>
          <p className="text-red-500 text-center mb-6 text-sm lg:text-base">{connectionError}</p>
          <button
            onClick={() => setConnectionError('')}
            className="px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors shadow-lg text-sm lg:text-base"
          >
            Try Again
          </button>
        </div>
      ) : currentChannel && isConnected ? (
        <div className="h-full flex flex-col w-full">
          <Chat client={chatClient} theme="messaging light">
            <Channel channel={currentChannel}>
              <div className="h-full flex flex-col w-full">
                {/* Message List - Full Width */}
                <div className="flex-1 overflow-auto w-full">
                  <MessageList 
                    hideDeletedMessages
                    messageActions={['edit', 'delete', 'react', 'reply']}
                  />
                </div>
                
                {/* Message Input - Full Width */}
                <div className="w-full p-4 border-t border-gray-200 bg-white/80 backdrop-blur-lg">
                  <MessageInput 
                    focus
                    additionalTextareaProps={{
                      placeholder: "Type your message...",
                      rows: 1,
                      className: "w-full px-4 py-3 bg-gray-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2042AA] resize-none text-sm lg:text-base"
                    }}
                  />
                </div>
              </div>
            </Channel>
          </Chat>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-8 text-center w-full">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-[#2042AA] to-[#3B82F6] rounded-2xl flex items-center justify-center mb-4 shadow-lg"
          >
            <FiMessageCircle className="h-8 w-8 lg:h-10 lg:w-10 text-white" />
          </motion.div>
          <h3 className="text-lg lg:text-xl font-bold text-gray-600 mb-2">Connecting...</h3>
          <p className="text-gray-500 text-sm lg:text-base">
            Setting up your chat with {selectedReferrer.referrerDetails?.fullName || selectedReferrer.username}
          </p>
        </div>
      )}
    </div>
  </motion.div>
)}
          </AnimatePresence>
        </main>
      </div>

      <style jsx global>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        /* Custom scrollbar */
        .overflow-auto::-webkit-scrollbar {
          width: 6px;
        }
        .overflow-auto::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .overflow-auto::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
        .overflow-auto::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }

        /* Stream Chat Overrides for Full Width */
        .str-chat {
          width: 100% !important;
          max-width: 100% !important;
        }

        .str-chat__container {
          width: 100% !important;
          max-width: 100% !important;
        }

        .str-chat__channel {
          width: 100% !important;
        }

        .str-chat__main-panel {
          width: 100% !important;
          padding: 0 !important;
        }

        .str-chat__message-list {
          width: 100% !important;
          padding: 1rem !important;
        }

        .str-chat__list {
          width: 100% !important;
        }

        .str-chat__ul {
          width: 100% !important;
        }

        .str-chat__message {
          max-width: 100% !important;
        }

        .str-chat__message-textarea {
          width: 100% !important;
        }

        .str-chat__input-footer {
          width: 100% !important;
        }
      `}</style>
    </div>
  );
}