const _ = require("lodash");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const SystemAdmin = require("../models/admin");

async function validate(req, res, next) {
  console.log("[Validate Middleware] Checking authorization...");
  let token = "";
  if (req.headers && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2) {
      const scheme = parts[0];
      const credentials = parts[1];
      if (/^Bearer$/i.test(scheme)) {
        token = credentials;
        try {
          var decoded = jwt.verify(token, process.env.JWT_SECRET);
          console.log("[Validate Middleware] Token decoded, type:", decoded.type);
          if (decoded.type === "user") {
            const user = await User.findOne({ _id: decoded.data._id });
            decoded.data = user;
            if (!user) {
              console.log("[Validate Middleware] User not found");
              return res.status(401).send({ message: "User not found!" });
            } else if (user) {
              console.log("[Validate Middleware] User validated:", user._id);
              req.user = user;
              return next();
            } else {
              return res.status(401).send({ message: "Your account is not verified!" });
            }
          } else if (decoded.type === "organization") {
            var org = await Organization.findOne(decoded.data._id);
            decoded.data = {};
            decoded.data.organization = org;
            console.log("[Validate Middleware] Organization validated");
            return next();
          } else if (decoded.type === "root") {
            var user = await User.findOneByid(decoded.data._id);
            decoded.data = user;
            req.user = user;
            console.log("[Validate Middleware] Root user validated");
            return next();
          } else if (decoded.type.name === "admin" || decoded.type.name === "manager" || decoded.type.name === "staff") {
            const user = await SystemAdmin.findOne({ _id: decoded.data._id });
            decoded.data = user;
            if (!user) {
              console.log("[Validate Middleware] Admin not found");
              return res.status(401).send({ message: "User not found!" });
            } else if (user) {
              console.log("[Validate Middleware] Admin validated:", user._id);
              req.user = user;
              return next();
            } else {
              return res.status(401).send({ message: "Your account is not verified!" });
            }
          }
        } catch (err) {
          console.log("[Validate Middleware] Token error:", err.message);
          if (err.name === "TokenExpiredError") {
            return res.status(401).send({ message: "Access token Expired." });
          } else {
            return res.status(401).send({ message: "Invalid access token." });
          }
        }
      }
    } else {
      console.log("[Validate Middleware] Invalid header format");
      return res.status(401).send({
        message: "Invalid authorization header format. Format is Authorization: Bearer [token]",
      });
    }
  } else {
    console.log("[Validate Middleware] No authorization header");
    return res.status(401).send({ message: "No authorization header was found" });
  }
}
async function validateAdmin(req, res, next) {
  let token = "";
  if (req.headers && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2) {
      const scheme = parts[0];
      const credentials = parts[1];
      if (/^Bearer$/i.test(scheme)) {
        token = credentials;
        try {
          var decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded.type.name === "admin" || decoded.type.name === "employee" || decoded.type.name === "manager") {
            const admin = await SystemAdmin.findOne({ _id: decoded.data._id });
            decoded.data = admin;
            if (!admin) {
              return res.status(401).send({ message: "Admin not found!" });
            } else if (admin) {
              req.admin = admin;
              return next();
            } else {
              return res.status(401).send({ message: "Your account is not verified!" });
            }
          } else if (decoded.type === "organization") {
            var org = await Organization.findOne(decoded.data._id);
            decoded.data = {};
            decoded.data.organization = org;
            return next();
          } else if (decoded.type === "root") {
            var admin = await SystemAdmin.findOneByid(decoded.data._id);
            decoded.data = admin;
            req.admin = admin;
            return next();
          }
        } catch (err) {
          if (err.name === "TokenExpiredError") {
            return res.status(401).send({ message: "Access token Expired." });
          } else {
            return res.status(401).send({ message: "Invalid access token." });
          }
        }
      }
    } else {
      return res.status(401).send({
        message: "Invalid authorization header format. Format is Authorization: Bearer [token]",
      });
    }
  } else {
    return res.status(401).send({ message: "No authorization header was found" });
  }
}
module.exports.validate = validate;
module.exports.validateAdmin = validateAdmin;
