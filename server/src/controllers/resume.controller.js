import User from '../models/User.js';
import { deleteResume } from '../services/cloudinary.service.js';

// ─── GET /api/resumes/my ──────────────────────────────────────────────────────
// Returns all resume PDFs the logged-in user has saved to Cloudinary,
// sorted newest-first so the most recent resume appears at the top of the picker.
export const getMyResumes = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('resumes');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Sort newest first without mutating the stored array
        const sorted = [...(user.resumes || [])].sort(
            (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
        );

        return res.status(200).json(sorted);
    } catch (error) {
        console.error('getMyResumes error:', error.message);
        return res.status(500).json({ message: 'Failed to fetch your resumes.', error: error.message });
    }
};

// ─── DELETE /api/resumes/:publicId ───────────────────────────────────────────
// Removes a specific resume from both Cloudinary and the user's profile.
// The client sends the publicId URL-encoded (slashes → %2F) so it arrives
// as a single path segment; Express and decodeURIComponent both decode it.
export const deleteMyResume = async (req, res) => {
    try {
        const publicId = decodeURIComponent(req.params.publicId);

        const user = await User.findById(req.user._id).select('resumes');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Verify ownership before deleting
        const owned = user.resumes.some((r) => r.publicId === publicId);
        if (!owned) {
            return res.status(403).json({ message: 'You do not own this resume.' });
        }

        // Delete from Cloudinary (non-fatal if it fails)
        try {
            await deleteResume(publicId);
        } catch (cloudErr) {
            console.error('Cloudinary deletion failed:', cloudErr.message);
        }

        // Remove from user's resumes array in MongoDB
        await User.findByIdAndUpdate(req.user._id, {
            $pull: { resumes: { publicId } },
        });

        return res.status(200).json({ message: 'Resume deleted successfully.' });
    } catch (error) {
        console.error('deleteMyResume error:', error.message);
        return res.status(500).json({ message: 'Failed to delete resume.', error: error.message });
    }
};
