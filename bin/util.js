/*
  Divine - A Personal Dota 2 Stats Aggregator
  bin/util.js

  created by Wyatt Calandro
  Copyright (c) 2015 Wyatt Calandro
*/

module.exports = function(){
  function updatePSetting(setting, update, callback){
    global.psettings[setting] = update;
    if(global.settings.isEncrypted === true){
      global.crypt.encrypt(global.psettings, function(result){
        fs.writeFile(global.root + "/../settings/" + global.username + "/psettings", result, function(err){
          if(err){
            callback(err);
          }else{
            callback(null);
          }
        });
      });
    }else{
      fs.writeFile(global.root + "/../settings/" + global.username + "/psettings", JSON.stringify(global.psettings), function(err){
        if(err){
          callback(err);
        }else{
          callback(null);
        }
      });
    }
  }
  return {
    updatePSetting: updatePSetting
  };
}
