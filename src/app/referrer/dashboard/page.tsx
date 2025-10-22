// app/referrer/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
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
  FiClock
} from 'react-icons/fi';
import {
  Chat,
  Channel,
  Window,
  MessageList,
  MessageInput,
  Thread,
} from 'stream-chat-react';
import 'stream-chat-react/dist/css/v2/index.css';
import { useStreamChat } from '@/hooks/useStreamChat';

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
}

interface ChatChannel {
  id: string;
  seeker: JobSeeker;
  lastMessage?: string;
  timestamp?: string;
  unreadCount: number;
  isOnline?: boolean;
}

export default function ReferrerDashboard() {
  const [currentChannel, setCurrentChannel] = useState<any>(null);
  const [jobSeekers, setJobSeekers] = useState<JobSeeker[]>([]);
  const [recentChats, setRecentChats] = useState<ChatChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeeker, setSelectedSeeker] = useState<JobSeeker | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const {
    chatClient,
    isConnected,
    connectionError,
    connectUser,
    startChannel,
    setConnectionError
  } = useStreamChat();

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

  // Get real channels and update recent chats with previous messages
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
        messages: { limit: 1 }, // Get last message for preview
      });

      const updatedChats: ChatChannel[] = [];
      const seenUserIds = new Set(); // Track seen user IDs to prevent duplicates

      for (const channel of channels) {
        // Get the other member (not the current user)
        const otherMembers = Object.values(channel.state.members).filter(
          (member: any) => member.user.id !== user._id
        );
        
        if (otherMembers.length === 0) continue;

        const otherMember = otherMembers[0];
        const userId = otherMember.user.id;
        
        // Skip if we've already processed this user
        if (seenUserIds.has(userId)) {
          console.log('🟡 Skipping duplicate user:', userId);
          continue;
        }
        
        seenUserIds.add(userId);

        // Find seeker in our job seekers list
        let seeker = jobSeekers.find(s => s._id === userId);
        
        if (!seeker) {
          // If seeker not found in API, create basic seeker object from channel data
          seeker = {
            _id: userId,
            username: otherMember.user.username || userId,
            email: otherMember.user.email || '',
            candidateDetails: {
              fullName: otherMember.user.name || otherMember.user.username || 'Unknown User',
            },
            role: 'job_seeker',
            isOnline: otherMember.user.online
          };
        }

        // Get last message for preview
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
      console.log('🟢 Updated recent chats:', updatedChats.length, 'chats');
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
      
      console.log('🟡 Starting chat with seeker:', seeker._id);
      
      // Ensure we're connected first
      if (!isConnected) {
        await connectUser(user._id, user);
      }

      // First, check if we already have a channel with this user in recentChats
      const existingChat = recentChats.find(chat => chat.seeker._id === seeker._id);
      
      let channel;
      
      if (existingChat) {
        // Use existing channel
        console.log('🟡 Using existing channel:', existingChat.id);
        channel = await startChannel(existingChat.id);
      } else {
        // Create new channel using the API
        console.log('🟡 Creating new channel with seeker:', seeker._id);
        const response = await fetch('/api/chat/create-channel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId1: user._id,
            userId2: seeker._id,
            userName1: user.referrerDetails?.fullName || user.username,
            userName2: seeker.candidateDetails?.fullName || seeker.username,
          }),
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to create channel');
        }

        // Start the new channel
        channel = await startChannel(result.channelId);
        
        // Add the new chat to recentChats immediately
        const newChat: ChatChannel = {
          id: result.channelId,
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
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

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
        console.log('🟡 Initializing Stream Chat for user:', user._id);
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
      
      // Set up interval to update chats periodically
      const interval = setInterval(updateRecentChats, 30000); // Update every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [chatClient, user, jobSeekers]);

  // Filter recent chats based on search - remove duplicates by user ID
  const filteredChats = recentChats.filter((chat, index, self) => {
    // Remove duplicates by user ID
    const isDuplicate = self.findIndex(c => c.seeker._id === chat.seeker._id) !== index;
    if (isDuplicate) return false;
    
    // Apply search filter
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
      <div className="flex h-screen bg-[#1D3FA4] justify-center items-center">
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
    <div className="flex h-screen bg-white font-inter overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#1D3FA4] z-50 p-4 text-white">
        <div className="flex items-center justify-between">
          {mobileView === 'chat' ? (
            <button 
              onClick={() => {
                setMobileView('list');
                setSelectedSeeker(null);
                setCurrentChannel(null);
              }}
              className="p-2"
            >
              <FiX className="h-6 w-6" />
            </button>
          ) : (
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2"
            >
              <FiMenu className="h-6 w-6" />
            </button>
          )}
          
          <h1 className="text-lg font-semibold">
            {mobileView === 'chat' ? selectedSeeker?.candidateDetails?.fullName : 'Messages'}
          </h1>
          
          <button 
            onClick={handleLogout}
            className="p-2"
          >
            <FiLogOut className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Sidebar for mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-white z-50 md:hidden"
            >
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Profile</h2>
                  <button onClick={() => setSidebarOpen(false)}>
                    <FiX className="h-6 w-6" />
                  </button>
                </div>
                <div className="mt-4 flex items-center space-x-3">
                  <div className="w-12 h-12 bg-[#1D3FA4] rounded-full flex items-center justify-center text-white font-bold">
                    {user?.referrerDetails?.fullName?.charAt(0) || user?.username?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold">{user?.referrerDetails?.fullName || user?.username}</p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Chat Interface - Full Screen */}
      <div className="flex-1 flex w-full h-full">
        {/* Left Sidebar - Recent Chats List */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`${
            mobileView === 'list' ? 'flex' : 'hidden'
          } md:flex flex-col w-full md:w-96 bg-white border-r border-gray-200 h-full`}
        >
          {/* Header */}
          <div className="p-4 bg-[#1D3FA4] text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <FiMessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold">Messages</h1>
                  <p className="text-white/80 text-sm">
                    {totalUnread > 0 ? `${totalUnread} unread messages` : 'All caught up'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handleLogout}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Logout"
                >
                  <FiLogOut className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:border-white/40 text-white placeholder-white/70 transition-all duration-200"
              />
            </div>
          </div>
          
          {/* Recent Chats List - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-2">
              {filteredChats.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiMessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No conversations yet</p>
                  <p className="text-sm mt-1">Start chatting with job seekers</p>
                </div>
              ) : (
                filteredChats.map((chat, index) => (
                  <motion.button
                    key={`${chat.id}-${chat.seeker._id}`} // Unique key with both channel and user ID
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => startChatWithSeeker(chat.seeker)}
                    className={`w-full text-left p-4 rounded-lg transition-all duration-200 border ${
                      selectedSeeker?._id === chat.seeker._id
                        ? 'bg-blue-50 border-blue-200 shadow-sm'
                        : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {chat.seeker.candidateDetails?.fullName?.charAt(0) || chat.seeker.username.charAt(0)}
                        </div>
                        {chat.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {chat.seeker.candidateDetails?.fullName || chat.seeker.username}
                          </h4>
                          <span className="text-xs text-gray-500 flex items-center space-x-1">
                            <FiClock className="h-3 w-3" />
                            <span>{formatTime(chat.timestamp)}</span>
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600 truncate flex-1 mr-2">
                            {chat.lastMessage}
                          </p>
                          {chat.unreadCount > 0 && (
                            <span className="bg-[#1D3FA4] text-white text-xs px-2 py-1 rounded-full min-w-5 text-center">
                              {chat.unreadCount}
                            </span>
                          )}
                        </div>
                        
                        {chat.seeker.candidateDetails?.skills && chat.seeker.candidateDetails.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {chat.seeker.candidateDetails.skills.slice(0, 2).map((skill, idx) => (
                              <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </div>
        </motion.div>

        {/* Right Side - Chat Area - Full Screen */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`${
            mobileView === 'chat' ? 'flex' : 'hidden'
          } md:flex flex-1 flex-col bg-gray-50 h-full`}
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
                <div className="p-4 bg-[#1D3FA4] text-white">
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => {
                        setSelectedSeeker(null);
                        setCurrentChannel(null);
                        if (window.innerWidth < 768) {
                          setMobileView('list');
                        }
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg md:hidden"
                    >
                      <FiX className="h-5 w-5" />
                    </button>
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold">
                      {selectedSeeker.candidateDetails?.fullName?.charAt(0) || selectedSeeker.username.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">
                        {selectedSeeker.candidateDetails?.fullName || selectedSeeker.username}
                      </h3>
                      <p className="text-white/80 text-sm flex items-center space-x-1">
                        {selectedSeeker.isOnline ? (
                          <>
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span>Online</span>
                          </>
                        ) : (
                          <span>Offline</span>
                        )}
                      </p>
                    </div>
                    <button className="p-2 hover:bg-white/10 rounded-lg">
                      <FiMoreVertical className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Stream Chat - Properly Scrollable with Previous Messages */}
                <div className="flex-1 flex flex-col min-h-0">
                  <Chat client={chatClient} theme="messaging light">
                    <Channel channel={currentChannel}>
                      <Window hideOnThread>
                        <MessageList />
                        <MessageInput />
                      </Window>
                      <Thread />
                    </Channel>
                  </Chat>
                </div>
              </motion.div>
            ) : (
              /* Empty State */
              <motion.div
                key="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white h-full"
              >
                <div className="w-24 h-24 bg-[#1D3FA4] rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
                  <FiMessageCircle className="h-12 w-12 text-white" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-4">
                  Welcome to Referrer Chat
                </h3>
                <p className="text-gray-600 text-lg mb-2 max-w-md">
                  {filteredChats.length === 0 
                    ? 'Start your first conversation with a job seeker' 
                    : 'Select a conversation to view messages'
                  }
                </p>
                <p className="text-gray-500 text-sm max-w-sm mb-8">
                  All your previous conversations and messages are preserved here.
                </p>
                
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl">
                  {[
                    { icon: FiUser, text: 'Previous Chats', desc: 'Access all conversations' },
                    { icon: FiMessageCircle, text: 'Message History', desc: 'See all past messages' },
                    { icon: FiCheckCircle, text: 'Continue', desc: 'Pick up where you left' }
                  ].map((item, index) => (
                    <motion.div
                      key={item.text}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="text-center p-4"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-[#1D3FA4] to-[#3B82F6] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                        <item.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="font-semibold text-gray-900">{item.text}</div>
                      <div className="text-xs text-gray-600">{item.desc}</div>
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