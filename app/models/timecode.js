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
    start: {
        type: Date,
        required: [true]
    },
    end: {
        type: Date,
        required: [true]
    },
    original_lang: String,
    original_text: String,
    character: String,

    translations: [
        { _job: Schema.Types.ObjectId, lang: String, text: String }
    ],

    _project: {
        type: Schema.Types.ObjectId,
        ref: 'Project'
    }
}, {
    timestamps: true
});

var Timecode = mongoose.model('Timecode', modelSchema, 'timecodes');

// make this available to our users in our Node applications
module.exports = Timecode;
