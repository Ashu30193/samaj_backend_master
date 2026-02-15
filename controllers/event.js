const Category = require("../models/category");
const _ = require("lodash");
const Event = require("../models/event");
const { uploadeventsImage, upload } = require("../services/upload-files");

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
      { name: { $regex: `^${params.keyword}`, $options: "i" } },
      { createdBy: { $regex: `^${params.keyword}`, $options: "i" } },
      { updatedBy: { $regex: `^${params.keyword}`, $options: "i" } },
    ];
    finalQuery.find["$or"] = $or;
  }
  return finalQuery;
};

exports.list = async function (req, res) {
  const filters = convertParams(Category, req.query);
  Event.find(filters.find)
    .populate("updatedBy")
    .populate("createdBy")
    .where(filters.where)
    .sort({ created_at: "desc" })
    .skip(filters.start)
    .limit(filters.limit)
    .exec(function (err, categories) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      Event.countDocuments(
        { ...filters.where, ...filters.find },
        (err, count) => {
          if (err) {
            res.status(400);
            res.send({ message: "Parameters are not valid" });
          }
          const categoryList = {
            events: categories,
            categoryCount: categories.length,
            total: count,
          };

          res.status(200).send(categoryList);
        },
      );
    });
};
exports.findOne = function (req, res) {
  const { params } = req;
  Event.findOne({ _id: params.id }).exec(function (err, event) {
    if (err) {
      res.status(400);
      res.send(err);
    }
    res.send(event);
  });
};

exports.create = function (req, res) {
  const { body, admin, user } = req;
  if (admin) {
    body.createdBy = admin._id;
    body.updatedBy = admin._id;
  } else if (user) {
    body.createdBy = user._id;
    body.updatedBy = user._id;
  }
  Event.create(body, function (err, event) {
    if (err) {
      res.status(400);
      res.send(err);
    }
    res.send(event);
  });
};
exports.createAdminEvent = async function (req, res) {
  const { body, admin } = req;
  if (admin) {
    body.createdBy = admin._id;
    body.updatedBy = admin._id;
  }
  if (req.files == null) {
    return res.status(404).send({ message: "No Image Found." });
  } else {
    try {
      const eventImage = req.files.eventImage;
      // Use tempFilePath for express-fileupload with useTempFiles: true
      const tempPath = eventImage.tempFilePath || eventImage.path;
      const originalFileName = eventImage.name;
      console.log("[Event CreateAdmin] Uploading image:", originalFileName, "from:", tempPath);

      const imageUrl = await upload(tempPath, originalFileName, "events");
      body.image = imageUrl;
      console.log("[Event CreateAdmin] Image uploaded:", imageUrl);

      Event.create(body, (err, result) => {
        if (err) {
          console.error("[Event CreateAdmin] Error:", err);
          res.status(400);
          res.send(err);
        }
        res.send(result);
      });
    } catch (uploadError) {
      console.error("[Event CreateAdmin] Upload error:", uploadError);
      res.status(500).send({ message: "Failed to upload image", error: uploadError.message });
    }
  }
};
exports.update = function (req, res) {
  const { body, user, params } = req;

  if (user) {
    body.updatedBy = user._id;
  }
  if (params.id) {
    Event.updateOne({ _id: params.id }, body, function (err, event) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      res.send(event);
    });
  } else {
    res.status(400);
    res.send({ message: "Event id not found!" });
  }
};

exports.delete = function (req, res) {
  const { params } = req;

  if (params.id) {
    Event.deleteOne({ _id: params.id }, function (err, event) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      res.send(event);
    });
  } else {
    res.status(400);
    res.send({ message: "Event id not found!" });
  }
};
exports.deleteEventByAdmin = function (req, res) {
  const { params } = req;

  if (params.id) {
    Event.deleteOne({ _id: params.id }, function (err, event) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      res.send(event);
    });
  } else {
    res.status(400);
    res.send({ message: "Event id not found!" });
  }
};
