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

module.exports.controller = function(router) {
    router.post('/video/:project_id/set_video', function(req, res) {
        models.Project.findById(req.params.project_id).then(function(project) {
            project.video.url = req.body.url;
            project.status = 'ENCODING_FINISHED';
            project.save();
        });
        res.json({});
    });

    router.post('/video/:project_id/save_duration', function(req, res) {
        models.Project.findById(req.params.project_id).then(function(project) {
            console.log(req.body.duration);
            project.video.duration = req.body.duration;
            project.save();
        });
        res.json({});
    });

    router.post('/project/archive', function(req, res) {
        var today = moment();

        models.Project.update({
            _id: models.ObjectId(req.body.id)
        }, {
            $set: {
                is_archived: 1,
                date_archived: today,
                to_delete: 1
            }
        }).then(function() {
            return models.Project.update({
                _parent: models.ObjectId(req.body.id)
            }, {
                is_archived: 1,
                date_archived: today,
                to_delete: 1
            }).then(function() {
                req.session.toast_message = 'Your project has been succesfully archived.';
                res.redirect('/project/' + req.body.id + '/display');
            });
        })
        .catch(function(err){
            console.error(err);
        });
    });

    router.get('/video/play/:id/:user', router.routeLogAccess, function(req, res) {
        var ok = false;

        var done = function() {
            if (ok) {
                res.json({
                    url: ''
                }); // expires in 60 seconds
            } else {
                res.json({});
            }
        };

        if (req.session.current_user && req.params.user == 'full') {
            models.Project.getUserProjects(req.session.current_user)
                .where({
                    _id: models.ObjectId(req.params.id)
                })
                .count()
                .then(function(nb) {
                    console.log(nb);
                    if (nb > 0) {
                        ok = true;
                    }
                    done();
                })
                .catch(function(err) {
                    console.error(err);
                });
        } else if (req.session.freelance_logged && req.session.freelance_logged_code == req.params.user) {
            models.Project.findOne({
                'jobs.access_code': req.job.access_code,
                _id: req.params.id
            }).count()
            .then(function(nb) {
                if (nb == 1) {
                    ok = true;
                }
                done();
            })
            .catch(function(err) {
                console.error(err);
            });
        }
    });
};
