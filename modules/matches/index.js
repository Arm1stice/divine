/*
  Matches - Analyze match data returned by the WebAPI
  Created specifically for use in Divine

  Copyright (c) 2015 Wyatt Calandro

*/
var lobbies = {
	"-1": "Invalid",
	"0": "Public Matchmaking",
	"1": "Practice",
	"2": "Tournament",
	"3": "Tutorial",
	"4": "Co-Op Bot Match",
	"5": "Team Match",
	"6": "Solo Queue",
	"7": "Ranked",
	"8": "1v1 Solo Mid"
};
var modes = {
	"0": "Unknown",
	"1": "All Pick",
	"2": "Captains Mode",
	"3": "Random Draft",
	"4": "Single Draft",
	"5": "All Random",
	"6": "?? INTRO/DEATH ??",
	"7": "The Diretide",
	"8": "Reverse Captains Mode",
	"9": "Greeviling",
	"10": "Tutorial",
	"11": "Mid Only",
	"12": "Least Played",
	"13": "New Player Pool",
	"14": "Compendium Matchmaking",
	"15": "Custom",
	"16": "Captains Draft",
	"17": "Balanced Draft",
	"18": "Ability Draft",
	"19": "?? Event ??",
	"20": "All Random Death Match",
	"21": "1v1 Solo Mid",
	"22": "Ranked All Pick"
};
var api = require('../api/index.js');
var dotaModule = require('../dota2/index.js');
var async = require("async");
module.exports = function(db) {
	var database = require("../database/index.js")(db);

	function analyzeAndAddNewMatch(dotes, match, callback) {
		///var dotes = new dotaModule.Dota2Client(global.steamcli, false);
		var data = {};
		data.matchid = match.result['match_id'];
		if (data.matchid === null) {
			return callback("No match id :/", null);
		}
		data.inform = JSON.stringify(match.result);
		data.modeid = match.result['game_mode'];
		data.modename = modes[match.result['game_mode'].toString()];
		data.isranked = (match.result['lobby_type'] === 7) ? 1 : 0;
		async.forEachOfSeries(match.result.players, function(value, i, cb) {
				if (match.result.players[i]['account_id'] === dotes.AccountID) {
					data.playerinfo = JSON.stringify(match.result.players[i]);
					data.heroid = match.result.players[i]["hero_id"];
					data.leaverstatus = match.result.players[i]["leaver_status"];
					data.abandon = (data.leaverstatus === 2) ? 1 : 0;
					var radiant = (match.result.players[i]['player_slot'] == (0 || 1 || 2 || 3 || 4)) ? true : false;
					data.win = (radiant == match.result['radiant_win']) ? 1 : 0;
					async.forEachOfSeries(global.heroes, function(val, iter, cb4){
						if (val.id === value["hero_id"]) {
							data.heroname = val['localized_name'];
							cb4(null);
						}else{
							cb4(null);
						}
					}, function(err){
						cb(null);
					});
				}else{
          cb(null);
        }
			},
			function(err) {
				if (data.isranked === 1) {
					console.log("GETTING THE CHANGE OF MMR FOR MATCH WITH ID " + parseInt(data.matchid));
					var theID = (parseInt(data.matchid) + 1).toString();
					//dotes.launch();
					//dotes.on('ready', function() {
						dotes.getMatchHistory(dotes.AccountID, theID, 1, null, null, null, false, function(response) {
							if (response.matches) {
                console.log("THE MATCH WAS RANKED AND WE RECEIVED A HISTORY OF " + response.matches.length);
								async.forEachOfSeries(response.matches, function(value, hj, cb2) {
									var selectedmatch = response.matches[hj];
									if (selectedmatch.matchId === data.matchid.toString()) {
										data.solochange = (selectedmatch.soloRank === true) ? 1 : 0;
										data.previousmmr = selectedmatch.previousRank;
										data.mmrchange = selectedmatch.rankChange;
										database.addMatch(data, function(err) {
											if (err) {
												return cb2(err);
											} else {
												return cb2(null);
											}
										});
									} else {
										console.log(selectedmatch.matchId + " DOES NOT EQUAL " + data.matchid.toString());
                    return cb2(null);
									}
								}, function(err) {
                  if(err){
                    //dotes.exit();
                    return callback(err, null);
                  }else{
                    //dotes.exit();
                    return callback(null, data);
                  }
								});
							} else {
								//dotes.exit();
								console.log("WHY DIDN'T WE RECEIVE ANY MATCHES DAMN IT");
                return callback("WHY DIDN'T WE RECEIVE ANY MATCHES DAMN IT", null);
							}
						});
					//});
				} else {
					database.addMatch(data, function(err) {
						if (err) {
							return callback(err, null);
						} else {
							return callback(null, data);
						}
					});
				}
			});
	}

	function obtainMatchesAndAdd(numMatches, startId, callback) {
		var dotes = new dotaModule.Dota2Client(global.steamcli, false);
		global.obtainedMatches = [];
		dotes.launch();
		dotes.on('ready', function() {
			dotes.getMatchHistory(dotes.AccountID, startId, numMatches, null, null, null, false, function(response) {
				if (response.matches) {
          async.forEachOfSeries(response.matches, function(value, i, cb3){
						if (value.lobbyType !== (1 || 3)) {
							api.getMatch(value.matchId, function(err, match) {
                if(err){
									console.log("WE COULDN'T GET MATCH ");
                  return cb3(err);
                }
								analyzeAndAddNewMatch(dotes, match, function(err, data) {
									if (err) {
										console.log("Error adding match with id " + value.matchId);
										return cb3(err);
									} else {
										console.log("Added match " + data.matchid);
										global.obtainedMatches.push(data);
                    return cb3(null);
									}
								});
							});
						}else{
							console.log("Found a practice match, skipping....");
              return cb3(null);
            }
					}, function(err){
            dotes.exit();
            if(err){
              console.log("Finished getting matches with errors");
              return callback(err, null);
            }else{
              console.log("Finished getting matches");
              return callback(null, global.obtainedMatches);
            }
          });
				} else {
					dotes.exit();
					return callback("We didn't get any matches! :(", null);
				}
			});
		});
	}
	var util = require("util");
	function obtainMatches(amt, startAt, callback) {
		var dotaClient = new dotaModule.Dota2Client(global.steamcli, false);
		//var dotaClient2 = new dotaModule.Dota2Client(global.steamcli, false);
		var matchesObtained = [];
		var response1 = false;
		var response2 = false;
		var readied1 = false;
		var readied2 = false;
		dotaClient.on('ready', function(){
			if(readied1 === true) return;
			readied1 = true;
			dotaClient.getMatchHistory(dotaClient.AccountID, startAt, amt, null, null, null, false, function(response){
				//dotaClient.on('matchHistoryResponse', function(){util.log("dotaClient matchHistoryResponse called extraneously")});
				if(response1 === true) return;
				response1 = true;
				dotaClient.exit();
				if(response.matches){
					util.log("We received " + response.matches.length + " matches!");
					var thelog = "Match List:";
					async.forEachOfSeries(response.matches, function(val, i, cb){
						if(i === response.matches.length < 1){
							thelog += (" and " + val.matchId + ".");
							return cb();
						}else{
							thelog += (" " + val.matchId + ",");
							return cb();
						}
					}, function(err){
						util.log(thelog);
						async.forEachOfSeries(response.matches, function(value, iteration, cb2){
							// TODO(Wyatt) - Implement going throigh the matches and aanalyzing them and adding them to the database
							if(value.lobbyType !== 1){
								util.log("This match with id " + value.matchId + " is not a practice match, good. Getting match info from API...");
								api.getMatch(value.matchId, function(err, match){
									if(err){
										util.log("We were unable to get match information for match with id " + value.matchId + ". Halting obtaining matches.");
										return cb2(err);
									}else{
										util.log("Well, we got the match info for id " + value.matchId + " from the API. Next, to add basic info and look for the player in the player list...");
										var matchdata = {};
										matchdata.matchid = match.result['match_id'];
										matchdata.inform = JSON.stringify(match.result);
										matchdata.modeid = match.result['game_mode'];
										matchdata.modename = modes[match.result['game_mode'].toString()];
										matchdata.isranked = (match.result['lobby_type'] === 7) ? 1 : 0;
										async.forEachOfSeries(match.result.players, function(player, iterationNum, cb3){
											if(player['account_id'] === dotaClient.AccountID){
												util.log("We found the player in the player list of match with id " + value.matchId + ". Now to add player specific info...");
												matchdata.playerinfo = JSON.stringify(player);
												matchdata.heroid = player["hero_id"];
												matchdata.leaverstatus = player["leaver_status"];
												matchdata.abandon = ((player["leaver_status"] === 2) || (player["leaver_status"] === 3)) ? 1 : 0;
												var radiant = (player['player_slot'] == (0 || 1 || 2 || 3 || 4)) ? true : false;
												matchdata.win = (radiant === match.result['radiant_win']) ? 1 : 0;
												async.forEachOfSeries(global.heroes, function(hero, heroiteration, cb4){
													if (hero.id === player["hero_id"]) {
														matchdata.heroname = hero['localized_name'];
														return cb4(null);
													}else{
														return cb4(null);
													}
												}, cb3);
											}else{
												return cb3();
											}
										}, function(err){
											util.log("Added player specific info for match with id " + value.matchId + ". Now to callback and check if the match is ranked...");
											if(matchdata.isranked === 1){
												readied2 = false;
												util.log("Well, the match with id " + value.matchId + " was ranked, now to run a spoofed Dota client to get the mmr change for the match...");
												var dotaClient2 = new dotaModule.Dota2Client(global.steamcli, false);
												var unready = false;
												dotaClient2.on('ready', function(){
													if(readied2 === true) return;
													readied2 = true;
													response2 = false;
													//unready = false;
													dotaClient2.getMatchHistory(dotaClient2.AccountID, (matchdata.matchid + 1), 1, null, null, null, false, function(rankedResponse){
														if(response2 === true) return;
														response2 = true;
														dotaClient2.exit();
														//dotaClient2.on('unready', function(){
															//if(unready === true) return;
															//unready = true;
															if(rankedResponse.matches){
																util.log("We received the mmr change information for match with id " + value.matchId + ". Now to add the match to the database...");
																var rankedMatch = rankedResponse.matches[0];
																matchdata.solochange = (rankedMatch.soloRank === true) ? 1 : 0;
																matchdata.previousmmr = rankedMatch.previousRank;
																matchdata.mmrchange = rankedMatch.rankChange;
																database.addMatch(matchdata, function(err){
																	if(err){
																		util.log("Error adding match with id " + matchdata.matchid + " to the database. Stopping operations.");
																		return cb2("Error adding match with id " + matchdata.matchid + " to the database. Stopping operations.");
																	}else{
																		util.log("Successfully added match with id " + matchdata.matchid + " to the database.");
																		matchesObtained.push(matchdata);
																		return cb2();
																	}
																});
															}else{
																util.log("Unable to get mmr change information for ranked match with id " + matchdata.matchid + ".");
																return cb2("Unable to get mmr change information for ranked match with id " + matchdata.matchid + ".");
															}
														//});
													});
													//dotaClient2.getMatchHistory(dotaClient2.AccountID, (matchdata.matchid + 1).toString(), 1, null, null, null, false);
												});
												dotaClient2.launch();
											}else{
												util.log("The match with id " + value.matchId + " was not ranked, now to add the match to the database.");
												database.addMatch(matchdata, function(err){
													if(err){
														util.log("Error adding match with id " + matchdata.matchid + " to the database. Stopping operations.");
														return cb2("Error adding match with id " + matchdata.matchid + " to the database. Stopping operations.");
													}else{
														util.log("Successfully added match with id " + matchdata.matchid + " to the database.");
														matchesObtained.push(matchdata);
														return cb2();
													}
												})
											}
										});
									}
								});
							}else{
								util.log(value.matchId + " is a practice match. Skipping...");
								matchesObtained.push({practice: true, matchid: value.matchId});
								return cb2();
							}
						}, function(err){
							if(err){
								util.log("Error received whilst attempting to obtain matches. Stopping operations...");
								return callback(null, matchesObtained);
							}else{
								util.log("Successfully fetched " + matchesObtained.length + " matches and added them to the database");
								return callback(null, matchesObtained);
							}
						});
					});
				}else{
					util.log("We didn't receive any matches. :(");
					return callback("No matches received", null);
				}
			});
			//dotaClient.getMatchHistory(dotaClient.AccountID, startAt, amt, null, null, null, false);
		});
		dotaClient.launch();
	}
	return {
		analyzeAndAddNewMatch: analyzeAndAddNewMatch,
		obtainMatchesAndAdd: obtainMatches
	}
};
