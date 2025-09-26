var Role = require('../models/role');

exports.list = async function (req, res) {
  Role.find().exec(function (err, roles) {
    if (err) {
      res.status(400);
      res.send(err);
    }
    Role.count({}).exec(function (err, count) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      var rolesList = {
        roles: roles,
        rolesCount: roles.length,
        total: count,
      };
      res.send(rolesList);
    });
  });
};
exports.findOne = function (req, res) {
  var id = req.params.id;
  Role.findOne({ _id: id }).exec(function (err, role) {
    if (err) {
      res.status(400);
      res.send(err);
    }
    res.send(role);
  });
};

exports.create = function (req, res) {
  var body = req.body;
  Role.create(body, function (err, role) {
    if (err) {
      res.status(400);
      res.send(err);
    }
    res.send(role);
  });
};

exports.update = function (req, res) {
  var body = req.body;
  Role.update({ _id: body._id }, body, function (err, role) {
    if (err) {
      res.status(400);
      res.send(err);
    }
    res.send(role);
  });
};

exports.delete = function (req, res) {
  var id = req.params.id;
  Role.deleteOne({ _id: id }, function (err, role) {
    if (err) {
      res.status(400);
      res.send(err);
    }
    res.send(role);
  });
};
