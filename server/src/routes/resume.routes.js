import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { getMyResumes, deleteMyResume } from '../controllers/resume.controller.js';

const router = Router();

// All resume routes are protected — user must be logged in.

// GET  /api/resumes/my          → list all saved resume PDFs for current user
router.get('/my', protect, getMyResumes);

// DELETE /api/resumes/:publicId → delete one resume from Cloudinary + user profile
// The client sends the publicId URL-encoded (e.g. resumes%2FuserId%2Fname_123)
// so it arrives as a single path segment with no real slashes in the URL.
router.delete('/:publicId', protect, deleteMyResume);

export default router;
