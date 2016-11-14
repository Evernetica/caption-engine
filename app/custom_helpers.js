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

var dust = require('dustjs-linkedin');
var helpers = require('./helpers');

/**
DustJS helper to test if a value is in an array

Usage :
{@ifInArray key=myArray value=valueToTest}
    Text to print if value is in array
{:else}
    Text to print if value is not in array
{/ifInArray}
**/
dust.helpers.ifInArray = function(chunk, context, bodies, params) {
    var array = dust.helpers.tap(params.key, chunk, context);
    var val = dust.helpers.tap(params.value, chunk, context);

    if(!Array.isArray(array) || array.indexOf(val) == -1 ) {
        if(bodies.else != undefined) {
            return chunk.render(bodies.else, context);
        }
        else {
            return false;
        }
    }
    else {
        return true;
    }
};

/**
DustJS helper to display a date as DD/MM/YYYY (in XX days)

Usage :
{@displayDeadline value=mydate /}
**/
dust.helpers.displayDeadline = function(chunk, context, bodies, params) {
    var val = dust.helpers.tap(params.value, chunk, context);
    chunk.write(helpers.displayDeadline(val));
    return chunk;
};


dust.helpers.iterate = function(chunk, context, bodies, params) {
    params = params || {};
    var obj = params['on'] || context.current();
    for (var k in obj) {
        chunk = chunk.render(bodies.block, context.push({key: k, value: obj[k]}));
    }
    return chunk;
};

dust.helpers.eval = function(chunk, context, bodies) {
    var expression = '';
    chunk.tap(function(data) {
        expression += data;
        return '';
    }).render(bodies.block, context).untap();
    chunk.write(eval(expression));
    return chunk;
};
