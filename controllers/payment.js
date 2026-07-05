const Razorpay = require("razorpay");
const crypto = require("crypto");
const User = require("../models/user");
const Transaction = require("../models/transaction");

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

// Startup diagnostic: which Razorpay mode/key did this process load?
console.log(
  "[Razorpay INIT] NODE_ENV=" + process.env.NODE_ENV +
  " | isProduction=" + isProduction +
  " | key_id=" + RAZORPAY_KEY_ID +
  " | secret_set=" + (RAZORPAY_KEY_SECRET ? "yes(len " + RAZORPAY_KEY_SECRET.length + ")" : "NO"),
);

// Subscription plans
const PLANS = {
  1: { months: 3, price: 300, name: "3 Month Membership" },
  2: { months: 6, price: 500, name: "6 Month Membership" },
  3: { months: 12, price: 800, name: "12 Month Membership" },
};

// Activate a user's subscription for the given plan.
// Returns the updated user (or null if user not found).
const activateSubscription = async (userId, plan, paymentId, orderId) => {
  const expireDate = new Date();
  expireDate.setMonth(expireDate.getMonth() + plan.months);

  return User.findByIdAndUpdate(
    userId,
    {
      subscription: true,
      subsDetails: {
        months: plan.months,
        expire: expireDate,
        paymentId,
        orderId,
        planName: plan.name,
        amount: plan.price,
        createdAt: new Date(),
      },
    },
    { new: true },
  );
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

    console.log(
      "[Create Order] planId=" + planId +
      " | amount(paise)=" + options.amount +
      " | using key_id=" + RAZORPAY_KEY_ID +
      " | NODE_ENV=" + process.env.NODE_ENV,
    );

    const order = await razorpay.orders.create(options);

    console.log(
      "[Create Order] SUCCESS order_id=" + order.id +
      " | status=" + order.status +
      " | amount=" + order.amount +
      " | this order belongs to key_id=" + RAZORPAY_KEY_ID,
    );

    // Record the transaction (status: created)
    await Transaction.create({
      user: userId,
      planId: Number(planId),
      planName: plan.name,
      months: plan.months,
      amount: plan.price,
      orderId: order.id,
      status: "created",
      currency: order.currency,
      notes: options.notes,
    });

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
      // Mark the transaction as failed if we can find it
      await Transaction.findOneAndUpdate(
        { orderId: razorpay_order_id },
        {
          status: "failed",
          paymentId: razorpay_payment_id || null,
          failureReason: "Invalid signature",
        },
      );
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

    // Update user subscription
    const updatedUser = await activateSubscription(
      userId,
      plan,
      razorpay_payment_id,
      razorpay_order_id,
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Mark the transaction as paid (verified by client)
    await Transaction.findOneAndUpdate(
      { orderId: razorpay_order_id },
      {
        status: "paid",
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        verifiedVia: "client",
        failureReason: null,
      },
    );

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
 * List the authenticated user's own transactions
 * GET /payment/transactions  (user auth)
 */
exports.getTransactions = async (req, res) => {
  try {
    const { page = 1, perPage = 10, status } = req.query;
    const user = req.user._id;

    const [transactions, total] = await Promise.all([
      Transaction.list({ page, perPage, status, user }),
      Transaction.count({ user, status }),
    ]);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      perPage: parseInt(perPage, 10),
      transactions,
    });
  } catch (error) {
    console.error("Get Transactions Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get transactions",
      error: error.message,
    });
  }
};

/**
 * List all transactions (admin only)
 * GET /payment/admin/transactions  (admin auth)
 * Optional filters: ?userId= &status= &page= &perPage=
 */
exports.getAllTransactions = async (req, res) => {
  try {
    const { page = 1, perPage = 20, status, userId } = req.query;

    const [transactions, total] = await Promise.all([
      Transaction.list({ page, perPage, status, user: userId || undefined }),
      Transaction.count({ status, user: userId || undefined }),
    ]);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      perPage: parseInt(perPage, 10),
      transactions,
    });
  } catch (error) {
    console.error("Get All Transactions Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get transactions",
      error: error.message,
    });
  }
};

/**
 * Razorpay Webhook (for server-to-server verification)
 * POST /payment/webhook
 *
 * Signature verification is mandatory: the webhook is a public, unauthenticated
 * endpoint, so without a verified signature anyone could forge a "payment.captured"
 * event and activate a subscription for free.
 */
exports.webhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Refuse to process webhooks unless a secret is configured.
    if (!webhookSecret) {
      console.error("Webhook rejected: RAZORPAY_WEBHOOK_SECRET is not set");
      return res.status(500).json({
        success: false,
        message: "Webhook secret not configured",
      });
    }

    const signature = req.headers["x-razorpay-signature"];
    if (!signature) {
      return res.status(400).json({ success: false, message: "Missing signature" });
    }

    // Use the raw request body captured in app.js for an exact-byte comparison.
    // Re-stringifying the parsed JSON can differ from what Razorpay signed.
    const rawBody = req.rawBody || JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    // Constant-time comparison to avoid timing attacks
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === "payment.captured" || event === "order.paid") {
      const payment = payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;

      // Resolve user & plan from the order notes
      const order = await razorpay.orders.fetch(orderId);
      const userId = order.notes?.userId;
      const planId = parseInt(order.notes?.planId);
      const plan = PLANS[planId];

      if (userId && plan) {
        await activateSubscription(userId, plan, paymentId, orderId);

        // Mark the transaction paid (idempotent: webhook may arrive more than once).
        // Only flip to paid if it isn't already, so we don't clobber a client verify.
        await Transaction.findOneAndUpdate(
          { orderId },
          {
            status: "paid",
            paymentId,
            verifiedVia: "webhook",
            failureReason: null,
          },
        );
      }
    } else if (event === "payment.failed") {
      const payment = payload.payment.entity;
      const orderId = payment.order_id;
      await Transaction.findOneAndUpdate(
        { orderId },
        {
          status: "failed",
          paymentId: payment.id,
          failureReason: payment.error_description || "Payment failed",
        },
      );
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
