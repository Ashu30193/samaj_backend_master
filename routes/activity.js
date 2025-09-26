const express = require("express");
const router = express.Router();

const ActivityController = require("../controllers/activity");
const { validate } = require("../middlewares/policies");

router.get("/", validate, ActivityController.get);

module.exports = router;
