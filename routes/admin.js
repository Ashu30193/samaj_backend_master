var express = require("express");
var router = express.Router();

var admin_controller = require("../controllers/admin");
const { validateAdmin } = require("../middlewares/policies");

router.post("/login", admin_controller.adminLogin);
router.post("/signup", validateAdmin, admin_controller.createAdmin);
router.get("/list", validateAdmin, admin_controller.list);
router.get("/:id", validateAdmin, admin_controller.findOne);
router.delete("/deleteUser", validateAdmin, admin_controller.delete);

module.exports = router;
