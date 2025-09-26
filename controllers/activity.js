/* eslint-disable no-underscore-dangle */
const _ = require("lodash");
const PostLikes = require("../models/post-likes");
const Post = require("../models/post");
const PostComment = require("../models/post-comment");

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
  if (params._q) {
    const $or = [];
    _.mapKeys(model.schema.obj, (value, key) => {
      if (value.valueType === "String") {
        const q = {};
        const query = params._q;
        if (q[key] === "customer") {
          q[key] = query;
        } else {
          q[key] = { $regex: query };
        }
        $or.push(q);
      }
    });
    finalQuery.find.$or = $or;
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
          finalQuery.start = Number(params[q]);
        } else if (_.includes(q, "_limit")) {
          finalQuery.limit = Number(params[q]);
        } else if (_.includes(q, "date_bt")) {
          const newQuerydate = {};
          const actualQuery = params[q].split(":");
          newQuerydate.$gte = new Date(actualQuery[0]);
          newQuerydate.$lte = new Date(actualQuery[1]);
          finalQuery.where.created_at = newQuerydate;
        }
      });
    });
    _.map(final, (f) => {
      finalQuery.where[f] = params[f];
    });
    return finalQuery;
  }
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
        finalQuery.start = Number(params[q]);
      } else if (_.includes(q, "_limit")) {
        finalQuery.limit = Number(params[q]);
      } else if (_.includes(q, "date_bt")) {
        const newQuerydate = {};
        const actualQuery = params[q].split(":");
        newQuerydate.$gte = new Date(actualQuery[0]);
        newQuerydate.$lte = new Date(actualQuery[1]);
        finalQuery.where.created_at = newQuerydate;
      }
    });
  });
  _.map(final, (f) => {
    finalQuery.where[f] = params[f];
  });
  return finalQuery;
};

// get likes for a particular post.
exports.get = async (req, res) => {
  const { query } = req;
  const filters = convertParams(PostLikes, query);

  const activityFilters = {
    user: { $ne: req.user._id },
    post_owner: req.user._id,
  };

  PostComment.find(activityFilters)
    .populate("post_id")
    .populate("user")
    .limit(10)
    .exec((err, data) => {
      if (err) {
        res.status(400).send({ message: "Failed to fetch activity" });
      }
      Post.aggregate([
        {
          $match: { user: req.user._id },
        },
        {
          $lookup: {
            from: "postlikes",
            let: { user_id: "$user", post_id: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$post_id", "$$post_id"] },
                      { $ne: ["$user", "$$user_id"] },
                    ],
                  },
                },
              },
              {
                $lookup: {
                  from: "users",
                  localField: "user",
                  foreignField: "_id",
                  as: "user",
                },
              },
              {
                $unwind: "$user",
              },
            ],
            as: "post_likes",
          },
        },
        {
          $project: {
            _id: "$_id",
            isVerified: "$isVerified",
            user: "$user",
            url: "$url",
            name: "$name",
            type: "$type",
            likes: { $size: "$post_likes" },
            peopleLiked: "$post_likes",
            created_at: "$created_at",
            updated_at: "$updated_at",
          },
        },
        {
          $limit: 10,
        },
      ])
        .then((likes) => {
          res.status(200).send({ likes, comments: data });
        })
        .catch((error) => {
          res.status(400).send(error);
        });
    });
};

module.exports.convertParams = convertParams;
