import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://easynetcraft:m6Ioqjj6VGOfSBEq@cluster0.gsbgycq.mongodb.net/jobportal?retryWrites=true&w=majority';


mongoose.connect(MONGODB_URI, { dbName: 'udyogJagat' })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Example Mongoose schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
});

const User = mongoose.model('User', userSchema);

// Insert test user
const run = async () => {
  const user = new User({
    name: 'Test User',
    email: 'test@example.com',
    role: 'candidate',
  });

  await user.save();
  console.log('User created');
  await mongoose.disconnect();
};

run();
