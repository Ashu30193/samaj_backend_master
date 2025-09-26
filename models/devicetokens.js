const mongoose = require('mongoose');
const Schema = mongoose.Schema;
// create a schema
const DeviceTokensSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true },
  },
  {
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);
// the schema is useless so far
// we need to create a model using it
const DeviceToken = mongoose.model('DeviceToken', DeviceTokensSchema);

// make this available to our users in our Node applications
module.exports = DeviceToken;
