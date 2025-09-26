const _ = require("lodash");
const Product = require("../models/product");
const { uploadproductImage, deleteFile } = require("../services/upload-files");
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
  const filters = await convertParams(Product, req.query);
  Product.find(filters.find)
    .populate("updatedBy")
    .populate("createdBy")
    .populate("category")
    .populate("business")
    .where(filters.where)
    .sort({ created_at: "desc" })
    .skip(filters.start)
    .limit(filters.limit)
    .exec(function (err, data) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      Product.countDocuments(
        { ...filters.where, ...filters.find },
        (err, count) => {
          if (err) {
            res.status(400);
            res.send({ message: "Parameters are not valid" });
          }
          const categoryList = {
            data,
            total: count,
          };
          res.status(200).send(categoryList);
        },
      );
    });
};
exports.findOne = function (req, res) {
  const { params } = req;
  Product.findOne({ _id: params.id })
    .populate("updatedBy")
    .populate("createdBy")
    // .populate("category")
    .populate("business")
    .exec(function (err, category) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      res.send(category);
    });
};

exports.create = async function (req, res) {
  const { body, user, files } = req;
  let arr = [];
  if (files && files.image && files.image.length > 1) {
    for (i = 0; i < files.image.length; i++) {
      var { url } = await uploadproductImage(
        files.image[i].data,
        "products",
        files.image[i].name,
      );
      arr.push(url);
    }
    body.image = arr;
  } else {
    var { url } = await uploadproductImage(
      files.image.data,
      "products",
      files.image.name,
    );
    body.image = url;
  }

  if (user) {
    body.createdBy = user._id;
    body.updatedBy = user._id;
  }
  Product.create(body, function (err, data) {
    if (err) {
      res.status(400);
      res.send(err);
    }
    res.send(data);
  });
};

exports.update = async function (req, res) {
  const { body, user, params, files } = req;
  if (user) {
    body.updatedBy = user._id;
  }

  let productDetails = await Product.findOne({ _id: params.id });
  if (!productDetails) {
    res.status(400);
    res.send({ message: "Id not found!" });
  }
  let imageArr = productDetails.image;
  let difference = [];
  const existingImage = body.existImage || [];
  if (existingImage) {
    difference = imageArr.filter((x) => !existingImage.includes(x));
  }

  if (difference.length) {
    for (let i = 0; i < difference.length; i++) {
      let deleteImage = await deleteFile(difference[i]);
      if (deleteImage) {
        res.status(deleteImage.statusCode);
        return res.send({ message: deleteImage.message });
      }
      const index = imageArr.indexOf(difference[i]);
      imageArr.splice(index, 1);
    }
  }

  if (files && files.image) {
    if (files.image.length > 1) {
      for (i = 0; i < files.image.length; i++) {
        var { url } = await uploadproductImage(
          files.image[i].data,
          "products",
          files.image[i].name,
        );
        imageArr.push(url);
      }
    } else {
      var { url } = await uploadproductImage(
        files.image.data,
        "products",
        files.image.name,
      );
      imageArr.push(url);
    }
  }
  body.image = imageArr;
  if (params.id) {
    Product.updateOne({ _id: params.id }, body, function (err, data) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      Product.findOne({ _id: params.id })
        .populate("updatedBy")
        .populate("createdBy")
        .populate("category")
        .populate("business")
        .exec(function (err, category) {
          if (err) {
            res.status(400);
            res.send(err);
          }
          res.send(category);
        });
    });
  } else {
    res.status(400);
    res.send({ message: "Id not found!" });
  }
};

exports.delete = function (req, res) {
  const { params } = req;
  if (params.id) {
    Product.deleteOne({ _id: params.id }, function (err, data) {
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
