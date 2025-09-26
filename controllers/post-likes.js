const _ = require("lodash");
const PostLikes = require("../models/post-likes");
const { firebase } = require("../firebase");
const DeviceToken = require("../models/devicetokens");
const Post = require("../models/post");

exports.create = async (req, res) => {
  const { params } = req;
  if (params.post_id && params.post_owner_id) {
    PostLikes.create(
      {
        post_id: params.post_id,
        user: req.user._id,
        post_owner: params.post_owner_id,
      },
      (err, post) => {
        if (err) {
          res.status(400);
          res.send(err);
        }
        res.send(post);
      },
    );

    Post.findOne({ _id: params.post_id })
      .populate("user")
      .exec((_, post) => {
        if (post) {
          DeviceToken.findOne({ user: post.user._id }).exec((_, data) => {
            if (data) {
              const message = {
                notification: {
                  title: "Watch Socials",
                  body: `${req.user.name} liked your post`,
                },
                data: {
                  bigPictureUrl: post.url || null,
                  largeIconUrl: req.user.profile_url || null,
                },
                token: data.token,
              };

              if (String(req.user._id) !== String(post.user._id)) {
                firebase
                  .messaging()
                  .send(message)
                  .then((res) => console.log("SUCCESS", res))
                  .catch((err) => console.log("ERROR", err));
              }
            }
          });
        }
      });
  }
};

// get likes for a particular post.
exports.get = async (req, res) => {
  const { params, query } = req;
  const filters = await convertParams(PostLikes, query);
  const skip =
    query._start && query._start ? (filters.start - 1) * filters.limit : 0;
  await PostLikes.find()
    .where({ post_id: params.post_id })
    .sort({ created_at: "desc" })
    .populate("user")
    .skip(skip)
    .limit(filters.limit)
    .exec((err, data) => {
      if (err) {
        res.status(400);
        res.send(err);
      } else {
        PostLikes.countDocuments(
          { ...filters.where, post_id: params.post_id, ...filters.find },
          (err, count) => {
            if (err) {
              res.status(400);
              res.send(err);
            }
            res.status(200).send({
              likes: data,
              total: count,
            });
          },
        );
      }
    });
};

exports.update = (req, res) => {
  const { body, params } = req;
  PostLikes.updateOne({ _id: params.id }, body, (err, post) => {
    if (err) {
      res.status(400).send(err);
    }
    res.status(200).send(post);
  });
};

exports.delete = (req, res) => {
  const { params } = req;
  PostLikes.deleteOne({ _id: params.id }, (err, post) => {
    if (err) {
      res.status(400).send(err);
    }
    res.status(200).send(post);
  });
};

exports.unlike = (req, res) => {
  const { params, user } = req;
  if ((params.post_id, user._id)) {
    PostLikes.deleteOne()
      .where({ post_id: params.post_id, user: user._id })
      .exec((err, data) => {
        if (err) {
          res.status(400).send({ message: "Unable to remove like" });
        }
        console.log(data);
        res.status(200).send({ message: "Unlike", data });
      });
  } else {
    res.status(400).send({ message: "Please provide post id" });
  }
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
          var actualQuery = params[q].split(":");
          finalQuery.sort[actualQuery[0]] = actualQuery[1];
        } else if (_.includes(q, "_start")) {
          finalQuery.start = parseInt(params[q]);
        } else if (_.includes(q, "_limit")) {
          finalQuery.limit = parseInt(params[q]);
        } else if (_.includes(q, "date_bt")) {
          const newQuerydate = {};
          var actualQuery = params[q].split(":");
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
        var actualQuery = params[q].split(":");
        finalQuery.sort[actualQuery[0]] = actualQuery[1];
      } else if (_.includes(q, "_start")) {
        finalQuery.start = parseInt(params[q]);
      } else if (_.includes(q, "_limit")) {
        finalQuery.limit = parseInt(params[q]);
      } else if (_.includes(q, "date_bt")) {
        const newQuerydate = {};
        var actualQuery = params[q].split(":");
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

module.exports.convertParams = convertParams;
