/* eslint-disable no-underscore-dangle */
const _ = require("lodash");
const jwt = require("jsonwebtoken");
const config = require("../config.json");
const SystemAdmin = require("../models/admin");
const User = require("../models/user");
const Role = require("../models/role");
const Post = require("../models/post");

exports.adminLogin = (req, res, next) => {
  const q = {
    $or: [
      {
        email: req.body.identifier,
      },
      {
        phone: req.body.identifier,
      },
    ],
  };

  SystemAdmin.findOne(q)
    .populate("role")
    .exec((err, admin) => {
      if (err) return next(err);
      if (admin) {
        if (admin.isActive) {
          admin.comparePassword(req.body.password, (err, isMatch) => {
            if (isMatch) {
              if (req.body.device_token) {
                checkOrCreateDeviceToken(req.body.device_token, admin._id)
                  .then(data => console.log(data, "DATA"))
                  .catch(() => res.status(400).send({ msg: "Unable to create device token" }));
              }
              const token = jwt.sign(
                {
                  type: admin.role,
                  //.type === "root" ? "root" : "admin",
                  access: ["read", "write"],
                  data: admin,
                },
                config.secret,
                {
                  expiresIn: 86400,
                },
              );
              let adminData = admin.toObject();
              delete adminData.password;
              const adminDetails = {
                message: "Login successful !",
                token_type: "Bearer",
                token,
                data: adminData,
              };
              res.status(200);
              res.send(adminDetails);
            } else {
              res.status(400);
              res.json({ message: "Incorrect email or password." });
            }
          });
        } else {
          res.status(400);
          res.json({ message: "Your account is disabled!" });
        }
      } else {
        res.status(400);
        res.json({ message: "Incorrect email or password." });
      }
    });
};
exports.createAdmin = (req, res) => {
  const { body } = req;
  if (body.role) {
    createOrFindRole(body.role).then(role => {
      if (role && role._id) {
        body.role = role._id;
        SystemAdmin.findOne({ email: body.email }, (err, admin) => {
          if (err) {
            return res.status(400).send(err);
          }
          if (admin) {
            return res.status(400).send({ message: "Account already exits with this email." });
          } else {
            let obj = Object.assign(body, { createdBy: req.admin._id, updatedBy: req.admin._id });
            SystemAdmin.create(obj, async (err, admin) => {
              if (err) {
                return res.status(400).send(err);
              }
              if (admin) {
                res.status(200);
                res.send({ message: "Data Added Successfully" });
              }
            });
          }
        });
      }
    });
  } else {
    res.status(400).send({ message: "User role is missing" });
  }
};
const createOrFindRole = role =>
  new Promise((resolve, reject) => {
    Role.findOne({ name: role }, (err, res) => {
      if (err || !res) {
        return Role.create({ name: role }, (error, val) => {
          if (!error || val) {
            console.log(val, "VA:");
            return resolve(val);
          } else {
            return reject(error);
          }
        });
      }
      return resolve(res);
    });
  });

const createOrFindRoleName = role =>
  new Promise((resolve, reject) => {
    Role.findOne({ _id: role }, (err, res) => {
      if (err || !res) {
        return reject(err);
      }
      return resolve(res);
    });
  });
exports.currentUser = (req, res) => {
  if (req.user) {
    User.findById({ _id: req.user._id })
      .populate("role")
      .exec((err, data) => {
        if (!err) {
          delete data.password;
          res.status(200).send(data);
        } else {
          res.status(404).send({ message: "User not found" });
        }
      });
  } else {
    res.status(400).send({ message: "Token is not valid" });
  }
};

exports.findOne = (req, res) => {
  const { id } = req.params;

  SystemAdmin.findOne({ _id: id })
    .populate("role")
    .exec((err, admin) => {
      if (err) {
        res.status(400);
        res.send(err);
      }
      if (admin) {
        Post.countDocuments({ admin: id, type: "image" }, (error, imageCount) =>
          Post.countDocuments({ admin: id, type: "video" }, (errors, videoCount) =>
            res.status(200).send({
              ...admin._doc,
              imageCount,
              videoCount,
              totalPosts: Number(imageCount) + Number(videoCount),
            }),
          ),
        );
      } else {
        res.status(400);
        res.send("no admin found");
      }
    });
};
exports.list = async function (req, res) {
  const { body, admin } = req;
  let role;
  await createOrFindRoleName(admin.role).then(result => {
    role = result;
  });
  if (role.name == "admin") {
    SystemAdmin.find()
      .populate("role")
      .populate("createdBy")
      .populate("updatedBy")
      .exec((err, admin) => {
        if (err) {
          console.log(err);
          return res.status(400).send(err);
        }
        if (admin) {
          return res.status(200).send(admin);
        }
      });
  } else {
    return res.status(401).send({ message: "Unauthorized User." });
  }
};
exports.delete = async (req, res) => {
  const { id } = req.body;
  const { admin } = req;
  let role;
  await createOrFindRoleName(admin.role).then(result => {
    role = result;
  });
  if (role.name == "admin") {
    User.deleteOne({ _id: id }, (err, user) => {
      if (err) {
        res.status(400);
        res.send(err);
      }
      res.status(200);
      res.send(user);
    });
  } else {
    return res.status(401).send({ message: "Unauthorized User." });
  }
};
