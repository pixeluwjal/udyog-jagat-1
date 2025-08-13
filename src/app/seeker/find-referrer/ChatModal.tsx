'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiSend, FiUser, FiLoader, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import io from 'socket.io-client';

interface Referrer {
    _id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
}

interface Message {
    id: number;
    senderId: string;
    text: string;
    timestamp?: Date;
}

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    referrer: Referrer | null;
    currentUserId: string;
    currentUsername: string;
}

const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, referrer, currentUserId }) => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [socket, setSocket] = useState<any | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!isOpen || !referrer) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
            return;
        }

        const connectSocket = () => {
            setConnectionError(null);
            setIsConnected(false);

            const newSocket = io('http://localhost:3000', {
                reconnectionAttempts: 5,
                timeout: 5000,
                query: {
                    userId: currentUserId,
                    chatPartnerId: referrer._id,
                },
            });
            
            newSocket.on('connect', () => {
                console.log('Socket.IO connection established.');
                setIsConnected(true);
                setConnectionError(null);
            });
            
            newSocket.on('chat history', (history: Message[]) => {
                console.log('Received chat history:', history);
                if (history.length === 0) {
                    setMessages([{ id: Date.now(), senderId: referrer._id, text: `Hello! I am ${referrer.firstName || 'your referrer'}. How can I help you?` }]);
                } else {
                    setMessages(history);
                }
            });

            newSocket.on('chat message', (msg) => {
                setMessages(prevMessages => [...prevMessages, msg]);
            });

            newSocket.on('disconnect', () => {
                console.log('Socket.IO connection closed.');
                setIsConnected(false);
                setConnectionError('Connection closed.');
            });

            newSocket.on('connect_error', (error) => {
                console.error('Socket.IO connection error:', error);
                setIsConnected(false);
                setConnectionError('Connection failed. Please ensure the server is running.');
            });

            setSocket(newSocket);
        };

        connectSocket();

        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, [isOpen, referrer, currentUserId]);

    const handleSendMessage = () => {
        if (message.trim() && referrer && socket && isConnected) {
            const newMessage = { id: Date.now(), senderId: currentUserId, text: message };
            
            socket.emit('chat message', { ...newMessage, recipientId: referrer._id });
            
            setMessages(prevMessages => [...prevMessages, newMessage]);
            setMessage('');
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (!isOpen || !referrer) return null;

    const headerName = `${referrer.firstName || ''} ${referrer.lastName || ''}`.trim() || referrer.username;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50 font-inter"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 50 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 50 }}
                    transition={{ duration: 0.2 }}
                    className="relative w-full max-w-2xl h-[80vh] bg-white rounded-3xl shadow-xl flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-6 flex items-center justify-between shadow-md">
                        <div className="flex items-center">
                            <FiUser className="h-8 w-8 mr-4 p-1 rounded-full border border-white" />
                            <div>
                                <h3 className="text-xl font-bold leading-none">
                                    {headerName}
                                </h3>
                                <p className="text-sm font-light opacity-80">{referrer.username}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
                            >
                                <FiX className="h-6 w-6" />
                            </motion.button>
                        </div>
                    </div>

                    {/* Connection Status */}
                    {!isConnected && !connectionError && (
                        <div className="bg-yellow-50 text-yellow-800 p-2 flex items-center justify-center text-sm font-medium">
                            <FiLoader className="animate-spin mr-2" />
                            Connecting to chat...
                        </div>
                    )}
                    {connectionError && (
                        <div className="bg-red-50 text-red-800 p-2 flex items-center justify-center text-sm font-medium">
                            <FiAlertTriangle className="mr-2" />
                            {connectionError}
                        </div>
                    )}
                    {isConnected && (
                         <div className="bg-green-50 text-green-800 p-2 flex items-center justify-center text-sm font-medium">
                            <FiCheckCircle className="mr-2" />
                            Connected
                        </div>
                    )}

                    {/* Message Area */}
                    <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`p-3 rounded-xl max-w-[75%] shadow-sm ${
                                        msg.senderId === currentUserId
                                            ? 'bg-indigo-500 text-white rounded-br-none'
                                            : 'bg-gray-200 text-gray-800 rounded-bl-none'
                                    }`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                    <div className="p-4 bg-white border-t border-gray-200 flex items-center">
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Type a message..."
                            className="flex-1 p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                        />
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleSendMessage}
                            disabled={!isConnected}
                            className="ml-3 p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            <FiSend className="h-6 w-6" />
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ChatModal;
