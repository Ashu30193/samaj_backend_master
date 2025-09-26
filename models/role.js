var mongoose = require('mongoose');
var Schema = mongoose.Schema;
// create a schema
var roleSchema = new Schema(
  {
    name: { type: String, required: true },
  },
  {
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);
// the schema is useless so far
// we need to create a model using it
var Role = mongoose.model('Role', roleSchema);

// make this available to our users in our Node applications
module.exports = Role;
