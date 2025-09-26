var mongoose = require('mongoose');
var Schema = mongoose.Schema;
// create a schema
var PostCommentSchema = new Schema(
  {
    post_id: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    comment: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    post_owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);
// the schema is useless so far
// we need to create a model using it
const PostComment = mongoose.model('PostComment', PostCommentSchema);

// make this available to our users in our Node applications
module.exports = PostComment;
