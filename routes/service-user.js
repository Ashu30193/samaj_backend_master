const express = require("express");
const router = express.Router();

const serviceUserController = require("../controllers/service-user");
const { validateAdmin, validate } = require("../middlewares/policies");

router.get("/", validate, serviceUserController.list);

module.exports = router;