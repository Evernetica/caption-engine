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

'use strict';

var models = require('../models');
var moment = require('moment');

var _ = require('lodash');

module.exports = function() {

    var today = moment();

    /* ---------- DELETE VIDEO WAITING FOR ---------- */
    models.Project.find({
        to_delete: 1
    }).then(function(projects){
        _.forEach(projects, function(project) {

            var date_archived = moment(project.date_archived);
            var diff = today.diff(date_archived, 'hours');

            console.log(diff);

            if(diff >= 24){
                project.to_delete = 0;
                project.save();
            }
        });
    });
};
