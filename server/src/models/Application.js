import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true,
    },
    applicantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    // Denormalized for fast display without population
    applicantName: { type: String, required: true },
    applicantEmail: { type: String, required: true },

    // Resume text stored so recruiter can review & re-analysis is possible
    resumeText: { type: String, default: '' },
    resumeFileName: { type: String, default: '' },
    resumeFileUrl: { type: String, default: '' },

    // ML Analysis cached at the time of application
    mlScore: { type: Number, default: 0 },
    mlAnalysis: {
        role: { type: String },
        matchedSkills: { type: [String], default: [] },
        missingSkills: { type: [String], default: [] },
        suggestions: { type: [String], default: [] },
        summary: { type: String, default: '' },
        usedJobDescription: { type: Boolean, default: false },
        evaluatedSkills: {
            requiredSkills: { type: [String], default: [] },
            goodToHave: { type: [String], default: [] },
        },
    },

    // Recruiter workflow status
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'shortlisted', 'rejected'],
        default: 'pending',
    },

    appliedAt: { type: Date, default: Date.now },
});

// Prevent the same user from applying to the same job twice
applicationSchema.index({ jobId: 1, applicantId: 1 }, { unique: true });

const Application = mongoose.model('Application', applicationSchema);
export default Application;
