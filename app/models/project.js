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

var modelSchema = new Schema({
    name: {
        type: String,
        required: [true]
    },
    name_parent: String,
    description: String,
    video: {
        url: String,
        duration: Number
    },
    tags: [String],
    use_character: {
        type: Boolean,
        default: false
    },

    is_multiple: {
        type: Boolean,
        default: false
    },

    is_archived: Boolean,
    date_archived: Date,

    type: {
        type: String,
        enum: ['MOVIE', 'TV', 'CORPORATE', 'ENTERTAINEMENT', 'EDUCATION', 'OTHER']
    },
    status: {
        type: String,
        enum: ['NONE', 'ENCODING_FINISHED', 'TRANSCRIPTION', 'TRANSCRIPTION_FINISHED', 'TRANSLATION']
    },

    jobs: [{
        mission: {
            type: String,
            enum: ['TRANSCRIPTION', 'TRANSLATION']
        },
        email: String,
        password: String,
        access_code: String,

        lang_source: String,
        lang_target: String,

        done: Boolean,
        accepted: Boolean,

        deadline: Date
    }],

    _parent: {
        type: Schema.Types.ObjectId,
        ref: 'Project'
    },
    _manager: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    _company: {
        type: Schema.Types.ObjectId,
        ref: 'Company'
    },
}, {
    timestamps: true
});

modelSchema.methods.hasTimecodes = function(){

};
modelSchema.methods.getPicto = function() {
    if(this.type == 'MOVIE')
        return 'fa-film';
    else if(this.type == 'TV')
        return 'fa-tv';
    else if(this.type == 'CORPORATE')
        return 'fa-suitcase';
    else {
        return 'fa-film';
    }
};

modelSchema.methods.getName = function() {
    if(this._parent != null){
        return this.name + ' - ' + this.name_parent;
    }
    else {
        return this.name;
    }
};

modelSchema.statics.getCompanyProjects = function(company){
    return this.find({
        _company: company._id,
        is_deleted:{$ne:true}
    });
};
modelSchema.statics.getUserProjects = function(user){
    if(user.is_admin) {
        return this.getCompanyProjects(user._company);
    }
    else {
        return this.where({
            _manager: user._id,
            is_deleted:{$ne:true}
        });
    }
};
modelSchema.statics.getUserProjectsWithEpisodes = function(user){
    if(user.is_admin){
        return this.getCompanyProjects(user._company);
    }
    else {
        return this.where({
            _manager: user._id,
            is_deleted:{$ne:true}
        });
    }
};

var Project = mongoose.model('Project', modelSchema, 'projects');

// make this available to our users in our Node applications
module.exports = Project;
