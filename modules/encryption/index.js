/*
  Encryption - Simple Encryption for Strings
  Copyright (c) 2015 Wyatt Calandro
*/
var crypto = require("crypto"), algorithm = 'aes-256-ctr';

module.exports = function(key){
  function encrypt(obj, callback){
    if(typeof obj === 'object' && obj !== null){
      obj = JSON.stringify(obj);
    }
    var cipher = crypto.createCipher(algorithm,key)
    var crypted = cipher.update(obj,'utf8','hex')
    crypted += cipher.final('hex');
    return callback(crypted);
  }
  function decrypt(text, callback){
    var decipher = crypto.createDecipher(algorithm,key);
    var dec;
    var decr;
    try{
      dec = decipher.update(text,'hex','utf8')
      dec += decipher.final('utf8');
      decr = JSON.parse(dec);
      return callback(null, decr);
    }catch(e){
      return callback(e, null);
    }
  }
  return {
    encrypt: encrypt,
    decrypt: decrypt
  };
};
