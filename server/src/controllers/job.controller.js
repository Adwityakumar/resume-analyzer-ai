import Job from '../models/Job.js';
import Application from '../models/Application.js';
import User from '../models/User.js';
import axios from 'axios';
import { analyzeJobMatch } from '../services/mlCore.service.js';
import { uploadResume } from '../services/cloudinary.service.js';

const buildJobMatchPayload = (job, req, resolvedResumeFile) => ({
    resumeText: req.body.resumeText || '',
    resumeFile: resolvedResumeFile || null,
    role: job.title,
    jobDescription: job.description,
    roleKeypoints: {
        title: job.title,
        requiredSkills: job.requiredSkills,
        goodToHave: job.goodToHave,
    },
});

const buildJobMatchResponse = (mlResult, message) => ({
    message,
    score: mlResult.score,
    summary: mlResult.summary,
    matchedSkills: mlResult.matchedSkills,
    missingSkills: mlResult.missingSkills,
    suggestions: mlResult.suggestions,
    role: mlResult.role,
    extractedResumeText: mlResult.extractedResumeText || '',
});

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
            isActive: true,
            isDeleted: false,
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
        const jobs = await Job.find({ recruiterId: req.user._id, isDeleted: { $ne: true } }).sort({ createdAt: -1 });

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
        if (isActive !== undefined) job.isActive = Boolean(isActive);

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

        // Soft delete: hide from recruiter and applicant lists without removing related applications.
        job.isActive = false;
        job.isDeleted = true;
        await job.save();

        return res.status(200).json({ message: 'Job deleted successfully.' });
    } catch (error) {
        console.error('deleteJob error:', error.message);
        return res.status(500).json({ message: 'Failed to delete job.', error: error.message });
    }
};

// ─── PUBLIC (logged-in): Get all active jobs for job board ─────────────────
// Also attaches hasApplied: true/false for the currently logged-in user
export const getAllJobs = async (req, res) => {
    try {
        const jobs = await Job.find({ isActive: { $ne: false }, isDeleted: { $ne: true } }).sort({ createdAt: -1 });

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
export const analyzeJobForApplication = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);

        if (!job || job.isDeleted || job.isActive === false) {
            return res.status(404).json({ message: 'Job not found or no longer active.' });
        }

        if (!req.body.resumeText?.trim() && !req.file && !req.body.resumeFileUrl) {
            return res.status(400).json({ message: 'Please upload your resume or paste your resume text.' });
        }

        const existingApplication = await Application.findOne({
            jobId: job._id,
            applicantId: req.user._id,
        });

        if (existingApplication) {
            return res.status(400).json({ message: 'You have already applied for this job.' });
        }

        let resumeFile = req.file;
        let resumeFileUrl = req.body.resumeFileUrl || '';
        let resumeFileName = req.body.resumeFileName || '';
        let cloudinaryPublicId = req.body.cloudinaryPublicId || '';

        // If it's a saved resume from the vault, download its buffer so ML can extract text
        if (!resumeFile && resumeFileUrl) {
            try {
                const response = await axios.get(resumeFileUrl, { responseType: 'arraybuffer' });
                resumeFile = {
                    buffer: Buffer.from(response.data),
                    originalname: resumeFileName || 'resume.pdf',
                    mimetype: 'application/pdf',
                };
            } catch (err) {
                console.error('Failed to download saved resume:', err.message);
                return res.status(500).json({ message: 'Failed to access saved resume from vault.' });
            }
        }

        // If it's a new upload, upload to Cloudinary now
        if (req.file && !resumeFileUrl) {
            try {
                const uploadResult = await uploadResume(req.file.buffer, req.file.originalname, req.user._id);
                resumeFileUrl = uploadResult.url;
                cloudinaryPublicId = uploadResult.publicId;
                resumeFileName = req.file.originalname;

                // Save to vault
                await User.findByIdAndUpdate(req.user._id, {
                    $push: {
                        resumes: {
                            url: resumeFileUrl,
                            publicId: cloudinaryPublicId,
                            fileName: resumeFileName,
                        },
                    },
                });
            } catch (err) {
                console.error('Cloudinary upload failed:', err.message);
            }
        }

        let mlResult;
        try {
            mlResult = await analyzeJobMatch(buildJobMatchPayload(job, req, resumeFile));
        } catch (mlError) {
            console.error('ML analysis failed during resume preview:', mlError.message);
            return res.status(502).json({ message: 'ML analysis service unavailable. Please try again.' });
        }

        return res.status(200).json({
            ...buildJobMatchResponse(mlResult, 'Resume analyzed. Review the score before submitting your application.'),
            resumeFileUrl,
            resumeFileName,
            cloudinaryPublicId,
        });
    } catch (error) {
        console.error('analyzeJobForApplication error:', error.message);
        return res.status(500).json({ message: 'Failed to analyze resume.', error: error.message });
    }
};

export const applyForJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);

        if (!job || job.isDeleted || job.isActive === false) {
            return res.status(404).json({ message: 'Job not found or no longer active.' });
        }

        const existingApplication = await Application.findOne({
            jobId: job._id,
            applicantId: req.user._id,
        });

        if (existingApplication) {
            return res.status(400).json({ message: 'You have already applied for this job.' });
        }

        if (!req.body.resumeText?.trim() && !req.file && !req.body.resumeFileUrl) {
            return res.status(400).json({ message: 'Please upload your resume or paste your resume text.' });
        }

        let resumeFile = req.file;
        let resumeFileUrl = req.body.resumeFileUrl || '';
        let resumeFileName = req.body.resumeFileName || '';
        let cloudinaryPublicId = req.body.cloudinaryPublicId || '';

        // If there's a URL but no file (cached from analyze), we need to fetch the buffer again for ML
        // (Wait, do we even need to run ML again? Yes, because we don't save the ML score in the client state to trust it directly)
        if (!resumeFile && resumeFileUrl) {
            try {
                const response = await axios.get(resumeFileUrl, { 
                    responseType: 'arraybuffer',
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                });
                resumeFile = {
                    buffer: Buffer.from(response.data),
                    originalname: resumeFileName || 'resume.pdf',
                    mimetype: 'application/pdf',
                };
            } catch (err) {
                console.error('Failed to download saved resume:', err.message);
                return res.status(500).json({ message: 'Failed to access saved resume.' });
            }
        }

        // Upload to Cloudinary if it's somehow a new file upload directly on apply (e.g. bypassing analyze)
        if (req.file && !resumeFileUrl) {
            try {
                const uploadResult = await uploadResume(req.file.buffer, req.file.originalname, req.user._id);
                resumeFileUrl = uploadResult.url;
                cloudinaryPublicId = uploadResult.publicId;
                resumeFileName = req.file.originalname;

                await User.findByIdAndUpdate(req.user._id, {
                    $push: {
                        resumes: { url: resumeFileUrl, publicId: cloudinaryPublicId, fileName: resumeFileName },
                    },
                });
            } catch (err) {
                console.error('Cloudinary upload failed:', err.message);
            }
        }

        let mlResult;
        try {
            mlResult = await analyzeJobMatch(buildJobMatchPayload(job, req, resumeFile));
        } catch (mlError) {
            console.error('ML analysis failed during application:', mlError.message);
            return res.status(502).json({ message: 'ML analysis service unavailable. Please try again.' });
        }

        const application = await Application.create({
            jobId: job._id,
            applicantId: req.user._id,
            applicantName: req.user.name,
            applicantEmail: req.user.email,
            resumeText: req.body.resumeText || mlResult.extractedResumeText || '',
            resumeFileName: resumeFileName || req.file?.originalname || '',
            resumeFileUrl: resumeFileUrl,
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
            ...buildJobMatchResponse(mlResult, 'Application submitted successfully!'),
            applicationId: application._id,
        });
    } catch (error) {
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
