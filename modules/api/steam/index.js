/*
  Api - A custom module meant to interface with the Steam and Dota 2 web apis
  created by Wyatt Calandro specifically for use with Divine

  Copyright (c) 2015 Wyatt Calandro
*/

var https = require('https');
var request = require('../../../app.asar/node_modules/request/');

// Used to get information about the user's profile
module.exports.getPersonalProfileInfo = function(callback){
  request('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=' + global.psettings.devkey + '&steamids=' + global.username, function(error, response, body){
    if(response.statusCode == 503){
      return callback("Steam WebAPI unavailable");
    }
    if(error){
      return callback(error, null);
    }else{
        if(body === "<html><head><title>Forbidden</title></head><body><h1>Forbidden</h1>Access is denied. Retrying will not help. Please verify your <pre>key=</pre> parameter.</body></html>"){
          callback("The DevKey you provided is not valid, please edit the key through Edit>Edit devkey!", null);
        }else{
          callback(null, JSON.parse(body));
        }
    }
  });
};
