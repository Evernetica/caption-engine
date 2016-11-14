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

var app = require('./index');
var models = require('./models');
var https = require('https');
var fs = require('fs');
var express = require('express');

var server;

/*
 * Create and start HTTP server.
 */

if (process.argv[2] == 'populate') {
    new models.Company({
        name: 'Default company'
    }).save().then(function(company){
        new models.User({
            email: 'admin@website.com',
            password: 'admin',
            firstname: 'Admin',
            lastname: 'Istrator',
            is_admin: 1,
            is_password_temporary: 1,
            _company: company._id
        }).save().then(function() {
            console.log('Default user : admin@website.com\nDefault password : admin');
            process.exit();
        });
    });
} else {
    server = https.createServer({
        key: fs.readFileSync(process.env.SSL_KEY_PATH),
        cert: fs.readFileSync(process.env.SSL_CERT_PATH)
    }, app).listen(process.env.PORT || 8000);

    server.on('listening', function() {
        console.log('Server HTTPS listening on https://localhost:%d', this.address().port);
    });

    var io = require('socket.io')(server);
    io.use(function(socket, next) {
        app.session_middleware(socket.request, socket.request.res, next);
    });

    require('./services/socket_freelance.js')(io);

    var appHTTP = express();
    appHTTP.use(function(req, res) {
        res.redirect('https://' + req.headers.host + req.url);
    });
    var serverHTTP = require('http').createServer(appHTTP).listen(8002);
    serverHTTP.on('listening', function() {
        console.log('Server HTTP listening on http://localhost:%d', this.address().port);
    });
}
