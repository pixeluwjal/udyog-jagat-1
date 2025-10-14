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
  FiClock
} from 'react-icons/fi';
import {
  Chat,
  Channel,
  Window,
  ChannelHeader,
  MessageList,
  MessageInput,
  Thread,
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
              console.log(`✅ Ensured Stream user for referrer: ${referrer.referrerDetails?.fullName || referrer.username}`);
            } catch (error) {
              console.error(`❌ Failed to ensure Stream user for referrer ${referrer._id}:`, error);
            }
          }
        }
        
        setReferrers(data.referrers || []);
      } else {
        throw new Error('Failed to fetch referrers');
      }
    } catch (error) {
      console.error('Failed to fetch referrers:', error);
      // Fallback mock data for demo
      setReferrers([
        {
          _id: 'referrer-1',
          username: 'johnreferrer',
          email: 'john@company.com',
          referralCode: 'REF123456',
          referrerDetails: {
            fullName: 'John Smith',
            mobileNumber: '+1234567890',
            personalEmail: 'john.personal@email.com',
            residentialAddress: 'Mumbai, India'
          },
          workDetails: {
            companyName: 'Tech Solutions Inc',
            workLocation: 'Mumbai',
            designation: 'Senior HR Manager'
          },
          jobReferrerDetails: {
            totalReferrals: 15,
            successfulReferrals: 12,
            commissionEarned: 50000
          },
          isOnline: true
        },
        {
          _id: 'referrer-2',
          username: 'priyareferrer',
          email: 'priya@techcorp.com',
          referralCode: 'REF789012',
          referrerDetails: {
            fullName: 'Priya Patel',
            mobileNumber: '+1234567891',
            personalEmail: 'priya.personal@email.com',
            residentialAddress: 'Bangalore, India'
          },
          workDetails: {
            companyName: 'TechCorp',
            workLocation: 'Bangalore',
            designation: 'Talent Acquisition Lead'
          },
          jobReferrerDetails: {
            totalReferrals: 8,
            successfulReferrals: 6,
            commissionEarned: 30000
          },
          isOnline: false
        },
        {
          _id: 'referrer-3',
          username: 'rahulreferrer',
          email: 'rahul@innovate.com',
          referralCode: 'REF345678',
          referrerDetails: {
            fullName: 'Rahul Sharma',
            mobileNumber: '+1234567892',
            personalEmail: 'rahul.personal@email.com',
            residentialAddress: 'Delhi, India'
          },
          workDetails: {
            companyName: 'Innovate Tech',
            workLocation: 'Delhi',
            designation: 'Tech Lead'
          },
          jobReferrerDetails: {
            totalReferrals: 20,
            successfulReferrals: 18,
            commissionEarned: 75000
          },
          isOnline: true
        }
      ]);
    } finally {
      setReferrersLoading(false);
    }
  };

  // Get real channels and update recent chats
  const updateRecentChats = async () => {
    if (!chatClient || !user) return;

    try {
      // Get all channels where user is a member
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
        // Get the other member (not the current user)
        const otherMembers = Object.values(channel.state.members).filter(
          (member: any) => member.user.id !== user._id
        );
        
        if (otherMembers.length === 0) continue;

        const otherMember = otherMembers[0];
        const userId = otherMember.user.id;
        
        // Skip if we've already processed this user
        if (seenUserIds.has(userId)) continue;
        
        seenUserIds.add(userId);

        // Find referrer in our referrers list
        let referrer = referrers.find(r => r._id === userId);
        
        if (!referrer) {
          // Create referrer object from channel data if not found in API
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

        // Get last message for preview
        const lastMessage = channel.state.messages[channel.state.messages.length - 1];
        const lastMessageText = lastMessage?.text || 'No messages yet';

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
      
      console.log('🟡 Starting chat with referrer:', referrer._id);
      
      // Ensure we're connected first
      if (!isConnected) {
        await connectUser(user._id, user);
      }

      // First, check if we already have a channel with this user
      const existingChat = recentChats.find(chat => chat.referrer._id === referrer._id);
      
      let channel;
      
      if (existingChat) {
        // Use existing channel
        console.log('🟡 Using existing channel:', existingChat.id);
        channel = await startChannel(existingChat.id);
      } else {
        // Create new channel using the API
        console.log('🟡 Creating new channel with referrer:', referrer._id);
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

        // Start the new channel
        channel = await startChannel(result.channelId);
        
        // Add to recent chats immediately
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
    // Remove duplicates by user ID
    const isDuplicate = self.findIndex(c => c.referrer._id === chat.referrer._id) !== index;
    if (isDuplicate) return false;
    
    // Apply search filter
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
        console.log('🟡 Initializing Stream Chat for user:', user._id);
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
      
      // Set up interval to update chats periodically
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative lg:ml-0">
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
                className="h-full flex flex-col items-center justify-center p-6"
              >
                {/* Header */}
                <div className="text-center mb-12">
                  <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#2042AA] to-[#3B82F6] bg-clip-text text-transparent mb-4">
                    Find Your Referrer
                  </h1>
                  <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    Connect with experienced professionals who can refer you to top companies. 
                    Search by name, company, position, or username.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 mb-8">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setViewMode('search')}
                    className="bg-[#2042AA] text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Find New Referrers
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={goToInbox}
                    className="bg-white text-[#2042AA] border-2 border-[#2042AA] px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                  >
                    <FiInbox className="h-5 w-5" />
                    Inbox {totalUnread > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {totalUnread}
                      </span>
                    )}
                  </motion.button>
                </div>

                {/* Big Search Bar */}
                <div className="w-full max-w-4xl mx-auto">
                  <form onSubmit={handleSearch} className="relative">
                    <motion.div
                      animate={{
                        scale: searchFocused ? 1.02 : 1,
                      }}
                      transition={{ duration: 0.2 }}
                      className="relative"
                    >
                      <FiSearch className="absolute left-6 top-1/2 transform -translate-y-1/2 h-6 w-6 text-[#2042AA] z-10" />
                      <input
                        type="text"
                        placeholder="Search referrers by name, company, position, or username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        className="w-full pl-16 pr-6 py-6 bg-white/90 backdrop-blur-lg rounded-2xl border-2 border-[#2042AA]/20 focus:outline-none focus:border-[#2042AA] focus:ring-4 focus:ring-[#2042AA]/20 text-lg text-gray-800 placeholder-gray-500 transition-all duration-300 shadow-2xl"
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={clearSearch}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <FiX className="h-5 w-5 text-gray-500" />
                        </button>
                      )}
                    </motion.div>

                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-[#2042AA] to-[#3B82F6] text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      Search
                    </motion.button>
                  </form>

                  {/* Search Tips */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8 text-center"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
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
                className="h-full flex flex-col p-6"
              >
                {/* Back Button and Header */}
                <div className="flex items-center justify-between mb-8">
                  <button
                    onClick={goBackToSearch}
                    className="flex items-center space-x-2 px-4 py-2 text-[#2042AA] hover:bg-[#2042AA]/10 rounded-xl transition-colors"
                  >
                    <FiChevronLeft className="h-5 w-5" />
                    <span>Back to Search</span>
                  </button>
                  
                  <div className="text-center flex-1 max-w-2xl">
                    <h2 className="text-2xl font-black bg-gradient-to-r from-[#2042AA] to-[#3B82F6] bg-clip-text text-transparent">
                      Search Results
                    </h2>
                    <p className="text-gray-600">
                      Found {filteredReferrers.length} referrers {searchTerm && `matching "${searchTerm}"`}
                    </p>
                  </div>

                  <button
                    onClick={goToInbox}
                    className="flex items-center space-x-2 px-4 py-2 text-[#2042AA] hover:bg-[#2042AA]/10 rounded-xl transition-colors"
                  >
                    <FiInbox className="h-5 w-5" />
                    <span>Inbox {totalUnread > 0 && `(${totalUnread})`}</span>
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
                      <FiUser className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No referrers found</p>
                      <p className="text-sm mt-2">Try different search terms</p>
                      <button
                        onClick={goBackToSearch}
                        className="mt-4 px-6 py-2 bg-[#2042AA] text-white rounded-lg hover:bg-[#1a3688] transition-colors"
                      >
                        Back to Search
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
                      {filteredReferrers.map((referrer, index) => (
                        <motion.div
                          key={referrer._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#2042AA]/20 p-6 hover:shadow-xl transition-all duration-300"
                        >
                          <div className="flex items-start space-x-4 mb-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-[#2042AA] to-[#3B82F6] rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-md flex-shrink-0">
                              {referrer.referrerDetails?.fullName?.charAt(0) || referrer.username.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-[#2042AA] text-lg truncate">
                                {referrer.referrerDetails?.fullName || referrer.username}
                              </h3>
                              {referrer.workDetails?.designation && (
                                <p className="text-gray-600 font-medium truncate">
                                  {referrer.workDetails.designation}
                                </p>
                              )}
                              {referrer.workDetails?.companyName && (
                                <p className="text-gray-500 text-sm truncate">
                                  {referrer.workDetails.companyName}
                                </p>
                              )}
                            </div>
                          </div>

                          {referrer.workDetails?.workLocation && (
                            <div className="flex items-center space-x-2 text-gray-500 mb-4">
                              <FiMapPin className="h-4 w-4" />
                              <span className="text-sm">{referrer.workDetails.workLocation}</span>
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
                className="h-full flex flex-col p-6"
              >
                {/* Back Button and Header */}
                <div className="flex items-center justify-between mb-8">
                  <button
                    onClick={goBackToSearch}
                    className="flex items-center space-x-2 px-4 py-2 text-[#2042AA] hover:bg-[#2042AA]/10 rounded-xl transition-colors"
                  >
                    <FiChevronLeft className="h-5 w-5" />
                    <span>Back to Search</span>
                  </button>
                  
                  <div className="text-center flex-1 max-w-2xl">
                    <h2 className="text-2xl font-black bg-gradient-to-r from-[#2042AA] to-[#3B82F6] bg-clip-text text-transparent">
                      Your Inbox
                    </h2>
                    <p className="text-gray-600">
                      {filteredChats.length} conversation{filteredChats.length !== 1 ? 's' : ''} • {totalUnread} unread message{totalUnread !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="w-32"></div>
                </div>

                {/* Recent Chats List */}
                <div className="flex-1 overflow-auto">
                  {filteredChats.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <FiInbox className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No conversations yet</p>
                      <p className="text-sm mt-2">Start chatting with referrers to see them here</p>
                      <button
                        onClick={goBackToSearch}
                        className="mt-4 px-6 py-2 bg-[#2042AA] text-white rounded-lg hover:bg-[#1a3688] transition-colors"
                      >
                        Find Referrers
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 max-w-4xl mx-auto">
                      {filteredChats.map((chat, index) => (
                        <motion.button
                          key={`${chat.id}-${chat.referrer._id}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => startChatWithReferrer(chat.referrer)}
                          className="w-full text-left bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#2042AA]/20 p-6 hover:shadow-xl transition-all duration-300"
                        >
                          <div className="flex items-start space-x-4">
                            <div className="relative">
                              <div className="w-16 h-16 bg-gradient-to-br from-[#2042AA] to-[#3B82F6] rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-md">
                                {chat.referrer.referrerDetails?.fullName?.charAt(0) || chat.referrer.username.charAt(0)}
                              </div>
                              {chat.isOnline && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-[#2042AA] text-lg">
                                  {chat.referrer.referrerDetails?.fullName || chat.referrer.username}
                                </h3>
                                <div className="flex items-center space-x-2">
                                  {chat.timestamp && (
                                    <span className="text-sm text-gray-500 flex items-center space-x-1">
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
                              
                              <p className="text-gray-600 mb-2 line-clamp-2">
                                {chat.lastMessage}
                              </p>
                              
                              {chat.referrer.workDetails && (
                                <div className="flex items-center space-x-4 text-sm text-gray-500">
                                  {chat.referrer.workDetails.designation && (
                                    <span className="flex items-center space-x-1">
                                      <FiBriefcase className="h-3 w-3" />
                                      <span>{chat.referrer.workDetails.designation}</span>
                                    </span>
                                  )}
                                  {chat.referrer.workDetails.companyName && (
                                    <span>at {chat.referrer.workDetails.companyName}</span>
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

            {/* CHAT VIEW */}
            {viewMode === 'chat' && selectedReferrer && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="h-full flex flex-col"
              >
                {/* Chat Header with Back Button */}
                <div className="flex items-center justify-between p-4 border-b border-[#2042AA]/10 bg-white/80 backdrop-blur-lg">
                  <button
                    onClick={viewMode === 'chat' && recentChats.length > 0 ? goToInbox : goBackToResults}
                    className="flex items-center space-x-2 px-4 py-2 text-[#2042AA] hover:bg-[#2042AA]/10 rounded-xl transition-colors"
                  >
                    <FiChevronLeft className="h-5 w-5" />
                    <span>{recentChats.length > 0 ? 'Back to Inbox' : 'Back to Results'}</span>
                  </button>

                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#2042AA] to-[#3B82F6] rounded-lg flex items-center justify-center text-white font-bold">
                      {selectedReferrer.referrerDetails?.fullName?.charAt(0) || selectedReferrer.username.charAt(0)}
                    </div>
                    <div className="text-center">
                      <h4 className="font-bold text-[#2042AA]">
                        {selectedReferrer.referrerDetails?.fullName || selectedReferrer.username}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {selectedReferrer.workDetails?.designation} at {selectedReferrer.workDetails?.companyName}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={goToInbox}
                    className="flex items-center space-x-2 px-4 py-2 text-[#2042AA] hover:bg-[#2042AA]/10 rounded-xl transition-colors"
                  >
                    <FiInbox className="h-5 w-5" />
                    <span>Inbox {totalUnread > 0 && `(${totalUnread})`}</span>
                  </button>
                </div>

                {/* Chat Container */}
                <div className="flex-1 overflow-hidden">
                  {connectionError ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8">
                      <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                        <FiMessageCircle className="h-10 w-10 text-red-500" />
                      </div>
                      <h3 className="text-xl font-bold text-red-600 mb-2">Connection Error</h3>
                      <p className="text-red-500 text-center mb-6">{connectionError}</p>
                      <button
                        onClick={() => setConnectionError('')}
                        className="px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors shadow-lg"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : currentChannel && isConnected ? (
                    <div className="h-full flex flex-col">
                      <Chat client={chatClient} theme="messaging light">
                        <Channel channel={currentChannel}>
                          <Window>
                            <ChannelHeader />
                            <MessageList />
                            <MessageInput />
                          </Window>
                          <Thread />
                        </Channel>
                      </Chat>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                      <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                        <FiMessageCircle className="h-10 w-10 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-600 mb-2">Connecting...</h3>
                      <p className="text-gray-500">Setting up your chat connection</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <style jsx>{`
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
      `}</style>
    </div>
  );
}