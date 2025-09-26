const config = require("../config.json");
const dev_db_url = config.db.url;
const idGenerator = require("mongo-incremental-id-generator")(dev_db_url);
const Forms = require("../models/forms");
const _ = require("lodash");

exports.create = async function (req, res) {
  const { body, params } = req;
  await idGenerator.generateId("categoryId", 1, function (err, id) {
    if (err) {
      console.log("There is an error");
    } else {
      body.form_id = "AMI" + id;
      body.type = params.type;
      Forms.create(body, (err, form) => {
        if (err) {
          res.status(400);
          res.send(err);
        }
        res.status(200);
        res.send(form);
      });
    }
  });
};

exports.get = async (req, res) => {
  const filters = await convertParams(Forms, req.query);
  await Forms.find(filters.find)
    .where(filters.where)
    .sort({ created_at: "desc" })
    .skip(filters.start)
    .limit(filters.limit)
    .exec((err, data) => {
      if (err) {
        res.status(400);
        res.send(err);
      } else {
        Forms.countDocuments(
          { ...filters.where, ...filters.find },
          (err, count) => {
            if (err) {
              res.status(400);
              res.send(err);
            }
            res.status(200).send({
              forms: data,
              total: count,
            });
          },
        );
      }
    });
};

exports.getOne = (req, res) => {
  const { params } = req;
  Forms.findOne({ _id: params.id }).exec((err, data) => {
    if (err || !data) {
      res.status(400).send({ message: "No data found!" });
      res.send(err);
    } else {
      res.send(data);
    }
  });
};

exports.update = (req, res) => {
  const { params, body } = req;
  Forms.update({ _id: params._id }, body, (err, form) => {
    if (err) {
      res.status(400);
      res.send(err);
    }
    res.status(200);
    res.send(form);
  });
};

exports.stats = async (req, res) =>
  Forms.aggregate([
    {
      $sort: { type: 1 },
    },
    {
      $group: { _id: "$type", count: { $sum: 1 } },
    },
  ]).exec((err, data) => {
    if (err) {
      res.status(400).send({ error: err });
    }
    res.status(200).send(data);
  });

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
        finalQuery.start = parseInt(params[q]);
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
