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

var express = require('express');

var Session = require('express-session');
var MongoStore = require('connect-mongo/es5')(Session);

console.log(process.env.MONGO_DB);
var mongodb_connection_url;
if(process.env.MONGO_USER!=undefined) {
    mongodb_connection_url = 'mongodb://'+process.env.MONGO_USER+':'+process.env.MONGO_PASSWORD+'@'+process.env.MONGO_HOST+'/'+process.env.MONGO_DB;
}
else {
    mongodb_connection_url = 'mongodb://'+process.env.MONGO_HOST+'/'+process.env.MONGO_DB;
}
console.log(mongodb_connection_url);

var options = { server: { socketOptions: { keepAlive: 60000, connectTimeoutMS: 60000, socketTimeoutMS : 60000 } }, replset: { socketOptions: { keepAlive: 60000, connectTimeoutMS : 60000, socketTimeoutMS : 60000 } } };
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
mongoose.connect(mongodb_connection_url, options);
mongoose.connection.on('error', console.error.bind(console, 'connection error:'));

var fs = require('fs');
var bodyParser = require('body-parser');

var models = require('./models');

var winston = require('winston');
require('winston-googlecloud');

winston.loggers.add('default', {
    transports: [
        new(winston.transports.Console)({
            level: 'silly'
        })
    ]
});


if (process.env.ENV == 'DEV') {
    winston.loggers.add('access', {
        transports: [
            new(winston.transports.Console)({
                level: 'verbose'
            })
        ]
    });
} else {
    winston.loggers.add('access', {
        transports: [
            new(winston.transports.Console)({
                level: 'verbose'
            })
        ]
    });
}

var logger_access = winston.loggers.get('access');

var app;

app = module.exports = express();

var cons = require('consolidate');
app.engine('dust', cons.dust);
if (process.env.ENV == 'DEV') {
    cons.dust.debugLevel = 'DEBUG';
}
app.set('view engine', 'dust');
require('./custom_helpers.js');

app.use(bodyParser.urlencoded());
app.use(bodyParser.json({
    limit: '50mb'
}));


var session = Session({
    secret: 'mysecret',
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
    resave: true,
    saveUninitialized: true
});
app.use(session);
app.session_middleware = session;


app.use('/css', express.static(__dirname + '/.build/css'));
app.use('/images', express.static(__dirname + '/public/images'));
app.use('/fonts', express.static(__dirname + '/public/fonts'));
app.use('/js', express.static(__dirname + '/public/js'));
app.use('/plugins', express.static(__dirname + '/public/plugins'));

/* Use as a middleware in every route that you want to log */
app.routeLogAccess = function(req, res, next) {
    var client_ip = req.ip;

    logger_access.verbose('Access ' + (!req.session.current_user ? '' : 'by ' + req.session.current_user.email + ' ') + req.path, {
        ip: client_ip,
        user: !req.session.current_user ? undefined : req.session.current_user.email
    });

    next();
};


app.enable('trust proxy');
app.use(function(req, res, next) {
    if (req.path.indexOf('/css') != 0 && req.path.indexOf('/js') != 0 && req.path.indexOf('/images') != 0) {
        if (req.path.indexOf('/proofread')!=-1) {
            next();
        }
        else if (req.path.indexOf('/freelance/login') != 0 && req.path.indexOf('/freelance-') != 0 && (req.path.indexOf('/freelance')==0 || req.session.freelance_logged || req.path.indexOf('/freelance/transcription')==0 || req.path.indexOf('/freelance/done') == 0 || req.path.indexOf('/freelance/sheet') == 0 || req.path.indexOf('/freelance/timecodes') == 0 || req.path.indexOf('/freelance/review') == 0 || req.path == '/freelance/translation' || (req.path.indexOf('/video/play/') == 0 && req.path.indexOf('full') == -1) )) {
            if (!req.session.freelance_logged) {
                res.redirect('/freelance/login');
            } else {
                models.Project.findOne({
                    'jobs.access_code': req.session.freelance_logged_code,
                    is_deleted:{$ne:true}
                }, {
                    'jobs': {
                        $elemMatch: {
                            'access_code': req.session.freelance_logged_code
                        }
                    }
                })
                .exec()
                .then(function(project) {
                    if (project != null && project.jobs.length == 1) {
                        req.job = project.jobs[0];
                        next();
                    } else {
                        req.session.freelance_logged = false;
                        res.redirect('/freelance/login');
                    }
                })
                .catch(function(err){
                    console.error(err);
                });
            }
        } else if (req.path.indexOf('/freelance/login') != 0) {
            if (req.path != '/user/login' && !req.session.current_user) {
                res.redirect('/user/login');
            } else {
                if (typeof req.session.current_user != 'undefined' && req.path != '/user/' + req.session.current_user._id + '/settings/edit' && req.path != '/user/logout' && req.session.current_user.is_password_temporary) {
                    res.redirect('/user/' + req.session.current_user._id + '/settings/edit');
                } else {
                    next();
                }
            }
        } else {
            next();
        }
    } else {
        next();
    }
});

app.use(function(req, res, next) {
    res.locals.base_url = '/';

    if (req.session.current_user) {
        res.locals.current_user = req.session.current_user;
    }
    if (req.session.toast_message) {
        res.locals.toast_message = req.session.toast_message;
        delete req.session.toast_message;
    }
    next();
});

fs.readdirSync('./controllers').forEach(function(file) {
    if (file.substr(-3) == '.js') {
        var route = require('./controllers/' + file);
        route.controller(app);
    } else if (file != '.DS_Store') {
        fs.readdirSync('./controllers/' + file).forEach(function(file2) {
            if (file2.substr(-3) == '.js') {
                var route = require('./controllers/' + file + '/' + file2);
                route.controller(app, file);
            }
        });
    }
});

app.on('start', function() {
    console.log('Application ready to serve requests.');
});
