/* eslint-disable no-underscore-dangle */
const _ = require("lodash");
const SystemAdmin = require("../models/admin");

exports.enableDisableUser = async function (req, res) {
 const { params,body } = req;
  if (body?.id) {
    await SystemAdmin.updateOne({ _id: body.id }, body, function (err, user) {
      if (err) {
        return res.status(400).send(err);
      }else{
        return res.status(200).send({ message: "Successfully Updated!" });
      }
    });
  }else{
   return res.status(404).send({ message: "Id not found" });
  }
};
