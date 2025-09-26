var mongoose = require('mongoose');
var Schema = mongoose.Schema;
// create a schema
var urlShortenSchema = new Schema({
    token: { type: String, required: true },
    urlCode: { type: String, required: true },
    description: String
}, { versionKey: false, timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
// the schema is useless so far
// we need to create a model using it
var UrlShorten = mongoose.model('UrlShorten', urlShortenSchema);

// make this available to our users in our Node applications
module.exports = UrlShorten;