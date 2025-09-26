const { Joi } = require("express-validation");

module.exports = {
  createJob: {
    body: Joi.object({
      title: Joi.string().required(),
      company: Joi.object({
        name: Joi.string().required(),
        state: Joi.string().required(),
        city: Joi.string().required(),
        locality: Joi.string().required(),
      }),
      vacancies: Joi.number().required(),
      description: Joi.string().required(),
      jobType: Joi.string().required(),
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().min(Joi.ref("startDate")).required(),
      pay: Joi.number().required(),
      payPerType: Joi.string().required(),
      communicationType: Joi.string().required(),
      responsibilities: Joi.string().optional().allow(null, ""),
      skillsRequired: Joi.string().optional().allow(null, ""),
    }),
  },
  getJobs: {
    query: Joi.object({
      search: Joi.string(),
      searchLocation: Joi.string(),
      page: Joi.number().min(1),
      perPage: Joi.number().min(1).max(100),
    }),
  },
  getJobWithId: {
    params: Joi.object({
      jobId: Joi.string()
        .regex(/^[a-fA-F0-9]{24}$/)
        .required(),
    }),
  },
  updateJob: {
    body: Joi.object({
      title: Joi.string(),
      company: Joi.object({
        name: Joi.string(),
        state: Joi.string(),
        city: Joi.string(),
        locality: Joi.string(),
      }),
      vacancies: Joi.number(),
      description: Joi.string(),
      jobType: Joi.string(),
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso().min(Joi.ref("startDate")),
      pay: Joi.number(),
      payPerType: Joi.string(),
      communicationType: Joi.string(),
      responsibilities: Joi.string().allow(null, ""),
      skillsRequired: Joi.string().allow(null, ""),
    }),
    params: Joi.object({
      jobId: Joi.string()
        .regex(/^[a-fA-F0-9]{24}$/)
        .required(),
      updateBy: Joi.string().valid("employer", "candidate").required(),
    }),
  },
  deleteJob: {
    params: Joi.object({
      jobId: Joi.string()
        .regex(/^[a-fA-F0-9]{24}$/)
        .required(),
    }),
  },
  applyOrExempt: {
    params: Joi.object({
      jobId: Joi.string()
        .regex(/^[a-fA-F0-9]{24}$/)
        .required(),
    }),
    body: Joi.object({
      action: Joi.string().valid("apply", "exempt").required(),
    }),
  },
  saveOrUnsave: {
    params: Joi.object({
      jobId: Joi.string()
        .regex(/^[a-fA-F0-9]{24}$/)
        .required(),
    }),
    body: Joi.object({
      action: Joi.string().valid("save", "unsave").required(),
    }),
  },
  getSavedJobs: {
    query: Joi.object({
      page: Joi.number().min(1),
      perPage: Joi.number().min(1).max(100),
    }),
  },
  getAppliedJobs: {
    query: Joi.object({
      page: Joi.number().min(1),
      perPage: Joi.number().min(1).max(100),
    }),
  },
};
