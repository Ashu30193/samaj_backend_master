/**
 * Migration Script: Re-process existing profile images
 *
 * This script finds all users with a profile_url but no profile_images,
 * downloads the existing image, processes it into multiple sizes,
 * and updates the user document.
 *
 * Usage: node scripts/migrate-profile-images.js
 *
 * Options:
 *   --dry-run    Preview what would be migrated without making changes
 *   --limit=N    Process only N users (for testing)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Import services
const { processProfileImage } = require('../services/image-processor');
const User = require('../models/user');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

// S3 setup
const AWS = require('aws-sdk');
const { v1: uuidv1 } = require('uuid');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-south-1'
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'pareek-samaj-bucket';

/**
 * Download image from URL and return as buffer
 */
async function downloadImage(url) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error(`[Migration] Failed to download image from ${url}:`, error.message);
    throw error;
  }
}

/**
 * Upload buffer to S3
 */
async function uploadToS3(buffer, fileName, modelName = 'profile') {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: BUCKET_NAME,
      Key: `${modelName}/${fileName}`,
      Body: buffer,
      ContentType: 'image/jpeg'
    };

    s3.upload(params, (err, data) => {
      if (err) {
        console.error('[Migration] S3 upload error:', err);
        reject(err);
        return;
      }
      resolve(data.Location);
    });
  });
}

/**
 * Migrate a single user's profile image
 */
async function migrateUserImage(user) {
  console.log(`\n[Migration] Processing user: ${user._id} (${user.name || 'N/A'})`);
  console.log(`[Migration] Current profile_url: ${user.profile_url}`);

  try {
    // Download the existing image
    console.log('[Migration] Downloading existing image...');
    const imageBuffer = await downloadImage(user.profile_url);
    console.log(`[Migration] Downloaded image: ${imageBuffer.length} bytes`);

    // Process into multiple sizes
    console.log('[Migration] Processing into multiple sizes...');
    const processedImages = await processProfileImage(imageBuffer);

    // Generate unique base name
    const baseName = uuidv1();
    const urls = {};

    // Upload each size to S3
    for (const [sizeName, buffer] of Object.entries(processedImages)) {
      const fileName = `${baseName}_${sizeName}.jpg`;
      console.log(`[Migration] Uploading ${sizeName} (${buffer.length} bytes)...`);

      if (!isDryRun) {
        urls[sizeName] = await uploadToS3(buffer, fileName);
      } else {
        urls[sizeName] = `[DRY RUN] Would upload to profile/${fileName}`;
      }
    }

    // Update user document
    const updateData = {
      profile_url: urls.large || user.profile_url, // Keep backward compatibility
      profile_images: urls
    };

    console.log('[Migration] Update data:', JSON.stringify(updateData, null, 2));

    if (!isDryRun) {
      await User.updateOne(
        { _id: user._id },
        { $set: updateData }
      );
      console.log('[Migration] User updated successfully!');
    } else {
      console.log('[Migration] [DRY RUN] Would update user document');
    }

    return { success: true, userId: user._id };
  } catch (error) {
    console.error(`[Migration] Error processing user ${user._id}:`, error.message);
    return { success: false, userId: user._id, error: error.message };
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('='.repeat(60));
  console.log('Profile Image Migration Script');
  console.log('='.repeat(60));
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Limit: ${limit || 'No limit'}`);
  console.log('');

  try {
    // Connect to MongoDB
    console.log('[Migration] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('[Migration] Connected to MongoDB');

    // Find users with profile_url but no profile_images
    const query = {
      profile_url: { $exists: true, $ne: null, $ne: '' },
      $or: [
        { profile_images: { $exists: false } },
        { 'profile_images.thumbnail': { $exists: false } }
      ]
    };

    let findQuery = User.find(query).select('_id name profile_url profile_images');
    if (limit) {
      findQuery = findQuery.limit(limit);
    }

    const users = await findQuery.exec();
    console.log(`[Migration] Found ${users.length} users to migrate`);

    if (users.length === 0) {
      console.log('[Migration] No users need migration. Exiting.');
      process.exit(0);
    }

    // Process each user
    const results = {
      success: [],
      failed: []
    };

    for (let i = 0; i < users.length; i++) {
      console.log(`\n[Migration] Progress: ${i + 1}/${users.length}`);
      const result = await migrateUserImage(users[i]);

      if (result.success) {
        results.success.push(result.userId);
      } else {
        results.failed.push({ userId: result.userId, error: result.error });
      }

      // Add a small delay to avoid overwhelming the server
      if (!isDryRun && i < users.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('Migration Summary');
    console.log('='.repeat(60));
    console.log(`Total processed: ${users.length}`);
    console.log(`Successful: ${results.success.length}`);
    console.log(`Failed: ${results.failed.length}`);

    if (results.failed.length > 0) {
      console.log('\nFailed users:');
      results.failed.forEach(f => {
        console.log(`  - ${f.userId}: ${f.error}`);
      });
    }

    if (isDryRun) {
      console.log('\n[DRY RUN] No changes were made. Run without --dry-run to perform actual migration.');
    }

  } catch (error) {
    console.error('[Migration] Fatal error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n[Migration] Disconnected from MongoDB');
    console.log('[Migration] Done!');
  }
}

// Run the migration
runMigration();
