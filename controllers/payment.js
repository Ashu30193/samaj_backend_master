const Razorpay = require("razorpay");
const crypto = require("crypto");
const User = require("../models/user");

// Select keys based on environment (live keys in production, test keys otherwise)
const isProduction = process.env.NODE_ENV === "production";
const RAZORPAY_KEY_ID = isProduction
  ? process.env.RAZORPAY_KEY_ID
  : process.env.RAZORPAY_KEY_ID_TEST;
const RAZORPAY_KEY_SECRET = isProduction
  ? process.env.RAZORPAY_KEY_SECRET
  : process.env.RAZORPAY_KEY_SECRET_TEST;

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

// Subscription plans
const PLANS = {
  1: { months: 3, price: 300, name: "3 Month Membership" },
  2: { months: 6, price: 500, name: "6 Month Membership" },
  3: { months: 12, price: 800, name: "12 Month Membership" },
};

/**
 * Create Razorpay Order
 * POST /payment/create-order
 */
exports.createOrder = async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user._id;

    // Validate plan
    const plan = PLANS[planId];
    if (!plan) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan selected",
      });
    }

    // Create Razorpay order
    // Receipt must be max 40 characters - using short format
    const shortUserId = userId.toString().slice(-8);
    const timestamp = Date.now().toString().slice(-8);
    const options = {
      amount: plan.price * 100, // Amount in paise
      currency: "INR",
      receipt: `rcpt_${shortUserId}_${timestamp}`,
      notes: {
        userId: userId.toString(),
        planId: planId.toString(),
        months: plan.months.toString(),
      },
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      plan: plan,
    });
  } catch (error) {
    console.error("Create Order Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
};

/**
 * Verify Payment and Update Subscription
 * POST /payment/verify
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;
    const userId = req.user._id;

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed - Invalid signature",
      });
    }

    // Get plan details
    const plan = PLANS[planId];
    if (!plan) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan",
      });
    }

    // Calculate subscription expiry
    const expireDate = new Date();
    expireDate.setMonth(expireDate.getMonth() + plan.months);

    // Update user subscription
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        subscription: true,
        subsDetails: {
          months: plan.months,
          expire: expireDate,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          planName: plan.name,
          amount: plan.price,
          createdAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment verified and subscription activated",
      data: {
        subscription: updatedUser.subscription,
        subsDetails: updatedUser.subsDetails,
      },
    });
  } catch (error) {
    console.error("Verify Payment Error:", error);
    res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: error.message,
    });
  }
};

/**
 * Get Subscription Status
 * GET /payment/subscription-status
 */
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("subscription subsDetails");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if subscription is expired
    let isActive = false;
    if (user.subscription && user.subsDetails?.expire) {
      isActive = new Date(user.subsDetails.expire) > new Date();
    }

    res.status(200).json({
      success: true,
      subscription: isActive,
      subsDetails: user.subsDetails,
      plans: PLANS,
    });
  } catch (error) {
    console.error("Get Subscription Status Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get subscription status",
      error: error.message,
    });
  }
};

/**
 * Razorpay Webhook (for server-to-server verification)
 * POST /payment/webhook
 */
exports.webhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // If webhook secret is configured, verify signature
    if (webhookSecret) {
      const signature = req.headers["x-razorpay-signature"];
      const body = JSON.stringify(req.body);

      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex");

      if (signature !== expectedSignature) {
        return res.status(400).json({ success: false, message: "Invalid webhook signature" });
      }
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === "payment.captured") {
      const payment = payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;

      // Get order details to find user
      const order = await razorpay.orders.fetch(orderId);
      const userId = order.notes?.userId;
      const planId = parseInt(order.notes?.planId);

      if (userId && planId) {
        const plan = PLANS[planId];
        const expireDate = new Date();
        expireDate.setMonth(expireDate.getMonth() + plan.months);

        await User.findByIdAndUpdate(userId, {
          subscription: true,
          subsDetails: {
            months: plan.months,
            expire: expireDate,
            paymentId: paymentId,
            orderId: orderId,
            planName: plan.name,
            amount: plan.price,
            createdAt: new Date(),
          },
        });
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
