const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// create a schema

const audioBooksSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    category: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    narratedBy: { type: String, trim: true },
    releaseDate: { type: Date },
    language: { type: String },
    writtenBy: { type: String },
    publisher: { type: String },
    tags: [{ type: String }],
    cover: { type: Object, required: true },
    audio: [{ type: Object, required: true }],
    country: { type: String, required: true },
    price: [{ type: Object, required: true }],
    rating: { type: Number, default: 0 },
    totalRating: { type: Number, default: 0 },
    itemsSold: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);
// the schema is useless so far
// we need to create a model using it
const AudioBook = mongoose.model("AudioBook", audioBooksSchema);

// make this available to our users in our Node applications
module.exports = AudioBook;
