const express = require("express");
const router = express.Router();

const ProductController = require("../controllers/product");
const { validate } = require("../middlewares/policies");
const { validateAdmin } = require("../middlewares/policies");

router.get("/", validate, ProductController.list);
router.get("/:id", validate, ProductController.findOne);
router.post("/", validate, ProductController.create);
router.put("/:id", validate, ProductController.update);
router.get("/delete/:id", validate, ProductController.delete);

module.exports = router;
