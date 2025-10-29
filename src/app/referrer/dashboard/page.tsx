// app/referrer/dashboard/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiMessageCircle,
  FiSearch,
  FiUser,
  FiLogOut,
  FiMoreVertical,
  FiMenu,
  FiX,
  FiCheckCircle,
  FiClock,
  FiPaperclip,
  FiSmile,
  FiSend,
  FiInfo,
  FiEdit3,
  FiTrash2,
  FiImage,
  FiFile,
  FiMic,
  FiArrowLeft,
  FiSettings,
  FiHome,
  FiBriefcase,
  FiUsers,
  FiAward,
  FiDollarSign
} from 'react-icons/fi';
import {
  Chat,
  Channel,
  Window,
  MessageList,
  MessageInput,
  Thread,
  useMessageContext,
} from 'stream-chat-react';
import 'stream-chat-react/dist/css/v2/index.css';
import { useStreamChat } from '@/hooks/useStreamChat';
import Sidebar from '@/app/components/Sidebar';

interface JobSeeker {
  _id: string;
  username: string;
  email: string;
  candidateDetails?: {
    fullName: string;
    phone?: string;
    skills?: string[];
    experience?: string;
    profilePicture?: string;
  };
  role: string;
  isOnline?: boolean;
  lastSeen?: string;
}

interface ChatChannel {
  id: string;
  seeker: JobSeeker;
  lastMessage?: string;
  timestamp?: string;
  unreadCount: number;
  isOnline?: boolean;
}

// Custom Message Component with attractive styling
const CustomMessage = (props: any) => {
  const { message, isMyMessage } = useMessageContext();
  
  return (
    <div className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
          isMyMessage
            ? 'bg-[#1e40a7] text-white rounded-br-none'
            : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        <div className={`flex justify-end mt-1 ${isMyMessage ? 'text-blue-100' : 'text-gray-500'}`}>
          <span className="text-xs">
            {new Date(message.created_at).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default function ReferrerDashboard() {
  const [currentChannel, setCurrentChannel] = useState<any>(null);
  const [jobSeekers, setJobSeekers] = useState<JobSeeker[]>([]);
  const [recentChats, setRecentChats] = useState<ChatChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeeker, setSelectedSeeker] = useState<JobSeeker | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [seekerInfoOpen, setSeekerInfoOpen] = useState(false);
  
  const { user, logout, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  
  const {
    chatClient,
    isConnected,
    connectionError,
    connectUser,
    startChannel,
    setConnectionError
  } = useStreamChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Fetch job seekers
  const fetchJobSeekers = async () => {
    try {
      const response = await fetch('/api/seekers');
      if (response.ok) {
        const data = await response.json();
        setJobSeekers(data.seekers || []);
      } else {
        throw new Error('Failed to fetch seekers');
      }
    } catch (error) {
      console.error('Failed to fetch job seekers:', error);
      setJobSeekers([]);
    } finally {
      setLoading(false);
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
        message_limit: 1,
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

        let seeker = jobSeekers.find(s => s._id === userId);
        
        if (!seeker) {
          seeker = {
            _id: userId,
            username: otherMember.user.username || userId,
            email: otherMember.user.email || '',
            candidateDetails: {
              fullName: otherMember.user.name || otherMember.user.username || 'Unknown User',
            },
            role: 'job_seeker',
            isOnline: otherMember.user.online,
            lastSeen: otherMember.user.last_active
          };
        }

        const lastMessage = channel.state.messages[channel.state.messages.length - 1];
        const lastMessageText = lastMessage?.text || 'No messages yet';

        updatedChats.push({
          id: channel.id,
          seeker,
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

  // Create or get chat channel with a job seeker
  const startChatWithSeeker = async (seeker: JobSeeker) => {
    try {
      setConnectionError('');
      setSelectedSeeker(seeker);
      
      if (window.innerWidth < 768) {
        setMobileView('chat');
      }
      
      if (!isConnected || !chatClient) {
        await connectUser(user._id, user);
      }

      const existingChat = recentChats.find(chat => chat.seeker._id === seeker._id);
      
      let channel;
      
      if (existingChat) {
        channel = chatClient.channel('messaging', existingChat.id);
        await channel.watch();
      } else {
        // Create new channel
        channel = chatClient.channel('messaging', {
          members: [user._id, seeker._id],
          name: `${user.referrerDetails?.fullName || user.username} & ${seeker.candidateDetails?.fullName || seeker.username}`,
        });
        
        await channel.create();
        await channel.watch();
        
        const newChat: ChatChannel = {
          id: channel.id,
          seeker,
          lastMessage: 'Start a conversation...',
          timestamp: new Date().toISOString(),
          unreadCount: 0,
          isOnline: seeker.isOnline
        };
        
        setRecentChats(prev => [newChat, ...prev]);
      }

      setCurrentChannel(channel);
      
    } catch (error: any) {
      console.error('Failed to create channel:', error);
      setConnectionError('Failed to start chat. Please try again.');
    }
  };

  // Format time for chat list
  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Format last seen
  const formatLastSeen = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `Last seen ${Math.floor(diff / 60000)} minutes ago`;
    if (diff < 86400000) return `Last seen ${Math.floor(diff / 3600000)} hours ago`;
    if (diff < 172800000) return 'Last seen yesterday';
    return `Last seen ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChannel]);

  // Redirect if not authenticated or not completed onboarding
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'job_referrer') {
      router.push('/');
      return;
    }
  }, [authLoading, user, router]);

  // Initialize Stream Chat and fetch seekers
  useEffect(() => {
    const initializeChat = async () => {
      if (!user) return;

      try {
        await connectUser(user._id, user);
        await fetchJobSeekers();
      } catch (error) {
        console.error('Failed to initialize chat:', error);
      }
    };

    if (user) {
      initializeChat();
    }
  }, [user]);

  // Update recent chats when chat client and job seekers are ready
  useEffect(() => {
    if (chatClient && user && jobSeekers.length > 0) {
      updateRecentChats();
      
      const interval = setInterval(updateRecentChats, 30000);
      return () => clearInterval(interval);
    }
  }, [chatClient, user, jobSeekers]);

  // Filter recent chats based on search - remove duplicates by user ID
  const filteredChats = recentChats.filter((chat, index, self) => {
    const isDuplicate = self.findIndex(c => c.seeker._id === chat.seeker._id) !== index;
    if (isDuplicate) return false;
    
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const fullName = chat.seeker.candidateDetails?.fullName?.toLowerCase() || '';
    const skills = chat.seeker.candidateDetails?.skills?.join(' ').toLowerCase() || '';
    
    return fullName.includes(searchLower) || 
           skills.includes(searchLower) ||
           chat.seeker.username.toLowerCase().includes(searchLower) ||
           chat.lastMessage?.toLowerCase().includes(searchLower);
  });

  // Total unread count for badge
  const totalUnread = filteredChats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-[#1e40a7] to-[#3b82f6] justify-center items-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center"
        >
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="rounded-full p-8 bg-white/20 backdrop-blur-lg"
          >
            <FiMessageCircle className="text-white h-16 w-16" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-2xl font-black text-white"
          >
            Loading Messages...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] font-inter overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        userRole="job_referrer"
        onLogout={handleLogout}
        userDisplayName={user?.referrerDetails?.fullName || user?.username}
        userEmail={user?.email}
        unreadCount={totalUnread}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-gradient-to-r from-[#1e40a7] to-[#3b82f6] z-40 p-4 text-white shadow-lg">
        <div className="flex items-center justify-between">
          {mobileView === 'chat' ? (
            <button 
              onClick={() => {
                setMobileView('list');
                setSelectedSeeker(null);
                setCurrentChannel(null);
              }}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <FiArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <FiMenu className="h-5 w-5" />
            </button>
          )}
          
          <h1 className="text-lg font-bold">
            {mobileView === 'chat' ? selectedSeeker?.candidateDetails?.fullName : 'Referrer Dashboard'}
          </h1>
          
          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <FiLogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row h-full pt-16 md:pt-0 md:ml-0">
        {/* Chats List Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`${
            mobileView === 'list' ? 'flex' : 'hidden'
          } md:flex flex-col w-full md:w-96 bg-white border-r border-gray-200 h-full shadow-lg`}
        >
          {/* Chats Header */}
          <div className="p-6 bg-gradient-to-r from-[#1e40a7] to-[#3b82f6] text-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">Messages</h1>
                <p className="text-white/80">
                  {totalUnread > 0 ? `${totalUnread} unread messages` : 'All caught up'}
                </p>
              </div>
              <button 
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <FiMoreVertical className="h-5 w-5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 focus:outline-none focus:border-white/40 text-white placeholder-white/60 transition-all duration-200"
              />
            </div>
          </div>
          
          {/* Chats List */}
          <div className="flex-1 overflow-y-auto bg-white">
            <div className="divide-y divide-gray-100">
              {filteredChats.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FiMessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium text-gray-900">No conversations yet</p>
                  <p className="text-sm mt-1 text-gray-600">Start chatting with job seekers</p>
                </div>
              ) : (
                filteredChats.map((chat, index) => (
                  <motion.button
                    key={`${chat.id}-${chat.seeker._id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => startChatWithSeeker(chat.seeker)}
                    className={`w-full text-left p-4 transition-all duration-200 hover:bg-gray-50 ${
                      selectedSeeker?._id === chat.seeker._id ? 'bg-blue-50 border-r-4 border-[#1e40a7]' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#1e40a7] to-[#3b82f6] rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-lg">
                          {chat.seeker.candidateDetails?.fullName?.charAt(0) || chat.seeker.username.charAt(0)}
                        </div>
                        {chat.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {chat.seeker.candidateDetails?.fullName || chat.seeker.username}
                          </h4>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatTime(chat.timestamp)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600 truncate flex-1 mr-2">
                            {chat.lastMessage}
                          </p>
                          {chat.unreadCount > 0 && (
                            <span className="bg-[#1e40a7] text-white text-xs px-2 py-1 rounded-full min-w-5 text-center shadow-sm">
                              {chat.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </div>
        </motion.div>

        {/* Chat Area */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`${
            mobileView === 'chat' ? 'flex' : 'hidden'
          } md:flex flex-1 flex-col bg-gradient-to-br from-gray-50 to-blue-50 h-full relative`}
        >
          <AnimatePresence mode="wait">
            {/* Active Chat View */}
            {currentChannel && isConnected && selectedSeeker ? (
              <motion.div
                key="active-chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col h-full"
              >
                {/* Chat Header */}
                <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between shadow-sm">
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={() => {
                        setSelectedSeeker(null);
                        setCurrentChannel(null);
                        if (window.innerWidth < 768) {
                          setMobileView('list');
                        }
                      }}
                      className="p-2 text-gray-600 hover:text-gray-800 md:hidden"
                    >
                      <FiArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="relative">
                      <div 
                        className="w-12 h-12 bg-gradient-to-br from-[#1e40a7] to-[#3b82f6] rounded-2xl flex items-center justify-center text-white font-bold cursor-pointer shadow-lg"
                        onClick={() => setSeekerInfoOpen(!seekerInfoOpen)}
                      >
                        {selectedSeeker.candidateDetails?.fullName?.charAt(0) || selectedSeeker.username.charAt(0)}
                      </div>
                      {selectedSeeker.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                      )}
                    </div>
                    <div 
                      className="cursor-pointer"
                      onClick={() => setSeekerInfoOpen(!seekerInfoOpen)}
                    >
                      <h3 className="font-bold text-gray-900 text-lg">
                        {selectedSeeker.candidateDetails?.fullName || selectedSeeker.username}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {selectedSeeker.isOnline ? 'Online' : formatLastSeen(selectedSeeker.lastSeen)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button 
                      className="p-3 text-gray-600 hover:text-[#1e40a7] hover:bg-gray-100 rounded-xl transition-colors"
                      onClick={() => setSeekerInfoOpen(!seekerInfoOpen)}
                    >
                      <FiInfo className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Chat Messages Area */}
                <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-blue-50 p-4">
                  {chatClient && (
                    <Chat client={chatClient} theme="messaging light">
                      <Channel channel={currentChannel} Message={CustomMessage}>
                        <Window>
                          <MessageList />
                          <MessageInput />
                        </Window>
                        <Thread />
                      </Channel>
                    </Chat>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Seeker Info Panel */}
                <AnimatePresence>
                  {seekerInfoOpen && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/50 z-10"
                        onClick={() => setSeekerInfoOpen(false)}
                      />
                      <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        className="absolute right-0 top-0 bottom-0 w-80 bg-white z-20 shadow-2xl"
                      >
                        <div className="p-6 bg-gradient-to-r from-[#1e40a7] to-[#3b82f6] text-white">
                          <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold">Candidate Info</h2>
                            <button onClick={() => setSeekerInfoOpen(false)}>
                              <FiX className="h-6 w-6" />
                            </button>
                          </div>
                          <div className="text-center">
                            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 border-2 border-white/30">
                              {selectedSeeker.candidateDetails?.fullName?.charAt(0) || selectedSeeker.username.charAt(0)}
                            </div>
                            <h3 className="font-bold text-xl mb-1">
                              {selectedSeeker.candidateDetails?.fullName || selectedSeeker.username}
                            </h3>
                            <p className="text-white/80 text-sm">{selectedSeeker.email}</p>
                          </div>
                        </div>
                        
                        <div className="p-6 space-y-6">
                          {selectedSeeker.candidateDetails?.phone && (
                            <div>
                              <p className="text-sm text-gray-600 mb-2 font-medium">Phone</p>
                              <p className="font-semibold text-gray-900">{selectedSeeker.candidateDetails.phone}</p>
                            </div>
                          )}
                          
                          {selectedSeeker.candidateDetails?.skills && selectedSeeker.candidateDetails.skills.length > 0 && (
                            <div>
                              <p className="text-sm text-gray-600 mb-3 font-medium">Skills</p>
                              <div className="flex flex-wrap gap-2">
                                {selectedSeeker.candidateDetails.skills.slice(0, 6).map((skill, idx) => (
                                  <span key={idx} className="text-xs bg-blue-50 text-[#1e40a7] px-3 py-2 rounded-lg font-medium">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {selectedSeeker.candidateDetails?.experience && (
                            <div>
                              <p className="text-sm text-gray-600 mb-2 font-medium">Experience</p>
                              <p className="font-semibold text-gray-900">{selectedSeeker.candidateDetails.experience}</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              /* Welcome State */
              <motion.div
                key="welcome-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full"
              >
                <div className="w-48 h-48 bg-gradient-to-br from-[#1e40a7] to-[#3b82f6] rounded-3xl flex items-center justify-center mb-8 shadow-2xl">
                  <FiMessageCircle className="h-20 w-20 text-white" />
                </div>
                <h3 className="text-4xl font-black bg-gradient-to-r from-[#1e40a7] to-[#3b82f6] bg-clip-text text-transparent mb-6">
                  Welcome to Your Dashboard
                </h3>
                <p className="text-gray-600 text-xl mb-8 max-w-2xl">
                  {filteredChats.length === 0 
                    ? 'Start your journey by connecting with talented job seekers' 
                    : 'Select a conversation to start messaging and help candidates find their dream jobs'
                  }
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mt-12">
                  {[
                    { icon: FiMessageCircle, text: 'Instant Chat', desc: 'Real-time messaging with candidates' },
                    { icon: FiUsers, text: 'Smart Matching', desc: 'Connect with relevant job seekers' },
                    { icon: FiAward, text: 'Track Referrals', desc: 'Monitor your referral success' }
                  ].map((item, index) => (
                    <motion.div
                      key={item.text}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="text-center p-8 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
                    >
                      <div className="w-20 h-20 bg-gradient-to-br from-[#1e40a7] to-[#3b82f6] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <item.icon className="h-10 w-10 text-white" />
                      </div>
                      <div className="font-bold text-gray-900 text-xl mb-3">{item.text}</div>
                      <div className="text-gray-600 leading-relaxed">{item.desc}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}