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

var models = require('../models');
var moment = require('moment');
var helpers = require('../helpers');
var crypto = require('crypto');

var winston = require('winston');
var logger = winston.loggers.get('default');

module.exports.controller = function(router) {
    router.get('/transcription/demo', router.routeLogAccess, function(req, res) {
        var params = {};
        params.access_code = req.params.code;

        res.render('transcription/demo', params);
    });

    router.get('/freelance', function(req, res) {
        if (req.session.freelance_logged) {
            models.Project.findOne({
                'jobs.access_code': req.job.access_code,
                is_deleted: {
                    $ne: true
                }
            }, {
                'jobs': {
                    $elemMatch: {
                        'access_code': req.job.access_code
                    }
                }
            })
            .exec()
            .then(function(project) {
                if (project != null && !project.is_archive && project.jobs.length == 1) {
                    var job = project.jobs[0];

                    if (job.mission == 'TRANSCRIPTION') {
                        res.redirect('/freelance/transcription');
                    } else if (job.mission == 'TRANSLATION') {
                        res.redirect('/freelance/translation');
                    }
                } else {
                    if (project.is_archived) {
                        req.session.toast_message = 'This project is archived';
                    } else {
                        req.session.toast_message = 'You are not allowed to access this interface.';
                    }
                    res.redirect('/');
                }
            })
            .catch(function(err) {
                console.error(err);
            });
        }
    });

    router.get('/freelance/login', function(req, res) {
        res.render('freelance/login');
    }).post('/freelance/login', function(req, res) {
        models.Project.findOne({
            'jobs.email': req.body.email.toLowerCase().trim(),
            'jobs.password': crypto.createHash('sha1').update(req.body.password).digest('hex'),
            is_deleted: {
                $ne: true
            }
        }, {
            'jobs': {
                $elemMatch: {
                    'email': req.body.email.toLowerCase().trim(),
                    'password': crypto.createHash('sha1').update(req.body.password).digest('hex')
                }
            }
        }).then(function(project) {
            if (project != null && project.jobs.length == 1) {
                var job = project.jobs[0];
                req.session.freelance_logged = true;
                req.session.freelance_logged_code = job.access_code;
                req.session.toast_message = 'You\'ve been logged in with success!';

                if (job.mission == 'TRANSLATION') {
                    res.redirect('/freelance/translation');
                } else if (job.mission == 'TRANSCRIPTION') {
                    res.redirect('/freelance/transcription');
                }
            } else {
                req.session.toast_message = 'Error with your credentials !';
                res.redirect('/freelance/login');
            }
        });
    }).get('/freelance/logout', function(req, res) {
        req.session.freelance_logged = false;
        req.session.freelance_logged_code = null;
        if(req.session.freelance_proofread) {
            var pid = req.session.freelance_proofread_id;
            req.session.freelance_proofread_id = -1;
            req.session.freelance_proofread = false;
            res.redirect('/project/'+pid+'/display');
        }
        else {
            res.redirect('/freelance/login');
        }
    });


    router.get('/project/freelance/:code/proofread', function(req, res) {
        models.Project.findOne({
            'jobs.access_code': req.params.code,
            is_deleted: {
                $ne: true
            }
        }, {
            'jobs': {
                $elemMatch: {
                    'access_code': req.params.code,
                }
            }
        }).then(function(project) {
            console.log(JSON.stringify(project));
            if (project != null && project.jobs.length == 1) {
                var job = project.jobs[0];
                req.session.freelance_logged = true;
                req.session.freelance_logged_code = job.access_code;
                req.session.freelance_proofread = true;
                req.session.freelance_proofread_id = project._id;
                req.session.toast_message = 'You\'ve been logged in with success!';

                if (job.mission == 'TRANSLATION') {
                    res.redirect('/freelance/translation');
                } else if (job.mission == 'TRANSCRIPTION') {
                    res.redirect('/freelance/transcription');
                }
            } else {
                req.session.toast_message = 'Error with your credentials !';
                res.redirect('/freelance/login');
            }
        });
    });

    router.get('/freelance/transcription', router.routeLogAccess, function(req, res) {
        var params = {};

        if (req.session.freelance_logged) {
            models.Project.findOne({
                'jobs.access_code': req.job.access_code,
                is_deleted: {
                    $ne: true
                }
            }, {
                'name': 1,
                'video': 1,
                'description': 1,
                'is_archived': 1,
                files: 1,
                use_character: 1,
                _parent: 1,
                name_parent: 1,
                'jobs': {
                    $elemMatch: {
                        'access_code': req.job.access_code
                    }
                }
            })
            .populate('_company')
            .exec()
            .then(function(project) {
                if (project != null && project.jobs.length == 1) {
                    var job = project.jobs[0];
                    if (!project.is_archived && job.mission == 'TRANSCRIPTION') {
                        params.project = project;
                        params.job = job;

                        if (!req.session.freelance_proofread && (job.accepted == true || job.done == true)) {
                            res.render('freelance/finish', params);
                        } else {
                            res.render('transcription/transcriptor', params);
                        }
                    } else {
                        if (project.is_archived) {
                            req.session.toast_message = 'This project is archived';
                        }
                        res.redirect('/');
                    }
                } else {
                    req.session.toast_message = 'You are not allowed to access this interface.';
                    res.redirect('/');
                }
            })
            .catch(function(err) {
                console.error(err);
            });
        }
    });

    router.get('/freelance/translation', router.routeLogAccess, function(req, res) {
        var params = {};


        if (req.session.freelance_logged) {
            models.Project.findOne({
                'jobs.access_code': req.job.access_code,
                is_deleted: {
                    $ne: true
                }
            }, {
                'name': 1,
                'video': 1,
                'description': 1,
                'is_archived': 1,
                _parent: 1,
                name_parent: 1,
                files: 1,
                'jobs': {
                    $elemMatch: {
                        'access_code': req.job.access_code
                    }
                }
            })
            .populate('_company')
            .exec()
            .then(function(project) {
                if (project != null && project.jobs.length == 1) {
                    var job = project.jobs[0];
                    if (!project.is_archived && job.mission == 'TRANSLATION') {
                        params.project = project;
                        params.job = job;

                        if (!req.session.freelance_proofread && (job.accepted == true || job.done == true)) {
                            res.render('freelance/finish', params);
                        } else {
                            res.render('translation/translate', params);
                        }
                    } else {
                        if (project.is_archived) {
                            req.session.toast_message = 'This project is archived';
                        }
                        res.redirect('/');
                    }
                }
            })
            .catch(function(err) {
                console.error(err);
            });
        }
    });


    router.get('/freelance/watch', function(req, res) {
        var params = {};

        if (req.session.freelance_logged) {
            models.Project.findOne({
                'jobs.access_code': req.job.access_code,
                is_deleted: {
                    $ne: true
                }
            }, {
                'video': 1,
                'jobs': {
                    $elemMatch: {
                        'access_code': req.job.access_code
                    }
                }
            })
            .exec()
            .then(function(project) {
                if (project != null && project.jobs.length == 1) {
                    var job = project.jobs[0];
                    if (!project.is_archived && job.mission == 'TRANSLATION') {
                        params.job = job;
                        params.project = project;

                        if (!req.session.freelance_proofread && (job.accepted == true || job.done == true)) {
                            res.render('freelance/finish', params);
                        } else {
                            res.render('freelance/watch', params);
                        }
                    }
                }
            });
        }
    });

    router.get('/freelance/timecodes', function(req, res) {
        if (req.session.freelance_logged) {
            models.Project.findOne({
                'jobs.access_code': req.job.access_code,
                is_deleted: {
                    $ne: true
                }
            }, {
                'jobs': {
                    $elemMatch: {
                        'access_code': req.job.access_code
                    }
                }
            })
            .exec()
            .then(function(project) {
                if (project != null && project.jobs.length == 1) {
                    var job = project.jobs[0];
                    return models.Timecode.find({
                        _project: project._id
                    }, {
                        start: 1,
                        end: 1,
                        original_lang: 1,
                        original_text: 1,
                        character: 1,
                        'translations': {
                            $elemMatch: {
                                '_job': job._id
                            }
                        }
                    })
                    .sort('start')
                    .lean()
                    .then(function(t) {
                        var timecodes = new Array();
                        for (var i = 0; i < t.length; i++) {
                            timecodes.push(t[i]);
                            var m = moment(timecodes[i].start);
                            var m2 = moment(timecodes[i].end);

                            timecodes[i].seconds = (m.millisecond() + m.second() * 1000 + m.minute() * 60000 + m.hour() * 3600000) / 1000;
                            timecodes[i].length = ((m2.millisecond() + m2.second() * 1000 + m2.minute() * 60000 + m2.hour() * 3600000) - (m.millisecond() + m.second() * 1000 + m.minute() * 60000 + m.hour() * 3600000)) / 1000;

                            if (req.query.notext == undefined) {
                                timecodes[i].original = timecodes[i].original_text != null ? timecodes[i].original_text /*.replace(/'/g, '\\'')*/ : '';
                                if (timecodes[i].translations && timecodes[i].translations.length > 0 && timecodes[i].translations[0].text != null) {
                                    timecodes[i].translations[0].text = timecodes[i].translations[0].text /*.replace(/'/g, '\\'')*/ ;
                                }
                            }
                        }

                        res.json({
                            timecodes: timecodes
                        });
                    });
                }
            })
            .catch(function(err) {
                console.error(err);
            });
        }
    });



    router.get('/freelance/sheet', router.routeLogAccess, function(req, res) {
        var params = {};

        if (req.session.freelance_logged) {
            models.Project.findOne({
                'jobs.access_code': req.job.access_code,
                is_deleted: {
                    $ne: true
                }
            }, {
                'use_character': 1,
                'video': 1,
                'jobs': {
                    $elemMatch: {
                        'access_code': req.job.access_code
                    }
                }
            })
            .exec()
            .then(function(project) {
                if (project != null && !project.is_archive && project.jobs.length == 1) {
                    var job = project.jobs[0];
                    return models.Timecode.find({
                        _project: project._id
                    }, {
                        start: 1,
                        end: 1,
                        original_lang: 1,
                        original_text: 1,
                        character: 1,
                        'translations': {
                            $elemMatch: {
                                '_job': job._id
                            }
                        }
                    })
                    .sort('start')
                    .lean()
                    .then(function(t) {
                        var timecodes = new Array();
                        for (var i = 0; i < t.length; i++) {
                            timecodes.push(t[i]);
                            var m = moment(timecodes[i].start);
                            var m2 = moment(timecodes[i].end);

                            timecodes[i].seconds = (m.millisecond() + m.second() * 1000 + m.minute() * 60000 + m.hour() * 3600000) / 1000;
                            timecodes[i].length = ((m2.millisecond() + m2.second() * 1000 + m2.minute() * 60000 + m2.hour() * 3600000) - (m.millisecond() + m.second() * 1000 + m.minute() * 60000 + m.hour() * 3600000)) / 1000;

                            timecodes[i].start = timecodes[i].seconds;
                            timecodes[i].end = timecodes[i].seconds + timecodes[i].length;

                            if (req.query.notext == undefined) {
                                timecodes[i].original = timecodes[i].original_text != null ? timecodes[i].original_text.replace(/\n/g, '\\n').replace(/"/g, '\\"') : '';
                                if (timecodes[i].translations && timecodes[i].translations.length > 0 && timecodes[i].translations[0].text != null) {
                                    timecodes[i].translations[0].text = timecodes[i].translations[0].text.replace(/\n/g, '\\n').replace(/"/g, '\\"');
                                }
                            }
                        }

                        params.project = project;
                        params.job = job;
                        params.timecodes = timecodes;

                        if (!req.session.freelance_proofread && (job.accepted == true || job.done == true)) {
                            res.render('freelance/finish', params);
                        } else {
                            res.render('freelance/sheet', params);
                        }
                    });
                } else {
                    if (project.is_archived) {
                        req.session.toast_message = 'This project is archived';
                    } else {
                        req.session.toast_message = 'You are not allowed to access this interface.';
                    }
                    res.redirect('/');
                }
            })
            .catch(function(err) {
                console.error(err);
            });
        }
    });



    router.post('/freelance/done', router.routeLogAccess, function(req, res) {
        var reason = req.body.reason;


        if (req.session.freelance_logged) {
            models.Project.findOne({
                'jobs.access_code': req.job.access_code,
                is_deleted: {
                    $ne: true
                }
            }, {
                'name': 1,
                'is_archived': 1,
                '_manager': 1,
                '_parent': 1,
                'name_parent': 1,
                'jobs': {
                    $elemMatch: {
                        'access_code': req.job.access_code
                    }
                }
            })
            .populate('_manager')
            .populate('_parent')
            .exec()
            .then(function(project) {
                if (project != null && project.jobs.length == 1) {
                    if (!project.is_archived) {
                        return models.Project.findOneAndUpdate({
                            'jobs.access_code': req.job.access_code,
                            is_deleted: {
                                $ne: true
                            }
                        }, {
                            $set: {
                                'jobs.$.done': true,
                                'jobs.$.accepted': false
                            }
                        })
                        .then(function() {
                            logger.info('Translation marked as done', {
                                project: project._id,
                                translator: project.jobs[0].email
                            });

                            helpers.sendEmail({
                                to: project._manager.email,
                                subject: 'Mission marked as done',
                                content_id: 'project_mission_marked_done',
                                values: {
                                    '--PROJECT_NAME--': project.getName(),
                                    '--EMAIL--': project.jobs[0].email,
                                    '--MESSAGE--': reason
                                }
                            });

                            res.redirect('/freelance');
                        });
                    }
                }
            })
            .catch(function(err) {
                console.error(err);
            });
        }
    });


    router.post('/project/freelance/:code/change_password', router.routeLogAccess, function(req, res) {
        var access_code = req.params.code;
        var new_password = req.body.password;

        models.Project.getUserProjects(req.session.current_user)
            .where({
                'jobs.access_code': access_code
            })
            .then(function(projects){
                if(projects.length==1){
                    return models.Project.findOneAndUpdate({
                        'jobs.access_code': access_code
                    }, {
                        $set: {
                            'jobs.$.password': crypto.createHash('sha1').update(new_password).digest('hex'),
                            'jobs.$.done': false,
                            'jobs.$.accepted': false
                        }
                    })
                    .then(function() {
                        res.json({});
                    });
                }
            })
            .catch(function(err) {
                console.error(err);
            });
    });
};
