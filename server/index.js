import app from './src/app.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas FIRST
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    
    // Only start the server if the DB connection is successful
    app.listen(PORT, () => {
      console.log(`🚀 Express Gateway running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
}); 

app.listen(PORT, () => {
  console.log(`Express Gateway running on port ${PORT}`);
});
