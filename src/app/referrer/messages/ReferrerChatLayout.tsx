"use client";

import { useState, useEffect } from "react";
import {
  Channel,
  ChannelList,
  MessageInput,
  MessageList,
  Window,
  ChannelPreviewUIComponentProps,
  ChannelHeaderProps,
  useChatContext,
  MessageInputProps,
} from "stream-chat-react";
import { useAuth } from "@/app/context/AuthContext";
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
  FiX,
} from "react-icons/fi";
import 'stream-chat-react/dist/css/v2/index.css';

// MARK: - Custom Channel Preview
const CustomChannelPreview = (props: ChannelPreviewUIComponentProps) => {
  const { channel, setActiveChannel, isActive } = props;
  const { user } = useAuth();

  const otherMember = Object.values(channel.state.members).find(
    (member) => member.user?.id !== user?._id
  );

  const getInitials = (name = "User") => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const lastMessage = channel.state.messages[channel.state.messages.length - 1];
  const lastMessageTime = lastMessage?.created_at ? new Date(lastMessage.created_at) : null;

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days === 1) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      className={`flex items-center p-3 mx-2 my-1 rounded-2xl cursor-pointer transition-all duration-300 transform active:scale-95 ${
        isActive 
          ? 'bg-gradient-to-r from-[#183380] to-[#2245AE] text-white shadow-xl' 
          : 'bg-white hover:bg-gray-50 active:bg-gray-100 border border-gray-100'
      } touch-manipulation`}
      onClick={() => setActiveChannel(channel)}
    >
      <div className="relative flex-shrink-0">
        {otherMember?.user?.image ? (
          <img 
            src={otherMember.user.image as string} 
            alt="avatar" 
            className="w-12 h-12 rounded-xl object-cover border-2 border-white/50" 
          />
        ) : (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${
            isActive 
              ? 'bg-white/30 text-white border-2 border-white/50' 
              : 'bg-gradient-to-br from-[#2245AE] to-[#3367D6] text-white'
          }`}>
            {getInitials(otherMember?.user?.name)}
          </div>
        )}
        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 ${
          isActive ? 'border-[#183380]' : 'border-white'
        } ${otherMember?.user?.online ? "bg-green-500" : "bg-gray-400"}`} />
      </div>
      
      <div className="ml-3 flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <h3 className={`font-semibold truncate text-sm ${
            isActive ? 'text-white' : 'text-gray-800'
          }`}>
            {otherMember?.user?.name || "Deleted User"}
          </h3>
          {lastMessageTime && (
            <span className={`text-xs whitespace-nowrap ml-2 ${
              isActive ? 'text-white/90' : 'text-gray-500'
            }`}>
              {formatTime(lastMessageTime)}
            </span>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          <p className={`truncate text-xs ${
            isActive ? 'text-white/95' : 'text-gray-600'
          }`}>
            {lastMessage?.text || "No messages yet"}
          </p>
          
          {channel.state.unreadCount > 0 && (
            <span className={`flex-shrink-0 text-xs font-bold rounded-full min-w-4 h-4 flex items-center justify-center ${
              isActive 
                ? 'bg-white text-[#183380]' 
                : 'bg-[#2245AE] text-white'
            }`}>
              {channel.state.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// MARK: - Custom Channel Header
const CustomChannelHeader = (props: ChannelHeaderProps) => {
  const { channel } = props;
  const { user } = useAuth();
  const { setActiveChannel } = useChatContext();

  if (!channel) return null;

  const otherMember = Object.values(channel.state.members).find(m => m.user?.id !== user?._id);

  return (
    <div className="p-3 border-b border-gray-200 bg-white flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center flex-1 min-w-0">
        <button
          onClick={() => setActiveChannel(undefined)}
          className="md:hidden p-2 mr-1 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
        >
          <FiArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        
        <div className="flex items-center flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            {otherMember?.user?.image ? (
              <img 
                src={otherMember.user.image as string} 
                alt="avatar" 
                className="w-10 h-10 rounded-xl object-cover" 
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2245AE] to-[#3367D6] flex items-center justify-center text-white font-bold text-sm">
                {otherMember?.user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            )}
            <div className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
              otherMember?.user?.online ? 'bg-green-500' : 'bg-gray-400'
            }`} />
          </div>
          
          <div className="ml-3 min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 truncate text-sm">{otherMember?.user?.name}</h3>
            <p className="text-xs text-gray-500 truncate">
              {otherMember?.user?.online ? 'Online' : 'Last seen recently'}
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-1 flex-shrink-0">
        <button className="p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation hidden xs:flex">
          <FiPhone className="w-4 h-4 text-gray-600" />
        </button>
        <button className="p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation hidden sm:flex">
          <FiVideo className="w-4 h-4 text-gray-600" />
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
          : 'bg-gray-100 border border-transparent'
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
    <h3 className="text-lg font-bold text-gray-800 mb-2">No Conversation Selected</h3>
    <p className="text-gray-600 text-sm max-w-xs">
      Choose a conversation from the list to start messaging
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
              placeholder="Search conversations..."
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

// MARK: - Main Chat Layout
export const ReferrerChatLayout = () => {
  const { user, logout } = useAuth();
  const { client, channel, setActiveChannel } = useChatContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const filters = { 
    type: "messaging", 
    members: { $in: [user!._id] },
    ...(searchTerm && {
      $or: [
        { name: { $autocomplete: searchTerm } },
        { 'member.user.name': { $autocomplete: searchTerm } }
      ]
    })
  };
  
  const sort = { last_message_at: -1 };
  
  const showChat = !isMobile || (isMobile && channel);
  const showList = !isMobile || (isMobile && !channel);

  return (
    <>
      {/* FIX: Added overflow-hidden to the main container to disable the body scrollbar */}
      <div className="flex h-screen bg-[#F7F9FC] font-sans text-gray-800 overflow-hidden">
        <Sidebar
          userRole={user!.role}
          onLogout={logout}
          userDisplayName={`${user!.firstName} ${user!.lastName}`}
          userEmail={user!.email}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
        />
        
        {isMobile && !channel && (
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
                Messages
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

        <MobileSearchOverlay 
          isOpen={showMobileSearch}
          onClose={() => setShowMobileSearch(false)}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
      
        <div className="flex-1 flex flex-row relative">
          <div 
            className={`
              ${showList ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 lg:w-96 flex-shrink-0 
              border-r border-gray-200 bg-white
              ${isMobile ? 'pt-16' : ''}
            `}
          >
            <div className="p-3 border-b border-gray-200 sticky top-0 bg-white z-10 hidden md:block">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-100 focus:bg-white focus:border-[#3367D6] focus:ring-2 focus:ring-[#3367D6]/30 outline-none transition-all duration-200 text-sm"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <ChannelList 
                filters={filters} 
                sort={sort} 
                Preview={CustomChannelPreview}
              />
            </div>
          </div>

          <div 
            className={`
              ${showChat ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-h-0
            `}
          >
            <Channel>
              <Window>
                <CustomChannelHeader />
                <div className="flex-1 overflow-y-auto bg-slate-50">
                  <MessageList />
                </div>
                <MessageInput Input={CustomMessageInputUI} />
              </Window>
            </Channel>
            
            {!channel && !isMobile && <EmptyChatState />}
          </div>
        </div>
      </div>
    </>
  );
};