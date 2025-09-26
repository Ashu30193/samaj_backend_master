const mongoose = require("mongoose");
const httpStatus = require("http-status");
const APIError = require("../errors/api-error");
const Schema = mongoose.Schema;

const JobSchema = new Schema(
  {
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String },
    vacancies: { type: String },
    description: { type: String },
    jobType: { type: String, required: true }, // Full Time | Work From Home | Internship
    pay: { type: String }, // ex: 100000
    communicationType: { type: String }, // ex: email | whatsapp
    responsibilites: { type: String },
    skills: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }, // user who has created this job
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true }, // user who has updated this job
    isActive: { type: Boolean, default: true, valueType: "Boolean" },
    isVerified: { type: Boolean, default: false, valueType: "Boolean" },
    applicants: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
  },
  {
    versionKey: false,
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

JobSchema.method({
  transform() {
    const transformed = {};
    const fields = [
      "id",
      "title",
      "company",
      "vacancies",
      "description",
      "jobType",
      "startDate",
      "endDate",
      "pay",
      "payPerType",
      "communicationType",
      "responsibilities",
      "skillsRequired",
    ];

    fields.forEach((field) => {
      transformed[field] = this[field];
    });

    return transformed;
  },
});

JobSchema.statics = {
  list({ page = 1, perPage = 10, search, searchLocation }) {
    page = parseInt(page, 10);
    perPage = parseInt(perPage, 10);

    let options = {};
    if (search)
      options = {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { "company.title": { $regex: search, $options: "i" } },
          { "company.state": { $regex: search, $options: "i" } },
          { "company.city": { $regex: search, $options: "i" } },
          { "company.locality": { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      };

    if (searchLocation)
      options = {
        $and: [
          { ...options },
          {
            $or: [
              { "company.state": { $regex: searchLocation, $options: "i" } },
              { "company.city": { $regex: searchLocation, $options: "i" } },
              { "company.locality": { $regex: searchLocation, $options: "i" } },
            ],
          },
        ],
      };

    return this.find(options)
      .sort({ createdAt: -1 })
      .skip(perPage * (page - 1))
      .limit(perPage)
      .exec();
  },

  countJobs() {
    return this.countDocuments().exec();
  },

  async get(id) {
    let job;

    if (mongoose.Types.ObjectId.isValid(id)) {
      job = await this.findById(id).exec();
    }
    if (job) {
      return job;
    }

    throw new APIError({
      message: "Job does not exist",
      status: httpStatus.NOT_FOUND,
    });
  },
};

const Job = mongoose.model("Job", JobSchema);

module.exports = Job;
