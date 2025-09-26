var mongoose = require("mongoose");
var Schema = mongoose.Schema;
// create a schema
var PostSchema = new Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String },
    // likes: { type: Number },
    dislikes: { type: Number },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isVerified: { type: Boolean, default: false, valueType: "Boolean" },
  },
  {
    versionKey: false,
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);
// the schema is useless so far
// we need to create a model using it
var Post = mongoose.model("Post", PostSchema);

// make this available to our users in our Node applications
module.exports = Post;
