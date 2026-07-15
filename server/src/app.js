import cors from 'cors';
import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import jobDemoRoutes from './routes/jobDemo.routes.js';
import authRoutes from './routes/authRoutes.js';
import jobRoutes from './routes/job.routes.js';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const ML_CORE_URL = process.env.ML_CORE_URL || 'http://localhost:8000';

// Middlewares
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/upload', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const formData = new FormData();
    formData.append('file', req.file.buffer, req.file.originalname);

    const mlResponse = await axios.post(`${ML_CORE_URL}/analyze`, formData, {
      headers: { ...formData.getHeaders() },
    });

    return res.status(200).json(mlResponse.data);
  } catch (error) {
    console.error('Error communicating with Python:', error.message);
    return res.status(500).json({ error: 'Failed to process resume pipeline.' });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobdemo', jobDemoRoutes);
app.use('/api/jobs', jobRoutes);

export default app;
