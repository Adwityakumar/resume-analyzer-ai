import Job from '../models/Job.js';
import Application from '../models/Application.js';
import { analyzeJobMatch } from '../services/mlCore.service.js';

// ─── RECRUITER: Create a new job posting ───────────────────────────────────
export const createJob = async (req, res) => {
  try {
    const { title, description, requiredSkills, goodToHave } = req.body;

    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ message: 'Title and description are required.' });
    }

    const job = await Job.create({
      title,
      description,
      requiredSkills: requiredSkills || [],
      goodToHave: goodToHave || [],
      recruiterId: req.user._id,
      recruiterName: req.user.name,
    });

    return res.status(201).json(job);
  } catch (error) {
    console.error('createJob error:', error.message);
    return res.status(500).json({ message: 'Failed to create job.', error: error.message });
  }
};

// ─── RECRUITER: Get all jobs posted by this recruiter ──────────────────────
export const getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ recruiterId: req.user._id }).sort({ createdAt: -1 });

    // For each job, attach the application count
    const jobsWithCount = await Promise.all(
      jobs.map(async (job) => {
        const applicationCount = await Application.countDocuments({ jobId: job._id });
        return { ...job.toObject(), applicationCount };
      })
    );

    return res.status(200).json(jobsWithCount);
  } catch (error) {
    console.error('getMyJobs error:', error.message);
    return res.status(500).json({ message: 'Failed to fetch your jobs.', error: error.message });
  }
};

// ─── RECRUITER: Update a job (must own it) ─────────────────────────────────
export const updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found.' });
    }

    if (job.recruiterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own job postings.' });
    }

    const { title, description, requiredSkills, goodToHave, isActive } = req.body;
    if (title !== undefined) job.title = title;
    if (description !== undefined) job.description = description;
    if (requiredSkills !== undefined) job.requiredSkills = requiredSkills;
    if (goodToHave !== undefined) job.goodToHave = goodToHave;
    if (isActive !== undefined) job.isActive = isActive;

    await job.save();
    return res.status(200).json(job);
  } catch (error) {
    console.error('updateJob error:', error.message);
    return res.status(500).json({ message: 'Failed to update job.', error: error.message });
  }
};

// ─── RECRUITER: Delete (deactivate) a job ──────────────────────────────────
export const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found.' });
    }

    if (job.recruiterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own job postings.' });
    }

    // Soft delete: mark as inactive instead of destroying the record
    job.isActive = false;
    await job.save();

    return res.status(200).json({ message: 'Job deactivated successfully.' });
  } catch (error) {
    console.error('deleteJob error:', error.message);
    return res.status(500).json({ message: 'Failed to delete job.', error: error.message });
  }
};

// ─── PUBLIC (logged-in): Get all active jobs for job board ─────────────────
// Also attaches hasApplied: true/false for the currently logged-in user
export const getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ isActive: true }).sort({ createdAt: -1 });

    // Bulk-fetch the user's applications so we can flag hasApplied without N queries
    const jobIds = jobs.map((j) => j._id);
    const userApplications = await Application.find({
      jobId: { $in: jobIds },
      applicantId: req.user._id,
    }).select('jobId');

    const appliedJobIds = new Set(userApplications.map((a) => a.jobId.toString()));

    const jobsWithApplied = jobs.map((job) => ({
      ...job.toObject(),
      hasApplied: appliedJobIds.has(job._id.toString()),
    }));

    return res.status(200).json(jobsWithApplied);
  } catch (error) {
    console.error('getAllJobs error:', error.message);
    return res.status(500).json({ message: 'Failed to fetch jobs.', error: error.message });
  }
};

// ─── USER: Apply for a job ──────────────────────────────────────────────────
export const applyForJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job || !job.isActive) {
      return res.status(404).json({ message: 'Job not found or no longer active.' });
    }

    // Check for duplicate application
    const existingApplication = await Application.findOne({
      jobId: job._id,
      applicantId: req.user._id,
    });

    if (existingApplication) {
      return res.status(400).json({ message: 'You have already applied for this job.' });
    }

    // Run the ML analysis using the existing mlCore.service.js function
    const mlPayload = {
      resumeText: req.body.resumeText || '',
      resumeFile: req.file || null,
      role: job.title, // pass job title as context
      jobDescription: job.description,
      roleKeypoints: {
        title: job.title,
        requiredSkills: job.requiredSkills,
        goodToHave: job.goodToHave,
      },
    };

    let mlResult;
    try {
      mlResult = await analyzeJobMatch(mlPayload);
    } catch (mlError) {
      console.error('ML analysis failed during application:', mlError.message);
      return res.status(502).json({ message: 'ML analysis service unavailable. Please try again.' });
    }

    // Save application with ML result embedded
    const application = await Application.create({
      jobId: job._id,
      applicantId: req.user._id,
      applicantName: req.user.name,
      applicantEmail: req.user.email,
      resumeText: req.body.resumeText || '',
      mlScore: mlResult.score,
      mlAnalysis: {
        role: mlResult.role,
        matchedSkills: mlResult.matchedSkills,
        missingSkills: mlResult.missingSkills,
        suggestions: mlResult.suggestions,
        summary: mlResult.summary,
      },
    });

    return res.status(201).json({
      message: 'Application submitted successfully!',
      score: mlResult.score,
      summary: mlResult.summary,
      matchedSkills: mlResult.matchedSkills,
      missingSkills: mlResult.missingSkills,
      suggestions: mlResult.suggestions,
      role: mlResult.role,
      applicationId: application._id,
    });
  } catch (error) {
    // Handle duplicate key error from the unique index
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already applied for this job.' });
    }
    console.error('applyForJob error:', error.message);
    return res.status(500).json({ message: 'Failed to submit application.', error: error.message });
  }
};

// ─── RECRUITER: Get all applications for a job (sorted by ML score) ────────
export const getJobApplications = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found.' });
    }

    if (job.recruiterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only view applications for your own jobs.' });
    }

    // Sort by mlScore descending — best candidates first
    const applications = await Application.find({ jobId: job._id }).sort({ mlScore: -1 });

    return res.status(200).json({ job, applications });
  } catch (error) {
    console.error('getJobApplications error:', error.message);
    return res.status(500).json({ message: 'Failed to fetch applications.', error: error.message });
  }
};

// ─── RECRUITER: Update application status ──────────────────────────────────
export const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'reviewed', 'shortlisted', 'rejected'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    // Verify the recruiter owns the job this application belongs to
    const application = await Application.findById(req.params.appId).populate('jobId');
    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    if (application.jobId.recruiterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only manage applications for your own jobs.' });
    }

    application.status = status;
    await application.save();

    return res.status(200).json({ message: `Status updated to "${status}".`, application });
  } catch (error) {
    console.error('updateApplicationStatus error:', error.message);
    return res.status(500).json({ message: 'Failed to update status.', error: error.message });
  }
};

// ─── USER: Get all applications submitted by the current user ──────────────
export const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ applicantId: req.user._id })
      .populate('jobId', 'title description recruiterName isActive')
      .sort({ appliedAt: -1 });

    return res.status(200).json(applications);
  } catch (error) {
    console.error('getMyApplications error:', error.message);
    return res.status(500).json({ message: 'Failed to fetch your applications.', error: error.message });
  }
};
