import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { getMyResumes, deleteMyResume } from '../controllers/resume.controller.js';

const router = Router();

// All resume routes require the user to be logged in.
// Recruiters technically won't call these, but there's no harm if they do.

// GET  /api/resumes/my              → fetch current user's saved resume list
router.get('/my', protect, getMyResumes);

// DELETE /api/resumes/:publicId     → delete a specific resume from Cloudinary + user profile
// The client sends the publicId fully URL-encoded (e.g. resumes%2FuserId%2Fname_123)
// so it arrives as a single path segment with no actual slashes in the URL.
// Express automatically URL-decodes req.params, and the controller decodes again
// just to be safe.
router.delete('/:publicId', protect, deleteMyResume);

export default router;
