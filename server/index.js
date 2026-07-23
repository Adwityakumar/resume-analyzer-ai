import 'dotenv/config';
import app from './src/app.js';
import mongoose from 'mongoose';

const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas FIRST, then start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    app.listen(PORT, () => {
      console.log(`🚀 Express Gateway running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
