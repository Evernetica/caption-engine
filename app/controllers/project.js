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
var _ = require('lodash');
var helpers = require('../helpers');
var crypto = require('crypto');

function routeProject(req, res, next) {
    req.view_params = {};


    models.Project.getUserProjects(req.session.current_user).or([{
        is_archived: null
    }, {
        is_archived: 0
    }]).and({
        _parent: null
    }).then(function(projects) {
        var projects_result = [];

        for (var i = 0; i < projects.length; i++) {
            projects_result.push({
                data: projects[i]
            });
        }
        req.view_params.projects = projects_result;
        next();
    });
}

module.exports.controller = function(router) {

    router.get('/project', router.routeLogAccess, routeProject, function(req, res) {
        res.render('project/index', req.view_params);
    });

    router.post('/project/create', router.routeLogAccess, function(req, res) {
        var name = req.body.projectname && req.body.projectname.trim();
        var description = req.body.description;
        var type = req.body.type == undefined ? 'child':req.body.type;
        var media_type = req.body.mediatype;
        var use_character = req.body.useCharacter == undefined ? false:true;
        var parent = null;
        var parent_project = null;
        var name_parent = null;
        var video_url = req.body.video_url;

        console.log(type);
        console.log(name);

        if (name != '' || req.body.episode!='') {
            if (type == 'child') {
                parent = models.ObjectId(req.body.parent);
                name = (req.body.episode && req.body.episode.trim());
            }

            models.Project.getUserProjects(req.session.current_user)
                .where({
                    _id: parent
                })
                .then(function(projects) {
                    if (projects.length > 0) {
                        parent_project = projects[0];
                    }

                    if(parent_project != null) {
                        use_character = parent_project.use_character;
                        media_type = parent_project.type;
                        name_parent = parent_project.name;
                    }


                    var p = new models.Project({
                        name: name,
                        name_parent: name_parent,
                        description: description,
                        type: media_type,
                        use_character: use_character,
                        _manager: req.session.current_user._id,
                        _company: req.session.current_user._company._id,
                        _parent: parent,
                        status: 'ENCODING_FINISHED',
                        is_multiple: type=='multiple'?true:false,
                        video: {
                            url: video_url
                        }
                    });

                    p.save().then(function(product) {
                        req.session.toast_message = 'Your project has been succesfully created.';
                        if(type=='child') {
                            res.redirect('/project/' + product._id + '/display');
                        }
                        else {
                            res.json({url: '/project/' + product._id + '/display'});
                        }
                    })
                    .catch(function(err) {
                        console.error(err);
                    });
                })
                .catch(function(err) {
                    console.error(err);
                });
        } else {
            req.session.toast_message = 'You need to specify more your project.';
            if(type=='child') {
                res.redirect('/project/');
            }
            else {
                res.json({url: '/project/'});
            }
        }
    });

    router.get('/project/:project_id/watch/:code', router.routeLogAccess, routeProject, function(req, res) {
        var project_id = req.params.project_id;

        models.Project.getUserProjects(req.session.current_user)
            .where({
                _id: project_id
            })
            .then(function(projects) {
                if (projects.length > 0) {
                    var project = projects[0];

                    req.view_params.project = project;
                    req.view_params.job_code = req.params.code;
                    res.render('project/watch', req.view_params);
                } else {
                    req.session.toast_message = 'You are not allowed to access this page.';
                    res.redirect('/');
                }
            })
            .catch(function(err) {
                console.error(err);
            });
    });

    router.get('/project/:project_id/edit', router.routeLogAccess, routeProject, function(req, res) {
        var project_id = req.params.project_id;

        models.Project.getUserProjects(req.session.current_user)
            .where({
                _id: project_id
            })
            .then(function(projects) {
                if (projects.length > 0) {
                    var project = projects[0];

                    return models.User.find({
                        _company: project._company
                    }).then(function(users) {
                        req.view_params.managers = users;
                        req.view_params.project = project;
                        res.render('project/edit', req.view_params);
                    });
                } else {
                    req.session.toast_message = 'You are not allowed to access this page.';
                    res.redirect('/');
                }
            })
            .catch(function(err) {
                console.error(err);
            });
    });

    router.post('/project/:project_id/edit', function(req, res) {

        var project_id = req.params.project_id;

        models.Project.getUserProjects(req.session.current_user)
            .where({
                _id: project_id
            })
            .then(function(projects) {
                if (projects.length > 0) {
                    var project = projects[0];

                    if(project.name != req.body.name && project.is_multiple) {
                        models.Project.update({_parent: project._id}, {$set:{name_parent: req.body.name}}, {multi: true});
                    }

                    project.name = req.body.name;
                    project.description = req.body.description;
                    project.use_character = (req.body.useCharacter == undefined ? false:true);
                    project._manager = models.ObjectId(req.body.manager);

                    project.save().then(function() {
                        req.session.toast_message = 'Your project has been succesfully updated.';
                        res.redirect('/project/' + project_id + '/display');
                    })
                    .catch(function(err) {
                        console.error(err);
                    });
                } else {
                    req.session.toast_message = 'You are not allowed to access this page.';
                    res.redirect('/');
                }
            });
    });

    router.get('/project/:project_id/display', router.routeLogAccess, routeProject, function(req, res) {
        models.Project.getUserProjects(req.session.current_user)
            .where({
                _id: models.ObjectId(req.params.project_id)
            })
            .populate('_manager')
            .populate('_parent')
            .then(function(projects) {
                var project = projects[0];
                if (project != null) {
                    req.view_params.project = project;
                    if(project.is_multiple) {
                        return models.Project.getUserProjects(req.session.current_user)
                            .where({
                                _parent: models.ObjectId(req.params.project_id)
                            })
                            .then(function(sub_projects){
                                var max_jobs = -1, max_id = -1;
                                for(var i=0;i<sub_projects.length;i++){
                                    if(max_jobs<sub_projects[i].jobs.length) {
                                        max_jobs = sub_projects[i].jobs.length;
                                        max_id = i;
                                    }

                                    //TODO : CreatedAt : reverse sorting
                                    sub_projects.jobs = _.sortBy(sub_projects.jobs, [function(e){
                                        if(sub_projects[i].jobs[j].mission=='TRANSCRIPTION')
                                            return '0'+e.lang_target;
                                        else
                                            return '1'+e.lang_target;
                                    }, function(e){ return e.createdAt; }]);
                                }

                                req.view_params.langs = [];
                                if(sub_projects[max_id]!=undefined) {
                                    for(i=0;i<sub_projects[max_id].jobs.length;i++) {
                                        req.view_params.langs.push(sub_projects[max_id].jobs[i].lang_target);
                                    }
                                }

                                for(i=0;i<sub_projects.length;i++){
                                    if(i!=max_id) {
                                        var new_jobs = [];

                                        for(var m=0;m<max_jobs;m++) {
                                            for(var j=0;j<sub_projects[i].jobs.length;j++) {
                                                if(sub_projects[i].jobs[j]!=undefined && sub_projects[max_id].jobs[m]!=undefined && (sub_projects[i].jobs[j].mission+sub_projects[i].jobs[j].lang_target == sub_projects[max_id].jobs[m].mission+sub_projects[max_id].jobs[m].lang_target)) {
                                                    new_jobs.push(sub_projects[i].jobs[j]);
                                                    break;
                                                }
                                            }
                                            new_jobs.push({});
                                        }
                                    }
                                }

                                req.view_params.subprojects = sub_projects;

                                res.render('project/display_multiple', req.view_params);
                            });
                    }
                    else {
                        req.view_params.has_parent = (project._parent != undefined && project._parent != null);

                        return models.Timecode.find({
                            _project: project._id
                        }, {
                            start: 1,
                            end: 1,
                            original_lang: 1,
                            original_text: 1,
                            character: 1
                        })
                        .sort('start')
                        .lean()
                        .then(function(timecodes) {
                            if(project.use_character) {
                                var grouped = _.groupBy(timecodes, 'character');

                                req.view_params.characters = [];
                                for (var c in grouped) {
                                    if (grouped.hasOwnProperty(c)) {
                                        var data = grouped[c];
                                        var length = 0;
                                        for(var i=0;i<data.length;i++){
                                            var m = moment(data[i].start);
                                            var m2 = moment(data[i].end);

                                            length += ((m2.millisecond() + m2.second() * 1000 + m2.minute() * 60000 + m2.hour() * 3600000) - (m.millisecond() + m.second() * 1000 + m.minute() * 60000 + m.hour() * 3600000)) / 1000;
                                        }

                                        req.view_params.characters.push({
                                            name: c,
                                            nb_lines: data.length,
                                            length: Math.round(length/60 * 100)/100
                                        });
                                    }
                                }
                            }

                            if (project.video != null && project.video.duration == null) {
                                req.view_params.checkDuration = true;
                            } else {
                                req.view_params.checkDuration = false;
                            }
                            res.render('project/display', req.view_params);
                        });
                    }
                } else {
                    req.session.toast_message = 'You are not allowed to access this page.';
                    res.redirect('/');
                }
            })
            .catch(function(err) {
                if (err.message) {
                    console.log('\nMessage: ' + err.message);
                }
                if (err.stack) {
                    console.log('\nStacktrace:');
                    console.log('====================');
                    console.log(err.stack);
                }
            });
    });


    var framerate = 25;
    router.get('/project/:project_id/timecodes', function(req, res) {
        var params = {};
        params.convert = 'import';
        params.project_id = req.params.project_id;

        res.render('services/convert', params);
    }).post('/project/:project_id/timecodes', function(req, res) {
        var timecodes = Array();

        var timeCodeFormat;

        /* VERIFICATION de Format */
        if (req.body.data[1][req.body.timecodestart_col].indexOf('.') != -1) {
            timeCodeFormat = 'fractional';
        } else if (req.body.data[1][req.body.timecodestart_col].indexOf(',') != -1) {
            timeCodeFormat = 'fractionalcomma';
        } else if (req.body.data[1][req.body.timecodestart_col].match(new RegExp(':', 'g')).length > 2) {
            timeCodeFormat = 'image';
        } else if (req.body.data[1][req.body.timecodestart_col].match(new RegExp(':', 'g')).length == 1) {
            timeCodeFormat = 'classic_minutesecond';
        } else {
            timeCodeFormat = 'classic_full';
        }

        var start_at = null;
        if (req.body.start_at != undefined) {
            var img_start = req.body.start_at.slice(-2);
            start_at = moment.duration(req.body.start_at.slice(0, -3) + '.' + ('000' + img_start / framerate * 1000).substr(-3));
            console.log(start_at);
        }

        for (var i = 0; i < req.body.data.length; i++) {
            if (req.body.data[i].length > Math.max(req.body.timecodestart_col, req.body.timecodeend_col, req.body.transcription_col)) {
                var start, end;

                if (timeCodeFormat == 'image') {
                    var img_in = req.body.data[i][req.body.timecodestart_col].slice(-2);
                    var img_out = req.body.data[i][req.body.timecodeend_col].slice(-2);
                    start = req.body.data[i][req.body.timecodestart_col].slice(0, -3) + '.' + ('000' + img_in / framerate * 1000).substr(-3);
                    end = req.body.timecodeend_col==-1?-1:req.body.data[i][req.body.timecodeend_col].slice(0, -3) + '.' + ('000' + img_out / framerate * 1000).substr(-3);
                } else if (timeCodeFormat == 'classic_full') {
                    start = req.body.data[i][req.body.timecodestart_col] + '.000';
                    end = req.body.timecodeend_col==-1?-1:req.body.data[i][req.body.timecodeend_col] + '.000';
                } else if (timeCodeFormat == 'classic_minutesecond') {
                    start = '00:'+req.body.data[i][req.body.timecodestart_col] + '.000';
                    end = req.body.timecodeend_col==-1?-1:'00:'+req.body.data[i][req.body.timecodeend_col] + '.000';
                } else if (timeCodeFormat == 'fractional') {
                    start = req.body.data[i][req.body.timecodestart_col];
                    end = req.body.timecodeend_col==-1?-1:req.body.data[i][req.body.timecodeend_col];
                } else if (timeCodeFormat == 'fractionalcomma') {
                    start = req.body.data[i][req.body.timecodestart_col].replace(',', '.');
                    end = req.body.timecodeend_col==-1?-1:req.body.data[i][req.body.timecodeend_col].replace(',', '.');
                }

                start = moment(start, 'HH:mm:ss.SSS');
                if(req.body.timecodeend_col==-1) {
                    end = moment(start).add(60, 'seconds');
                }
                else {
                    end = moment(end, 'HH:mm:ss.SSS');
                }

                if (start_at != null) {
                    start = moment(start, 'HH:mm:ss.SSS').subtract(start_at);
                    end = moment(end, 'HH:mm:ss.SSS').subtract(start_at);
                }

                start = start.toDate();
                end = end.toDate();

                var character = '';
                if (req.body.character_col != -1)
                    character = req.body.data[i][req.body.character_col];

                timecodes.push({
                    timecode_in: start,
                    timecode_out: end
                });
                var t = new models.Timecode({
                    start: start,
                    end: end,
                    character: character,
                    original_text: req.body.data[i][req.body.transcription_col],
                    original_lang: req.body.transcription_lang,
                    _project: models.ObjectId(req.params.project_id)
                });
                t.save().catch(function(err) {
                    console.error(err);
                });
            }
        }

        models.Project.findById(req.params.project_id).then(function(project) {
            project.status = 'TRANSCRIPTION_FINISHED';
            project.save().then(function() {
                res.json({});
            });
        });

    });


    router.post('/project/:project_id/invite', router.routeLogAccess, function(req, res) {
        var done = function(mission_txt, lang_title) {

            var access_code = helpers.randomString(20);

            models.Project.findOne({
                'jobs.access_code': access_code
            })
            .then(function(project) {
                if (project != null) {
                    access_code = helpers.randomString(20);
                }

                return models.Project.getUserProjects(req.session.current_user)
                    .where({
                        _id: req.params.project_id
                    })
                    .then(function(projects) {
                        if (projects.length > 0) {
                            var project = projects[0];
                            var password = helpers.randomString(8);
                            console.log('Freelance password : ' + password);

                            var job = {
                                mission: mission_txt,
                                email: req.body.email.toLowerCase().trim(),
                                password: crypto.createHash('sha1').update(password).digest('hex'),
                                access_code: access_code,
                                lang_target: lang_title,
                                deadline: req.body.deadline
                            };
                            project.jobs.push(job);
                            console.log(typeof project._id.str);
                            return project.save().then(function() {
                                if (job.mission == 'TRANSLATION') {
                                    helpers.sendEmail({
                                        to: job.email,
                                        subject: 'Invitation to translate',
                                        content_id: 'invitation_translator',
                                        values: {
                                            '--ACCESS_CODE--': job.access_code,
                                            '--PROJECT_NAME--': project.name,
                                            '--FROM_LANG--': job.lang_source,
                                            '--TO_LANG--': job.lang_target,
                                            '--PROJECT_ID--': project._id,
                                            '--PASSWORD--': password,
                                            '--DEADLINE--': helpers.displayDeadline(job.deadline)
                                        }
                                    });
                                } else if (job.mission == 'TRANSCRIPTION') {
                                    project.status = 'TRANSCRIPTION';
                                    project.save();
                                    helpers.sendEmail({
                                        to: job.email,
                                        subject: 'Invitation to transcribe',
                                        content_id: 'invitation_transcriptor',
                                        values: {
                                            '--ACCESS_CODE--': job.access_code,
                                            '--PROJECT_NAME--': project.name,
                                            '--TO_LANG--': job.lang_source,
                                            '--PROJECT_ID--': project._id,
                                            '--PASSWORD--': password,
                                            '--DEADLINE--': helpers.displayDeadline(job.deadline)
                                        }
                                    });
                                }
                            });
                        }
                    });
            })
            .catch(function(err) {
                console.error(err);
            });
        };

        if (req.body.mission == 'TRANSCRIPTION') {
            done('TRANSCRIPTION', req.body.translate_lang);
        } else if (req.body.mission == 'TRANSLATION') {
            done('TRANSLATION', req.body.translate_lang);
        }

        res.json({});
    });

    router.get('/project/:project_id/translators', function(req, res) {
        models.Project.getUserProjects(req.session.current_user)
            .where({
                _id: req.params.project_id
            })
            .then(function(projects) {
                if (projects.length > 0) {
                    var project = projects[0];
                    var t = [];
                    _.forEach(project.jobs, function(job) {
                        var progress = 0;
                        t.push({
                            progress: progress,
                            email: job.email,
                            lang: job.lang_target,
                            code: job.access_code,
                            done: job.done,
                            accepted: job.accepted,
                            mission: job.mission,
                            deadline: moment(job.deadline).format('DD/MM/YYYY'),
                            deadline_diff: moment.duration(moment(job.deadline).diff(moment())).humanize(true)
                        });
                    });
                    res.json({
                        translators: t
                    });
                }
            })
            .catch(function(err) {
                console.error(err);
            });
    });

    router.get('/project/:project_id/translate/:code/accept', router.routeLogAccess, function(req, res) {
        models.Project.getUserProjects(req.session.current_user)
            .where({
                _id: req.params.project_id,
                'jobs.access_code': req.params.code
            })
            .select({
                'name': 1,
                'is_archived': 1,
                'status': 1,
                'jobs': {
                    $elemMatch: {
                        'access_code': req.params.code
                    }
                }
            })
            .exec()
            .then(function(projects) {
                var project = projects[0];
                if (project != null && project.jobs.length == 1) {
                    if (!project.is_archived) {
                        var status = project.status;
                        if (project.jobs[0].mission == 'TRANSCRIPTION') {
                            status = 'TRANSCRIPTION_FINISHED';
                        }

                        return models.Project.findOneAndUpdate({
                            'jobs.access_code': req.params.code
                        }, {
                            $set: {
                                status: status,
                                'jobs.$.accepted': true
                            }
                        })
                        .then(function() {
                            helpers.sendEmail({
                                to: project.jobs[0].email,
                                subject: 'Mission validated',
                                content_id: 'project_mission_validated',
                                values: {
                                    '--PROJECT_NAME--': project.getName()
                                }
                            });

                            res.redirect('/project/' + project._id + '/display');
                        });
                    }
                }
            })
            .catch(function(err) {
                console.error(err);
            });
    });

    router.post('/project/:project_id/translate/:code/decline', router.routeLogAccess, function(req, res) {
        var reason = req.body.reason;

        models.Project.getUserProjects(req.session.current_user)
            .where({
                _id: req.params.project_id,
                'jobs.access_code': req.params.code
            })
            .select({
                'name': 1,
                'is_archived': 1,
                'jobs': {
                    $elemMatch: {
                        'access_code': req.params.code
                    }
                }
            })
            .exec()
            .then(function(projects) {
                var project = projects[0];
                if (project != null && project.jobs.length == 1) {
                    if (!project.is_archived) {
                        return models.Project.findOneAndUpdate({
                            'jobs.access_code': req.params.code
                        }, {
                            $set: {
                                'jobs.$.accepted': false,
                                'jobs.$.done': false
                            }
                        })
                        .then(function() {
                            helpers.sendEmail({
                                to: project.jobs[0].email,
                                subject: 'Mission validation declined',
                                content_id: 'project_mission_declined',
                                values: {
                                    '--PROJECT_NAME--': project.getName(),
                                    '--REASON--': reason,
                                    '--PROJECT_ID--': project._id,
                                    '--ACCESS_CODE--': project.jobs[0].access_code
                                }
                            });

                            res.json({});
                        });
                    }
                }
            })
            .catch(function(err) {
                console.error(err);
            });
    });


    router.get('/project/:project_id/timecodes/:code', router.routeLogAccess, function(req, res) {
        models.Project.getUserProjects(req.session.current_user)
            .where({
                'jobs.access_code': req.params.code,
                _id: models.ObjectId(req.params.project_id)
            })
            .select({
                'name': 1,
                'video': 1,
                'description': 1,
                'is_archived': 1,
                files: 1,
                'jobs': {
                    $elemMatch: {
                        'access_code': req.params.code
                    }
                }
            })
            .exec()
            .then(function(projects) {
                var project = projects[0];

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
                        translations: {
                            $elemMatch: {
                                _job: job._id
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
                                if(job.mission == 'TRANSCRIPTION') {
                                    timecodes[i].original = timecodes[i].original_text != null ? timecodes[i].original_text /*.replace(/'/g, '\\'')*/ : '';
                                }
                                else if(job.mission == 'TRANSLATION') {
                                    if (timecodes[i].translations && timecodes[i].translations.length > 0 && timecodes[i].translations[0].text != null) {
                                        timecodes[i].original = timecodes[i].translations[0].text;
                                    }
                                }
                            }
                        }

                        res.json({
                            timecodes: timecodes
                        });
                    });
                }
            });
    });


    router.get('/project/:project_id/download/:type', router.routeLogAccess, function(req, res){
        models.Project.getUserProjects(req.session.current_user)
            .where({
                _parent: models.ObjectId(req.params.project_id)
            })
            .select({
                'name': 1,
                'video': 1,
                'description': 1,
                'is_archived': 1,
                files: 1,
                '_parent': 1,
                'name_parent': 1,
                'jobs': 1
            })
            .exec()
            .then(function(projects) {
                if (projects != null) {
                    var parser = require('../libs/srt.parser.js');

                    var AdmZip = require('adm-zip');
                    var zip = new AdmZip();

                    var size = 1;
                    for(var j=0;j<projects.length;j++){
                        for(var k=0;k<projects[j].jobs.length;k++) {
                            if(projects[j].jobs[k].done == true) {
                                size++;
                            }
                        }
                    }

                    var done = _.after(size, function(){
                        console.log('TERMINE');
                        res.set({
                            'Content-Disposition': 'attachment; filename=project.zip',
                            'Content-type': 'application/zip, application/octet-stream'
                        });
                        res.send(zip.toBuffer());
                    });

                    console.log('Size: '+size);
                    for(j=0;j<projects.length;j++){
                        (function(project){
                            for(var k=0;k<project.jobs.length;k++) {
                                if(project.jobs[k].done == true) {
                                    (function(job, project){
                                        models.Timecode.find({
                                            _project: project._id
                                        }, {
                                            start: 1,
                                            end: 1,
                                            original_lang: 1,
                                            original_text: 1,
                                            character: 1,
                                            translations: {
                                                $elemMatch: {
                                                    _job: job._id
                                                }
                                            }
                                        })
                                        .sort('start')
                                        .lean()
                                        .then(function(timecodes) {
                                            for (var i = 0; i < timecodes.length; i++) {
                                                var m = moment(timecodes[i].start);
                                                var m2 = moment(timecodes[i].end);

                                                timecodes[i].start = m.format('HH:mm:ss.SSS', {
                                                    trim: false
                                                });
                                                timecodes[i].end = m2.format('HH:mm:ss.SSS', {
                                                    trim: false
                                                });

                                                timecodes[i].seconds = (m.millisecond() + m.second() * 1000 + m.minute() * 60000 + m.hour() * 3600000) / 1000;
                                                timecodes[i].length = ((m2.millisecond() + m2.second() * 1000 + m2.minute() * 60000 + m2.hour() * 3600000) - (m.millisecond() + m.second() * 1000 + m.minute() * 60000 + m.hour() * 3600000)) / 1000;
                                                timecodes[i].original_text = timecodes[i].original_text != null ? timecodes[i].original_text : '';
                                                /*if (timecodes[i].translations.length > 0 && timecodes[i].translations[0].text != null) {
                                                    timecodes[i].translations[0].text = timecodes[i].translations[0].text;
                                                }*/
                                            }

                                            var filename = job.lang_target.toLowerCase()+'/'+project.getName() + '-' + job.lang_target.toLowerCase();
                                            filename = filename.replace(/,/g, '').replace(/;/g, '').replace(/\./g, '').replace(' ', '-');

                                            var data;
                                            if (req.params.type == 'srt') {
                                                data = [];
                                                if (job.mission == 'TRANSCRIPTION') {
                                                    for (i = 0; i < timecodes.length; i++) {
                                                        data.push({
                                                            id: '' + (i + 1),
                                                            startTime: timecodes[i].start.replace('.', ','),
                                                            endTime: timecodes[i].end.replace('.', ','),
                                                            text: timecodes[i].original_text != null ? timecodes[i].original_text : ''
                                                        });
                                                    }
                                                } else if (job.mission == 'TRANSLATION') {
                                                    for (i = 0; i < timecodes.length; i++) {
                                                        if (timecodes[i].translations !== undefined && timecodes[i].translations.length > 0) {
                                                            data.push({
                                                                id: '' + (i + 1),
                                                                startTime: timecodes[i].start.replace('.', ','),
                                                                endTime: timecodes[i].end.replace('.', ','),
                                                                text: timecodes[i].translations[0].text
                                                            });
                                                        }
                                                    }
                                                }

                                                console.log('Add to zip : '+filename+'.srt');
                                                zip.addFile('subtitles/srt/'+filename+'.srt', new Buffer(parser.toSrt(data)));
                                                console.log('Added to zip');
                                                done();
                                            } else if (req.params.type == 'vtt') {
                                                data = 'WEBVTT\n\n';

                                                if (job.mission == 'TRANSCRIPTION') {
                                                    for (i = 0; i < timecodes.length; i++) {
                                                        data += timecodes[i].start + ' --> ' + timecodes[i].end + '\n' + (timecodes[i].original_text != null ? timecodes[i].original_text : '') + '\n\n';
                                                    }
                                                } else if (job.mission == 'TRANSLATION') {
                                                    for (i = 0; i < timecodes.length; i++) {
                                                        if (timecodes[i].translations !== undefined && timecodes[i].translations.length > 0) {
                                                            data += timecodes[i].start + ' --> ' + timecodes[i].end + '\n' + timecodes[i].translations[0].text + '\n\n';
                                                        }
                                                    }
                                                }

                                                console.log('Add to zip : '+filename+'.vtt');
                                                zip.addFile('subtitles/vtt/'+filename+'.vtt', new Buffer(data));
                                                console.log('Added to zip');
                                                done();
                                            }

                                        })
                                        .catch(function(err) {
                                            console.error(err);
                                        });
                                    })(project.jobs[k], project);
                                }
                            }
                        })(projects[j]);
                    }
                    done();
                }
            })
            .catch(function(err) {
                console.error(err);
            });
    });
    router.get('/project/:project_id/translate/:code/download/:type', router.routeLogAccess, function(req, res) {
        models.Project.getUserProjects(req.session.current_user)
            .where({
                'jobs.access_code': req.params.code,
                _id: models.ObjectId(req.params.project_id)
            })
            .select({
                'name': 1,
                'video': 1,
                'description': 1,
                'is_archived': 1,
                files: 1,
                '_parent': 1,
                'name_parent': 1,
                'jobs': {
                    $elemMatch: {
                        'access_code': req.params.code
                    }
                }
            })
            .exec()
            .then(function(projects) {
                var project = projects[0];

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
                        translations: {
                            $elemMatch: {
                                _job: job._id
                            }
                        }
                    })
                    .sort('start')
                    .lean()
                    .then(function(timecodes) {
                        for (var i = 0; i < timecodes.length; i++) {
                            var m = moment(timecodes[i].start);
                            var m2 = moment(timecodes[i].end);

                            timecodes[i].start = m.format('HH:mm:ss.SSS', {
                                trim: false
                            });
                            timecodes[i].end = m2.format('HH:mm:ss.SSS', {
                                trim: false
                            });

                            timecodes[i].seconds = (m.millisecond() + m.second() * 1000 + m.minute() * 60000 + m.hour() * 3600000) / 1000;
                            timecodes[i].length = ((m2.millisecond() + m2.second() * 1000 + m2.minute() * 60000 + m2.hour() * 3600000) - (m.millisecond() + m.second() * 1000 + m.minute() * 60000 + m.hour() * 3600000)) / 1000;
                            timecodes[i].original_text = timecodes[i].original_text != null ? timecodes[i].original_text : '';
                            /*if (timecodes[i].translations.length > 0 && timecodes[i].translations[0].text != null) {
                                timecodes[i].translations[0].text = timecodes[i].translations[0].text;
                            }*/
                        }

                        var filename = project.getName() + '-' + job.lang_target.toLowerCase();
                        filename = filename.replace(/,/g, '').replace(/;/g, '').replace(/\./g, '').replace(' ', '-');

                        var data;
                        if (req.params.type == 'srt') {
                            var parser = require('../libs/srt.parser.js');

                            data = [];
                            if (job.mission == 'TRANSCRIPTION') {
                                for (i = 0; i < timecodes.length; i++) {
                                    data.push({
                                        id: '' + (i + 1),
                                        startTime: timecodes[i].start.replace('.', ','),
                                        endTime: timecodes[i].end.replace('.', ','),
                                        text: timecodes[i].original_text != null ? timecodes[i].original_text : ''
                                    });
                                }
                            } else if (job.mission == 'TRANSLATION') {
                                for (i = 0; i < timecodes.length; i++) {
                                    if (timecodes[i].translations !== undefined && timecodes[i].translations.length > 0) {
                                        data.push({
                                            id: '' + (i + 1),
                                            startTime: timecodes[i].start.replace('.', ','),
                                            endTime: timecodes[i].end.replace('.', ','),
                                            text: timecodes[i].translations[0].text
                                        });
                                    }
                                }
                            }

                            res.set({
                                'Content-Disposition': 'attachment; filename=' + filename + '.srt',
                                'Content-type': 'application/x-subrip'
                            });
                            res.send(parser.toSrt(data));
                        } else if (req.params.type == 'vtt') {
                            data = 'WEBVTT\n\n';

                            if (job.mission == 'TRANSCRIPTION') {
                                for (i = 0; i < timecodes.length; i++) {
                                    data += timecodes[i].start + ' --> ' + timecodes[i].end + '\n' + (timecodes[i].original_text != null ? timecodes[i].original_text : '') + '\n\n';
                                }
                            } else if (job.mission == 'TRANSLATION') {
                                for (i = 0; i < timecodes.length; i++) {
                                    if (timecodes[i].translations !== undefined && timecodes[i].translations.length > 0) {
                                        data += timecodes[i].start + ' --> ' + timecodes[i].end + '\n' + timecodes[i].translations[0].text + '\n\n';
                                    }
                                }
                            }

                            res.set({
                                'Content-Disposition': 'attachment; filename=' + filename + '.vtt',
                                'Content-type': 'text/vtt'
                            });
                            res.send(data);
                        } else if (req.params.type == 'detx') {
                            var xmlbuilder = require('xmlbuilder');

                            var root = xmlbuilder.create('detx');

                            var body = root.ele('header').insertAfter('roles').insertAfter('body');

                            if (job.mission == 'TRANSCRIPTION') {
                                for (i = 0; i < timecodes.length; i++) {
                                    var line = body.ele('line', {
                                        'role': timecodes[i].character ? timecodes[i].character : '',
                                        'track': 0
                                    });
                                    var ms_start = timecodes[i].start.slice(-3) / 1000;
                                    var ms_end = timecodes[i].end.slice(-3) / 1000;

                                    line.ele('lipsync', {
                                        'type': 'in_open',
                                        'timecode': timecodes[i].start.slice(0, -4) + ':' + ('00' + Math.round(ms_start * framerate)).slice(-2)
                                    })
                                    .insertAfter('text', {}, timecodes[i].original_text != null ? timecodes[i].original_text : '')
                                    .insertAfter('lipsync', {
                                        'type': 'out_open',
                                        'timecode': timecodes[i].end.slice(0, -4) + ':' + ('00' + Math.round(ms_end * framerate)).slice(-2)
                                    });
                                }
                            } else if (job.mission == 'TRANSLATION') {
                                for (i = 0; i < timecodes.length; i++) {
                                    if (timecodes[i].translations.length > 0) {
                                        /*lines.push({
                                            '@': {
                                                'role': timecodes[i].character,
                                                'track': 0
                                            },
                                            'lipsync': [{
                                                '@': {
                                                    'type': 'in_open',
                                                    'timecode': timecodes[i].start
                                                }
                                            }, {
                                                '@': {
                                                    'type': 'out_open',
                                                    'timecode': timecodes[i].end
                                                }
                                            }],
                                            'text': timecodes[i].translations[0].text
                                        });*/
                                    }
                                }
                            }

                            res.set({
                                'Content-Disposition': 'attachment; filename=' + filename + '.detx',
                                'Content-type': 'application/document'
                            });
                            res.send(root.end({
                                pretty: true
                            }));
                        } else if (req.params.type == 'csv') {
                            data = '';
                            for (i = 0; i < timecodes.length; i++) {
                                data += timecodes[i].start + ';' + timecodes[i].end + (timecodes[i].character != null ? ';'+timecodes[i].character : '') + '; \'' + (timecodes[i].original_text != null ? timecodes[i].original_text.replace(';', '\;').replace('"', '\"') : '') + '\';';
                                if (job.mission == 'TRANSLATION' && timecodes[i].translations !== undefined && timecodes[i].translations.length > 0) {
                                    data += '\''+timecodes[i].translations[0].text.replace(';', '\;').replace('"', '\"')+'\'';
                                }
                                data += '\n';
                            }

                            res.set({
                                'Content-Disposition': 'attachment; filename=' + filename + '.csv',
                                'Content-type': 'text/csv'
                            });
                            res.send(data);
                        }
                    });
                }
            })
            .catch(function(err) {
                console.error(err);
            });
    });

    /* ARCHIVE POST DANS CONTROLLER VIDEO.JS */
    router.get('/archive', router.routeLogAccess, function(req, res) {
        var params = {};

        models.Project.getUserProjects(req.session.current_user)
            .where({
                is_archived: 1,
                _company: req.session.current_user._company._id
            })
            .or([{
                is_deleted: 0
            }, {
                is_deleted: null
            }])
            .then(function(projects) {
                for (var i = 0; i < projects.length; i++) {
                    projects[i]['dateArchivedRead'] = moment(projects[i]['date_archived']).format('MM/DD/YYYY, h:mm:ss a');
                }

                params.projects = projects;
                res.render('archive/index', params);
            })
            .catch(function(err) {
                console.error(err);
            });
    });

    router.post('/project/archive/delete', router.routeLogAccess, function(req, res) {
        models.Project.getUserProjects(req.session.current_user)
            .where({
                is_archived: 1,
                _id: models.ObjectId(req.body.id)
            })
            .or([{
                is_deleted: 0
            }, {
                is_deleted: null
            }])
            .then(function(projects) {
                if (projects.length == 1) {
                    var project = projects[0];
                    project.is_deleted = 1;
                    project.to_delete = 1;

                    project.save()
                        .then(function() {
                            req.session.toast_message = 'Project successfully deleted !';
                            res.redirect('/archive');
                        })
                        .catch(function(err) {
                            console.error(err);
                        });
                }
            })
            .catch(function(err) {
                console.error(err);
            });
    });

    router.get('/project/:project_id/cancel', router.routeLogAccess, function(req, res) {
        var project_id = req.params.project_id;

        models.Project.findOne({
            _id: models.ObjectId(project_id)
        }).then(function(project) {
            if (project.to_delete == 1 && project._company == req.session.current_user._company) {
                project.to_delete = 0;
                project.is_archived = 0;
                project.is_deleted = 0;
                project.save(function() {
                    res.redirect('/project/' + project_id + '/display');
                });
            } else {
                res.redirect('/');
            }
        });
    });

};
