import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    requiredSkills: { type: [String], default: [] },
    goodToHave: { type: [String], default: [] },
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recruiterName: { type: String },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true } // adds createdAt + updatedAt automatically
);

const Job = mongoose.model('Job', jobSchema);
export default Job;
