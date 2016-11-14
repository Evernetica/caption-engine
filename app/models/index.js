var fs = require('fs');
var path = require('path');
var basename = path.basename(module.filename);
var db = {};

fs
    .readdirSync(__dirname)
    .filter(function(file) {
        return (file.indexOf('.') !== 0) && (file !== basename) && (file !== 'validators.js');
    })
    .forEach(function(file) {
        var model = require(path.join(__dirname, file));
        db[model.modelName] = model;
    });

Object.keys(db).forEach(function(modelName) {
    if ('associate' in db[modelName]) {
        db[modelName].associate(db);
    }
});

db.ObjectId = require('mongoose').Types.ObjectId;

module.exports = db;
