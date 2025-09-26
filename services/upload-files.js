const fs = require("fs");
const AWS = require("aws-sdk");
const config = require("../config.json");
const ffmpeg = require("fluent-ffmpeg");
const { v1: uuidv1 } = require("uuid");

ffmpeg.setFfmpegPath("/usr/bin/ffmpeg");
ffmpeg.setFfprobePath("/usr/bin/ffprobe");
ffmpeg.setFlvtoolPath("/usr/bin");

//upload file.
exports.upload = async (path, originalFileName, modelName) => {
  return new Promise((resolve, reject) => {
    fs.readFile(path, function (err, data) {
      if (err) throw err; // Something went wrong!
      const name = originalFileName.split(".");
      const ext = name[name.length - 1];
      name.pop();
      const tempfileName = name.toString();
      const fileName = tempfileName.replace(/,/g, "");

      const s3 = new AWS.S3({
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
        params: {
          Bucket: config.aws.bucketName,
          Key: modelName + "/" + uuidv1() + "." + ext,
        },
      });
      s3.upload({ ACL: "public-read", Body: data }, function (err, data) {
        console.log(data, err, "DATA 1");
        // Whether there is an error or not, delete the temp file
        fs.unlink(path, function (err) {
          if (err) {
            console.error(err);
          }
        });
        if (err) {
          reject();
          return { err, status: "error" };
        }
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
      Bucket: config.aws.bucketName,
      Key: `${folder || "university"}/` + name,
    };

    const s3 = new AWS.S3({
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
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
      Bucket: config.aws.bucketName,
      Key: `${folder || "news"}/` + name,
    };

    const s3 = new AWS.S3({
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
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
      Bucket: config.aws.bucketName,
      Key: `${folder || "events"}/` + name,
    };

    const s3 = new AWS.S3({
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
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
    Bucket: config.aws.bucketName,
    Key: filePath,
  };

  const bucketInstance = new AWS.S3({
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
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
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
      params: {
        Bucket: config.aws.bucketName,
        Key: modelName + "/" + uuidv1() + "." + ext,
      },
    });
    s3.upload({ ACL: "public-read", Body: data }, function (err, data) {
      if (err) {
        reject();
        return null;
      }
      resolve(data.Location);
    });
  });
};
