const express = require("express");
const router = express.Router();

const siteConfigController = require("../controllers/siteConfig");

const { validate } = require("../middlewares/policies");

router.get("/", siteConfigController.getAll);
router.get("/:resource", siteConfigController.getResource);
router.put("/:resource/update", validate, siteConfigController.updateResource);

module.exports = router;
