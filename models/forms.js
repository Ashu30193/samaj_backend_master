const mongoose = require('mongoose');
const Schema = mongoose.Schema;
// create a schema
const formsSchema = new Schema(
  { any: Schema.Types.Mixed },
  {
    strict: false,
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);
// the schema is useless so far
const Forms = mongoose.model('Forms', formsSchema);

// make this available to our users in our Node applications
module.exports = Forms;
