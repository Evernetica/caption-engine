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

var winston = require('winston');
var logger = winston.loggers.get('default');

module.exports.controller = function(router) {
	router.get('/services/convert', router.routeLogAccess, function(req, res) {
		var params = {};
		params.convert = 'convert';
		res.render('services/convert', params);
	});

	router.post('/services/convert', function(req, res) {
		var params = {};

		var dataJSON = JSON.parse(req.body.data);

		if(typeof dataJSON.content[1] == 'undefined'){
			logger.error("Fichier vide pour tentative de conversion CSV/SRT. User :" + req.session.current_user.name );
			req.session.toast_message = "Your File is Empty";
			res.redirect('/services/convert');
		}

		if(dataJSON.type == "csv"){

			if((isNaN(parseInt(dataJSON.content[1][dataJSON.position.timecodestart][0])) && dataJSON.content[1][dataJSON.position.timecodestart][2] != ":")
				|| (isNaN(parseInt(dataJSON.content[1][dataJSON.position.timecodeend][0])) && dataJSON.content[1][dataJSON.position.timecodeend][2] != ":")) {
				console.log("Choix des timecode pour la conversion CSV sont faux");
				req.session.toast_message = "Please verify Timecodestart and Timecodesend";
				res.redirect('/services/convert');
			}
			else{

				var parser = require('../libs/srt.parser.js');
				var data = [];
				var toReplace;

				if( dataJSON.content[1][dataJSON.position.timecodestart].indexOf('.') != -1 ){
					toReplace = ".";
				}
				else if(dataJSON.content[1][dataJSON.position.timecodestart].indexOf(',') != -1){
					toReplace = ",";
				}
				else if(dataJSON.content[1][dataJSON.position.timecodestart].match(new RegExp(":", 'g')).length > 2){
					toReplace = ":";
				}
				else{
					toReplace = "VIDE";
				}

				for(var i=0;i<dataJSON.content.length;i++){
					if(toReplace == "VIDE"){
						data.push({
							id: ''+(i+1),
							startTime: dataJSON.content[i][dataJSON.position.timecodestart]+",000",
							endTime: dataJSON.content[i][dataJSON.position.timecodeend]+",000",
							text: dataJSON.content[i][dataJSON.position.transcription].replace("\;", ";").replace("\\n", "\n")
						});
					}
					else if(toReplace == ":"){
						var debStart = dataJSON.content[i][dataJSON.position.timecodestart].substr(0, 8);
						var finStart = dataJSON.content[i][dataJSON.position.timecodestart].substr(9,10);
						var finStartConvert = Math.round((finStart/25)*100);

						if(finStartConvert.toString().length == 1){
							finStartConvert = finStartConvert.toString() + "00";
						}
						else if(finStartConvert.toString().length == 2){
							finStartConvert = finStartConvert.toString() + "0";
						}
						else if(finStartConvert.toString().length > 3){
							finStartConvert = finStartConvert.toString().substr(0, 2);
						}
						else{
							finStartConvert = "000";
						}

						var debEnd = dataJSON.content[i][dataJSON.position.timecodeend].substr(0, 8);
						var finEnd = dataJSON.content[i][dataJSON.position.timecodeend].substr(9,10);
						var finEndConvert = (finEnd/25)*100;

						if(finEndConvert.toString().length == 1){
							finEndConvert = finEndConvert.toString() + "00";
						}
						else if(finEndConvert.toString().length == 2){
							finEndConvert = finEndConvert.toString() + "0";
						}
						else if(finEndConvert.toString().length > 3){
							finEndConvert = finEndConvert.toString().substr(0, 2);
						}
						else{
							finEndConvert = "000";
						}

						data.push({
							id: ''+(i+1),
							startTime: debStart + "," + finStartConvert,
							endTime: debEnd+ "," + finEndConvert,
							text: dataJSON.content[i][dataJSON.position.transcription].replace("\;", ";").replace("\\n", "\n")
						});
					}
					else{
						data.push({
							id: ''+(i+1),
							startTime: dataJSON.content[i][dataJSON.position.timecodestart].replace(toReplace,","),
							endTime: dataJSON.content[i][dataJSON.position.timecodeend].replace(toReplace,","),
							text: dataJSON.content[i][dataJSON.position.transcription].replace("\;", ";").replace("\\n", "\n")
						});
					}
				}

				res.set({
	                'Content-Disposition': 'attachment; filename='+dataJSON.filename+'.srt',
	                'Content-type': 'application/x-subrip'
	            });
	            res.send(parser.toSrt(data));
	        }
		}
	    else if (dataJSON.type == "srt") {

	        var data = "";
	        for (var i = 0; i < dataJSON.content.length; i++) {
	            data += dataJSON.content[i][0].replace(",", dataJSON.delimiter) + ";" + dataJSON.content[i][1].replace(",", dataJSON.delimiter) + ";" + dataJSON.content[i][2].replace(";", "\;").replace("\n", "\\n") + ";";
	            data += "\n";
	        }

	        res.set({
	            'Content-Disposition': 'attachment; filename='+dataJSON.filename+'.csv',
	            'Content-type': 'text/csv'
	        });

	        res.send(data);
	    }
	});
};
