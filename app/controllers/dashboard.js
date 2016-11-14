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
var helpers = require('../helpers');
var _ = require('lodash');

module.exports.controller = function(router) {
    router.get('/', router.routeLogAccess, function(req, res) {

        var sentences = [{
            text: 'Welcome back ' + req.session.current_user.firstname + ', may the force be with you today.',
            youtube: 'https://www.youtube.com/embed/D9XYKY4Km20'
        }, {
            text: 'Welcome back ' + req.session.current_user.firstname + ', all those moments will be lost in time... Like tears in rain.',
            youtube: 'https://www.youtube.com/embed/_JjJzMBGUwo'
        }, {
            text: 'Welcome back ' + req.session.current_user.lastname + '. ' + req.session.current_user.firstname + ' ' + req.session.current_user.lastname + '.',
            youtube: 'https://www.youtube.com/embed/TXxKZkE2MGo'
        }, {
            text: 'Welcome back ' + req.session.current_user.firstname + ', I am Spartacus.',
            youtube: 'https://www.youtube.com/embed/-8h_v_our_Q'
        }, {
            text: 'Welcome back ' + req.session.current_user.firstname + ', just keep swimming.',
            youtube: 'https://www.youtube.com/embed/0Hkn-LSh7es'
        }, {
            text: 'Welcome back ' + req.session.current_user.firstname + ', to infinity... And beyond.',
            youtube: 'https://www.youtube.com/embed/ejwrxGs_Y_I'
        }, {
            text: 'Welcome back ' + req.session.current_user.firstname + ', you\'re gonna need a bigger boat.',
            youtube: 'https://www.youtube.com/embed/2I91DJZKRxs'
        }, {
            text: 'Welcome back ' + req.session.current_user.firstname + ', I am your father.',
            youtube: 'https://www.youtube.com/embed/cas-B-CGnLk'
        }];

        var params = {};

        params.sentence = sentences[helpers.randomNumber(0, sentences.length)];

        var done = _.after(2, function() {
            res.render('dashboard', params);
        });

        models.Company.findById(req.session.current_user._company._id).then(function(company) {
            params.company = company;
            models.User.find({
                _company: company._id
            }).then(function(err, managers) {
                params.company.managers = managers;
                done();
            });
        }).catch(function(err){
            console.error(err);
        });

        models.Project.getUserProjectsWithEpisodes(req.session.current_user).lean().then(function(projects) {
            var projects_result = [];
            for (var i = 0; i < projects.length; i++) {
                projects_result.push({
                    data: projects[i]
                });
            }

            projects_result.sort(function(a, b) {
                if (a.data.name < b.data.name)
                    return -1;
                else if (a.data.name > b.data.name)
                    return 1;
                else return 0;
            });

            params.projects = projects_result;

            done();
        })
        .catch(function(err){
            console.error(err);
        });
    });
};
