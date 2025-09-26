const express = require("express");
const router = express.Router();

const NewsController = require("../controllers/news");
const { validate } = require("../middlewares/policies");
const { validateAdmin } = require("../middlewares/policies");

router.get("/", NewsController.list);
router.get("/:id", validate, NewsController.findOne);
router.post("/", validate, NewsController.create);
router.post("/add", validate, NewsController.addNews);
router.post(
  "/createNewsAdmin",
  validateAdmin,
  NewsController.createNewsByAdmin,
);
router.put("/:id", validate, NewsController.update);
//router.delete("/:id", validate, NewsController.delete);
router.delete("/:id", validateAdmin, NewsController.deleteNewsAdmin);

module.exports = router;
