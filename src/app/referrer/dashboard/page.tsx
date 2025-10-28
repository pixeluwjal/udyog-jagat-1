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
  FiVideo,
  FiPhone,
  FiInfo,
  FiEdit3,
  FiTrash2,
  FiImage,
  FiFile,
  FiMic,
  FiArrowLeft,
  FiSettings
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

// Custom Message Component for WhatsApp-like styling
const CustomMessage = (props: any) => {
  const { message, isMyMessage } = useMessageContext();
  
  return (
    <div className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl shadow-sm ${
          isMyMessage
            ? 'bg-[#005c4b] text-white rounded-tr-none'
            : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        <div className={`flex justify-end mt-1 ${isMyMessage ? 'text-[#99b8b1]' : 'text-gray-500'}`}>
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
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  
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

  // Get real channels and update recent chats with previous messages
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

  // Profile Edit Form State
  const [profileForm, setProfileForm] = useState({
    fullName: user?.referrerDetails?.fullName || '',
    mobileNumber: user?.referrerDetails?.mobileNumber || '',
    personalEmail: user?.referrerDetails?.personalEmail || '',
    residentialAddress: user?.referrerDetails?.residentialAddress || '',
    companyName: user?.workDetails?.companyName || '',
    workLocation: user?.workDetails?.workLocation || '',
    designation: user?.workDetails?.designation || '',
  });

  // Update profile form when user data changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        fullName: user.referrerDetails?.fullName || '',
        mobileNumber: user.referrerDetails?.mobileNumber || '',
        personalEmail: user.referrerDetails?.personalEmail || '',
        residentialAddress: user.referrerDetails?.residentialAddress || '',
        companyName: user.workDetails?.companyName || '',
        workLocation: user.workDetails?.workLocation || '',
        designation: user.workDetails?.designation || '',
      });
    }
  }, [user]);

  // Handle profile update
// In your referrer dashboard component, update the handleProfileUpdate function:

// Handle profile update
const handleProfileUpdate = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    console.log('🔄 Updating profile...');
    
    // Get token from localStorage or your auth context
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found. Please log in again.');
    }

    const response = await fetch('/api/referrer/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(profileForm),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update profile');
    }

    console.log('✅ Profile updated successfully:', data);
    
    // Refresh user data
    await refreshUser();
    setEditProfileOpen(false);
    
    // Show success message
    alert('Profile updated successfully!');
    
  } catch (error: any) {
    console.error('❌ Error updating profile:', error);
    alert(error.message || 'Failed to update profile');
  }
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
      <div className="flex h-screen bg-[#00a884] justify-center items-center">
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
    <div className="flex h-screen bg-[#f0f2f5] font-inter overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#00a884] z-50 p-3 text-white">
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
              <FiArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2"
            >
              <FiMenu className="h-5 w-5" />
            </button>
          )}
          
          <h1 className="text-lg font-semibold">
            {mobileView === 'chat' ? selectedSeeker?.candidateDetails?.fullName : 'Chats'}
          </h1>
          
          <button 
            onClick={handleLogout}
            className="p-2"
          >
            <FiLogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Profile Sidebar for mobile */}
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
              <div className="p-6 bg-[#00a884] text-white">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Profile</h2>
                  <button onClick={() => setSidebarOpen(false)}>
                    <FiX className="h-6 w-6" />
                  </button>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {user?.referrerDetails?.fullName?.charAt(0) || user?.username?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{user?.referrerDetails?.fullName || user?.username}</p>
                    <p className="text-white/80 text-sm">{user?.email}</p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <button 
                  onClick={() => setEditProfileOpen(true)}
                  className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-3"
                >
                  <FiEdit3 className="h-5 w-5 text-gray-600" />
                  <span>Edit Profile</span>
                </button>
                <button className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-3">
                  <FiSettings className="h-5 w-5 text-gray-600" />
                  <span>Settings</span>
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-full text-left p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center space-x-3"
                >
                  <FiLogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {editProfileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setEditProfileOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl w-full max-w-md p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Edit Profile</h3>
                  <button onClick={() => setEditProfileOpen(false)}>
                    <FiX className="h-6 w-6 text-gray-500" />
                  </button>
                </div>
                
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a884] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      value={profileForm.mobileNumber}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, mobileNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a884] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Personal Email</label>
                    <input
                      type="email"
                      value={profileForm.personalEmail}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, personalEmail: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a884] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <input
                      type="text"
                      value={profileForm.companyName}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, companyName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a884] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                    <input
                      type="text"
                      value={profileForm.designation}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, designation: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a884] focus:border-transparent"
                    />
                  </div>
                  
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setEditProfileOpen(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-[#00a884] text-white rounded-lg hover:bg-[#008c6d] transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Chat Interface */}
      <div className="flex-1 flex w-full h-full pt-12 md:pt-0">
        {/* Left Sidebar - Recent Chats List */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`${
            mobileView === 'list' ? 'flex' : 'hidden'
          } md:flex flex-col w-full md:w-96 bg-white border-r border-gray-300 h-full`}
        >
          {/* Header */}
          <div className="p-4 bg-[#f0f2f5] border-b border-gray-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <div 
                      className="w-10 h-10 bg-[#00a884] rounded-full flex items-center justify-center text-white font-bold cursor-pointer"
                      onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    >
                      {user?.referrerDetails?.fullName?.charAt(0) || user?.username?.charAt(0)}
                    </div>
                  </div>
                  {profileMenuOpen && (
                    <div className="absolute top-14 left-0 w-48 bg-white rounded-lg shadow-2xl border border-gray-200 z-10">
                      <div className="p-3 border-b border-gray-200">
                        <p className="font-semibold">{user?.referrerDetails?.fullName || user?.username}</p>
                        <p className="text-sm text-gray-600">{user?.email}</p>
                      </div>
                      <button 
                        onClick={() => setEditProfileOpen(true)}
                        className="w-full text-left p-3 hover:bg-gray-50 transition-colors flex items-center space-x-2"
                      >
                        <FiEdit3 className="h-4 w-4" />
                        <span>Edit Profile</span>
                      </button>
                      <button className="w-full text-left p-3 hover:bg-gray-50 transition-colors flex items-center space-x-2">
                        <FiSettings className="h-4 w-4" />
                        <span>Settings</span>
                      </button>
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left p-3 text-red-600 hover:bg-red-50 transition-colors border-t border-gray-200 flex items-center space-x-2"
                      >
                        <FiLogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Chats</h1>
                  <p className="text-gray-600 text-sm">
                    {totalUnread > 0 ? `${totalUnread} unread messages` : 'All caught up'}
                  </p>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search or start new chat"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white rounded-lg border border-gray-300 focus:outline-none focus:border-[#00a884] text-gray-900 placeholder-gray-500 transition-all duration-200"
              />
            </div>
          </div>
          
          {/* Recent Chats List */}
          <div className="flex-1 overflow-y-auto bg-white">
            <div className="divide-y divide-gray-100">
              {filteredChats.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FiMessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No conversations yet</p>
                  <p className="text-sm mt-1">Start chatting with job seekers</p>
                </div>
              ) : (
                filteredChats.map((chat, index) => (
                  <motion.button
                    key={`${chat.id}-${chat.seeker._id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => startChatWithSeeker(chat.seeker)}
                    className={`w-full text-left p-3 transition-all duration-200 hover:bg-gray-50 ${
                      selectedSeeker?._id === chat.seeker._id ? 'bg-[#f0f2f5]' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#00a884] to-[#008c6d] rounded-full flex items-center justify-center text-white font-bold text-sm">
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
                          <span className="text-xs text-gray-500">
                            {formatTime(chat.timestamp)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600 truncate flex-1 mr-2">
                            {chat.lastMessage}
                          </p>
                          {chat.unreadCount > 0 && (
                            <span className="bg-[#00a884] text-white text-xs px-2 py-1 rounded-full min-w-5 text-center">
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

        {/* Right Side - Chat Area */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`${
            mobileView === 'chat' ? 'flex' : 'hidden'
          } md:flex flex-1 flex-col bg-[#efeae2] h-full relative`}
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
                <div className="bg-[#f0f2f5] px-4 py-3 border-b border-gray-300 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
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
                        className="w-10 h-10 bg-gradient-to-br from-[#00a884] to-[#008c6d] rounded-full flex items-center justify-center text-white font-bold cursor-pointer"
                        onClick={() => setSeekerInfoOpen(!seekerInfoOpen)}
                      >
                        {selectedSeeker.candidateDetails?.fullName?.charAt(0) || selectedSeeker.username.charAt(0)}
                      </div>
                      {selectedSeeker.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div 
                      className="cursor-pointer"
                      onClick={() => setSeekerInfoOpen(!seekerInfoOpen)}
                    >
                      <h3 className="font-semibold text-gray-900">
                        {selectedSeeker.candidateDetails?.fullName || selectedSeeker.username}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {selectedSeeker.isOnline ? 'Online' : formatLastSeen(selectedSeeker.lastSeen)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-600 hover:text-gray-800 transition-colors">
                      <FiVideo className="h-5 w-5" />
                    </button>
                    <button className="p-2 text-gray-600 hover:text-gray-800 transition-colors">
                      <FiPhone className="h-5 w-5" />
                    </button>
                    <button 
                      className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                      onClick={() => setSeekerInfoOpen(!seekerInfoOpen)}
                    >
                      <FiInfo className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Chat Messages Area */}
                <div className="flex-1 overflow-y-auto bg-[#efeae2]">
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
                        <div className="p-6 bg-gradient-to-b from-[#00a884] to-[#008c6d] text-white">
                          <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold">Contact Info</h2>
                            <button onClick={() => setSeekerInfoOpen(false)}>
                              <FiX className="h-6 w-6" />
                            </button>
                          </div>
                          <div className="text-center">
                            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3">
                              {selectedSeeker.candidateDetails?.fullName?.charAt(0) || selectedSeeker.username.charAt(0)}
                            </div>
                            <h3 className="font-semibold text-lg">
                              {selectedSeeker.candidateDetails?.fullName || selectedSeeker.username}
                            </h3>
                            <p className="text-white/80 text-sm">{selectedSeeker.email}</p>
                          </div>
                        </div>
                        
                        <div className="p-4 space-y-4">
                          {selectedSeeker.candidateDetails?.phone && (
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Phone</p>
                              <p className="font-medium">{selectedSeeker.candidateDetails.phone}</p>
                            </div>
                          )}
                          
                          {selectedSeeker.candidateDetails?.skills && selectedSeeker.candidateDetails.skills.length > 0 && (
                            <div>
                              <p className="text-sm text-gray-600 mb-2">Skills</p>
                              <div className="flex flex-wrap gap-2">
                                {selectedSeeker.candidateDetails.skills.slice(0, 4).map((skill, idx) => (
                                  <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {selectedSeeker.candidateDetails?.experience && (
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Experience</p>
                              <p className="font-medium">{selectedSeeker.candidateDetails.experience}</p>
                            </div>
                          )}
                          
                          <div className="border-t border-gray-200 pt-4">
                            <button className="flex items-center space-x-3 text-red-600 hover:text-red-700 transition-colors">
                              <FiTrash2 className="h-5 w-5" />
                              <span>Clear Chat</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              /* Empty State */
              <motion.div
                key="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#f0f2f5] h-full"
              >
                <div className="w-32 h-32 bg-[#00a884] rounded-full flex items-center justify-center mb-8 shadow-2xl">
                  <FiMessageCircle className="h-16 w-16 text-white" />
                </div>
                <h3 className="text-3xl font-black text-gray-800 mb-4">
                  Start Connnecting with Job Seekers
                </h3>
                <p className="text-gray-600 text-lg mb-2 max-w-md">
                  {filteredChats.length === 0 
                    ? 'Start your first conversation with a job seeker' 
                    : 'Select a conversation to start messaging'
                  }
                </p>
                <p className="text-gray-500 text-sm max-w-sm">
                  Send messages, share files, and communicate seamlessly with job seekers
                </p>
                
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl">
                  {[
                    { icon: FiMessageCircle, text: 'Instant Messaging', desc: 'Real-time chat' },
                    { icon: FiPaperclip, text: 'File Sharing', desc: 'Share documents' },
                    { icon: FiVideo, text: 'Video Call', desc: 'Face-to-face meetings' }
                  ].map((item, index) => (
                    <motion.div
                      key={item.text}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="text-center p-6 bg-white rounded-2xl shadow-lg"
                    >
                      <div className="w-16 h-16 bg-gradient-to-br from-[#00a884] to-[#008c6d] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <item.icon className="h-8 w-8 text-white" />
                      </div>
                      <div className="font-bold text-gray-900 text-lg mb-2">{item.text}</div>
                      <div className="text-sm text-gray-600">{item.desc}</div>
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