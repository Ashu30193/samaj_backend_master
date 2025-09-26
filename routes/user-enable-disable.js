var express = require("express");
var router = express.Router();
const { validateAdmin } = require("../middlewares/policies");
var enable_disable_user = require("../controllers/user-enable-disable");

router.post(
  "/",
  validateAdmin,
  enable_disable_user.enableDisableUser,
);

module.exports = router;


