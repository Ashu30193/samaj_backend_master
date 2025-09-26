var express = require("express");
var router = express.Router();

var user_controller = require("../controllers/user");
const { validate } = require("../middlewares/policies");

router.get("/test", user_controller.test);
router.get("/list", validate, user_controller.list);
router.get("/matrimonialList", user_controller.matrimonialList);
router.get("/currentuser", validate, user_controller.currentUser);
router.get("/:id", validate, user_controller.findOne);
router.put("/update", validate, user_controller.update);
router.put("/updatepassword", validate, user_controller.updatePassword);
router.post("/signup", user_controller.create);
router.post(
  "/updateMatrimonialStatus/:id",
  validate,
  user_controller.updateMatrimonialStatus,
);
router.post(
  "/editUserPrivateDetails",
  validate,
  user_controller.editUserPrivateDetails,
);

router.put("/:id", validate, user_controller.updateUser);
router.delete("/:id", validate, user_controller.delete);
router.post("/login", user_controller.login);
router.get("/:id/refreshToken", user_controller.createRefreshToken);
router.post("/forgotpassword", user_controller.forgotpassword);
router.post("/:id/verification", user_controller.verification);
router.post("/otp-verification", user_controller.otpVerification);
router.post("/:id/resendOtp", user_controller.resendOtp);
router.post("/sendOtp", user_controller.sendOtp);
router.post(
  "/upload/profileImage",
  validate,
  user_controller.uploadProfileImage,
);
router.post("/resetpassword", user_controller.resetUserPasswordWithEmailOtp);
router.post("/confirmPasswordOtp", user_controller.verifyOtpForResetPassword);
router.post("/google/auth", user_controller.googleAuth);

module.exports = router;
