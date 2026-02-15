const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment");
const { validate } = require("../middlewares/policies");

// Create order - requires authentication
router.post("/create-order", validate, paymentController.createOrder);

// Verify payment - requires authentication
router.post("/verify", validate, paymentController.verifyPayment);

// Get subscription status - requires authentication
router.get("/subscription-status", validate, paymentController.getSubscriptionStatus);

// Webhook - no authentication (called by Razorpay)
router.post("/webhook", paymentController.webhook);

module.exports = router;
