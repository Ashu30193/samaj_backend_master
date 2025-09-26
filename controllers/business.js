const _ = require("lodash");
const Business = require("../models/business");
const BusinessCategories = require("../models/business-categories");

exports.create = async function (req, res) {
  const { body, user, files } = req;

  if (user) {
    body.createdBy = user._id;
    body.updatedBy = user._id;
  }
  Business.findOne({ createdBy: user._id }).exec((err, data) => {
    if (err) {
      return res.status(400).send(err);
    }
    if (data) {
      return res.status(409).send({ message: "Business already exist. You can only create one business!" });
    } else {
      Business.create(body, function (err, data) {
        if (err) {
          res.status(400);
          res.send(err);
        }
        res.status(200);
        res.send(data);
      });
    }
  });
};
exports.update = function (req, res) {
  const { body, user, params } = req;
  if (user) {
    body.updatedBy = user._id;
  }
  if (params.id) {
    Business.updateOne({ _id: params.id }, body, function (err, business) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      Business.findOne({ _id: params.id })
        .populate("businesscategory")
        .populate("createdBy")
        .populate("updatedBy")
        .exec((err, data) => {
          if (err) {
            return res.status(400).send(err);
          }
          if (data) {
            res.status(200);
            res.send(data);
          } else {
            return res.status(202).send(data);
          }
        });
    });
  } else {
    res.status(400);
    res.send({ message: "Business id not found!" });
  }
};
exports.addcategories = async function (req, res) {
  const { body } = req;
  BusinessCategories.create(body, function (err, data) {
    if (err) {
      res.status(400);
      res.send(err);
    }
    res.send(data);
  });
};
exports.list = async function (req, res) {
  Business.find()
    .populate("businesscategory")
    .populate("createdBy")
    .populate("updatedBy")
    .exec((err, data) => {
      if (err) {
        console.log(err);
        return res.status(400).send(err);
      }
      if (data) {
        return res.status(200).send(data);
      } else {
        return res.status(202).send([]);
      }
    });
};
exports.userBusiness = async function (req, res) {
  const user = req.user;
  let message = null;
  if (user) {
    if (!user.subscription) {
      message = { message: "Subscription required!" };
    }
  }
  if (message) {
    return res.status(200).send(Object.assign(message, { subscription: false }));
  }
  const { params } = req;
  Business.findOne({ createdBy: params.id })
    .populate("businesscategory")
    .populate("createdBy")
    .populate("updatedBy")
    .exec((err, data) => {
      if (err) {
        console.log(err);
        return res.status(400).send(Object.assign(err, { subscription: true }));
      }
      if (data) {
        return res.status(200).send({ data: data, subscription: true });
      } else {
        return res.status(202).send({ subscription: true, data: {} });
      }
    });
};
