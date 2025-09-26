const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// create a schema
const businessCategoriesSchema = new Schema(
  {
    name: { type: String, required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);
// the schema is useless so far
// we need to create a model using it
const BusinessCategories = mongoose.model(
  "BusinessCategories",
  businessCategoriesSchema,
);

// make this available to our users in our Node applications
module.exports = BusinessCategories;
