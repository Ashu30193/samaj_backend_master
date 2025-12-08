const fs = require("fs");
const path = require("path");
const AWS = require("aws-sdk");
const ffmpeg = require("fluent-ffmpeg");
const { v1: uuidv1 } = require("uuid");

ffmpeg.setFfmpegPath("/usr/bin/ffmpeg");
ffmpeg.setFfprobePath("/usr/bin/ffprobe");
ffmpeg.setFlvtoolPath("/usr/bin");

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
      s3.upload({ ACL: "public-read", Body: data }, function (err, data) {
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

exports.uploadproductImage = (base64, folder, fileName) => {
  return new Promise((resolve, reject) => {
    const base64Data = new Buffer.from(base64, "base64");
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

    s3.upload({ ACL: "public-read", Body: base64Data }, (err, data) => {
      // Whether there is an error or not, delete the temp file
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

    s3.upload({ ACL: "public-read", Body: base64Data }, (err, data) => {
      // Whether there is an error or not, delete the temp file
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

    s3.upload({ ACL: "public-read", Body: base64Data }, (err, data) => {
      // Whether there is an error or not, delete the temp file
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
    s3.upload({ ACL: "public-read", Body: data }, function (err, data) {
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
