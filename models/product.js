const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// create a schema
const productSchema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    descripiton: { type: String },
    isActive: { type: Boolean, default: true },
    image: { type: Array },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    business: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);
// the schema is useless so far
// we need to create a model using it
const Product = mongoose.model("Product", productSchema);

// make this available to our users in our Node applications
module.exports = Product;
