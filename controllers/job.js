const Job = require("../models/job");
const _ = require("lodash");
const AppliedJob = require("../models/applied-job");

//  Load user and append to req.
exports.load = async (req, res, next, id) => {
  try {
    const job = await Job.get(id);
    req.locals = { job };
    return next();
  } catch (error) {
    return next(error);
  }
};

exports.update = function (req, res) {
  const { body, user, params } = req;
  if (user) {
    body.updatedBy = user._id;
  }
  if (params.id) {
    Job.updateOne({ _id: params.id }, body, (err, data) => {
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

exports.create = function (req, res) {
  const { body, user } = req;
  if (user) {
    body.createdBy = user._id;
    body.updatedBy = user._id;
  }
  Job.create(body, (err, job) => {
    if (err) {
      res.status(400);
      res.send(err);
    }
    res.send(job);
  });
};

exports.get = async (req, res) => {
  const filters = await convertParams(Job, req.query);
  Job.find(filters.find)
    .where(filters.where)
    .sort({ created_at: "desc" })
    .populate("createdBy")
    .populate("updatedBy")
    .skip(filters.start)
    .limit(filters.limit)
    .exec((err, data) => {
      if (err) {
        res.status(400);
        res.send(err);
      } else {
        Job.countDocuments(
          { ...filters.where, ...filters.find },
          (err, count) => {
            if (err) {
              res.status(400);
              res.send(err);
            }
            res.status(200).send({
              jobs: data,
              total: count,
            });
          },
        );
      }
    });
};

exports.applyJob = (req, res) => {
  const { user, params } = req;
  console.log(user, params, "PPUU");
  AppliedJob.create({ jobId: params.jobId, userId: user._id }, (err, job) => {
    if (err) {
      res.status(400);
      console.log(err, "ERR");
      res.send(err);
    }
    res.send(job);
  });
};

exports.getAppliedJobs = async (req, res) => {
  const filters = await convertParams(AppliedJob, req.query);
  AppliedJob.find(filters.find)
    .where(filters.where)
    .sort({ created_at: "desc" })
    .populate("jobId")
    .populate("userId")
    .skip(filters.start)
    .limit(filters.limit)
    .exec((err, data) => {
      if (err) {
        res.status(400);
        res.send(err);
      } else {
        AppliedJob.countDocuments(
          { ...filters.where, ...filters.find },
          (err, count) => {
            if (err) {
              res.status(400);
              res.send(err);
            }
            res.status(200).send({
              jobs: data,
              total: count,
            });
          },
        );
      }
    });
};

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
      { title: { $regex: `^${params.keyword}`, $options: "i" } },
      { location: { $regex: `^${params.keyword}`, $options: "i" } },
    ];
    finalQuery.find["$or"] = $or;
  }
  return finalQuery;
}
