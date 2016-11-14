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

var moment = require('moment');

module.exports = {
    randomString: function(length) {
        var text = '';
        var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for(var i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    },
    randomNumber: function(low, high) {
        return Math.floor(Math.random() * (high - low) + low);
    },

    displayDeadline: function(val) {
        return moment(val).format('DD/MM/YYYY') + ' (' + moment.duration(moment(val).diff(moment())).humanize(true) + ')';
    },

    sendEmail: function(options){
        var opts = options;

        opts.to = opts.to || null;
        opts.subject = opts.subject || 'Captiz notification';
        opts.from = opts.from || 'contact@captiz.com';
        opts.content_id = opts.content_id || null;
        opts.values = opts.values || {};
        opts.sendgrid_api_key = process.env.SENDGRID_API_KEY;
        opts.sendgrid_template_id = process.env.SENDGRID_TEMPLATE_ID;

        if(opts.to==null || opts.subject==null || opts.content_id==null){
            console.log('Error sending email, check arguments !');
        }
        else{
            var contents = {};
            try{
                contents = JSON.parse(require('fs').readFileSync(__dirname + '/config/emails.json', 'utf8'));
            } catch (e) {
                console.error('Parsing error:', e);
            }

            var helper = require('sendgrid').mail;
            var from_email = new helper.Email(opts.from);
            var to_email = new helper.Email(opts.to);
            var subject = opts.subject;
            var mail = new helper.Mail();
            mail.setFrom(from_email);
            mail.setSubject(subject);

            var personalization = new helper.Personalization();
            personalization.addTo(to_email);
            opts.values['--preview--'] = contents[opts.content_id].preview;
            for(var key in opts.values) {
                personalization.addSubstitution(
                  new helper.Substitution(key, opts.values[key]));
            }
            mail.addPersonalization(personalization);

            mail.addContent(new helper.Content('text/plain', contents[opts.content_id].text));
            mail.addContent(new helper.Content('text/html', contents[opts.content_id].html));

            mail.setTemplateId(opts.sendgrid_template_id);

            var sg = require('sendgrid')(opts.sendgrid_api_key);
            var request = sg.emptyRequest({
                method: 'POST',
                path: '/v3/mail/send',
                body: mail.toJSON(),
            });

            sg.API(request, function(error, response) {
                console.log(response.statusCode);
            });
        }
    }
};
