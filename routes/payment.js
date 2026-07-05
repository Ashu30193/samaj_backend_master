const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment");
const { validate, validateAdmin } = require("../middlewares/policies");

// Create order - requires authentication
router.post("/create-order", validate, paymentController.createOrder);

// Verify payment - requires authentication
router.post("/verify", validate, paymentController.verifyPayment);

// Get subscription status - requires authentication
router.get("/subscription-status", validate, paymentController.getSubscriptionStatus);

// List own transactions - requires user authentication
router.get("/transactions", validate, paymentController.getTransactions);

// List all transactions - requires admin authentication
router.get("/admin/transactions", validateAdmin, paymentController.getAllTransactions);

// Webhook - no authentication (called by Razorpay, verified by signature)
router.post("/webhook", paymentController.webhook);

module.exports = router;
