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
var crypto = require('crypto');

module.exports.controller = function(router) {

    router.get('/user/login', function(req, res) {
        res.render('user/login');
    }).post('/user/login', function(req, res) {
        models.User.login(req.body.email, req.body.password, function(user) {
            if (user != null) {
                req.session.current_user = user;
                //req.session.current_user.company = user._company;
                req.session.toast_message = 'You\'ve been logged in with success!';
            }
            res.redirect('/');
        });
    });

    router.get('/user/logout', router.routeLogAccess, function(req, res) {
        req.session.destroy(function(err) {
            res.redirect('/');
        });
    });

    /* AJAX AJOUT MANAGER */
    router.post('/user/addManager', function(req, res) {
        models.User.findOne({
            email: req.body.email
        }).then(function(checkMail) {
            if (checkMail) {
                res.json({
                    success: false,
                    message: 'Mail already used !'
                });
            } else {
                var error_handling = false;
                var randomPassword = Math.random().toString(36).slice(-8);

                var user = new models.User({
                    firstname: req.body.firstname,
                    lastname: req.body.lastname,
                    password: randomPassword,
                    email: req.body.email,
                    is_admin: 0,
                    is_password_temporary: 1,
                    _company: req.session.current_user._company._id
                });

                user.save().then(function(user) {
                    if (!error_handling) {
                        helpers.sendEmail({
                            to: req.body.email,
                            subject: 'Captiz account created',
                            content_id: 'account_created',
                            values: {
                                '--PASSWORD--': randomPassword
                            }
                        });

                        res.json({
                            success: true,
                            firstname: req.body.firstname,
                            lastname: req.body.lastname,
                            email: req.body.email,
                            id: user._id
                        });
                    } else {
                        res.json({
                            success: false,
                            message: 'An error occured'
                        });
                    }
                })
                .catch(function(error) {
                    error_handling = true;
                });
            }
        });
    });

    /* User settings */
    router
        .get('/user/:id/settings', router.routeLogAccess, function(req, res) {
            var params = {};
            var current_user_id = req.session.current_user._id;
            var current_user_isAdmin = req.session.current_user.is_admin;
            var request_user_id = req.params.id;
            var user_company_id = req.session.current_user._company;

            models.User.findById(request_user_id).then(function(user) {
                if (user == null) {
                    res.redirect('/');
                } else {
                    params.user = user;

                    if (request_user_id == current_user_id) {
                        res.render('user/index', params);
                    } else if ((user_company_id == user._company) && current_user_isAdmin) {
                        res.render('user/index', params);
                    } else {
                        res.redirect('/');
                    }
                }
            });
        });

    router.get('/user/:id/settings/edit', router.routeLogAccess, function(req, res) {
        var params = {};
        params.is_password_temporary = req.session.current_user.is_password_temporary;
        var current_user_id = req.session.current_user._id;
        var current_user_isAdmin = req.session.current_user.is_admin;
        var request_user_id = req.params.id;
        var user_company_id = req.session.current_user._company._id;

        models.User.findById(request_user_id).then(function(user) {
            if (user == null) {
                res.redirect('/');
            } else {
                params.user = user;

                if (request_user_id == current_user_id) {
                    res.render('user/edit', params);
                } else if ((user_company_id == user._company) && current_user_isAdmin) {
                    res.render('user/edit', params);
                } else {
                    res.redirect('/');
                }
            }
        });
    });

    router.post('/user/:id/settings/edit', function(req, res) {

        var params = {};
        var current_user_id = req.session.current_user._id;
        var current_user_isAdmin = req.session.current_user.is_admin;
        var request_user_id = req.params.id;
        var user_company_id = req.session.current_user._company;

        models.User.findById(request_user_id).then(function(user) {
            if (user == null) {
                res.redirect('/');
            } else {
                params.user = user;

                if ((request_user_id == current_user_id) || (user_company_id == user._company && current_user_isAdmin)) {
                    var newPassword = user.password;
                    var end_of_temporary;
                    if (req.session.current_user.is_password_temporary) {
                        end_of_temporary = 1;
                    } else {
                        end_of_temporary = 0;
                    }

                    if (req.body.newPassword1 != '' && req.body.newPassword2 != '') {

                        if (req.body.newPassword1 != req.body.newPassword2) {
                            req.session.toast_message = 'New passwords dont\'t match !';
                            res.redirect('/user/' + request_user_id + '/settings/edit');
                        } else {
                            newPassword = crypto.createHash('sha1').update(req.body.newPassword1).digest('hex');
                            end_of_temporary = 0;
                        }
                    }

                    var catch_error = false;
                    var catch_error_message = 'An error occured';

                    models.User.update({
                        _id: models.ObjectId(request_user_id)
                    }, {
                        $set: {
                            firstname: req.body.firstname,
                            lastname: req.body.lastname,
                            email: req.body.email,
                            is_password_temporary: end_of_temporary,
                            password: newPassword,
                        }
                    }).catch(function(error) {
                        console.log(error.message);
                        catch_error = true;
                        catch_error_message = error.message;
                    }).then(function(user) {
                        if (request_user_id == current_user_id) {
                            req.session.current_user.firstname = req.body.firstname;
                            req.session.current_user.lastname = req.body.lastname;
                            req.session.current_user.email = req.body.email;
                            req.session.current_user.password = newPassword;
                        }

                        if (catch_error) {
                            req.session.toast_message = catch_error_message;
                            res.redirect('/user/' + request_user_id + '/settings/edit');
                        } else {
                            req.session.toast_message = 'Profile has been succesfully updated.';
                            if (end_of_temporary == 0 && req.session.current_user.is_password_temporary) {
                                req.session.current_user.is_password_temporary = false;
                                res.redirect('/');
                            } else {
                                res.redirect('/user/' + request_user_id + '/settings');
                            }
                        }
                    });
                } else {
                    res.redirect('/');
                }
            }
        });
    });
};
