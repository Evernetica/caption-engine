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

module.exports.controller = function(router) {

    router.get('/company', router.routeLogAccess, function(req, res) {
        if (req.session.current_user.is_admin) {
            var params = {};
            var company_id = req.session.current_user._company;

            models.Project.find({
                _company: company_id
            }).then(function() {
                return models.User.find({
                    _company: company_id
                }).populate('_company').then(function(managers) {
                    if (managers.length == 0) {
                        params.managers = null;
                        params.company = models.Company.findById(company_id);
                    } else {
                        params.company = managers[0]._company;
                        params.managers = managers;
                    }

                    res.render('company/index', params);
                });
            })
            .catch(function(err) {
                console.error(err);
            });
        } else {
            res.redirect('/');
        }
    });

    router.get('/company/edit', router.routeLogAccess, function(req, res) {
        if (req.session.current_user.is_admin) {
            var params = {};
            var company_id = req.session.current_user._company;
            params.user = req.session.current_user;

            models.Company.findById(company_id).then(function(company) {
                params.company = company;
                res.render('company/edit', params);
            });
        } else {
            res.redirect('/');
        }
    });

    router.post('/company/edit', function(req, res) {
        if (req.session.current_user.is_admin) {
            var company_id = req.session.current_user._company;

            models.Company.update({
                _id: company_id
            }, {
                $set: {
                    name: req.body.name
                }
            }).then(function() {
                req.session.current_user._company.name = req.body.name;

                res.redirect('/company');
            });
        } else {
            res.redirect('/');
        }
    });
};
