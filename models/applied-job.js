const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// create a schema
const appliedJobsScehma = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
  },
  {
    versionKey: false,
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

// the schema is useless so far
// we need to create a model using it
const AppliedJob = mongoose.model("AppliedJob", appliedJobsScehma);

// make this available to our users in our Node applications
module.exports = AppliedJob;
