const _ = require("lodash");
const WishList = require("../models/wishlist");

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
        const newQuery = {};
        newQuery[option.replace("_", "$")] = params[q];
        finalQuery.where[q.replace(option, "")] = newQuery;
      } else if (_.includes(q, "_sort")) {
        const actualQuery = params[q].split(":");
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

exports.list = async (req, res) => {
  const filters = await convertParams(WishList, req.query);
  WishList.find(filters.find)
    .populate("audioBook")
    .populate("user")
    .where(filters.where)
    .sort({ created_at: "desc" })
    .skip(filters.start)
    .limit(filters.limit)
    .exec((err, wishlist) => {
      if (err) {
        res.status(400);
        res.send(err);
      }
      WishList.countDocuments(
        { ...filters.where, ...filters.find },
        (err, count) => {
          if (err) {
            res.status(400);
            res.send({ message: "Invalid path parameters." });
          }
          res.status(200).send({
            wishlist,
            wishlistCount: wishlist.length,
            total: count,
          });
        },
      );
    });
};

exports.create = (req, res) => {
  const { body, user } = req;
  body.user = user._id;
  WishList.create(body, (err, wishlist) => {
    if (err) {
      res.status(400);
      res.send(err);
    }
    res.send(wishlist);
  });
};

exports.delete = (req, res) => {
  const { params } = req;
  if (params.id) {
    WishList.deleteOne({ _id: params.id }, (err, wishlist) => {
      if (err) {
        res.status(400);
        res.send(err);
      }
      res.send(wishlist);
    });
  } else {
    res.status(400);
    res.send({ message: "Audio book not found!" });
  }
};
