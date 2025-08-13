import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Chat from '@/models/Chat';
import User from '@/models/User';
import { authMiddleware } from '@/lib/authMiddleware';
import mongoose from 'mongoose';

// GET /api/chats?userId=[userId]
// This route fetches a list of all chats for a specific user.
export async function GET(request: NextRequest) {
    await dbConnect();

    const authResult = await authMiddleware(request, ['job_referrer', 'job_seeker']);
    if (!authResult.success || !authResult.user) {
        return NextResponse.json({ error: authResult.message }, { status: authResult.status });
    }

    const { user: authenticatedUser } = authResult;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Security check: ensure the user can only fetch their own chats
    if (!userId || authenticatedUser._id.toString() !== userId) {
        return NextResponse.json({ error: 'Forbidden: You can only fetch your own chats.' }, { status: 403 });
    }

    try {
        // Find all chats where the user's ID is part of the chatId
        const chats = await Chat.find({ chatId: { $regex: new RegExp(userId, 'i') } })
                                .sort({ 'messages.timestamp': -1 }) // Sort by last message
                                .lean();

        if (!chats || chats.length === 0) {
            return NextResponse.json({ chats: [] }, { status: 200 });
        }

        const chatPreviews = await Promise.all(chats.map(async (chat) => {
            // Extract the other user's ID from the chatId
            const chatPartners = chat.chatId.split('-');
            const chatPartnerId = chatPartners.find(id => id !== userId);

            if (!chatPartnerId) {
                return null;
            }

            // FIX: Ensure the chat partner ID is a valid ObjectId before querying
            if (!mongoose.isValidObjectId(chatPartnerId)) {
                console.warn(`API: Invalid ObjectId found for chat partner ID: ${chatPartnerId}`);
                return null;
            }

            // Fetch the chat partner's details
            const partner = await User.findById(chatPartnerId).select('_id username email firstName lastName phone');

            if (!partner) {
                return null;
            }

            const lastMessage = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].text : '';
            
            return {
                id: chat.chatId,
                chatPartner: {
                    _id: partner._id.toString(),
                    username: partner.username,
                    email: partner.email,
                    firstName: partner.firstName,
                    lastName: partner.lastName,
                    phone: partner.phone
                },
                lastMessage,
            };
        }));
        
        const validChats = chatPreviews.filter(Boolean);

        return NextResponse.json({ chats: validChats }, { status: 200 });

    } catch (error: any) {
        console.error('API: Fetch chats error:', error);
        return NextResponse.json({ error: 'Server error fetching chats.' }, { status: 500 });
    }
}
