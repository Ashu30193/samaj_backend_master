const express = require("express");
const router = express.Router();

const categoryController = require("../controllers/category");

const { validate } = require("../middlewares/policies");

router.get("/list", categoryController.list);
router.get("/:id", validate, categoryController.findOne);
router.get("/category-products/:id", validate, categoryController.findProduct);
router.post("/create", validate, categoryController.create);
router.put("/:id/update", validate, categoryController.update);
router.delete("/:id", validate, categoryController.delete);

module.exports = router;
