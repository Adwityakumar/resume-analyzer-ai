import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Cloudinary is configured from env vars at startup.
// Fill in CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in server/.env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a resume PDF buffer to Cloudinary.
 *
 * @param {Buffer}  buffer    - The raw file buffer (from multer memoryStorage)
 * @param {string}  filename  - Original filename (used to set display name)
 * @param {string}  userId    - MongoDB user _id (used to namespace the folder)
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export const uploadResume = (buffer, filename, userId) => {
  return new Promise((resolve, reject) => {
    // Strip extension from filename for the Cloudinary public_id
    const baseName = filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = Date.now();

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',          // 'image' supports inline PDF viewing in browsers
        folder: `resumes/${userId || 'guest'}`, // fallback for undefined userId
        public_id: `${baseName}_${timestamp}`,
        // Store with the original filename as display name
        use_filename: false,
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url:      result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    // Pipe the in-memory buffer into the Cloudinary upload stream
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

/**
 * Delete a resume from Cloudinary by its public_id.
 * Used when the user removes a resume from their vault.
 *
 * @param {string} publicId - Cloudinary public_id (e.g. "resumes/userId/cv_123")
 * @returns {Promise<object>}
 */
export const deleteResume = async (publicId) => {
  // Try deleting as 'image' (new behavior) and fallback to 'raw' (old behavior)
  let result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  if (result.result === 'not found') {
    result = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
  }
  return result;
};
