const express = require("express");
const router = express.Router();

const audioBooksController = require("../controllers/audiobooks");

const { validate } = require("../middlewares/policies");

router.get("/list", audioBooksController.list);
router.get("/:id", audioBooksController.findOne);
router.post("/create", validate, audioBooksController.create);
router.put("/:id/update", validate, audioBooksController.update);
router.delete("/:id", validate, audioBooksController.delete);

module.exports = router;
