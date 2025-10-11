"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  Channel,
  Window,
  MessageList,
  MessageInput,
  useChatContext,
  MessageInputProps,
} from "stream-chat-react";
import Sidebar from "@/app/components/Sidebar";
import {
  FiMessageSquare,
  FiSearch,
  FiMenu,
  FiVideo,
  FiPhone,
  FiMoreVertical,
  FiPaperclip,
  FiSmile,
  FiSend,
  FiArrowLeft,
  FiLoader,
  FiUser,
  FiX
} from "react-icons/fi";
import InfiniteScroll from "react-infinite-scroll-component";
import 'stream-chat-react/dist/css/v2/index.css';
import { Channel as StreamChannel } from "stream-chat";

// MARK: - Debounce Hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

// MARK: - Type Definition
type ReferrerContact = {
  _id: string;
  id: string;
  name: string;
  profileImage?: string;
  position?: string;
  company?: string;
  email?: string;
  username?: string;
};

// MARK: - Referrer Preview Component
const ReferrerPreview = ({ referrer, onClick, isActive }: { referrer: ReferrerContact; onClick: () => void; isActive: boolean; }) => {
  const getInitials = (name = "User") => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  // Safely get display name
  const displayName = referrer.name || referrer.username || referrer.email || "Referrer";
  const displayPosition = referrer.position || 'Professional';
  const displayCompany = referrer.company || 'Company';

  return (
    <div className={`flex items-center p-3 mx-2 my-1 rounded-2xl cursor-pointer transition-all duration-300 transform active:scale-95 ${
      isActive 
        ? 'bg-gradient-to-r from-[#183380] to-[#2245AE] text-white shadow-xl' 
        : 'bg-white hover:bg-gray-50 active:bg-gray-100 border border-gray-100'
    } touch-manipulation`} 
    onClick={onClick}>
      <div className="relative flex-shrink-0">
        {referrer.profileImage ? (
          <img src={referrer.profileImage} alt="avatar" className="w-12 h-12 rounded-xl object-cover border-2 border-white/50" />
        ) : (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${
            isActive 
              ? 'bg-white/30 text-white border-2 border-white/50' 
              : 'bg-gradient-to-br from-[#2245AE] to-[#3367D6] text-white'
          }`}>
            {getInitials(displayName)}
          </div>
        )}
      </div>
      <div className="ml-3 flex-1 min-w-0">
        <h3 className={`font-semibold truncate text-sm ${isActive ? 'text-white' : 'text-gray-800'}`}>
          {displayName}
        </h3>
        <p className={`truncate text-xs ${isActive ? 'text-white/95' : 'text-gray-600'}`}>
          {displayPosition} @ {displayCompany}
        </p>
      </div>
    </div>
  );
};

// MARK: - Custom Channel Header
const CustomChannelHeader = ({ channel }: { channel: StreamChannel }) => {
  const { user } = useAuth();
  const { setActiveChannel } = useChatContext();
  const otherMember = Object.values(channel.state.members).find(m => m.user?.id !== user?._id);
  
  // Safely get other user's display info
  const otherUser = otherMember?.user;
  const otherUserName = otherUser?.name || otherUser?.username || otherUser?.email || "Referrer";
  const imageUrl = otherUser?.image || `https://getstream.io/random_png/?name=${encodeURIComponent(otherUserName)}`;

  return (
    <div className="p-3 border-b border-gray-200 bg-white flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center flex-1 min-w-0">
        <button 
          onClick={() => setActiveChannel(undefined)} 
          className="md:hidden p-2 mr-1 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
        >
          <FiArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="relative flex-shrink-0">
          <img src={imageUrl} alt="avatar" className="w-10 h-10 rounded-xl object-cover" />
          <div className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
            otherUser?.online ? 'bg-green-500' : 'bg-gray-400'
          }`} />
        </div>
        <div className="ml-3 min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 truncate text-sm">{otherUserName}</h3>
          <p className="text-xs text-gray-500 truncate">
            {otherUser?.online ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-1 flex-shrink-0">
        <button className="p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation hidden xs:flex">
          <FiPhone className="w-4 h-4 text-gray-600" />
        </button>
        <button className="p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation">
          <FiMoreVertical className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
};

// MARK: - Custom Message Input UI
const CustomMessageInputUI = (props: MessageInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <div className="p-3 bg-white border-t border-gray-200 sticky bottom-0">
      <div className={`flex items-center space-x-2 rounded-2xl px-3 py-2 transition-all duration-200 ${
        isFocused 
          ? 'bg-white border-2 border-[#3367D6] shadow-sm' 
          : 'bg-gray-100 border-transparent'
      }`}>
        <button className="p-2 rounded-xl hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation flex-shrink-0">
          <FiPaperclip className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <input 
            {...props.inputProps} 
            placeholder="Type a message..." 
            onFocus={() => setIsFocused(true)} 
            onBlur={() => setIsFocused(false)} 
            className="w-full bg-transparent focus:outline-none text-gray-800 placeholder-gray-500 text-sm resize-none" 
            style={{ minHeight: '20px' }} 
          />
        </div>
        <button className="p-2 rounded-xl hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation flex-shrink-0 hidden xs:flex">
          <FiSmile className="w-4 h-4 text-gray-600" />
        </button>
        <button 
          onClick={props.sendMessage} 
          disabled={!props.value} 
          className={`p-2 rounded-xl transition-all duration-200 transform active:scale-95 touch-manipulation flex-shrink-0 ${
            props.value 
              ? 'bg-gradient-to-r from-[#2245AE] to-[#3367D6] text-white shadow-md hover:shadow-lg' 
              : 'bg-gray-300 text-gray-400 cursor-not-allowed'
          }`}
        >
          <FiSend className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// MARK: - Empty State Component
const EmptyChatState = () => (
  <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-white to-blue-50/30 p-6 text-center">
    <div className="w-20 h-20 bg-gradient-to-br from-[#2245AE] to-[#3367D6] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
      <FiMessageSquare className="w-8 h-8 text-white" />
    </div>
    <h3 className="text-lg font-bold text-gray-800 mb-2">Connect with Referrers</h3>
    <p className="text-gray-600 text-sm max-w-xs">
      Select a referrer from the list to start a conversation and get career guidance.
    </p>
  </div>
);

// MARK: - Mobile Search Overlay
const MobileSearchOverlay = ({ isOpen, onClose, searchTerm, setSearchTerm }: {
  isOpen: boolean;
  onClose: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 md:hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
          >
            <FiArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search referrers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-100 focus:bg-white focus:border-[#3367D6] focus:ring-2 focus:ring-[#3367D6]/30 outline-none transition-all duration-200"
              autoFocus
            />
          </div>
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
            >
              <FiX className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// MARK: - Main Chat Layout for Seekers to chat with Referrers
export const SeekerChatLayout = () => {
  const { user, token, logout, loading: authLoading } = useAuth();
  const { client, setActiveChannel: setStreamChannel } = useChatContext();

  const [referrers, setReferrers] = useState<ReferrerContact[]>([]);
  const [activeChannel, setActiveChannelState] = useState<StreamChannel | null>(null);
  const [selectedReferrerId, setSelectedReferrerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const isFetching = useRef(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchReferrers = useCallback(async (isSearchReset = false) => {
    const currentSearchTerm = debouncedSearchTerm;
    const currentPage = isSearchReset ? 1 : page;
    if (isFetching.current || (!hasMore && !isSearchReset)) return;

    isFetching.current = true;
    if (currentPage === 1) setIsLoading(true);

    try {
      const response = await fetch(
        `/api/referrers?page=${currentPage}&limit=25&search=${encodeURIComponent(currentSearchTerm)}`, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Network response failed");
      const data = await response.json();
      
      setReferrers(prev => (currentPage === 1 ? data.referrers : [...prev, ...data.referrers]));
      setHasMore(data.hasMore);
      setPage(prev => isSearchReset ? 2 : prev + 1);
    } catch (err) {
      console.error("Failed to load referrers:", err);
      setHasMore(false);
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [token, page, hasMore, debouncedSearchTerm]);

  useEffect(() => {
    if (client && token) {
      setPage(1);
      fetchReferrers(true);
    }
  }, [debouncedSearchTerm, client, token]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSelectReferrer = async (referrer: ReferrerContact) => {
    if (!client || !user) return;
    
    try {
      // Create or get existing channel with the referrer
      const channel = client.channel('messaging', {
        members: [user._id, referrer.id],
        name: `Chat with ${referrer.name || referrer.username || 'Referrer'}`
      });
      
      await channel.watch();
      setStreamChannel(channel);
      setActiveChannelState(channel);
      setSelectedReferrerId(referrer.id);
    } catch (error) {
      console.error("Failed to create channel:", error);
    }
  };
  
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || !activeChannel || !isMobile) return;
    const touchEnd = e.touches[0].clientX;
    
    // Swipe right to go back to list
    if (touchEnd - touchStart > 75) { 
      setStreamChannel(undefined);
      setActiveChannelState(null);
      setSelectedReferrerId(null);
      setTouchStart(null);
    }
  };

  // Safe user display name calculation
  const getUserDisplayName = () => {
    if (!user) return "User";
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    return user.username || user.email || "User";
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F7F9FC]">
        <FiLoader className="h-8 w-8 animate-spin text-[#2245AE]" />
      </div>
    );
  }

  // Authentication failed state
  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F7F9FC] text-center">
        <div>
          <p className="text-red-500 font-semibold">Authentication failed.</p>
          <p className="text-gray-600">Could not load user data. Please try logging in again.</p>
        </div>
      </div>
    );
  }

  const showChat = !isMobile || (isMobile && activeChannel);
  const showList = !isMobile || (isMobile && !activeChannel);

  return (
    <>
      <div className="flex h-screen bg-[#F7F9FC] font-sans text-gray-800 overflow-hidden">
        <Sidebar 
          userRole={user.role} 
          onLogout={logout} 
          userDisplayName={getUserDisplayName()}
          userEmail={user.email} 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
        />
        
        {/* Mobile Header for List View */}
        {isMobile && !activeChannel && (
          <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white p-3 border-b border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
              >
                <FiMenu className="w-5 h-5 text-gray-700" />
              </button>
              <h1 className="text-lg font-bold text-gray-800 flex items-center">
                <FiMessageSquare className="w-5 h-5 mr-2 text-[#2245AE]" />
                Find Referrers
              </h1>
              <button 
                onClick={() => setShowMobileSearch(true)}
                className="p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
              >
                <FiSearch className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>
        )}

        {/* Mobile Search Overlay */}
        <MobileSearchOverlay 
          isOpen={showMobileSearch}
          onClose={() => setShowMobileSearch(false)}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
        
        <div className="flex-1 flex flex-row">
          {/* Referrers List */}
          <div className={`
            ${showList ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 lg:w-96 flex-shrink-0 
            border-r border-gray-200 bg-white
            ${isMobile ? 'pt-16' : ''}
          `}>
            {/* Desktop Search */}
            <div className="p-3 border-b border-gray-200 sticky top-0 bg-white z-10 hidden md:block">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search referrers by name, company..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-100 focus:bg-white focus:border-[#3367D6] focus:ring-2 focus:ring-[#3367D6]/30 outline-none transition-all text-sm" 
                />
              </div>
            </div>
            
            {/* Referrers List with Infinite Scroll */}
            <div id="scrollableDiv" className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center items-center h-32">
                  <FiLoader className="w-6 h-6 animate-spin text-[#2245AE]" />
                </div>
              ) : (
                <InfiniteScroll
                  dataLength={referrers.length}
                  next={fetchReferrers}
                  hasMore={hasMore}
                  loader={
                    <div className="flex justify-center py-4">
                      <FiLoader className="w-5 h-5 animate-spin text-gray-500" />
                    </div>
                  }
                  scrollableTarget="scrollableDiv"
                  endMessage={
                    <p className="text-center py-4 text-gray-500 text-sm">
                      {referrers.length === 0 ? 'No referrers found' : "You've reached the end of the list."}
                    </p>
                  }
                >
                  {referrers.map(referrer => (
                    <ReferrerPreview 
                      key={referrer.id} 
                      referrer={referrer} 
                      onClick={() => handleSelectReferrer(referrer)} 
                      isActive={selectedReferrerId === referrer.id} 
                    />
                  ))}
                </InfiniteScroll>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div 
            className={`
              ${showChat ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-h-0 bg-white
            `} 
            onTouchStart={handleTouchStart} 
            onTouchMove={handleTouchMove}
          >
            {activeChannel ? (
              <Channel channel={activeChannel}>
                <Window>
                  <CustomChannelHeader channel={activeChannel} />
                  <div className="flex-1 overflow-y-auto bg-slate-50">
                    <MessageList />
                  </div>
                  <MessageInput Input={CustomMessageInputUI} />
                </Window>
              </Channel>
            ) : (
              <EmptyChatState />
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Hint */}
      {isMobile && activeChannel && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1 rounded-full z-20 animate-bounce">
          ← Swipe right to go back
        </div>
      )}
    </>
  );
};