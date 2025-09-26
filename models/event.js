const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// create a schema
const eventSchema = new Schema(
  {
    name: { type: String, required: true },
    date: { type: Date },
    image: { type: String },
    description: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);
// the schema is useless so far
// we need to create a model using it
const Event = mongoose.model("Event", eventSchema);

// make this available to our users in our Node applications
module.exports = Event;
