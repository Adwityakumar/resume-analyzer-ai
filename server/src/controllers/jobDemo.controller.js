import { roleKeypoints } from '../config/roleKeypoints.js';
import { analyzeJobMatch } from '../services/mlCore.service.js';

export const analyzeJobDemo = async (req, res) => {
  try {
    const { resumeText, role, jobDescription } = req.body;

    if (!resumeText?.trim() && !req.file) {
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
      resumeFile: req.file,
      role,
      jobDescription: jobDescription || '',
      roleKeypoints: selectedRoleKeypoints,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Job Demo analysis failed:', error.message);
    return res.status(500).json({ error: 'Failed to analyze Job Demo workflow.' });
  }
};
