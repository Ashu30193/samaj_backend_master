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
    let location = req.files.newsImage.data;
    const originalFileName = req.files.newsImage.name;
    if (req.files && req.files.newsImage) {
      const data = await uploadnewsImage(location, originalFileName, "news");
      body.image = data.url;
    }
    News.create(body, (err, post) => {
      if (err) {
        res.status(400);
        res.send(err);
      }
      res.send(post);
    });
  }
};

exports.create = (req, res) => {
  const { body, user } = req;

  // Handle JSON requests (no file upload)
  if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
    if (user) {
      body.createdBy = user._id;
      body.updatedBy = user._id;
    }
    News.create(body, (err, news) => {
      if (err) {
        res.status(400);
        res.send(err);
      } else {
        res.send(news);
      }
    });
    return;
  }

  // Handle multipart form data (with or without file upload)
  const form = new formidable.IncomingForm();
  form.maxFileSize = 50 * 1024 * 1024; // 50MB max
  form.keepExtensions = true;
  form.multiples = false;

  form.parse(req, async (err, fields, files) => {

    if (err) {
      res.status(400);
      res.send({ error: 'FormData parsing failed', details: err.message });
      return;
    }

    if (user) {
      fields.createdBy = user._id;
      fields.updatedBy = user._id;
    }

    // Handle optional file upload - only if file is actually provided
    if (files && files.file && files.file.size > 0 && files.file.name) {
      try {
        let location = files.file.path;
        const originalFileName = files.file.name;
        const data = await upload(location, originalFileName, "news");
        fields.image = data;
      } catch (uploadError) {
        // Continue without image instead of failing
      }
    }

    News.create(fields, (err, post) => {
      if (err) {
        res.status(400);
        res.send(err);
      } else {
        res.send(post);
      }
    });
  });
};

exports.addNews = function (req, res) {
  const { body, user } = req;

  if (user) {
    body.createdBy = user._id;
    body.updatedBy = user._id;
  }

  News.create(body, function (err, news) {
    if (err) {
      res.status(400);
      res.send(err);
    } else {
      res.send(news);
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
