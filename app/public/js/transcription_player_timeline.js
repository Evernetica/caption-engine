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

var unit = 80; /* 1s = 80px */
var current_time = 0;
var timecodes = [];
var current_timecodes = [];
var moving_timecode = -1;
var moving_in = false;
var dragging = false;

current_time = 0;

var layer_time;
var layer_timecodes;
var layer_main;

/** SYMBOL REPRESENTING A TIMECODE **/
var myCircle = new Path.Circle(new Point(0,0), 7);
myCircle.fillColor = '#03A9F4';
myCircle.strokeColor = '#333333';
var symbol_circle = new Symbol(myCircle);

function onResize(event){
    project.clear();

    /*CANVAS BACKGROUND */
    var rect = new Path.Rectangle({
        point: [0, 0],
        size: [view.size.width, view.size.height],
        strokeColor: '#3F3F3F'
    });
    rect.sendToBack();
    rect.fillColor = '#3F3F3F';


    /** HORIZONTAL WHITE LINE LAYER **/
    layer_main = new Layer();
    var item_horizontal_line = new Path();
    item_horizontal_line.strokeColor = 'white';
    item_horizontal_line.add(new Point(0, view.size.height/2), new Point(view.size.width, view.size.height/2));

    /** TIME TEXT LAYER **/
    var item_time_line = new Path();
    item_time_line.strokeColor = '#00CCFF';
    item_time_line.add(new Point(view.size.width/2, 0), new Point(view.size.width/2, view.size.height));

    layer_time = new Layer();
    layer_timecodes = new Layer();

    setTime(current_time, true);
}

onResize();


var selectTimecodeAtCurrentTime = function(_current_time){
    var found=false;
    var pos = timecodes.length/2;
    var prev_pos = null;
    var istart = 0, iend = timecodes.length;

    while(!found && iend-istart>1){
        var imiddle = Math.ceil((istart+iend)/2);
        if(timecodes[imiddle].tc_in <= _current_time && timecodes[imiddle].tc_out >= _current_time) {
            found = true;
            globals.selectTimecode(imiddle);
        }
        else if(timecodes[imiddle].tc_in > _current_time){
            iend = imiddle;
        }
        else if(timecodes[imiddle].tc_out < _current_time){
            istart = imiddle;
        }
    }
    if(!found && imiddle==1){
        if(timecodes[0].tc_in <= _current_time && timecodes[0].tc_out >= _current_time) {
            found = true;
            globals.selectTimecode(0);
        }
    }

    /*for(var i=0;i<timecodes.length;i++){
        if(timecodes[i].tc_in <= _current_time && timecodes[i].tc_out >= _current_time) {
            globals.selectTimecode(i);
            break;
        }
    }*/
};

globals.timeupdate_timeline = function(time_s){
    setTime(time_s);
    selectTimecodeAtCurrentTime(time_s);
};
globals.addTimecode = function(timecode){
    for(var i=0;i<timecodes.length;i++){
        if(timecode.tc_in < timecodes[i].tc_in) {
            timecodes.splice(i, 0, timecode);
            break;
        }
    }
    if(i==timecodes.length){
        timecodes.push(timecode);
    }

    return i;
};
globals.getTimecodes = function(){
    return timecodes;
};
globals.clearTimecodes = function(){
    timecodes = [];
    current_timecodes = [];
    moving_timecode = -1;
};
globals.updateTimecodeId = function(old_id, new_id){
    for(var i=0;i<timecodes.length;i++){
        if(timecodes[i].id === old_id){
            timecodes[i].id = new_id;
            timecodes[i].temporary = false;
            timecodes[i].original = timecodes[i].text;
            window.globals.saveTC(timecodes[i].id, timecodes[i]);
            break;
        }
    }
};
globals.updateTimecodeText = function(id, text){
    timecodes[id].text = text;
    if(!timecodes[id].temporary)
        globals.saveTC(timecodes[id].id, { original: text });
};
globals.updateTimecodeCharacter = function(id, text){
    timecodes[id].character = text;
    if(!timecodes[id].temporary)
        globals.saveTC(timecodes[id].id, { character: text });
};
globals.updateTimecodeIn = function(id, tcin){
    timecodes[id].tc_in = tcin;
    if(!timecodes[id].temporary)
        globals.saveTC(timecodes[id].id, { tc_in: tcin });
};
globals.updateTimecodeOut = function(id, tcout){
    timecodes[id].tc_out = tcout;
    if(!timecodes[id].temporary)
        globals.saveTC(timecodes[id].id, { tc_out: tcout });
};
globals.removeTimecode = function(id){
    globals.deleteTC(timecodes[id].id);
    timecodes.splice(id, 1);
};
globals.redrawTimeline = function(){
    drawTimeline(current_time);
    drawTimecodes(current_time);
    view.draw();
}


function drawTimeline(time_s){
    var second_number = view.size.width/unit;
    var first_second = current_time - (second_number/2);
    var last_second = current_time + (second_number/2);
    layer_time.removeChildren();
    layer_time.activate();
    for(var i=Math.ceil(first_second);i<Math.ceil(first_second)+second_number;i++){
        if(i>=0){
            var item_text = new PointText(new Point((i-first_second)*unit, view.size.height/2-25));
            item_text.fillColor = "white";
            var duration = moment.duration(i, 'seconds');
            item_text.content = moment.utc(duration.asMilliseconds()).format("HH:mm:ss");
            var l = new Path();
            l.strokeColor = 'white';
            l.add(new Point((i-first_second)*unit, view.size.height/2-20), new Point((i-first_second)*unit, view.size.height/2+20));
        }
    }
}
function drawTimecodes(time_s){
    var second_number = view.size.width/unit;
    var first_second = current_time - (second_number/2);
    var last_second = current_time + (second_number/2);
    layer_timecodes.removeChildren();
    layer_timecodes.activate();
    current_timecodes=[];
    //var timecode_started=false;

    for(var i=0;i<timecodes.length;i++){
        var t = timecodes[i];
        if(t.tc_in!=undefined && t.tc_in <= last_second){
            if(t.tc_out >= first_second){
                var myRectangle = new Rectangle(new Point((t.tc_in-first_second)*unit, view.size.height/2-6), new Point((t.tc_out-first_second)*unit, view.size.height/2+6));
                var cornerSize = new Size(5, 5);
                var myRoundRectangle = new Path.RoundRectangle(myRectangle, cornerSize);
                myRoundRectangle.fillColor = '#FF5722';
                myRoundRectangle.fillColor.alpha = 0.5;
                myRoundRectangle.t_id = i;
                myRoundRectangle.onClick = function(event){
                    globals.selectTimecode(this.t_id, 0);
                }

                var s_in = symbol_circle.place(new Point((t.tc_in-first_second)*unit, view.size.height/2));
                var s_out = symbol_circle.place(new Point((t.tc_out-first_second)*unit, view.size.height/2));
                current_timecodes.push({
                    tc: t,
                    id: i,
                    item_in: s_in,
                    item_out: s_out
                });
            }
        }
        else if(t.tc > last_second){
            break;
        }
    }
}
function setTime(time_s, force){
    if(force || current_time!=time_s){
        current_time = time_s;

        drawTimeline(time_s);
        drawTimecodes(time_s);

        view.draw();
    }
}



function onMouseDown(event){
    for(var i=0;i<current_timecodes.length;i++){
        if(current_timecodes[i].item_in.hitTest(event.point)){
            /** event.event.button==2 double click **/
            moving_timecode=i;
            moving_in=true;
            break;
        }
        else if(current_timecodes[i].item_out.hitTest(event.point)){
            moving_timecode=i;
            moving_in=false;
        }
    }
}
function onMouseDrag(event) {
    if(moving_timecode!=-1){
        var tc = moving_in?current_timecodes[moving_timecode].tc.tc_in:current_timecodes[moving_timecode].tc.tc_out;
        var t = tc+event.delta.x/unit;
        /*if(current_timecodes[moving_timecode].id>0 && t<=timecodes[current_timecodes[moving_timecode].id-1].tc_out)
            t=timecodes[current_timecodes[moving_timecode].id-1].tc_out+0.100;
        else if(current_timecodes[moving_timecode].id==0 && t<0)
            t=0;*/
        if(t<0)
            t=0;

        moving_in?current_timecodes[moving_timecode].tc.tc_in=t:current_timecodes[moving_timecode].tc.tc_out=t;
        moving_in?timecodes[current_timecodes[moving_timecode].id].tc_in=t:timecodes[current_timecodes[moving_timecode].id].tc_out=t;
        drawTimecodes(current_time);
    }
    else {
        dragging = true;
        var t = current_time - event.delta.x/unit;
        if(t<0)
            t=0;
        setTime(t);
    }
}
function onMouseUp(event) {
    if(moving_timecode!=-1){
        moving_in?globals.updateTimecodeIn(current_timecodes[moving_timecode].id, current_timecodes[moving_timecode].tc.tc_in):globals.updateTimecodeOut(current_timecodes[moving_timecode].id, current_timecodes[moving_timecode].tc.tc_out);

        moving_timecode=-1;

        globals.update_sheet();
    }
    else if(dragging) {
        dragging = false;
        selectTimecodeAtCurrentTime(current_time)
        globals.timeupdate_player(current_time);
    }
}
