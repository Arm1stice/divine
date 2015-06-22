/*
  Database - Obtain match information from an SQLite Database
  Created specifically for use in Divine

  Copyright (c) 2015 Wyatt Calandro

*/

module.exports = function(db){
  function loadMatches(index, callback){
    if(typeof index == "function"){
      db.all("SELECT * FROM matches ORDER BY matchid DESC LIMIT 25", function(err, rows){
        if(err){
          return callback(err, null);
        }
        return callback(null, rows);
      });
    }else{
      db.all("SELECT * FROM matches ORDER BY matchid DESC LIMIT 25 OFFSET ?", index, function(err, rows){
        if(err){
          return callback(err, null);
        }
        return callback(null, rows);
      });
    }
  }
  function getMatchInfo(matchID, callback){
    db.get("SELECT * FROM matches WHERE matchid = ?", matchID, function(err, row){
      if(err){
        return callback(err, null);
      }
      row.gameinfo = JSON.parse(row.info);
      return callback(err, row);
    });
  }
  function addMatch(data, callback){
    db.serialize(function(){
      db.run("INSERT into matches VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", data.matchid, null, data.heroid, data.heroname, data.isranked, data.modeid, data.modename, data.win, data.playerinfo, data.mmrchange, data.previousmmr, data.solochange, data.leaverstatus, data.abandon, function(err){
        if(err){
          return callback(err);
        }else{
          return callback(null);
        }
      });
    });
  }
  return {
    loadMatches: loadMatches,
    getMatchInfo: getMatchInfo,
    addMatch: addMatch
  }
}
