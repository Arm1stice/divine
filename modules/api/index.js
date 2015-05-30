/*
  Api - A custom module meant to interface with the Steam and Dota 2 web apis
  created by Wyatt Calandro specifically for use with Divine

  Copyright (c) 2015 Wyatt Calandro
*/

var steam = require('./steam/index.js');
//var dota2 = require('./dota2/index.js');
var request = require('request');
function test(callback){
  request('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=' + global.psettings.devkey + '&steamid=' + global.username + '&format=json', function(error, response, body){
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
module.exports = {
  test: test,
  getPersonalProfileInfo: steam.getPersonalProfileInfo
};
