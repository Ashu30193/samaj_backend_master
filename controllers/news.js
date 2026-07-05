const _ = require("lodash");
const News = require("../models/news");
const Product = require("../models/product");
const { uploadnewsImage, upload } = require("../services/upload-files");
const formidable = require("formidable");

const convertParams = (model, params) => {
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

  _.map(query, q => {
    _.map(options, option => {
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
  _.map(final, f => {
    if (f === "name") {
      finalQuery.where[f] = { $regex: `^${params[f]}`, $options: "i" };
    } else {
      finalQuery.where[f] = params[f];
    }
  });
  _.map(query, f => {
    if (f === "type") {
      finalQuery.where[f] = params[f];
    }
  });
  if (params.keyword) {
    const $or = [
      { name: { $regex: `^${params.keyword}`, $options: "i" } },
      { createdBy: { $regex: `^${params.keyword}`, $options: "i" } },
      { updatedBy: { $regex: `^${params.keyword}`, $options: "i" } },
    ];
    finalQuery.find["$or"] = $or;
  }
  return finalQuery;
};

exports.list = async function (req, res) {
  const filters = await convertParams(News, req.query);
  News.find(filters.find)
    .populate("updatedBy")
    .populate("createdBy")
    .where(filters.where)
    .sort({ created_at: "desc" })
    .skip(filters.start)
    .limit(filters.limit)
    .exec((err, data) => {
      if (err) {
        res.status(400);
        res.send(err);
      }
      News.countDocuments({ ...filters.where, ...filters.find }, (err, count) => {
        if (err) {
          res.status(400);
          res.send({ message: "Parameters are not valid" });
        }
        const categoryList = {
          data,
          total: count,
        };
        res.status(200).send(categoryList);
      });
    });
};

exports.findOne = function (req, res) {
  const { params } = req;
  News.findOne({ _id: params.id })
    .populate("updatedBy")
    .populate("createdBy")
    .populate("category")
    .exec((err, category) => {
      if (err) {
        res.status(400);
        res.send(err);
      }
      res.send(category);
    });
};

// exports.create = async function (req, res) {
//   const { body, user } = req;
//   if (user) {
//     body.createdBy = user._id;
//     body.updatedBy = user._id;
//   }

//   if (body.image) {
//     const { url } = await upload(body.image.url, "products", body.image.name);
//     body.image = url;
//   }
//   News.create(body, function (err, data) {
//     if (err) {
//       res.status(400);
//       res.send(err);
//     }
//     res.send(data);
//   });
// };


exports.createNewsByAdmin = async (req, res) => {
  const { body, admin } = req;
  if (admin) {
    body.createdBy = admin._id;
    body.updatedBy = admin._id;
  }
  if (req.files == null) {
    return res.status(404).send({ message: "No Image Found." });
  } else {
    try {
      const newsImage = req.files.newsImage;
      // Use tempFilePath for express-fileupload with useTempFiles: true
      const tempPath = newsImage.tempFilePath || newsImage.path;
      const originalFileName = newsImage.name;
      console.log("[News CreateByAdmin] Uploading image:", originalFileName, "from:", tempPath);

      const imageUrl = await upload(tempPath, originalFileName, "news");
      body.image = imageUrl;
      console.log("[News CreateByAdmin] Image uploaded:", imageUrl);

      News.create(body, (err, post) => {
        if (err) {
          console.error("[News CreateByAdmin] Error:", err);
          res.status(400);
          res.send(err);
        }
        res.send(post);
      });
    } catch (uploadError) {
      console.error("[News CreateByAdmin] Upload error:", uploadError);
      res.status(500).send({ message: "Failed to upload image", error: uploadError.message });
    }
  }
};

exports.create = async (req, res) => {
  console.log("[News Create] Request received");
  console.log("[News Create] Content-Type:", req.headers['content-type']);
  console.log("[News Create] User:", req.user ? req.user._id : "No user");

  const { body, user, files } = req;

  // Handle JSON requests (no file upload)
  if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
    console.log("[News Create] Handling JSON request");
    console.log("[News Create] Body:", JSON.stringify(body, null, 2));

    if (user) {
      body.createdBy = user._id;
      body.updatedBy = user._id;
    }

    News.create(body, (err, news) => {
      if (err) {
        console.log("[News Create] Error creating news (JSON):", err);
        return res.status(400).send(err);
      } else {
        console.log("[News Create] News created successfully (JSON):", news._id);
        return res.status(200).send(news);
      }
    });
    return;
  }

  // Handle multipart form data (with or without file upload)
  // Using express-fileupload (already parsed by middleware)
  console.log("[News Create] Handling multipart/form-data request");
  console.log("[News Create] Body fields:", body);
  console.log("[News Create] Files:", files ? Object.keys(files) : "none");

  try {
    const newsData = { ...body };

    if (user) {
      newsData.createdBy = user._id;
      newsData.updatedBy = user._id;
    }

    // Handle optional file upload(s) - only if file(s) actually provided
    // express-fileupload gives a single object for one file, or an array when
    // multiple files are sent under the same field name ("file").
    if (files && files.file) {
      const fileArray = Array.isArray(files.file) ? files.file : [files.file];
      console.log(
        "[News Create] Uploading files:",
        fileArray.map(f => f.name),
      );
      try {
        const imageUrls = await Promise.all(
          fileArray.map(f => {
            const tempPath = f.tempFilePath || f.path;
            return upload(tempPath, f.name, "news");
          }),
        );
        newsData.images = imageUrls;
        newsData.image = imageUrls[0]; // kept for backward compatibility
        console.log("[News Create] Files uploaded successfully:", imageUrls);
      } catch (uploadError) {
        console.log("[News Create] Upload error (continuing without image):", uploadError);
        // Continue without image instead of failing
      }
    }

    console.log("[News Create] Creating news document...");
    News.create(newsData, (err, post) => {
      if (err) {
        console.log("[News Create] Error creating news (FormData):", err);
        return res.status(400).send(err);
      } else {
        console.log("[News Create] News created successfully (FormData):", post._id);
        return res.status(200).send(post);
      }
    });
  } catch (error) {
    console.log("[News Create] Unexpected error:", error);
    return res.status(500).send({ error: 'Internal server error', details: error.message });
  }
};

exports.addNews = function (req, res) {
  const { body, user } = req;

  if (user) {
    body.createdBy = user._id;
    body.updatedBy = user._id;
  }

  News.create(body, function (err, news) {
    if (err) {
      console.log("[News AddNews] Error:", err);
      return res.status(400).send(err);
    } else {
      console.log("[News AddNews] Success:", news._id);
      return res.status(200).send(news);
    }
  });
};

exports.update = function (req, res) {
  const { body, user, params } = req;
  if (user) {
    body.updatedBy = user._id;
  }
  if (params.id) {
    News.updateOne({ _id: params.id }, body, (err, data) => {
      if (err) {
        res.status(400);
        res.send(err);
      }
      res.send(data);
    });
  } else {
    res.status(400);
    res.send({ message: "Id not found!" });
  }
};

// exports.delete = function (req, res) {
//   console.log("delete news api logg");
//   const { params } = req;
//   if (params.id) {
//     News.deleteOne({ _id: params.id }, function (err, data) {
//       if (err) {
//         res.status(400);
//         res.send(err);
//       }
//       res.send(data);
//     });
//   } else {
//     res.status(400);
//     res.send({ message: "Id not found!" });
//   }
// };
exports.deleteNewsAdmin = function (req, res) {
  const { params } = req;

  if (params.id) {
    News.deleteOne({ _id: params.id }, function (err, data) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      res.send(data);
    });
  } else {
    res.status(400);
    res.send({ message: "Id not found!" });
  }
};
