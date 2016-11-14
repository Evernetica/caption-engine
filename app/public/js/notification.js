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

(function ($) {
    $.extend({
        notification: function (options) {
            options.content = options.content || '';
            options.timeout = options.timeout || 5000;

            if($( '#notification_bar' ).length) {
                $('#notification_bar').hide();
            }
            else {
                $('body').prepend('<div id="notification_bar" style="font-size:1.3em;display:none;position:fixed;bottom:0;width:100%;left:0;right:0;z-index:20000;background-color:#222D32;color:white;text-align:center;padding:15px;"></div>');
            }

            $('#notification_bar').html(options.content);
            $('#notification_bar').slideDown(500);
            setTimeout(function(){
                $('#notification_bar').slideUp();
            }, options.timeout);
        }
    });
})(jQuery);
