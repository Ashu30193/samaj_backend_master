const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// create a schema

const transactionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Plan details (snapshot at time of purchase)
    planId: { type: Number, required: true },
    planName: { type: String },
    months: { type: Number },
    amount: { type: Number, required: true }, // amount in INR (rupees)

    // Razorpay identifiers
    orderId: { type: String, required: true, index: true },
    paymentId: { type: String, default: null, index: true },
    signature: { type: String, default: null },

    // Lifecycle: created -> paid | failed
    status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
    },

    // How the payment was confirmed: client verify call or server webhook
    verifiedVia: {
      type: String,
      enum: ["client", "webhook", null],
      default: null,
    },

    currency: { type: String, default: "INR" },
    notes: { type: Schema.Types.Mixed },
    failureReason: { type: String, default: null },
  },
  {
    versionKey: false,
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

transactionSchema.statics = {
  list({ page = 1, perPage = 10, user, status }) {
    page = parseInt(page, 10);
    perPage = parseInt(perPage, 10);

    const options = {};
    if (user) options.user = user;
    if (status) options.status = status;

    return this.find(options)
      .populate("user", "name phone email")
      .sort({ created_at: -1 })
      .skip(perPage * (page - 1))
      .limit(perPage)
      .exec();
  },

  count({ user, status } = {}) {
    const options = {};
    if (user) options.user = user;
    if (status) options.status = status;
    return this.find(options).countDocuments().exec();
  },
};

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
