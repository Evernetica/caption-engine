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

(function ($, undefined) {
    $.fn.getCursorPosition = function () {
        var el = $(this).get(0);
        var pos = 0;
        if ('selectionStart' in el) {
            pos = el.selectionStart;
        } else if ('selection' in document) {
            el.focus();
            var Sel = document.selection.createRange();
            var SelLength = document.selection.createRange().text.length;
            Sel.moveStart('character', -el.value.length);
            pos = Sel.text.length - SelLength;
        }
        return pos;
    }
})(jQuery);

var CaptizTranscription = (function(){
    var player;

    var old_fromcharcode = String.fromCharCode;
    String.fromCharCode2 = function(code){
        if(code==8)
            return "Backspace";
        else if(code == 13)
            return "Enter";
        else if(code == 32)
            return "Space";
        else if(code == 37)
            return "Left";
        else if(code == 39)
            return "Right";
        else {
            return old_fromcharcode(code);
        }
    };



    var current_style = 'NONE';

    function getStyle(text){
        if(text.substring(0, 3) == "<i>"){
            return 'ITALIC';
        }
        else if(text.substring(0, 3) == "<b>" || text.substring(0, 3) == "<em>"){
            return 'BOLD';
        }
        else {
            return 'NONE';
        }
    }
    function cleanStyle(text){
        return text.replace(/<[\/]?i>/g, "").replace(/<[\/]?b>/g, "");
    }
    function applyStyle(el, style) {
        if(style == "ITALIC"){
            el.css("font-weight", "");
            el.css("font-style", "italic");

            $("#btn_italic").removeClass("btn-warning").addClass("btn-info");
            $("#btn_bold").removeClass("btn-info").addClass("btn-warning");
        }
        else if(style == "BOLD"){
            el.css("font-style", "");
            el.css("font-weight", "bold");
            $("#btn_bold").removeClass("btn-warning").addClass("btn-info");
            $("#btn_italic").removeClass("btn-info").addClass("btn-warning");
        }
        else if(style == "NONE"){
            el.css("font-style", "");
            el.css("font-weight", "");
            $("#btn_italic").removeClass("btn-info").addClass("btn-warning");
            $("#btn_bold").removeClass("btn-info").addClass("btn-warning");
        }
    }
    function addStyle(text, style){
        if(style == "ITALIC"){
            return "<i>"+text+"</i>";
        }
        else if(style == "BOLD"){
            return "<b>"+text+"</b>";
        }
        else if(style == "NONE"){
            return text;
        }
    }


    function getSpreadsheetColFromName(instance, name)
    {
        var n_cols  =   instance.countCols();
        var i       =   1;

        for (i=1; i<=n_cols; i++)
        {
            if (name.toLowerCase() == instance.getColHeader(i).toLowerCase()) {
                return i;
            }
        }
        return -1; //return -1 if nothing can be found
    }

    var player = null;
    var current_interval;
    var checkCanvasLoaded_interval;
    var current_timecode_id = -1;
    var sheet;
    var captions_videojs;

    var bold_activated = false;
    var italic_activated = false;

    var config = {};

    var shortcuts_types = {
        "AZERTY_ALT" : {
            modifier: "ALT",
            keys : {
                playpause: 80,
                start: 65,
                end: 90,
                cut_start: 69,
                cut_end: 82,
                add_current: 13,
                add_position: 8,
                backward_1s: 37,
                forward_1s: 39
            }
        },
        "QWERTY_ALT" : {
            modifier: "ALT",
            keys : {
                playpause: 80,
                start: 81,
                end: 87,
                cut_start: 69,
                cut_end: 82,
                add_current: 13,
                add_position: 8,
                backward_1s: 37,
                forward_1s: 39
            }
        }
    };
    var current_shortcut;

    var chooseShortcuts = function(shortcuts){
        current_shortcut = shortcuts_types[shortcuts];
        var description = "";
        var modifier = current_shortcut.modifier;
        description+="<li>"+modifier+" + "+ String.fromCharCode2(current_shortcut.keys.playpause) +" : Toggle Play/Pause</li>";
        description+="<li>"+modifier+" + "+ String.fromCharCode2(current_shortcut.keys.start) +" : Go to the begining of current subtitle</li>";
        description+="<li>"+modifier+" + "+ String.fromCharCode2(current_shortcut.keys.end) +" : Go to the end of current subtitle</li>";
        description+="<li>"+modifier+" + "+ String.fromCharCode2(current_shortcut.keys.cut_start) +" : Set the begining of current subtitle at current time</li>";
        description+="<li>"+modifier+" + "+ String.fromCharCode2(current_shortcut.keys.cut_end) +" : Set the end of current subtitle at current time</li>";
        description+="<li>"+modifier+" + "+ String.fromCharCode2(current_shortcut.keys.add_current) +" : Add a new timecode after current timecode</li>";
        description+="<li>"+modifier+" + "+ String.fromCharCode2(current_shortcut.keys.add_position) +" : Add a new timecode at current position</li>";
        description+="<li>"+modifier+" + "+ String.fromCharCode2(current_shortcut.keys.backward_1s) +" : Move 0.1 second backward</li>";
        description+="<li>"+modifier+" + "+ String.fromCharCode2(current_shortcut.keys.forward_1s) +" : Move 0.1 second forward</li>";

        $("#shortcuts_description").html(description);

        Mousetrap.reset();
        Mousetrap.bind(current_shortcut.modifier.toLowerCase()+'+'+String.fromCharCode2(current_shortcut.keys.playpause).toLowerCase(), function(e) {
            if(player.paused()){
                player.play();
            }
            else {
                player.pause();
            }
            return false;
        });

        Mousetrap.bind(current_shortcut.modifier.toLowerCase()+'+'+String.fromCharCode2(current_shortcut.keys.start).toLowerCase(), function(e) {  /* Jump to the start of current timecode */
            if(current_timecode_id!=-1)
                player.currentTime(window.globals.getTimecodes()[current_timecode_id].tc_in);
            return false;
        });

        Mousetrap.bind(current_shortcut.modifier.toLowerCase()+'+'+String.fromCharCode2(current_shortcut.keys.end).toLowerCase(), function(e) {  /* Jump to the end of current timecode */
            if(current_timecode_id!=-1)
                player.currentTime(window.globals.getTimecodes()[current_timecode_id].tc_out);
            return false;
        });

        Mousetrap.bind(current_shortcut.modifier.toLowerCase()+'+'+String.fromCharCode2(current_shortcut.keys.backward_1s).toLowerCase(), function(e) {  /* Move 1s backward */
            console.log(player.currentTime());
            player.currentTime(player.currentTime()-0.1);
            return false;
        });
        Mousetrap.bind(current_shortcut.modifier.toLowerCase()+'+'+String.fromCharCode2(current_shortcut.keys.forward_1s).toLowerCase(), function(e) {  /* Move 1s backward */
            console.log(player.currentTime());
            player.currentTime(player.currentTime()+0.1);
            return false;
        });

        Mousetrap.bind(current_shortcut.modifier.toLowerCase()+'+'+String.fromCharCode2(current_shortcut.keys.cut_start).toLowerCase(), function(e) { /*Set current timecode start*/
            if(current_timecode_id!=-1)
                window.globals.updateTimecodeIn(current_timecode_id, player.currentTime());

            window.globals.redrawTimeline();
            window.globals.update_sheet();
            return false;
        });

        Mousetrap.bind(current_shortcut.modifier.toLowerCase()+'+'+String.fromCharCode2(current_shortcut.keys.cut_end).toLowerCase(), function(e) { /*Set current timecode end*/
            if(current_timecode_id!=-1)
                window.globals.updateTimecodeOut(current_timecode_id, player.currentTime());

            window.globals.redrawTimeline();
            window.globals.update_sheet();
            return false;
        });

        Mousetrap.bind(current_shortcut.modifier.toLowerCase()+'+'+String.fromCharCode2(current_shortcut.keys.add_position).toLowerCase(), function(e) { /*Add new timecode at position*/
            var timecodes = window.globals.getTimecodes();
            var t={text:""};
            if(bold_activated){
                t.text = "<b>"+t.text+"</b>";
            }
            if(italic_activated){
                t.text = "<i>"+t.text+"</i>";
            }

            t.tc_in = player.currentTime();
            t.tc_out = t.tc_in+3;

            window.globals.addTC(t);
            return false;
        });

        Mousetrap.bind(current_shortcut.modifier.toLowerCase()+'+'+String.fromCharCode2(current_shortcut.keys.add_current).toLowerCase(), function(e) { /*Add new timecode after current timecode*/
            var timecodes = window.globals.getTimecodes();
            var t={text:""};
            if(bold_activated){
                t.text = "<b>"+t.text+"</b>";
            }
            if(italic_activated){
                t.text = "<i>"+t.text+"</i>";
            }

            if(current_timecode_id!=-1){
                t.tc_in = timecodes[current_timecode_id].tc_out+0.20;
                t.tc_out = t.tc_in+3;
            }
            else if(timecodes.length>0){
                t.tc_in = timecodes[timecodes.length-1].tc_out+0.20;
                t.tc_out = t.tc_in+3;
            }
            else{
                t.tc_in=0;
                t.tc_out=3;
            }
            /*if(t<0)
                t=0;*/
            window.globals.addTC(t);
            return false;
        });
    }

    var play = function(){
        player.off("timeupdate");
        window.clearInterval(current_interval);
        current_interval = window.setInterval(function () {
            var whereYouAt = player.currentTime();
            if(window.globals.timeupdate_timeline != undefined){
                window.globals.timeupdate_timeline(whereYouAt);
            }
        }, 50);
    }
    var pause = function(){
        window.clearInterval(current_interval);
        player.on("timeupdate", function(){
            var whereYouAt = player.currentTime();
            if(window.globals.timeupdate_timeline != undefined){
                window.globals.timeupdate_timeline(whereYouAt);
            }
        });
    }
    window.globals.timeupdate_player = function(time_s){
        player.currentTime(time_s);
    };

    window.globals.update_sheet = function(){
        sheet.render();

        var cues, cues_length;

        if(captions_videojs.cues!==null && typeof captions_videojs.cues === 'object'){
            cues = captions_videojs.cues.cues_?captions_videojs.cues.cues_:$.extend(true, {}, captions_videojs.cues);
            cues_length = cues.length?cues.length:cues.length_;
        }
        else if(Array.isArray(captions_videojs.cues_)){
            console.log("array");
            cues = captions_videojs.cues_.slice(0);
            cues_length = cues.length;
        }
        else if(player.currentType()=="video/youtube" || player.currentType()=="video/vimeo"){
            cues = $.extend(true, {}, captions_videojs.cues_);
            cues_length = Object.keys(cues).length;
        }


        for(var i=0;i<cues_length;i++){
            captions_videojs.removeCue(cues[i]);
        }
        var timecodes = window.globals.getTimecodes();
        for(var i = 0;i<timecodes.length;i++){
            var t = timecodes[i];
            captions_videojs.addCue(new VTTCue(t.tc_in, t.tc_out, t.text));
        }
    };
    window.globals.selectTimecode = function(id, row){
        sheet.selectCell(id,row!=undefined?row:2);
        /*player.currentTime(window.globals.getTimecodes()[id].tc_in);

        window.globals.redrawTimeline();*/
    };

    var timecodeRenderer = function(instance, td, row, col, prop, value, cellProperties) {
        td.innerHTML = moment.duration(value, "seconds").format("hh:mm:ss.SSS", { trim: false });

        return td;
    }

    window.globals.saveTC = function(id, data) {
        config.updateTimecode(id, "update", data);
    }
    window.globals.deleteTC = function(id){
        config.updateTimecode(id, "delete");
    }
    window.globals.addTC = function(data) {
        config.updateTimecode(-1, "add", data);
    }

    /* original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net) */
    function strip_tags(input, allowed) {
        var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
        commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
        allowed = (((allowed || "") + "").toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join('');
        return input.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
            return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
        });
    }

    var loadTimecodes = function(callback_end){
          config.loadTimecodes(function(timecodes, mission, access_code){
              var data_sheet = [];
              var translation = "";
              for(var i = 0;i<timecodes.length;i++){

                  if(timecodes[i].translations && timecodes[i].translations.length > 0){
                    translation = timecodes[i].translations[0].translation;
                  }
                  else{
                    translation = "";
                  }

                  window.globals.addTimecode({
                      id: timecodes[i]._id,
                      tc_in: timecodes[i].seconds,
                      tc_out: timecodes[i].seconds+timecodes[i].length,
                      text: timecodes[i].original,
                      translation: translation,
                      character: timecodes[i].character,
                      temporary: false
                  });
              }

              var col_header = ["In", "Out"]
              var transcribe_read = true;
              var translate_read = true;
              var columns = [
                  {
                    data: 'tc_in',
                    readOnly: !config.editable_tcin,
                    renderer: timecodeRenderer
                  },
                  {
                    data: 'tc_out',
                    readOnly: !config.editable_tcout, //transcribe_read
                    renderer: timecodeRenderer
                  }
              ];

              if(config.display_cps) {
                  col_header.push("CPS");
                  columns.push({
                    renderer: function(instance, td, row, col, prop, value, cellProperties){
                        var col_text = getSpreadsheetColFromName(instance, "Transcription");
                        var length = parseFloat(instance.getDataAtCell(row, 1))-parseFloat(instance.getDataAtCell(row, 0));
                        var CPS = instance.getDataAtCell(row, col_text)!=null&&instance.getDataAtCell(row, col_text).length>0&&length>0?Math.round(instance.getDataAtCell(row, col_text).replace(/[^A-Z]/gi, "").length/length *10)/10:0;

                        td.innerHTML = CPS>17?"<span style='color:red;'>"+CPS+"</span>":CPS;
                    },
                    readOnly: true
                  });
              }
              if(config.display_cpl) {
                  col_header.push("CPL");
                  columns.push({
                    renderer: function(instance, td, row, col, prop, value, cellProperties){
                        var col_text = getSpreadsheetColFromName(instance, "Transcription");

                        var text = instance.getDataAtCell(row, col_text)!=null?instance.getDataAtCell(row, col_text):"";
                        //text = text.replace(/\h+/g, '');
                        var lines = text.split(/\n/g);
                        if(lines.length==1) {
                            var CPL = lines[0].length;
                            td.innerHTML = CPL>=37?"<span style='color:red;'>"+CPL+"</span>":CPL;
                        }
                        else if(lines.length==2) {
                            var CPL1 = lines[0].length;
                            var CPL2 = lines[1].length;
                            td.innerHTML = CPL1>=37?"<span style='color:red;'>"+CPL1+"</span>":CPL1;
                            td.innerHTML += "\n";
                            td.innerHTML += CPL2>=37?"<span style='color:red;'>"+CPL2+"</span>":CPL2;
                        }
                        else {
                            td.innerHTML = "<span style='color:red;'>Too many lines</span>";
                        }
                    },
                    readOnly: true
                  });
              }
              if(config.display_character) {
                  col_header.push("Character");
                  columns.push({
                    data: 'character',
                    readOnly: !config.editable_character
                  });
              }

              col_header.push("Transcription");
              columns.push({
                data: 'text',
                readOnly: !config.editable_transcription,
                renderer: function(instance, td, row, col, prop, value, cellProperties) {
                    var escaped = Handsontable.helper.stringify(value);
                    escaped = strip_tags(escaped, '<em><b><strong><a><i>');
                    if(escaped.indexOf("(INAUDIBLE)") != -1){
                        escaped = "<span style='background: red;'><b>"+escaped+"</b></span>";
                    }
                    td.innerHTML = escaped;
                    return td;
                }
              });

              if(config.display_translation) {
                  col_header.push("Translation");
                  columns.push({
                    data: 'translation',
                    readOnly: !config.editable_translation,
                    renderer: function(instance, td, row, col, prop, value, cellProperties) {
                        var escaped = Handsontable.helper.stringify(value);
                        escaped = strip_tags(escaped, '<em><b><strong><a><i>');
                        if(escaped.indexOf("(INAUDIBLE)") != -1){
                            escaped = "<span style='background: red;'><b>"+escaped+"</b></span>";
                        }
                        td.innerHTML = escaped;
                        return td;
                    }
                  });
              }

              if(mission){
                if(mission == "TRANSCRIBE"){
                  transcribe_read = false;
                }
                else if(mission == "TRANSLATE"){
                  translate_read = false;
                }
              }
              else{

              }

              var container = document.getElementById('spreadsheet');
              sheet = new Handsontable(container, {
                  data: window.globals.getTimecodes(),
                  colHeaders: col_header,
                  columns: columns,
                  minSpareRows: 0,
                  manualColumnResize: true,
                  stretchH: 'last',
                  rowHeaders: true,
                  contextMenu: false,
                  outsideClickDeselects: false,
                  currentRowClassName: 'currentRow',
                  height: 300,
                  afterInit: function(){
                      player.pause();

                      if(window.globals.getTimecodes().length > 0){
                          current_timecode = 0;
                          this.selectCell(0,0);
                      }
                  },
                  afterSelection: function(r, c, r2, c2){
                      current_timecode_id = r;
                      var text = window.globals.getTimecodes()[r].text;
                      $("#timecode_character").val(window.globals.getTimecodes()[r].character);
                      /*current_timecode = data[r];*/
                      if(c==1){
                          player.currentTime(window.globals.getTimecodes()[r].tc_out);
                      }
                      else if(c==0) {
                          player.currentTime(window.globals.getTimecodes()[r].tc_in);
                      }

                      current_style = getStyle(text);
                      text = cleanStyle(text);
                      applyStyle($("#timecode_content"), current_style);

                      $("#timecode_content").val(text);
                      setTimeout(function(){
                          $("#timecode_content").focus();
                      }, 100);
                  },
                  afterChange: function(changes, source) {
                      /*if(mission){
                      if(source!="loadData" && source!="populateFromArray"){
                          for(var i=0;i<changes.length;i++){
                            save(changes[i][3], changes[i][1], changes[i][0], access_code);
                          }
                      }
                    }*/
                  },
                  beforeKeyDown: function (event) {
                      Handsontable.Dom.stopImmediatePropagation(event);
                      Mousetrap.trigger((event.ctrlKey?"ctrl":event.metaKey?"meta":event.altKey?"alt":"")+"+"+String.fromCharCode2(event.which).toLowerCase());
                  }
              });

              window.globals.update_sheet();
              callback_end();
          });
    }

    return {
        init: function(_config_){
            player = _config_.player!=undefined?_config_.player:null;
            config.loadTimecodes = _config_.loadTimecodes?_config_.loadTimecodes:function(callback){callback([]);};
            config.updateTimecode = _config_.updateTimecode?_config_.updateTimecode:function(callback){callback(-1, null);};
            config.canvasLoaded = _config_.canvasLoaded?_config_.canvasLoaded:function(){};

            config.display_cps = _config_.display_cps!=undefined?_config_.display_cps:true;
            config.display_cpl = _config_.display_cpl!=undefined?_config_.display_cpl:true;
            config.display_character = _config_.display_character!=undefined?_config_.display_character:true;
            config.display_translation = _config_.display_translation!=undefined?_config_.display_translation:true;

            config.editable_tcin = _config_.editable_tcin!=undefined?_config_.editable_tcin:false;
            config.editable_tcout = _config_.editable_tcout!=undefined?_config_.editable_tcout:false;
            config.editable_character = _config_.editable_character!=undefined?_config_.editable_character:false;
            config.editable_transcription = _config_.editable_transcription!=undefined?_config_.editable_transcription:false;
            config.editable_translation = _config_.editable_translation!=undefined?_config_.editable_translation:false;

            $(document).ready(function(){
                player.on("play", function(){
                    play();
                });
                player.on("pause", function(){
                    pause();
                });

                checkCanvasLoaded_interval = setInterval(function(){
                    if(window.globals.addTimecode!=undefined){
                        config.canvasLoaded();
                        loadTimecodes(function(){
                            window.globals.timeupdate_timeline(0);
                        });
                        clearInterval(checkCanvasLoaded_interval);
                    }
                }, 500);

                captions_videojs = player.addTextTrack('captions', 'Captiz captions', '');
                captions_videojs.mode = "showing";

                $('#timecode_content').bind('input propertychange', function() {
                      if(current_timecode_id!=-1){
                          window.globals.updateTimecodeText(current_timecode_id, $(this).val());
                          window.globals.update_sheet();
                      }
                });
                $('textarea').keydown(function(event) {
                    if (event.altKey) {
                        event.preventDefault();
                    }
                });

                $('#timecode_character').bind('input propertychange', function() {
                      if(current_timecode_id!=-1){
                          var val = $(this).val();
                          if(val.length == 0){
                              val = $(this).attr('placeholder');
                              window.globals.updateTimecodeCharacter(current_timecode_id, "");
                              window.globals.update_sheet();
                          }
                          else {
                              window.globals.updateTimecodeCharacter(current_timecode_id, val);
                              window.globals.update_sheet();
                          }

                          $(this).attr('size', val.length+1);
                          $("#timecode_content").width($("#timecode_content").parent().width()-$("#timecode_span").width()-25);
                      }
                });
                $("#timecode_content").width($("#timecode_content").parent().width()-$("#timecode_span").width()-25);

                $("#btn_bold").click(function(){
                    current_style = (current_style=="BOLD"?"NONE":"BOLD");
                    applyStyle($("#timecode_content"), current_style);
                    $("#timecode_content").focus();

                    if(current_timecode_id!=-1){
                        var text = addStyle($("#timecode_content").val(), current_style);
                        window.globals.updateTimecodeText(current_timecode_id, text);
                        window.globals.update_sheet();
                    }
                });
                $("#btn_italic").click(function(){
                    current_style = (current_style=="ITALIC"?"NONE":"ITALIC");
                    applyStyle($("#timecode_content"), current_style);
                    $("#timecode_content").focus();

                    if(current_timecode_id!=-1){
                        var text = addStyle($("#timecode_content").val(), current_style);
                        window.globals.updateTimecodeText(current_timecode_id, text);
                        window.globals.update_sheet();
                    }
                });
                $("#btn_split").click(function(){
                    if(current_timecode_id!=-1){
                        var position = $("#timecode_content").getCursorPosition();
                        var before_text = $('#timecode_content').val().substr(0, position);
                        var after_text = $('#timecode_content').val().substr(position);

                        var t = window.globals.getTimecodes()[current_timecode_id];

                        var new_t = {
                            tc_in: t.tc_in+(t.tc_out-t.tc_in)/2+0.20,
                            tc_out: t.tc_out,
                            text: after_text
                        };
                        //window.globals.addTimecode(new_t);
                        window.globals.addTC(new_t);

                        window.globals.updateTimecodeOut(current_timecode_id, t.tc_in+(t.tc_out-t.tc_in)/2);
                        window.globals.updateTimecodeText(current_timecode_id, before_text);

                        window.globals.redrawTimeline();
                        window.globals.update_sheet();
                    }
                });
                $("#btn_remove").click(function(){
                    if(current_timecode_id!=-1){
                        window.globals.removeTimecode(current_timecode_id);
                        window.globals.redrawTimeline();
                        window.globals.update_sheet();
                    }
                });

                chooseShortcuts("AZERTY_ALT");
            });
        },
        chooseShortcuts: function(short){
            chooseShortcuts(short);
        },
        getTimecodes: function(){
            return window.globals.getTimecodes();
        },
        getCurrentShortcut(){
            return current_shortcut;
        },
        selectTimecode(id){
            window.globals.selectTimecode(id);
        },
        addTimecode(id, data, temporary) {
            data.temporary = temporary?temporary:false;
            data.id = id;
            var pos = window.globals.addTimecode(data);
            window.globals.redrawTimeline();
            window.globals.update_sheet();
            sheet.selectCell(pos, 0);
        },
        updateTimecodeId(old_id, new_id){
            window.globals.updateTimecodeId(old_id, new_id);
        }
    };
})();
