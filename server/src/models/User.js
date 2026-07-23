import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role: { 
    type: String, 
    enum: ['user', 'recruiter'], 
    default: 'user' 
  },

  // ─── Cloudinary-stored resume PDFs (job seekers only) ───────────────────────
  // Each entry is added whenever the user uploads a resume (during apply or
  // standalone upload). They can reuse any saved resume in future applications.
  resumes: [
    {
      url:        { type: String, required: true }, // Cloudinary secure_url
      publicId:   { type: String, required: true }, // Used for Cloudinary deletion
      fileName:   { type: String, default: '' },    // Original file name shown in UI
      uploadedAt: { type: Date,   default: Date.now },
    },
  ],

  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
export default User;