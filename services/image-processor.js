const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Image size configurations
const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150, quality: 80 },    // For list views
  medium: { width: 500, height: 500, quality: 85 },       // For cards
  large: { width: 1080, height: 1080, quality: 90 },      // For full profile view
  original: { quality: 95 }                                // Original high quality
};

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validate uploaded image
 * @param {Object} file - The uploaded file object
 * @returns {Object} - { valid: boolean, error?: string }
 */
const validateImage = (file) => {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'Image too large. Max 10MB allowed.' };
  }

  // Check file type
  const mimetype = file.mimetype || file.type;
  if (!ALLOWED_TYPES.includes(mimetype)) {
    return { valid: false, error: 'Invalid image type. Use JPG, PNG or WebP.' };
  }

  return { valid: true };
};

/**
 * Process profile image into multiple sizes
 * @param {string|Buffer} input - File path or buffer of the image
 * @returns {Promise<Object>} - Object containing buffers for each size
 */
const processProfileImage = async (input) => {
  const processedImages = {};

  // Read the input (either file path or buffer)
  let imageBuffer;
  if (Buffer.isBuffer(input)) {
    imageBuffer = input;
  } else {
    imageBuffer = fs.readFileSync(input);
  }

  console.log('[ImageProcessor] Starting to process image, input size:', imageBuffer.length);

  for (const [sizeName, config] of Object.entries(IMAGE_SIZES)) {
    try {
      let processor = sharp(imageBuffer);

      if (config.width && config.height) {
        // Resize with cover fit (maintains aspect ratio, crops to fill)
        processor = processor.resize(config.width, config.height, {
          fit: 'cover',
          position: 'centre'
        });
      }

      // Convert to JPEG with progressive encoding for better loading
      const outputBuffer = await processor
        .jpeg({
          quality: config.quality,
          progressive: true,
          mozjpeg: true // Use mozjpeg for better compression
        })
        .toBuffer();

      processedImages[sizeName] = outputBuffer;
      console.log(`[ImageProcessor] Processed ${sizeName}: ${outputBuffer.length} bytes`);
    } catch (err) {
      console.error(`[ImageProcessor] Error processing ${sizeName}:`, err);
      throw err;
    }
  }

  return processedImages;
};

/**
 * Get image metadata
 * @param {string|Buffer} input - File path or buffer of the image
 * @returns {Promise<Object>} - Image metadata (width, height, format, etc.)
 */
const getImageMetadata = async (input) => {
  let imageBuffer;
  if (Buffer.isBuffer(input)) {
    imageBuffer = input;
  } else {
    imageBuffer = fs.readFileSync(input);
  }

  return sharp(imageBuffer).metadata();
};

module.exports = {
  IMAGE_SIZES,
  ALLOWED_TYPES,
  MAX_FILE_SIZE,
  validateImage,
  processProfileImage,
  getImageMetadata
};
