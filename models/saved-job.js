var mongoose = require("mongoose");
var Schema = mongoose.Schema;
// create a schema
var savedJobsScehma = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    job: { type: Schema.Types.ObjectId, ref: "Job", required: true },
  },
  {
    versionKey: false,
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

savedJobsScehma.index({ userId: 1, job: 1 }, { unique: true });

savedJobsScehma.statics = {
  list({ page = 1, perPage = 10, userId }) {
    page = parseInt(page, 10);
    perPage = parseInt(perPage, 10);

    return this.find({ userId })
      .populate("job")
      .sort({ createdAt: -1 })
      .skip(perPage * (page - 1))
      .limit(perPage)
      .exec();
  },

  countJobs(userId) {
    return this.find({ userId }).countDocuments().exec();
  },
};

// the schema is useless so far
// we need to create a model using it
var SavedJob = mongoose.model("SavedJob", savedJobsScehma);

// make this available to our users in our Node applications
module.exports = SavedJob;
