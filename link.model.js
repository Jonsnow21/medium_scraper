let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let linkSchema = new Schema({
    url: {type: String},
    refCount: {type: Number},
    params: {type: Array},
});

let Link = mongoose.model('Link', linkSchema);

module.exports = Link;