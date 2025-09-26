const formidable = require("formidable");
const Post = require("../models/post");
const PostComment = require("../models/post-comment");
const PostLike = require("../models/post-likes");
const { decodetoken } = require("../services/decodetoken");
const uploadFiles = require("../services/upload-files");
const { ObjectId } = require("mongoose").Types;
const { convertParams } = require("./post-comment");

// create a new post
exports.create = (req, res) => {
  const decodedtoken = decodetoken(req);
  const { body } = req;
  const userId = decodedtoken.data._id;
  body.user = userId;
  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      res.status(400);
      res.send(err);
    }
    console.log(fields, files, "FILES");
    let location = files.file.path;
    const originalFileName = files.file.name;
    const fileType = fields.type;
    // compress file if its a video.
    if (fileType === "video") {
      try {
        location = await uploadFiles.compressVideo(files);
      } catch (err) {
        return res.json({ message: "Something went wrong!" });
      }
    }
    // uploads file.
    uploadFiles.upload(
      location,
      originalFileName,
      `users/${userId}/posts`,
      (error, loc) => {
        if (error) {
          res.status(400);
          res.send(error);
        }
        console.log(loc, "LOC");
        body.url = loc;
        body.name = fields.name;
        body.type = fileType;
        // store the post info in the model.
        console.log(body, "BODY ");
        Post.create(body, (err, post) => {
          if (err) {
            res.status(400);
            res.send(err);
          }
          res.send(post);
        });
      },
    );
  });
};

// get all posts
exports.get = async (req, res) => {
  const { query } = req;
  const decodedtoken = decodetoken(req);
  const userId = decodedtoken.data._id;
  const filters = await convertParams(Post, query);
  const pageNo = (query._start && parseInt(query._start)) || 1;
  const pageLimit = (query._limit && parseInt(query._limit)) || 10;
  const searchCriteria = filters.where;
  if (query.user_id) {
    searchCriteria.user = ObjectId(query.user_id);
  }
  if (query.isVerified && query.isVerified === "false") {
    searchCriteria.isVerified = false;
  }
  if (query.isVerified && query.isVerified === "true") {
    searchCriteria.isVerified = true;
  }
  if (query._id) {
    searchCriteria._id = ObjectId(query._id);
  }

  Post.aggregate([
    {
      $match: searchCriteria,
    },
    {
      $lookup: {
        from: "postcomments", // collection to join
        localField: "_id", // field from the input documents
        foreignField: "post_id", // field from the documents of the "from" collection
        as: "comments", // output array field
      },
    },
    {
      $lookup: {
        from: "postlikes",
        localField: "_id",
        foreignField: "post_id",
        as: "post_likes",
      },
    },
    {
      $lookup: {
        from: "users", // collection to join
        localField: "user", // field from the input documents
        foreignField: "_id", // field from the documents of the "from" collection
        as: "user", // output array field
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        _id: "$_id",
        isVerified: "$isVerified",
        user: "$user",
        url: "$url",
        name: "$name",
        type: "$type",
        created_at: "$created_at",
        updated_at: "$updated_at",
        total_comments: { $size: "$comments" },
        total_likes: { $size: "$post_likes" },
        is_post_liked: {
          $in: [ObjectId(userId), "$post_likes.user"],
        },
      },
    },
    { $sort: { created_at: -1 } },
    { $skip: (pageNo - 1) * pageLimit },
    { $limit: parseInt(pageLimit) },
  ])
    .then((data) => {
      Post.countDocuments(
        { ...filters.where, ...filters.find },
        (err, count) => {
          if (err) {
            res.status(400);
            res.send(err);
          }
          res.status(200).send({
            posts: data,
            total: count,
            post_total: data.length,
          });
        },
      );
    })
    .catch((error) => {
      res.status(400).send(error);
    });
};

// update likes and dislikes for a given post.
exports.update = (req, res) => {
  const { body, params } = req;
  Post.updateOne({ _id: params.id }, body, (err, post) => {
    if (err) {
      res.status(400).send(err);
    }
    res.status(200).send(post);
  });
};

// delete a post ,its likes and comments and file from the bucket.
exports.delete = (req, res) => {
  const { params } = req;

  Post.findOne({ _id: params.id }, async (err, post) => {
    if (err) {
      res.status(400).send(err);
    }
    if (post) {
      const { url } = post;
      if (url) {
        const filePath = url.substring(37);
        // delete post from bucket.
        try {
          await uploadFiles.deleteFile(filePath);

          Post.deleteOne({ _id: params.id }, (err) => {
            if (err) {
              return res.status(400).send(err);
            }

            PostLike.deleteMany({ post_id: params.id }, (err) => {
              if (err) {
                return res.status(400).send(err);
              }

              PostComment.deleteMany({ post_id: params.id }, (err) => {
                if (err) {
                  return res.status(400).send(err);
                }
                res.status(200).json({ message: "Post deleted successfully!" });
              });
            });
          });
        } catch (err) {
          console.log("File not deleted from bucket");
        }
      }
    } else {
      res.status(400).send({ message: "No such post exists." });
    }
  });
};

// get a particlular post information.
exports.findOne = (req, res) => {
  const { params } = req;
  Post.findOne({ _id: params.id }, (err, post) => {
    if (err) {
      res.status(400).send(err);
    }
    res.status(200).send(post);
  });
};
