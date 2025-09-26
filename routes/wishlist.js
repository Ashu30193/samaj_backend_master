const express = require("express");
const router = express.Router();

const wishListController = require("../controllers/wishlist");

const { validate } = require("../middlewares/policies");

router.get("/list", wishListController.list);
router.post("/create", validate, wishListController.create);
router.delete("/:id", validate, wishListController.delete);

module.exports = router;
