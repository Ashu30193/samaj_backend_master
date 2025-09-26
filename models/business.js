const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// create a schema
const businessSchema = new Schema(
  {
    name: { type: String, required: true },
    address: {
      line1: { type: String, valueType: "String" },
      city: { type: String, valueType: "String" },
      zipcode: { type: String, valueType: "String" },
      state: { type: String, valueType: "String" },
    },
    businesscategory: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    isGst: { type: Boolean, default: false, valueType: "Boolean" },
    gstNo: { type: String, required: false },
    isExempted: { type: Boolean, default: false, valueType: "Boolean" },
    isNoGst: { type: Boolean, default: false, valueType: "Boolean" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);
// the schema is useless so far
// we need to create a model using it
const Business = mongoose.model("Business", businessSchema);

// make this available to our users in our Node applications
module.exports = Business;
