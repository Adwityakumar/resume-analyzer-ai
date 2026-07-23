import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// ─── Configuration ────────────────────────────────────────────────────────────
// TODO: Replace the placeholder values below with your actual Cloudinary
//       credentials, or add them to your server/.env file:
//
//   CLOUDINARY_CLOUD_NAME=your_cloud_name
//   CLOUDINARY_API_KEY=your_api_key
//   CLOUDINARY_API_SECRET=your_api_secret
//
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'YOUR_CLOUD_NAME',
  api_key:    process.env.CLOUDINARY_API_KEY    || 'YOUR_API_KEY',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'YOUR_API_SECRET',
  secure: true,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts a Node.js Buffer into a Readable stream so we can pipe it
 * directly into Cloudinary's upload_stream without writing to disk.
 */
const bufferToStream = (buffer) => {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Upload a resume PDF buffer to Cloudinary.
 *
 * Files are stored under  resumes/<userId>/  so they are easy to manage
 * per user in the Cloudinary Media Library.
 *
 * @param {Buffer} fileBuffer   - The raw PDF buffer from multer memoryStorage
 * @param {string} originalName - The original filename (e.g. "john_doe_cv.pdf")
 * @param {string} userId       - MongoDB _id of the uploading user
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export const uploadResume = (fileBuffer, originalName, userId) => {
  return new Promise((resolve, reject) => {
    // Strip extension for the public_id; Cloudinary will add its own suffix
    const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_');
    const timestamp = Date.now();

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        // 'raw' preserves the original file type (PDF stays as PDF)
        resource_type: 'raw',
        folder: `resumes/${userId}`,
        public_id: `${baseName}_${timestamp}`,
        // Allow content-disposition header so browsers can open/download PDFs
        use_filename: true,
        unique_filename: false,
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    bufferToStream(fileBuffer).pipe(uploadStream);
  });
};

/**
 * Delete a resume from Cloudinary by its public_id.
 * Used when a job seeker removes a saved resume.
 *
 * @param {string} publicId - The Cloudinary public_id returned at upload time
 */
export const deleteResume = async (publicId) => {
  return cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
};
