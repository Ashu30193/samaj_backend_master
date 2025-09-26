var express = require("express");
var router = express.Router();

var otp_controller = require("../controllers/otp");
const { validate } = require("../middlewares/policies");

router.post("/otp", otp_controller.verifyMobile);
router.post("/verify-otp", otp_controller.verifyOtp);
module.exports = router;
