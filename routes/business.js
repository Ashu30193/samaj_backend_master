const express = require("express");
const router = express.Router();

const BusinessController = require("../controllers/business");
const { validate } = require("../middlewares/policies");

router.post("/", validate, BusinessController.create);
router.post("/categories", validate, BusinessController.addcategories);
router.put("/:id", validate, BusinessController.update);
router.get("/businesses", validate, BusinessController.list);
router.get("/user-business/:id", validate, BusinessController.userBusiness);

module.exports = router;
