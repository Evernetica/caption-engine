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


module.exports = function(io) {
    var opened_freelance = [];

    var socket_onlyeone = io
        .of('/socket_freelance')
        .on('connection', function(socket) {
            for (var i = 0; i < opened_freelance.length; i++) {
                if (opened_freelance[i].access_code == socket.request.session.freelance_logged_code) {
                    socket.emit('new_window');
                }
            }

            opened_freelance.push({
                access_code: socket.request.session.freelance_logged_code,
                socket: socket
            });

            var requests_ack = {};

            socket.on('save_timecode', function(data, callback) {
                if(requests_ack[data.request_id] === undefined) {
                    requests_ack[data.request_id] = 1;
                    var code = socket.request.session.freelance_logged_code;
                    if (data.type == 'translation') {
                        var part = data.part;
                        var translation = data.translation;

                        console.log('Code : '+code);
                        console.log('Part : '+part);
                        console.log('Translation : '+translation);

                        if(socket.request.session.freelance_logged) {
                            console.log('Logged : '+socket.request.session.freelance_logged);

                            models.Project.findOne({
                                'jobs.access_code': code,
                                is_deleted:{$ne:true}
                            }, {
                                'jobs': {
                                    $elemMatch: {
                                        'access_code': code
                                    }
                                }
                            })
                            .exec()
                            .then(function(project) {
                                console.log(JSON.stringify(project));
                                if (project != null && project.jobs.length == 1) {
                                    var job = project.jobs[0];

                                    return models.Timecode.find({
                                        _project: project._id,
                                        _id: part
                                    })
                                    /*.sort('start')
                                    .skip(part)*/
                                    .limit(1)
                                    .exec()
                                    .then(function(timecodes){
                                        if (timecodes.length == 1) {
                                            var timecode = timecodes[0];
                                            console.log(JSON.stringify(timecode));
                                            for(var i=0; i<timecode.translations.length;i++) {
                                                if(timecode.translations[i]._job.equals(job._id)) {
                                                    timecode.translations[i].text = translation;
                                                    return timecode.save();
                                                }
                                            }

                                            if(i == timecode.translations.length) {
                                                timecode.translations.push({
                                                    _job: job._id,
                                                    text: translation,
                                                    lang: job.lang_target
                                                });
                                                return timecode.save();
                                            }
                                        }
                                    });
                                }
                            })
                            .catch(function(err){
                                console.error(err);
                            });
                        }

                        callback({
                            request_id: data.request_id
                        });
                    } else if (data.type == 'transcription') {
                        console.log('Transcription freelance code : '+code);

                        if(socket.request.session.freelance_logged) {
                            models.Project.findOne({
                                'jobs.access_code': code,
                                is_deleted:{$ne:true}
                            }, {
                                'jobs': {
                                    $elemMatch: {
                                        'access_code': code
                                    }
                                }
                            })
                            .exec()
                            .then(function(project) {
                                if (project != null && project.jobs.length == 1) {
                                    var job = project.jobs[0];

                                    if (data.action == 'update') {

                                        console.log('UPDATE');
                                        console.log('job : '+JSON.stringify(job));
                                        console.log('ID : '+data.id);

                                        return models.Timecode.find({
                                            _project: project._id,
                                            _id: models.ObjectId(data.id)
                                        })
                                        .exec()
                                        .then(function(timecodes){
                                            if (timecodes.length == 1) {
                                                var timecode = timecodes[0];
                                                if (data.data.tc_in != undefined) {
                                                    var duration_in = moment.duration(data.data.tc_in, 'seconds');
                                                    timecode.start = moment.utc(duration_in.asMilliseconds()).toDate();
                                                }
                                                if (data.data.tc_out != undefined) {
                                                    var duration_out = moment.duration(data.data.tc_out, 'seconds');
                                                    timecode.end = moment.utc(duration_out.asMilliseconds()).toDate();
                                                }
                                                if (data.data.original != undefined) {
                                                    timecode.original_text = data.data.original;
                                                }
                                                if (data.data.character != undefined) {
                                                    timecode.character = data.data.character;
                                                }

                                                return timecode.save().then(function(){
                                                    callback({
                                                        request_id: data.request_id
                                                    });
                                                });
                                            }
                                        });
                                    }
                                    else if (data.action == 'delete') {
                                        console.log('DELETE');
                                        console.log('ID : '+data.id);

                                        return models.Timecode.find({
                                            _project: project._id,
                                            _id: data.id
                                        })
                                        .exec()
                                        .then(function(timecodes){
                                            if (timecodes.length == 1) {
                                                return timecodes[0].remove().then(function(){
                                                    callback({
                                                        request_id: data.request_id
                                                    });
                                                });
                                            }
                                        });
                                    }
                                    else if (data.action == 'add') {
                                        console.log('ADD');
                                        console.log('job : '+JSON.stringify(job));

                                        var duration_in = moment.duration(data.data.tc_in, 'seconds');
                                        var duration_out = moment.duration(data.data.tc_out, 'seconds');

                                        var t = new models.Timecode({
                                            start: moment.utc(duration_in.asMilliseconds()).toDate(),
                                            end: moment.utc(duration_out.asMilliseconds()).toDate(),
                                            original_text: data.data.original,
                                            character: data.data.character,
                                            _project: project._id,
                                            OriginalLangId: job.lang_target
                                        });
                                        t.save().then(function(new_t){
                                            console.log('new id: ');
                                            console.log(JSON.stringify(new_t));
                                            callback({
                                                request_id: data.request_id,
                                                new_id: new_t._id
                                            });
                                        });
                                    }
                                }
                            })
                            .catch(function(err){
                                console.error(err);
                                callback({
                                    request_id: data.request_id
                                });
                            });
                        } else {
                            callback({
                                request_id: data.request_id
                            });
                        }
                    }
                }
            });

            socket.on('disconnect', function() {
                for (var i = 0; i < opened_freelance.length; i++) {
                    if (opened_freelance[i].socket.id == this.id) {
                        console.log('disconnected ' + opened_freelance[i].access_code);
                        console.log(opened_freelance.length);
                        opened_freelance.splice(i, 1);
                        console.log(opened_freelance.length);
                        break;
                    }
                }
            });
        });
};
