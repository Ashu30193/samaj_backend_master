const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const siteConfigSchema = new Schema(
  {
    marital_status: [
      {
        name: String,
        value: String,
        updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      },
    ],
    clan: [
      {
        name: String,
        value: String,
        updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      },
    ],
    higher_qualification: [
      {
        name: String,
        value: String,
        updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      },
    ],
    occupation: [
      {
        name: String,
        value: String,
        updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      },
    ],
    annual_income: [
      {
        name: String,
        value: String,
        updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      },
    ],
    job_type: [
      {
        name: String,
        value: String,
        updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      },
    ],
    pay: [
      {
        name: String,
        value: String,
        updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      },
    ],
    work_location: [
      {
        name: String,
        value: String,
        updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      },
    ],
    date_posted: [
      {
        name: String,
        value: String,
        updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      },
    ],
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

const SiteConfig = mongoose.model("SiteConfig", siteConfigSchema);

module.exports = SiteConfig;
