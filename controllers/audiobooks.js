const AudioBook = require("../models/audiobooks");
const _ = require("lodash");
const {v1: uuidv1} = require("uuid");
const config = require("../config.json");
const AWS = require("aws-sdk");

function convertParams(model, params) {
  const finalQuery = {};
  const keys = _.keys(model.schema.obj);
  const query = _.keys(params);
  const final = _.intersectionWith(query, keys);
  const options = ["_ne", "_lt", "_gt", "_lte", "_gte"];
  finalQuery.find = {};
  finalQuery.where = {};
  finalQuery.sort = {};
  finalQuery.start = 0;
  finalQuery.limit = 1000;

  _.map(query, (q) => {
    _.map(options, (option) => {
      if (_.includes(q, option)) {
        var newQuery = {};
        newQuery[option.replace("_", "$")] = params[q];
        finalQuery.where[q.replace(option, "")] = newQuery;
      } else if (_.includes(q, "_sort")) {
        var actualQuery = params[q].split(":");
        finalQuery.sort[actualQuery[0]] = actualQuery[1];
      } else if (_.includes(q, "_start")) {
        finalQuery.start = (parseInt(params[q]) - 1) * parseInt(params._limit);
      } else if (_.includes(q, "_limit")) {
        finalQuery.limit = parseInt(params[q]);
      }
    });
  });
  _.map(final, (f) => {
    if (f === "name") {
      finalQuery.where[f] = { $regex: `^${params[f]}`, $options: "i" };
    } else {
      finalQuery.where[f] = params[f];
    }
  });
  _.map(query, (f) => {
    if (f === "type") {
      finalQuery.where[f] = params[f];
    }
  });
  if (params.keyword) {
    const $or = [
      { serviceUser: { $regex: `^${params.keyword}`, $options: "i" } },
      { form_id: { $regex: `^${params.keyword}`, $options: "i" } },
    ];
    finalQuery.find["$or"] = $or;
  }
  return finalQuery;
}

const upload = ({ base64, fileName }, folder) => {
  return new Promise((resolve, reject) => {
    const base64Data = new Buffer.from(
      base64.split(";")[1].replace(/^base64,/, ""),
      "base64",
    );
    const type = base64.split(";")[0].split("/")[1];
    const name = uuidv1() + fileName;
    const params = {
      Bucket: config.aws.bucketName,
      Key: `${folder || "audiobooks"}/` + name,
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
        src: data.Location,
        name: fileName || undefined,
      });
    });
  });
};

const uploadSignatues = (signatures) => {
  return Promise.all(
    signatures.map(async (key) => {
      if (key.base64) {
        return {
          ...(await upload(key)),
          size: key.size,
          time: key.time,
          title: key.title,
        };
      }
      return key;
    }),
  ).then((res) => res);
};

exports.list = async function (req, res) {
  const filters = await convertParams(AudioBook, req.query);
  AudioBook.find(filters.find)
    .where(filters.where)
    .populate("updatedBy")
    .populate("createdBy")
    .populate("category")
    .sort({ created_at: "desc" })
    .skip(filters.start)
    .limit(filters.limit)
    .exec(function (err, audiobooks) {
      if (err) {
        return res.status(400).send(err);
      }
      AudioBook.countDocuments(
        { ...filters.where, ...filters.find },
        (err, count) => {
          if (err) {
            res.status(400);
            res.send({ message: "Parameters are not valid" });
          }
          const audioBooksList = {
            audiobooks,
            audioBooksCount: audiobooks.length,
            total: count,
          };

          res.status(200).send(audioBooksList);
        },
      );
    });
};

exports.findOne = function (req, res) {
  const { params } = req;
  AudioBook.findOne({ _id: params.id })
    .populate("updatedBy")
    .populate("createdBy")
    .populate("category")
    .exec(function (err, audiobooks) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      res.send(audiobooks);
    });
};

exports.create = (req, res) => {
  const { body, user } = req;
  if (user) {
    body.createdBy = user._id;
    body.updatedBy = user._id;
  }
  if (body.cover) {
    upload(body.cover, "bookcover")
      .then((bookCover) => {
        body.cover = bookCover.src;
        if (body.audio) {
          uploadSignatues(body.audio)
            .then((resp) => {
              body.audio = resp;
              AudioBook.create(body, function (err, audiobooks) {
                if (err) {
                  res.status(400);
                  res.send(err);
                }
                res.send(audiobooks);
              });
            })
            .catch(() =>
              res
                .status(400)
                .send({ message: "Failed to upload audio files." }),
            );
        } else {
          res.status(400).send({ message: "Audio files are missing." });
        }
      })
      .catch(() =>
        res.status(400).send({ message: "Failed to upload cover image." }),
      );
  } else {
    res.status(400).send({ message: "Audio book cover image is missing." });
  }
};

const updateAudios = (body, res) => {
  if (body.audio) {
    uploadSignatues(body.audio)
      .then((resp) => {
        body.audio = resp;
        AudioBook.updateOne(body, function (err, audiobooks) {
          if (err) {
            res.status(400);
            res.send(err);
          }
          res.send(audiobooks);
        });
      })
      .catch(() =>
        res.status(400).send({ message: "Failed to upload audio files." }),
      );
  } else {
    res.status(400).send({ message: "Audio files are missing." });
  }
};

exports.update = function (req, res) {
  const { body, user, params } = req;
  if (user) {
    body.updatedBy = user._id;
  }
  if (params.id) {
    if (body.cover) {
      if (typeof body.cover === "string" && body.cover.startsWith("https")) {
        body.cover = body.cover;
        updateAudios(body, res);
      } else {
        upload(body.cover).then((cover) => {
          body.cover = cover.src;
          updateAudios(body, res);
        });
      }
    }
  } else {
    res.status(400);
    res.send({ message: "AudioBook id not found!" });
  }
};

exports.delete = function (req, res) {
  const { params } = req;

  if (params.id) {
    AudioBook.deleteOne({ _id: params.id }, function (err, audiobooks) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      res.send(audiobooks);
    });
  } else {
    res.status(400);
    res.send({ message: "Audio book id not found!" });
  }
};
