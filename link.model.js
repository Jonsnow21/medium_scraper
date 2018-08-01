let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let linkSchema = new Schema({
    url: {type: String, unique: true},
    refCount: {type: Number, default: 1},
    params: {type: Array},
});

let Link = mongoose.model('Link', linkSchema);

module.exports = Link;