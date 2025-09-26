const express = require("express");
const router = express.Router();

const eventController = require("../controllers/event");
const { validateAdmin } = require("../middlewares/policies");
const { validate } = require("../middlewares/policies");

router.get("/:id", validate, eventController.findOne);

router.post("/", validate, eventController.create);

router.get("/", eventController.list);

router.post(
  "/createAdminEvent",
  validateAdmin,
  eventController.createAdminEvent,
);
router.put("/:id/update", validate, eventController.update);
router.delete("/:id", validateAdmin, eventController.delete);
router.delete(
  "/deleteEventByAdmin/:id",
  validateAdmin,
  eventController.deleteEventByAdmin,
);

module.exports = router;
