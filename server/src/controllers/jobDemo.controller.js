import { roleKeypoints } from '../config/roleKeypoints.js';
import { analyzeJobMatch } from '../services/mlCore.service.js';
import { uploadResume } from '../services/cloudinary.service.js';
import User from '../models/User.js';
import axios from 'axios';

export const analyzeJobDemo = async (req, res) => {
  try {
    const { resumeText, role, jobDescription, resumeFileUrl } = req.body;

    let resolvedResumeFile = req.file;
    let outResumeFileUrl = resumeFileUrl || '';
    let outCloudinaryPublicId = '';

    // If a saved resume URL was provided (not a fresh upload), download its bytes
    // so the ML service can extract text from the PDF buffer.
    if (!resolvedResumeFile && resumeFileUrl) {
      try {
        const fileRes = await axios.get(resumeFileUrl, {
          responseType: 'arraybuffer',
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        });
        resolvedResumeFile = {
          originalname: 'saved-resume.pdf',
          mimetype: 'application/pdf',
          buffer: Buffer.from(fileRes.data),
        };
      } catch (err) {
        console.error('Failed to download saved resume:', err.message);
        return res.status(400).json({ error: 'Could not access the saved resume PDF.' });
      }
    }

    // If a brand-new file was uploaded, save it to Cloudinary and the user's vault.
    if (req.file && !outResumeFileUrl) {
      try {
        const uploadResult = await uploadResume(req.file.buffer, req.file.originalname, req.user._id);
        outResumeFileUrl = uploadResult.url;
        outCloudinaryPublicId = uploadResult.publicId;

        const user = await User.findById(req.user._id);
        if (user) {
          user.resumes.push({
            publicId: uploadResult.publicId,
            url: uploadResult.url,
            fileName: req.file.originalname,
          });
          await user.save();
        }
      } catch (err) {
        console.error('Failed to upload and save resume to vault:', err.message);
        // Non-fatal: we do not fail the analysis if saving to the vault fails.
      }
    }

    if (!resumeText?.trim() && !resolvedResumeFile) {
      return res.status(400).json({ error: 'resumeText or resumeFile is required.' });
    }

    if (!role?.trim()) {
      return res.status(400).json({ error: 'role is required.' });
    }

    const selectedRoleKeypoints = roleKeypoints[role];

    if (!selectedRoleKeypoints) {
      return res.status(400).json({ error: 'Invalid role selected.' });
    }

    const result = await analyzeJobMatch({
      resumeText: resumeText || '',
      resumeFile: resolvedResumeFile,
      role,
      jobDescription: jobDescription || '',
      roleKeypoints: selectedRoleKeypoints,
    });

    return res.status(200).json({
      ...result,
      resumeFileUrl: outResumeFileUrl,
      cloudinaryPublicId: outCloudinaryPublicId
    });
  } catch (error) {
    console.error('Job Demo analysis failed:', error.message);
    return res.status(500).json({ error: 'Failed to analyze Job Demo workflow.' });
  }
};
