const fs = require("fs");
const path = require("path");
const AWS = require("aws-sdk");
const ffmpeg = require("fluent-ffmpeg");
const { v1: uuidv1 } = require("uuid");
const { processProfileImage, validateImage } = require("./image-processor");

ffmpeg.setFfmpegPath("/usr/bin/ffmpeg");
ffmpeg.setFfprobePath("/usr/bin/ffprobe");
ffmpeg.setFlvtoolPath("/usr/bin");

// S3 instance for presigned URLs
const s3Instance = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  signatureVersion: 'v4'
});

// Generate presigned URL for viewing (valid for 7 days)
exports.getPresignedUrl = (key) => {
  if (!key) return null;

  // If it's already a full URL, extract the key
  let s3Key = key;
  if (key.includes('.amazonaws.com/')) {
    s3Key = key.split('.amazonaws.com/')[1];
  }

  try {
    const url = s3Instance.getSignedUrl('getObject', {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
      Expires: 604800 // 7 days in seconds
    });
    return url;
  } catch (err) {
    console.log("[Presigned URL] Error:", err);
    return key; // Return original if error
  }
};

// Helper to convert image fields in an object to presigned URLs
exports.convertToPresignedUrls = (obj, imageFields = ['image', 'profile_url', 'cover_image', 'thumbnail']) => {
  if (!obj) return obj;

  const convert = (item) => {
    if (!item || typeof item !== 'object') return item;

    const converted = { ...item._doc || item };
    for (const field of imageFields) {
      if (converted[field] && typeof converted[field] === 'string' && converted[field].includes('amazonaws.com')) {
        converted[field] = exports.getPresignedUrl(converted[field]);
      }
    }
    return converted;
  };

  if (Array.isArray(obj)) {
    return obj.map(convert);
  }
  return convert(obj);
};

// Determine if we're in localhost/development mode
const IS_LOCALHOST = process.env.NODE_ENV !== 'production' || !process.env.AWS_ACCESS_KEY_ID;
const UPLOAD_DIR = path.join(__dirname, '../uploads');

// Create uploads directory if it doesn't exist
if (IS_LOCALHOST && !fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log('[Upload] Created uploads directory:', UPLOAD_DIR);
}

//upload file.
exports.upload = async (filePath, originalFileName, modelName) => {
  return new Promise((resolve, reject) => {
    // FOR LOCALHOST: Store files locally
    if (IS_LOCALHOST) {
      console.log("[Upload] Localhost mode - storing file locally");

      const name = originalFileName.split(".");
      const ext = name[name.length - 1];
      const fileName = `${uuidv1()}.${ext}`;

      // Create model subdirectory if it doesn't exist
      const modelDir = path.join(UPLOAD_DIR, modelName);
      if (!fs.existsSync(modelDir)) {
        fs.mkdirSync(modelDir, { recursive: true });
      }

      const destinationPath = path.join(modelDir, fileName);
      const publicUrl = `/uploads/${modelName}/${fileName}`;

      // Copy file to uploads directory
      fs.copyFile(filePath, destinationPath, (err) => {
        // Delete temp file
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error('[Upload] Error deleting temp file:', unlinkErr);
          }
        });

        if (err) {
          console.log("[Upload] Local file save error:", err);
          reject(err);
          return;
        }

        console.log("[Upload] Local file saved successfully:", publicUrl);
        resolve(publicUrl);
      });

      return;
    }

    // FOR PRODUCTION: Upload to S3
    console.log("[Upload] Production mode - uploading to S3");
    fs.readFile(filePath, function (err, data) {
      if (err) {
        console.log("[Upload] File read error:", err);
        reject(err);
        return;
      }

      const name = originalFileName.split(".");
      const ext = name[name.length - 1];
      name.pop();
      const tempfileName = name.toString();
      const fileName = tempfileName.replace(/,/g, "");

      const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        params: {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: modelName + "/" + uuidv1() + "." + ext,
        },
      });
      s3.upload({ Body: data }, function (err, data) {
        console.log(data, err, "DATA 1");
        // Whether there is an error or not, delete the temp file
        fs.unlink(filePath, function (err) {
          if (err) {
            console.error(err);
          }
        });
        if (err) {
          console.log("[Upload] S3 upload error:", err);
          reject(err);
          return;
        }
        console.log("[Upload] S3 upload success:", data.Location);
        resolve(data.Location);
      });
    });
  });
};

exports.uploadproductImage = (imageData, folder, fileName) => {
  return new Promise((resolve, reject) => {
    // Handle both Buffer (from express-fileupload) and base64 string
    let uploadData;
    if (Buffer.isBuffer(imageData)) {
      // Already a Buffer from express-fileupload
      uploadData = imageData;
      console.log("[uploadproductImage] Using raw Buffer, size:", imageData.length);
    } else if (typeof imageData === 'string') {
      // Base64 string
      uploadData = Buffer.from(imageData, "base64");
      console.log("[uploadproductImage] Converted from base64, size:", uploadData.length);
    } else {
      console.log("[uploadproductImage] Unknown data type:", typeof imageData);
      return reject(new Error("Invalid image data type"));
    }

    const name = uuidv1() + "/" + `${fileName || ""}`;
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${folder || "university"}/` + name,
    };

    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      params,
    });

    s3.upload({ Body: uploadData }, (err, data) => {
      if (err) {
        console.log("[uploadproductImage] S3 upload error:", err);
        return reject(err);
      }
      console.log("[uploadproductImage] S3 upload success:", data.Location);
      return resolve({
        url: data.Location,
        name: fileName || undefined,
      });
    });
  });
};
exports.uploadnewsImage = (base64, fileName, folder) => {
  return new Promise((resolve, reject) => {
    const base64Data = new Buffer.from(base64, "base64");
    const name = uuidv1() + "/" + `${fileName || ""}`;
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${folder || "news"}/` + name,
    };

    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      params,
    });

    s3.upload({ Body: base64Data }, (err, data) => {
      if (err) {
        return reject(err);
      }
      return resolve({
        url: data.Location,
        name: fileName || undefined,
      });
    });
  });
};
exports.uploadeventsImage = (base64, fileName, folder) => {
  return new Promise((resolve, reject) => {
    const base64Data = new Buffer.from(base64, "base64");
    const name = uuidv1() + "/" + `${fileName || ""}`;
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${folder || "events"}/` + name,
    };

    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      params,
    });

    s3.upload({ Body: base64Data }, (err, data) => {
      if (err) {
        return reject(err);
      }
      return resolve({
        url: data.Location,
        name: fileName || undefined,
      });
    });
  });
};
//compress video and return location.
exports.compressVideo = (files, cb) => {
  return new Promise((resolve, reject) => {
    const file = files.file;
    ffmpeg(file.path)
      .videoCodec("libx264")
      .size("640x480")
      .on("error", function (err) {
        console.log("An error occurred: " + err.message);
        return reject(err.message);
      })
      .on("progress", function (progress) {
        console.log("... frames: " + progress.frames);
      })
      .on("end", function (v) {
        return resolve(`uploads/${file.name}`);
      })
      .save(`uploads/${file.name}`);
  });
};

//Deletes file from the bucket.
exports.deleteFile = async filePath => {
  var params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: filePath,
  };

  const bucketInstance = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    params,
  });
  let result = null;
  await bucketInstance.deleteObject(params, function (err, data) {
    if (data) {
      console.log("File deleted successfully", data);
    } else {
      console.log("Check if you have sufficient permissions : " + err);
      result = err;
    }
  });
  return result;
};

//upload file.
exports.uploadImage = async (data, originalFileName, modelName) => {
  return new Promise((resolve, reject) => {
    const ext = originalFileName;

    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      params: {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: modelName + "/" + uuidv1() + "." + ext,
      },
    });
    s3.upload({ Body: data }, function (err, data) {
      if (err) {
        console.log("[UploadImage] S3 upload error:", err);
        reject(err);
        return;
      }
      console.log("[UploadImage] S3 upload success:", data.Location);
      resolve(data.Location);
    });
  });
};

/**
 * Upload a buffer to S3 or local storage
 * @param {Buffer} buffer - The image buffer to upload
 * @param {string} fileName - The file name (without extension)
 * @param {string} modelName - The model/folder name
 * @returns {Promise<string>} - The URL of the uploaded file
 */
const uploadBuffer = async (buffer, fileName, modelName) => {
  return new Promise((resolve, reject) => {
    // FOR LOCALHOST: Store files locally
    if (IS_LOCALHOST) {
      console.log("[UploadBuffer] Localhost mode - storing file locally");

      // Create model subdirectory if it doesn't exist
      const modelDir = path.join(UPLOAD_DIR, modelName);
      if (!fs.existsSync(modelDir)) {
        fs.mkdirSync(modelDir, { recursive: true });
      }

      const destinationPath = path.join(modelDir, fileName);
      const publicUrl = `/uploads/${modelName}/${fileName}`;

      fs.writeFile(destinationPath, buffer, (err) => {
        if (err) {
          console.log("[UploadBuffer] Local file save error:", err);
          reject(err);
          return;
        }
        console.log("[UploadBuffer] Local file saved successfully:", publicUrl);
        resolve(publicUrl);
      });

      return;
    }

    // FOR PRODUCTION: Upload to S3
    console.log("[UploadBuffer] Production mode - uploading to S3");

    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      params: {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `${modelName}/${fileName}`,
        ContentType: 'image/jpeg'
      },
    });

    s3.upload({ Body: buffer }, function (err, data) {
      if (err) {
        console.log("[UploadBuffer] S3 upload error:", err);
        reject(err);
        return;
      }
      console.log("[UploadBuffer] S3 upload success:", data.Location);
      resolve(data.Location);
    });
  });
};

/**
 * Upload profile image with multiple sizes
 * @param {string} filePath - Path to the temp file
 * @param {Object} file - The file object with name, mimetype, size
 * @returns {Promise<Object>} - Object containing URLs for each size
 */
exports.uploadProfileImageMultiSize = async (filePath, file) => {
  try {
    // Validate the image
    const validation = validateImage(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    console.log("[ProfileUpload] Processing image:", file.name);

    // Process image into multiple sizes
    const processedImages = await processProfileImage(filePath);

    // Generate a unique base name for all sizes
    const baseName = uuidv1();
    const modelName = "profile";

    // Upload each size
    const urls = {};
    const uploadPromises = Object.entries(processedImages).map(async ([sizeName, buffer]) => {
      const fileName = `${baseName}_${sizeName}.jpg`;
      const url = await uploadBuffer(buffer, fileName, modelName);
      urls[sizeName] = url;
      console.log(`[ProfileUpload] Uploaded ${sizeName}:`, url);
    });

    await Promise.all(uploadPromises);

    // Delete the temp file
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("[ProfileUpload] Error deleting temp file:", err);
      }
    });

    console.log("[ProfileUpload] All sizes uploaded successfully:", urls);

    return {
      profile_url: urls.large, // Default profile_url uses large size for backward compatibility
      profile_images: urls
    };
  } catch (error) {
    // Delete the temp file on error
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("[ProfileUpload] Error deleting temp file on error:", err);
      }
    });
    throw error;
  }
};
