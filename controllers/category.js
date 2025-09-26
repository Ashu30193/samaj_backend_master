const Category = require("../models/category");
const Business = require("../models/business");
const Product = require("../models/product");
const _ = require("lodash");

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
  const filters = await convertParams(Category, req.query);

  Category.find(filters.find)
    .populate("updatedBy")
    .populate("createdBy")
    .where(filters.where)
    .sort({ name: "asc" })
    .skip(filters.start)
    .limit(filters.limit)
    .exec(function (err, categories) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      Category.countDocuments({ ...filters.where, ...filters.find }, (err, count) => {
        if (err) {
          res.status(400);
          res.send({ message: "Parameters are not valid" });
        }
        const categoryList = {
          categories: categories,
          categoryCount: categories.length,
          total: count,
        };

        res.status(200).send(categoryList);
      });
    });
};
exports.findProduct = async function (req, res) {
  const filters = await convertParams(Category, req.query);
  const { params, user } = req;
  Business.find({ businesscategory: params.id })
    .select("_id")
    .exec(function (err, data) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      if (data.length) {
        let id = [];
        data.forEach(element => {
          id.push(element._id);
        });
        Product.find({ business: { $in: id }, createdBy: { $ne: user._id } })
          .populate("updatedBy")
          .populate("createdBy")
          .populate("business")
          .exec(function (err, product) {
            if (err) {
              res.status(400);
              res.send(err);
            }
            res.send(product);
          });
      } else {
        res.status(200);
        res.send([]);
      }
    });
};
exports.findOne = function (req, res) {
  const { params } = req;
  Category.findOne({ _id: params.id }).exec(function (err, category) {
    if (err) {
      res.status(400);
      res.send(err);
    }
    res.send(category);
  });
};

exports.create = function (req, res) {
  const { body, user } = req;
  if (user) {
    body.createdBy = user._id;
    body.updatedBy = user._id;
  }
  Category.create(body, function (err, category) {
    if (err) {
      res.status(400);
      res.send(err);
    }
    res.send(category);
  });
};

exports.update = function (req, res) {
  const { body, user, params } = req;

  if (user) {
    body.updatedBy = user._id;
  }
  if (params.id) {
    Category.updateOne({ _id: params.id }, body, function (err, category) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      res.send(category);
    });
  } else {
    res.status(400);
    res.send({ message: "Category id not found!" });
  }
};

exports.delete = function (req, res) {
  const { params } = req;

  if (params.id) {
    Category.deleteOne({ _id: params.id }, function (err, category) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      res.status(200);
      res.send({ message: "Delete successfully!" });
    });
  } else {
    res.status(400);
    res.send({ message: "Category id not found!" });
  }
};
