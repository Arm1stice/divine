var Dota2 = require("../index"),
    fs = require("fs"),
    util = require("util"),
    Schema = require('protobuf').Schema,
    base_gcmessages = new Schema(fs.readFileSync(__dirname + "/../generated/base_gcmessages.desc")),
    gcsdk_gcmessages = new Schema(fs.readFileSync(__dirname + "/../generated/gcsdk_gcmessages.desc")),
    dota_gcmessages_client = new Schema(fs.readFileSync(__dirname + "/../generated/dota_gcmessages_client.desc")),
    protoMask = 0x80000000;

// Methods

Dota2.Dota2Client.prototype.getMatchHistory = function(account_id, start_at_match_id, matches_requested, hero_id, request_id, engine, include_practice, callback) {
  callback = callback || null;

  // Set Some Default Values
  account_id = (account_id) ? account_id : this.AccountID;
  start_at_match_id = (start_at_match_id) ? start_at_match_id : null;
  matches_requested = (matches_requested) ? matches_requested : 10;
  hero_id = (hero_id) ? hero_id : null;
  request_id = (request_id) ? request_id : null;
  // I have no idea what the fuck this engine is (Source engine version?), but apparently there is a default that is set if the value is null so whatever \_(^_^)_/
  engine = (engine) ? engine : null;
  include_practice = (include_practice) ? include_practice : true;


  /* Sends a message to the Game Coordinator requesting either the specified account_id's matches or our own in none is provided.
     Listen for `matchHistoryResponse` event for the Game Coordinator's response. */

  if (!this._gcReady) {
    if (this.debug) util.log("GC not ready, please listen for the 'ready' event.");
    return null;
  }

  if (this.debug) util.log("Requesting match history for id " + account_id);
  var payload = dota_gcmessages_client.CMsgDOTAGetPlayerMatchHistory.serialize({
    accountId: account_id,
    startAtMatchId: start_at_match_id,
    matchesRequested: matches_requested,
    heroId: hero_id,
    requestId: request_id,
    engine: engine,
    includePracticeMatches: include_practice
  });

  this._client.toGC(this._appid, (Dota2.EDOTAGCMsg.k_EMsgDOTAGetPlayerMatchHistory | protoMask), payload, callback);
};


// Handlers

var handlers = Dota2.Dota2Client.prototype._handlers;

handlers[Dota2.EDOTAGCMsg.k_EMsgDOTAGetPlayerMatchHistoryResponse] = function onMatchHistoryResponse(message, callback) {
  callback = callback || null;
  var response = dota_gcmessages_client.CMsgDOTAGetPlayerMatchHistoryResponse.parse(message);
  this.emit("matchHistoryResponse", response);
  if (callback) callback(response);
  if(response.matches){
    //util.log("Received matches from GC!");
  }else{
    //util.log("Received no matches from GC");
  }
};
