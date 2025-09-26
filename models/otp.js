const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// create a schema

const otpSchema = new Schema(
  {
    phone: { type: String, required: true },
    otp: { type: String, required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);
// the schema is useless so far
// we need to create a model using it
const Otp = mongoose.model("Otp", otpSchema);

// make this available to our users in our Node applications
module.exports = Otp;
