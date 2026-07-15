import { Router } from 'express';
import multer from 'multer';
import { protect, isRecruiter } from '../middlewares/auth.middleware.js';
import {
  createJob,
  getMyJobs,
  updateJob,
  deleteJob,
  getAllJobs,
  applyForJob,
  getJobApplications,
  updateApplicationStatus,
  getMyApplications,
} from '../controllers/job.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// ─── Recruiter-only routes ────────────────────────────────────────────────
router.post('/', protect, isRecruiter, createJob);
router.get('/my', protect, isRecruiter, getMyJobs);
router.patch('/:id', protect, isRecruiter, updateJob);
router.delete('/:id', protect, isRecruiter, deleteJob);
router.get('/:id/applications', protect, isRecruiter, getJobApplications);
router.patch('/:jobId/applications/:appId', protect, isRecruiter, updateApplicationStatus);

// ─── User / Job Seeker routes ─────────────────────────────────────────────
router.get('/my-applications', protect, getMyApplications);  // MUST be before /:id
router.get('/', protect, getAllJobs);
router.post('/:id/apply', protect, upload.single('resumeFile'), applyForJob);

export default router;
