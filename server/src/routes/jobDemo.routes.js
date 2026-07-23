import { Router } from 'express';
import multer from 'multer';
import { analyzeJobDemo } from '../controllers/jobDemo.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/analyze', protect, upload.single('resumeFile'), analyzeJobDemo);

export default router;
