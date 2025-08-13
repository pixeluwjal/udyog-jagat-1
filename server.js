const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require("socket.io");
const mongoose = require('mongoose');

// Use dotenv to load environment variables from the .env file
require('dotenv').config();

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://easynetcraft:m6Ioqjj6VGOfSBEq@cluster0.gsbgycq.mongodb.net/jobportal?retryWrites=true&w=majority";

// Define Mongoose Schema for Chat Messages
const MessageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// Define Mongoose Schema for Chat Rooms
const ChatSchema = new mongoose.Schema({
  chatId: { type: String, required: true, unique: true },
  messages: [MessageSchema],
});

const Chat = mongoose.models.Chat || mongoose.model('Chat', ChatSchema);

// Utility function to get a consistent chat ID for a pair of users.
const getChatId = (user1, user2) => {
  return [user1, user2].sort().join('-');
};

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  try {
    if (!MONGO_URI) {
      throw new Error("MongoDB URI is not defined in environment variables.");
    }
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected successfully.');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling request', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', async (socket) => {
    const { userId, chatPartnerId } = socket.handshake.query;
    if (!userId || !chatPartnerId) {
      console.log('Connection rejected: Missing user or chat partner ID.');
      socket.disconnect(true);
      return;
    }

    const chatId = getChatId(userId, chatPartnerId);
    socket.join(chatId);

    console.log(`User ${userId} connected to chat with ${chatPartnerId}. Chat ID: ${chatId}`);

    try {
      const chatDoc = await Chat.findOne({ chatId });
      const history = chatDoc ? chatDoc.messages : [];
      socket.emit('chat history', history);
    } catch (error) {
      console.error('Error fetching chat history from MongoDB:', error);
      socket.emit('chat history', []);
    }

    socket.on('chat message', async (msg) => {
      console.log(`Message received in chat ${chatId}:`, msg);
      
      // FIX: Ensure the message object is complete before saving
      const newMessage = { 
        id: msg.id, 
        senderId: msg.senderId, 
        text: msg.text, 
        timestamp: new Date() 
      };

      try {
        await Chat.findOneAndUpdate(
          { chatId },
          { $push: { messages: newMessage } },
          { upsert: true, new: true }
        );
      } catch (error) {
        console.error('Error saving message to MongoDB:', error);
      }
      
      socket.broadcast.to(chatId).emit('chat message', newMessage);
    });

    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected from chat.`);
    });
  });

  server.on('error', err => {
    console.error('Server error:', err);
  });

  server.listen(port, err => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
