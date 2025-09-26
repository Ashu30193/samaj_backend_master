const express = require("express");
const jobsController = require("../controllers/job");
const { validate } = require("../middlewares/policies");
const { validateAdmin } = require("../middlewares/policies");
const router = express.Router();

router.put("/:id", validate, jobsController.update);
router.post("/create", validate, jobsController.create);
router.get("/list", validate, jobsController.get);
router.post("/apply/:jobId", validate, jobsController.applyJob);
router.get("/getAppliedJobs", validate, jobsController.getAppliedJobs);

module.exports = router;
