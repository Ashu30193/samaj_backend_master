const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// create a schema

const cartSchema = new Schema(
  {
    audioBook: {
      type: Schema.Types.ObjectId,
      ref: "AudioBook",
      required: true,
    },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);
// the schema is useless so far
// we need to create a model using it
const Cart = mongoose.model("Cart", cartSchema);

// make this available to our users in our Node applications
module.exports = Cart;
