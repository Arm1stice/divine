/*
  Api - A custom module meant to interface with the Steam and Dota 2 web apis
  created by Wyatt Calandro specifically for use with Divine

  Copyright (c) 2015 Wyatt Calandro
*/

var https = require('https');
var request = require('request');

// Used to get information about the user's profile
module.exports.getPersonalProfileInfo = function(callback){
  request('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=' + global.psettings.devkey + '&steamids=' + global.username, function(error, response, body){
    if(error && response.statusCode === 403){
      callback(error, null);
    }else{
        if(body === "<html><head><title>Forbidden</title></head><body><h1>Forbidden</h1>Access is denied. Retrying will not help. Please verify your <pre>key=</pre> parameter.</body></html>"){
          callback("The DevKey you provided is not valid, please edit the key through Edit>Edit devkey!", null);
        }else{
          callback(null, JSON.parse(body));
        }
    }
  });
};
