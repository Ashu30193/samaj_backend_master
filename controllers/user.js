/* eslint-disable no-underscore-dangle */
const _ = require("lodash");
const jwt = require("jsonwebtoken");
const formidable = require("formidable");

// Make Twilio optional - only initialize if valid credentials are provided
let client = null;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
if (accountSid && authToken && accountSid.startsWith('AC') && authToken !== 'your_twilio_auth_token') {
  try {
    client = require("twilio")(accountSid, authToken);
    console.log("Twilio initialized successfully");
  } catch (err) {
    console.log("Twilio initialization failed:", err.message);
  }
} else {
  console.log("Twilio credentials not configured - SMS features will be disabled");
}
const User = require("../models/user");
const sendMessage = require("../services/send-message");
const Otp = require("../models/otp");
const { sendSMS } = require("../services/send-message");
const Role = require("../models/role");
const uploadFiles = require("../services/upload-files");
const Post = require("../models/post");
const DeviceToken = require("../models/devicetokens");
const { uploadImage } = require("../services/upload-files");
const {
  signupnotification,
  forgetPasswordNotification,
} = require("../services/api");
const {
  verifiednotification,
  notverifiednotification,
} = require("../services/api");

const CLIENT_ID =
  "513136185738-44dfaqe7lraoufs65c3ae4vgori7mo8a.apps.googleusercontent.com";

const { OAuth2Client } = require("google-auth-library");
const { sendEmail } = require("../services/mail");
const googleclient = new OAuth2Client(CLIENT_ID);

function generatePassword(length) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i += 1) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

exports.googleAuth = (req, res) => {
  const { token } = req.body;
  if (token) {
    async function verify() {
      const ticket = await googleclient.verifyIdToken({
        idToken: token,
        audience: CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const userid = payload["sub"];
      res.send({ token });
    }
    verify().catch(console.error);
  }
};

exports.test = (req, res) => {
  sendEmail({}, {}, (data, d1) => {
    console.log({ data, d1 });
  });

  // client.messages
  //   .create({
  //     body: "This is the ship that made the Kessel Run in fourteen parsecs?",
  //     from: "+19283623557",
  //     to: "+918288841089",
  //   })
  //   .then((message) => res.send({ msg: message.sid }))
  //   .catch((err) => res.status(500).send({ msg: err }));
};

exports.resetUserPasswordWithEmailOtp = (req, res) => {
  const { mobileNumber, password } = req.body;
  if (mobileNumber && password) {
    User.findOne({ phone: mobileNumber })
      .then((info) => {
        if (info) {
          const OTP = sendMessage.generateOTP();

          forgetPasswordNotification(mobileNumber, OTP)
            .then((response) => {
              User.updateOne({ _id: info._id }, { resetPasswordOtp: OTP })
                .then((resp) => {
                  if (resp.acknowledged && resp.matchedCount > 0) {
                    res.status(200).send({ status: true, message: "OTP sent successfully" });
                  } else {
                    res.status(500).send({ message: "Internal Server Error!" });
                  }
                })
                .catch(() =>
                  res.status(500).send({ message: "Internal Server Error!" }),
                );
            })
            .catch((error) => {
              console.log(error);
              res.status(500).send({ message: "Internal Server Error!" });
            });
        } else {
          res.status(400).send({
            messager: "User not found, Please try with other mobile number",
          });
        }
      })
      .catch(() => {
        res.status(500).send({ message: "Internal Server Error!" });
      });
  } else {
    res.status(400).send({ message: "Please enter the number and password" });
  }
};

exports.verifyOtpForResetPassword = async (req, res) => {
  const { mobileNumber, password, otp } = req.body;
  if (mobileNumber && password && otp) {
    try {
      const info = await User.findOne({ phone: mobileNumber }).select('+resetPasswordOtp');
      if (info && otp === info.resetPasswordOtp) {
        // Hash password manually since updateOne middleware may not trigger
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);

        const resp = await User.updateOne(
          { _id: info._id },
          { password: hashedPassword, resetPasswordOtp: null }
        );

        if (resp.acknowledged && resp.matchedCount > 0) {
          res.status(200).send({ status: true, message: "Password updated successfully" });
        } else {
          res.status(500).send({ message: "Internal Server Error!" });
        }
      } else {
        res.status(400).send({ message: "User or OTP info not found" });
      }
    } catch (error) {
      console.log("verifyOtpForResetPassword error:", error);
      res.status(500).send({ message: "Internal Server Error!" });
    }
  } else {
    res.status(400).send({ message: "Please enter all fields" });
  }
};

exports.list = async function (req, res) {
  const { query } = req;
  const filters = convertParams(User, query);
  User.find(filters.find)
    .where(filters.where)
    .sort({ created_at: "desc" })
    .populate("role")
    .skip(filters.start)
    .limit(filters.limit)
    .exec(function (err, users) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      User.countDocuments(
        { ...filters.where, ...filters.find },
        function (err, count) {
          if (err) {
            res.status(400);
            res.send(err);
          }
          var usersList = {
            users: users,
            usersCount: users.length,
            total: count,
          };
          res.status(200);
          res.send(usersList);
        },
      );
    });
};

exports.findOne = (req, res) => {
  const { id } = req.params;
  User.findOne({ _id: id })
    .populate("role")
    .exec((err, user) => {
      if (err) {
        res.status(400);
        res.send(err);
      }
      if (user) {
        Post.countDocuments(
          { user: id, type: "image" },
          (error, imageCount) => {
            Post.countDocuments(
              { user: id, type: "video" },
              (errors, videoCount) => {
                res.status(200).send({
                  ...user._doc,
                  imageCount,
                  videoCount,
                  totalPosts: Number(imageCount) + Number(videoCount),
                });
              },
            );
          },
        );
      } else {
        res.status(400);
        res.send({ message: "User not found" });
      }
    });
};

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

exports.create = (req, res) => {
  const { body } = req;
  if (body.role) {
    createOrFindRole(body.role).then((role) => {
      if (role && role._id) {
        body.role = role._id;
        User.findOne({ email: body.email }, (err, user) => {
          if (err) {
            return res.status(400).send(err);
          }
          if (user) {
            return res
              .status(400)
              .send({ message: "Account already exits with this email." });
          } else {
            User.create(body, async (err, user) => {
              if (err) {
                return res.status(400).send(err);
              }
              if (user) {
                const token = jwt.sign(
                  {
                    type: user.role.type === "root" ? "root" : "user",
                    access: ["read", "write"],
                    data: user,
                  },
                  process.env.JWT_SECRET,
                  {
                    expiresIn: 86400,
                  },
                );
                const userDetails = {
                  token_type: "Bearer",
                  token,
                  data: user,
                };
                res.status(200);
                res.send(userDetails);
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

exports.update = async function (req, res) {
  const { body, user } = req;
  await User.updateOne({ _id: user._id }, body, async (err, updatedUser) => {
    if (err) {
      res.status(400);
      res.send(err);
    }

    User.findOne({ _id: user._id })
      .populate("role")
      .exec(async (err, data) => {
        if (err) {
          res.status(400);
          res.send(err);
        }
        if (data) {
          delete data.password;
          if (data.isVerified == null) {
            let notification = await signupnotification(body.phone);
          }
          res.status(200);
          res.send(data);
        } else {
          res.status(400);
          res.send("User not found !");
        }
      });
  });
};

exports.updateUser = (req, res) => {
  const { params, body } = req;
  User.updateOne({ _id: params.id }, body, async function (err, data) {
    if (err) {
      res.status(400);
      res.send(err);
    }
    if (err) {
      res.status(400).send(err);
    }
    User.findOne({ _id: params.id }, async (err, userData) => {
      if (err) {
        return res.status(400).send(err);
      }

      if (body.isVerified == true) {
        let notification = await verifiednotification(userData.phone);
      }
      if (body.isVerified == false) {
        let notification = await notverifiednotification(userData.phone);
      }
      res.status(200).send(data);
    });
  });
};

exports.delete = (req, res) => {
  const { id } = req.params;
  User.deleteOne({ _id: id }, (err, user) => {
    if (err) {
      res.status(400);
      res.send(err);
    }
    res.status(200);
    res.send(user);
  });
};

exports.deleteMany = (req, res) => {
  const { ids } = req.params;
  User.deleteMany({ _id: ids.split(",") }, (err, users) => {
    if (err) {
      res.status(400);
      res.send(err);
    }
    res.status(200);
    res.send(users);
  });
};

exports.login = (req, res, next) => {
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

  User.findOne(q)
    .populate("role")
    .exec((err, user) => {
      if (err) return next(err);
      if (user) {
        if (user.isActive) {
          if (user.isVerified !== null) {
            if (user.isVerified) {
              user.comparePassword(req.body.password, (err, isMatch) => {
                if (isMatch) {
                  if (req.body.device_token) {
                    checkOrCreateDeviceToken(req.body.device_token, user._id)
                      .then((data) => console.log(data, "DATA"))
                      .catch(() =>
                        res
                          .status(400)
                          .send({ msg: "Unable to create device token" }),
                      );
                  }
                  const token = jwt.sign(
                    {
                      type: user.role.type === "root" ? "root" : "user",
                      access: ["read", "write"],
                      data: user,
                    },
                    process.env.JWT_SECRET,
                    {
                      expiresIn: 86400,
                    },
                  );
                  delete user.password;
                  const userDetails = {
                    message: "Login successful !",
                    token_type: "Bearer",
                    token,
                    data: user,
                  };
                  res.status(200);
                  res.send(userDetails);
                } else {
                  res.status(400);
                  res.json({ message: "Incorrect email or password." });
                }
              });
            } else {
              res.status(400);
              res.json({
                message:
                  "Your details have been rejected, as they haven't met the standard practices,Please contact support team",
              });
            }
          } else {
            res.status(400);
            res.json({
              message:
                "Your account is not verified. You will able to login once it's verified!",
            });
          }
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

exports.forgotpassword = (req, res) => {
  const { email } = req.body;
  const newPassword = generatePassword(10);
  User.findOne({ email }, (err, user) => {
    if (err) {
      res.send(err);
    }
    if (user) {
      User.updateOne(
        { _id: user._id },
        { password: newPassword },
        (err, updatedUser) => {
          if (err) {
            res.send(err);
          }
          const defaultMails = ["devops@abc.com"];
          defaultMails.push(req.body.email);
        },
      );
    } else {
      res.status(400);
      res.send("Invalid email");
    }
  });
};

/**
 * OTP verification.
 * @param {*} req
 * @param {*} res
 */
exports.verification = (req, res) => {
  const { params, body } = req;
  User.findOne({ _id: params.id }, (err, user) => {
    if (err) {
      return res.status(400).send(err);
    }
    const { otpInfo } = user;

    if (body.otp !== otpInfo.otp) {
      return res.status(400).json({ message: "Your OTP is not correct" });
    }

    const expiryDate = otpInfo.expiresIn;
    const nowDate = new Date();
    if (nowDate > expiryDate) {
      return res.status(400).json({ message: "Your OTP has exipred" });
    }

    // mark user as verified if otp is correct.
    User.updateOne({ _id: params.id }, { isVerified: true }, (userErr) => {
      if (userErr) {
        res.status(400).send(userErr);
      }
      return res.status(200).send(user);
    });
  });
};

exports.otpVerification = (req, res) => {
  const { params, body } = req;
  Otp.findOne({ phone: body.phone }, (err, otpInfo) => {
    if (err) {
      return res.status(400).send(err);
    }

    if (body.otp !== otpInfo.otp) {
      return res.status(400).json({ message: "Your OTP is not correct" });
    } else {
      return res.status(200).json({ message: "Your OTP is correct" });
    }
  });
};

const createOrFindRole = (role) =>
  new Promise((resolve, reject) => {
    Role.findOne({ name: role }, (err, res) => {
      if (err || !res) {
        return Role.create({ name: role }, (error, val) => {
          if (!error || val) {
            return resolve(val);
          } else {
            return reject(error);
          }
        });
      }
      return resolve(res);
    });
  });

// Resend OTP.
exports.resendOtp = async (req, res) => {
  const { params } = req;

  try {
    const user = await User.findOne({ _id: params.id });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const otp = sendMessage.generateOTP();
    const date = new Date();
    const expiryDate = new Date();
    expiryDate.setTime(date.getTime() + 5 * 1000 * 60);

    const message = `Hi, Your OTP is ${otp}. Please enter the OTP to proceed. Thank you, Team Pareek Samaj`;

    // Send SMS via Twilio
    await sendSMS(message, user.phone);
    console.log("[ResendOtp] OTP sent to:", user.phone);

    // Update user with OTP info
    await User.updateOne(
      { _id: user._id },
      { otpInfo: { otp, expiresIn: expiryDate } }
    );

    return res.status(200).send({
      message: "OTP resent successfully",
      phone: user.phone
    });
  } catch (error) {
    console.log("[ResendOtp] Error:", error.message);
    return res.status(500).send({ message: "Failed to send OTP", error: error.message });
  }
};
// send OTP.
exports.sendOtp = async (req, res) => {
  const { body } = req;

  if (!body.phone) {
    return res.status(400).send({ message: "Phone number is required" });
  }

  const otp = sendMessage.generateOTP();
  const message = `Hi, Your OTP is ${otp}. Please enter the OTP to proceed. Thank you, Team Pareek Samaj`;

  try {
    // Send SMS via Twilio
    await sendSMS(message, body.phone);
    console.log("[SendOtp] OTP sent to:", body.phone);

    // Save OTP in database
    const existingOtp = await Otp.findOne({ phone: body.phone });

    if (existingOtp) {
      await Otp.updateOne({ phone: body.phone }, { otp: otp });
    } else {
      await Otp.create({ phone: body.phone, otp: otp });
    }

    return res.status(200).send({
      message: "OTP sent successfully",
      phone: body.phone
    });
  } catch (error) {
    console.log("[SendOtp] Error:", error.message);
    return res.status(500).send({ message: "Failed to send OTP", error: error.message });
  }
};

/**
 * Create a refresh token.
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.createRefreshToken = (req, res) => {
  const { id } = req.params;
  if (id) {
    User.findOne({ _id: id })
      .populate("role")
      .exec((err, user) => {
        if (err) {
          res.status(400);
          res.send(err);
        }
        if (user) {
          const token = jwt.sign(
            {
              type: user.role.type === "root" ? "root" : "user",
              access: ["read", "write"],
              data: user,
            },
            process.env.JWT_SECRET,
            {
              expiresIn: 86400,
            },
          );
          delete user.password;
          const userDetails = {
            message: "Token refreshed",
            token_type: "Bearer",
            token,
            data: user,
          };
          res.status(200);
          res.send(userDetails);
        } else {
          res.status(401);
          res.send("User not found");
        }
      });
  } else {
    res.status(400);
    res.send("Please provide user id");
  }
};

exports.updatePassword = (req, res) => {
  const { body, user } = req;
  if (user && body) {
    User.findOne({ _id: user._id }).exec((err, data) => {
      data.comparePassword(body.currentPassword, (err, isMatch) => {
        if (isMatch) {
          User.updateOne({ _id: data._id }, { password: body.newPassword }).exec(
            (err, response) => {
              if (!err) {
                res.status(200).send({
                  message: "Password updated successfully!",
                  user: data,
                });
              } else {
                res
                  .status(400)
                  .send({ message: "Unable to update the password" });
              }
            },
          );
        } else {
          res.status(400).send({ message: "Current password do not match" });
        }
      });
    });
  } else {
    res.status(400).send({ message: "Unable to update the password" });
  }
};

exports.uploadProfileImage = async (req, res) => {
  let imageFile = req.files.image ? req.files.image : null;
  if (imageFile) {
    const image = await uploadImage(imageFile.data, imageFile.name, "profile");
    if (!image) {
      res.status(400).send({ message: "Profile image not updated!" });
    }

    User.updateOne(
      { _id: req.user._id },
      { profile_url: image },
      (userError) => {
        if (userError) {
          res.status(400).send(err);
        }
        return res.status(200).send({ image });
      },
    );
  } else {
    res.status(400).send({ message: "Please attach the file." });
  }
};

const checkOrCreateDeviceToken = (token, user) =>
  new Promise((resolve, reject) =>
    DeviceToken.findOne({ user }, (err, device) => {
      if (err) {
        reject(err);
      }
      if (device) {
        DeviceToken.updateOne(
          { _id: device._id },
          { token, user },
          (error, response) => {
            if (error) {
              reject(error);
            }
            if (response) {
              resolve(device);
            }
          },
        );
      } else {
        DeviceToken.create({ token, user }, (error, newdevice) => {
          if (error) {
            reject(error);
          }
          if (newdevice) {
            resolve(newdevice);
          }
        });
      }
    }),
  );

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
      { email: { $regex: `^${params.keyword}`, $options: "i" } },
      { phone: { $regex: `^${params.keyword}`, $options: "i" } },
      { "address.city": { $regex: `^${params.keyword}`, $options: "i" } },
    ];
    finalQuery.find["$or"] = $or;
  }
  return finalQuery;
};

exports.matrimonialList = async function (req, res) {
  const { query } = req;
  const filters = convertParams(User, query);
  let checkMatrimonialActive = filters.where;
  checkMatrimonialActive.isMatrimonialActive = true;

  User.find(filters.find)
    .where(checkMatrimonialActive)
    .sort({ created_at: "desc" })
    .populate("role")
    .skip(filters.start)
    .limit(filters.limit)
    .exec(function (err, users) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      User.countDocuments(
        { ...filters.where, ...filters.find },
        function (err, count) {
          if (err) {
            res.status(400);
            res.send(err);
          }
          var usersList = {
            users: users,
            usersCount: users.length,
            total: count,
          };
          res.status(200);
          res.send(usersList);
        },
      );
    });
};

exports.updateMatrimonialStatus = (req, res) => {
  const { body, user } = req;
  User.updateOne(
    { _id: req.params.id },
    {
      showMatrimonialPopup: false,
      isMatrimonialActive: body.isMatrimonialActive,
    },
  ).exec(async (err, response) => {
    let userData = await User.findOne({ _id: req.params.id });
    if (!err) {
      res.status(200).send({
        message: "Matrimonial Status updated successfully!",
        userData,
      });
    } else {
      res
        .status(400)
        .send({ message: "Unable to update the Matrimonial Status" });
    }
  });
};
exports.editUserPrivateDetails = (req, res) => {
  const { body, user } = req;
  User.updateOne({ _id: user._id }, body)
    .then(async (UpdatedUsedData) => {
      let userData = await User.findOne({ _id: user._id });

      res.status(200).send({
        message: "The Private details updated successfully!",
        userData,
      });
    })
    .catch((err) => {
      res.status(400).send({ message: "Unable to update the Private details" });
    });
};

// Check if email/login ID already exists
exports.isExistingLoginId = async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).send({ message: "user_id is required" });
  }

  try {
    // Check in User collection
    const existingUser = await User.findOne({ email: user_id });

    // Also check in Admin collection
    const SystemAdmin = require("../models/admin");
    const existingAdmin = await SystemAdmin.findOne({ email: user_id });

    if (existingUser || existingAdmin) {
      return res.status(400).send({
        exists: true,
        message: "Email already exists"
      });
    }

    return res.status(200).send({
      exists: false,
      message: "Email is available"
    });
  } catch (error) {
    console.log("[isExistingLoginId] Error:", error);
    return res.status(500).send({ message: "Error checking email" });
  }
};
