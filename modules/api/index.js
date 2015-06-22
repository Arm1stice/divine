/*
  Api - A custom module meant to interface with the Steam and Dota 2 web apis
  created by Wyatt Calandro specifically for use with Divine

  Copyright (c) 2015 Wyatt Calandro
*/

var steam = require('./steam/index.js');
var fs = require("fs");
//var dota2 = require('./dota2/index.js');
var request = require('request');
global.lastapicall = Math.floor((new Date()).getTime() / 1000);
function limit(fn){
  return function(){
    var args = arguments;
    function check(){
      if(Math.floor((new Date()).getTime() / 1000) - global.lastapicall < 1){
        setTimeout(check, 100);
      }else{
        fn.apply(this, args);
        global.lastapicall = Math.floor((new Date()).getTime() / 1000);
      }
    }
    check();
  }
}
function test(callback){
  request('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=' + global.psettings.devkey + '&steamid=' + global.username + '&format=json', function(error, response, body){
    if(response.statusCode == 503){
      return callback("Steam WebAPI unavailable");
    }
    if(error){
      console.log(error);
      return callback(false);
    }else{
      if(body === "<html><head><title>Forbidden</title></head><body><h1>Forbidden</h1>Access is denied. Retrying will not help. Please verify your <pre>key=</pre> parameter.</body></html>"){
        return callback(false);
      }else{
        return callback(true);
      }
    }
  });
}
function getHeroList(callback){
  request('https://api.steampowered.com/IEconDOTA2_570/GetHeroes/v0001/?key=' + global.psettings.devkey + '&language=en_us', function(err, resp, body){
    if(err){
      console.log(err);
      return callback(err);
    }else{
      if(resp.statusCode == 503){
        return callback("Steam WebAPI unavailable");
      }
      if(body === "<html><head><title>Forbidden</title></head><body><h1>Forbidden</h1>Access is denied. Retrying will not help. Please verify your <pre>key=</pre> parameter.</body></html>"){
        return callback("Invalid Dev Key");
      }else{
        fs.writeFile(global.root + '/bin/heroes.json', JSON.stringify(JSON.parse(body).result.heroes), function(err){
          if(err){
            return callback(err);
          }
          global.heroes = JSON.parse(body).result.heroes;
          return callback(null);
        });
      }
    }
  });
};
function getItemList(callback){
  request('https://api.steampowered.com/IEconDOTA2_570/GetGameItems/V001/?key=' + global.psettings.devkey + '&language=en_us', function(err, resp, body){
    if(resp.statusCode == 503){
      return callback("Steam WebAPI unavailable");
    }
    if(err){
      console.log(err);
      return callback(err);
    }else{
      if(body === "<html><head><title>Forbidden</title></head><body><h1>Forbidden</h1>Access is denied. Retrying will not help. Please verify your <pre>key=</pre> parameter.</body></html>"){
        return callback("Invalid Dev Key");
      }else{
        fs.writeFile(global.root + '/bin/items.json', JSON.stringify(JSON.parse(body).result.items), function(err){
          if(err){
            return callback(err);
          }
          global.items = JSON.parse(body).result.items;
          return callback(null);
        });
      }
    }
  });
};
function getMatch(id, callback){
  request('https://api.steampowered.com/IDOTA2Match_570/GetMatchDetails/V001/?match_id=' + id + '&key=' + global.psettings.devkey, function(err, resp, body){
    if(resp.statusCode == 503){
      return callback("Steam WebAPI unavailable", null);
    }
    if(err){
      console.log(err);
      return callback(err);
    }else{
      if(body === "<html><head><title>Forbidden</title></head><body><h1>Forbidden</h1>Access is denied. Retrying will not help. Please verify your <pre>key=</pre> parameter.</body></html>"){
        return callback("Invalid Dev Key", null);
      }else{
        return callback(null, JSON.parse(body));
      }
    }
  });
};
module.exports = {
  test: limit(test),
  getPersonalProfileInfo: limit(steam.getPersonalProfileInfo),
  getHeroList: limit(getHeroList),
  getItemList: limit(getItemList),
  getMatch: limit(getMatch)
};
