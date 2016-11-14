/**
This file is part of Captiz.

Captiz is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Captiz is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Captiz.  If not, see <http://www.gnu.org/licenses/>.
**/

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var crypto = require('crypto');

var modelSchema = new Schema({
    email: {
        type: String,
        required: [true]
    },
    password: {
        type: String,
        required: [true]
    },
    firstname: {
        type: String,
        required: [true]
    },
    lastname: {
        type: String,
        required: [true]
    },
    is_admin: {
        type: Boolean,
        required: [true]
    },

    is_password_temporary: {
        type: Boolean,
        required: [true]
    },

    _company: {
        type: Schema.Types.ObjectId,
        ref: 'Company'
    }
}, {
    timestamps: true
});

modelSchema.pre('save', function(next) {
    /** Hash password **/
    if (this.isModified('password')) {
        this.password = crypto.createHash('sha1').update(this.password).digest('hex');
        next();
    } else {
        next();
    }
});

modelSchema.methods.getMyProjects = function() {
};
modelSchema.methods.getMyProjectsWithEpisodes = function() {
};


modelSchema.statics.login = function(email, password, callback) {
    var sha_password = crypto.createHash('sha1').update(password).digest('hex');
    this.findOne({
        email: email,
        password: sha_password
    }).populate('_company').exec(function(err, user) {
        if (err) {
            console.error(err);
        } else {
            callback(user);
        }
    });
};

var User = mongoose.model('User', modelSchema, 'users');

// make this available to our users in our Node applications
module.exports = User;
