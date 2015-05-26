/*
  Divine - A Personal Dota 2 Stats Aggregator
  bin/steamEvents.js

  created by Wyatt Calandro
  Copyright (c) 2015 Wyatt Calandro
*/

var SteamEvents = function(){

};

SteamEvents.prototype.registerEvents = function(){
  global.steamcli.on('loggedOn', function(){
    global.loginWindow.webContents.send('loggedOn', {
      error: false,
      message: null
    });
  });
  global.steamcli.on('sentry', function(hash){
    fs.writeFile(__dirname + '/../info/sentry', hash, function(err){
      if(err){
        return console.error("Error writing sentry hash!");
      }
    });
  });
  global.steamcli.on('error', function(e){
    if(e.cause === 'logonFail'){
      var reason;
      switch(e.eresult.toString()){
        case "5":{
          reason = "Invalid Password!";
          break;
        }
        case "50":{
          reason = "It seems you are already logged in elsewhere!";
          break;
        }
        case "63":{
          reason = "SteamGuard Auth Code required. Check your email and try logging in again with your SteamGuard code.";
          break;
        }
        case "65":{
          reason = "The SteamGuard code you used was incorrect.";
          break;
        }
        default:{
          reason = "Login error!";
        }
      }
      global.loginWindow.webContents.send('loggedOn', {
        error: true,
        message: reason
      });
    }
  });
}

module.exports = SteamEvents;
