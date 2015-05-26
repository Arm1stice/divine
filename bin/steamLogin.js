/*
  Divine - A Personal Dota 2 Stats Aggregator
  bin/steamLogin.js

  created by Wyatt Calandro
  Copyright (c) 2015 Wyatt Calandro
*/

//var information = require('info/information.json');
var fs = require("fs");

var steamerino = function(steamcli){
};

steamerino.prototype.login = function(e, a){
  //var hash = (information.havehash === true) ? fs.readFileSync("../info/sentry") : null;
  fs.readFile(__dirname + '/../info/sentry', function(err, value){
    if(err){
     global.steamcli.logOn({
       accountName: a.username,
       password: a.password,
       authCode: a.authCode,
       shaSentryfile: null
     });
    }else{
     var hash = value;
     global.steamcli.logOn({
       accountName: a.username,
       password: a.password,
       authCode: a.authCode,
       shaSentryfile: value
     });
    }
  });
  if(a.remember === true){
    global.info.remember = true;
    global.info.username = a.username;
    fs.writeFileSync(__dirname + '/../info/information.json', JSON.stringify(global.info));
  }else{
    global.info.remember = false;
    global.info.username = "";
    fs.writeFileSync(__dirname + '/../info/information.json', JSON.stringify(global.info));
  }
};

module.exports = steamerino;
