const express = require("express");
const router = express.Router();

const FormController = require("../controllers/forms");
const { validate } = require("../middlewares/policies");

router.post("/:type", validate, FormController.create);
router.get("/", validate, FormController.get);
router.get("/:id", validate, FormController.getOne);
router.get("/count/stats", validate, FormController.stats);
router.put("/:id", validate, FormController.update);

module.exports = router;
