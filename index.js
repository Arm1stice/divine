/*
  Divine - A Personal Dota 2 Stats Aggregator
  index.js

  created by Wyatt Calandro
  Copyright (c) 2015 Wyatt Calandro

  NOTES:
  When running package and installing dependencies,
  make sure to change the nan dependency for protbuf
  to be ^1.0.0 so it will build correctly under
  electron-rebuild

  RADIANT PLAYER SLOTS:
  0, 1, 2, 3, 4
  DIRE PLAYER SLOTS:
  128, 129, 130, 131, 132

	ACCOUNT ID FOR PLAYERS WHO DON'T REVEAL MATCH DETAILS:
	4294967295
*/
process.on('error', function(err) {
  console.log(err);
});
global.root = __dirname;
// Import SQLite
var sqlite = require('sqlite3').verbose();
var matchdb = null;
// Import Steam module and create client
var steam = global.steam = require("../steam/");
var steamClient = global.steamcli = new steam.SteamClient();

// Import Dota2 module and hook steam client into it
var dota = require(__dirname + "/../modules/dota2/");
var dotaClient = global.dotacli = new dota.Dota2Client(steamClient, true);

// Import custom API module
var api = require(__dirname + '/../modules/api/');
// Other Imports
global.info = require(global.root + '/../info/information.json');
var dialog = require('dialog');
var fs = require('fs');
var ofs = require('original-fs');
var escape = require('escape-html');
var handlebars = require('handlebars');
global.ipc = require("ipc");
global.events = require('events');
global.isOpeningAnotherWindow = false;
// Electron Stuffs
var app = require("app");
var browserWin = require('browser-window');

// Custom Modules
var sLogin = require('./bin/steamLogin.js');
var isthere = require("is-there");
var steamLogin = new sLogin();
var sEvents = require('./bin/steamEvents.js');
var async = require('async');
var menu = require('menu');
var tray = require('tray');
var MenuItem = require('menu-item');
var encryptor = require(__dirname + '/../modules/encryption/');
var dUtil = require('./bin/util.js')();
var util = require('util');
var child = require("child_process");
var size, database, mAnalyzer;
global.crypt = null;
var baseSettings = {
  isEncrypted: false
};
var basePSettings = {
  twitchUsername: null,
  twitchPassword: null,
  devkey: null
};

setInterval(function() {
  var windows = browserWin.getAllWindows();
  if (windows.length === 0) {
    if (global.isOpeningAnotherWindow === false) {
      app.quit();
    }
  }
}, 15000);

// Application Functionality
app.on('window-all-closed', function() {
  if (global.isOpeningAnotherWindow === false) {
    if (global.steamcli.loggedOn === true) {
      global.steamcli.logOff();
    }
    app.quit();
  } else {
    global.isOpeningAnotherWindow = false;
  }
  //app.quit();
});

function checkUpdaterVersion(callback) {
  // Here we check to see if the user's Divine update version is the newest version
  if (process.env.startedfromupdater !== 1) {
    util.log("Divine was not start from updater. Quitting and starting updater");
    child.spawn(global.root + '/../../../../divine.exe', {
      detached: true
    });
    return setTimeout(function() {
      app.quit();
    }, 2500);
  }
  var latestUpdaterV = "2";
  isthere(global.root + '/../../../updaterversion.json', function(updaterexists) {
    if (updaterexists) {
      var updaterV = require(global.root + "/../../../updaterversion.json");
      if (updaterV.version === latestUpdaterV) {
        return callback();
      } else {
        // We have to copy the newest updater to the directory of the user
        ofs.readFile(global.root + "/updater/app.asar", function(err, updaterfile) {
          if (err) {
            util.log("Failed to read new update file. " + err);
            return callback();
          }
          ofs.writeFile(global.root + '/../../../app.asar', updaterfile, function(err) {
            if (err) {
              util.log("Failed to write new update file. " + err);
              return callback();
            } else {
              updaterV.version = latestUpdaterV;
              ofs.writeFile(global.root + '/../../../updaterversion.json', updaterV, function(err) {
                if (err) {
                  util.log("Error writing new updater version to disk");
                  return callback();
                } else {
                  child.spawn(global.root + '/../../../../divine.exe', {
                    detached: true
                  });
                  setTimeout(function() {
                    app.quit();
                  }, 2500);
                }
              });
            }
          });
        });
      }
    } else {
      // We have to copy the newest updater to the directory of the user
      ofs.readFile(global.root + "/updater/app.asar", function(err, updaterfile) {
        if (err) {
          util.log("Failed to read new update file. " + err);
          return callback();
        }
        ofs.writeFile(global.root + '/../../../app.asar', updaterfile, function(err) {
          if (err) {
            util.log("Failed to write new update file. " + err);
            return callback();
          } else {
            var updaterV = {};
            updaterV.version = latestUpdaterV;
            ofs.writeFile(global.root + '/../../../updaterversion.json', updaterV, function(err) {
              if (err) {
                util.log("Error writing new updater version to disk");
                return callback();
              } else {
                child.spawn(global.root + '/../../../../divine.exe', {
                  detached: true
                });
                setTimeout(function() {
                  app.quit();
                }, 2500);
              }
            });
          }
        });
      });
    }
  });
};
app.on('ready', function() {
  util.log("ROOT DIRECTORY: " + global.root);
  checkUpdaterVersion(, function() {
    var atomScreen = require('screen');
    size = atomScreen.getPrimaryDisplay().workAreaSize;
    var menuTemplate = [{
      label: 'Divine',
      submenu: [{
        label: 'Check for new matches',
        click: function() {
          dialog.showMessageBox(global.mainWindow, {
            type: 'warning',
            buttons: ["OK"],
            title: 'Not Available',
            message: "'Check for new matches' functionality is still being actively developed, and I hope to add the functionality in the next major update. Stay tuned!"
          }, function(response) {});
        }
      }, {
        type: 'separator'
      }, {
        label: 'Quit',
        click: function() {
          global.steamcli.logOff();
          app.quit();
        }
      }]
    }, {
      label: "Edit",
      submenu: [{
        label: "Change devkey",
        click: function() {
          global.devKeyWindow = new browserWin({
            width: 700,
            height: 150,
            title: "Steam DevKey",
            resizable: false,
            frame: false
          });
          global.devKeyWindow.loadUrl("file://" + __dirname + "/views/devKeyUpdate.html");
          global.devKeyWindow.webContents.executeJavaScript(("$('#username').val('" + global.psettings.devkey + "');"));
          global.devKeyWindow.on('closed', function() {
            global.devKeyWindow = null;
          });
        }
      }]
    }, {
      label: "View",
      submenu: [{
        label: "Show DevTools",
        click: function() {
          global.mainWindow.openDevTools({
            detach: false
          });
        }
      }]
    }];
    var matchWindowMenu = menu.buildFromTemplate(menuTemplate);
    menu.setApplicationMenu(matchWindowMenu);
    require('power-monitor').on('suspend', function() {
      if (global.steamcli.loggedOn === true) {
        global.steamcli.logOff();
      }
      app.quit();
    });
    global.loginWindow = new browserWin({
      width: 450,
      height: 500,
      title: "Login",
      resizable: false,
      frame: false
    });
    global.loginWindow.loadUrl("file://" + __dirname + '/views/login.html');
    global.loginWindow.webContents.on('did-finish-load', function() {
      (new sEvents()).registerEvents();
      if (global.info.remember === true) {
        global.loginWindow.webContents.executeJavaScript(("$('#remember').prop('checked', true);"));
        global.loginWindow.webContents.executeJavaScript(("$('#username').val('" + global.info.username + "');"));
      }
    });
  });
});

// Received login request
global.ipc.on('login', steamLogin.login);

// Received request to show login explanation window.
global.ipc.on('showExplanationWindow', function() {
  global.steamExplanationWindow = new browserWin({
    width: 700,
    height: 250,
    title: "Credentials Explanation",
    resizable: false,
    frame: false
  });
  global.steamExplanationWindow.loadUrl("file://" + __dirname + '/views/loginExplanation.html');
  global.steamExplanationWindow.on('closed', function() {
    global.steamExplanationWindow = null;
  });
});

// Received negative confirmation that we want to encrypt PSettings with password.
global.ipc.on('dontEncryptFile', function() {
  global.settings = baseSettings;
  fs.writeFile(global.root + "/../settings/" + global.username + "/settings.json", JSON.stringify(global.settings), function(err) {
    if (err) {
      throw err;
    } else {
      global.psettings = basePSettings;
      fs.writeFile(global.root + "/../settings/" + global.username + "/psettings", JSON.stringify(global.psettings), function(err) {
        if (err) throw err;
        global.isOpeningAnotherWindow = true;
        global.encryptionWindow.close();
        continueOn();
      });
    }
  });
});

// Received positive confirmation that we want to encrypt with password
global.ipc.on('encryptFileWithPass', function(event, pass) {
  global.settings = baseSettings;
  global.settings.isEncrypted = true;
  fs.writeFile(global.root + "/../settings/" + global.username + "/settings.json", JSON.stringify(global.settings), function(err) {
    if (err) {
      throw err;
    } else {
      global.crypt = encryptor(pass);
      global.psettings = basePSettings;
      global.crypt.encrypt(global.psettings, function(result) {
        fs.writeFile(global.root + "/../settings/" + global.username + "/psettings", result, function(err) {
          if (err) throw err;
          global.isOpeningAnotherWindow = true;
          global.encryptionWindow.close();
          continueOn();
        });
      });
    }
  });
});

// Received password from PSettings decryption page.
global.ipc.on('decryptPassword', function(event, pass) {
  global.crypt = encryptor(pass);
  fs.readFile(global.root + "/../settings/" + global.username + "/psettings", 'utf8', function(err, file) {
    if (err) throw err;
    global.crypt.decrypt(file, function(err, result) {
      if (err) {
        global.encryptionWindow.webContents.send("decryptPasswordError", err);
      } else {
        global.psettings = result;
        global.isOpeningAnotherWindow = true;
        global.encryptionWindow.close();
        global.encryptionWindow.on('closed', function() {
          global.encryptionWindow = null;
        })
        continueOn();
      }
    });
  });
});

// Received confirmnation from the login page that we logged in.
global.ipc.on('loginSuccessResponseOk', function() {
  //global.steamcli.setPersonaState(global.steam.EPersonaState.Online);
  //global.accountid = dotaClient.AccountID;
  global.isOpeningAnotherWindow = true;
  global.loginWindow.on('closed', function() {
    global.loginWindow = null;
  });
  global.loginWindow.close();
  isthere(global.root + "/../settings/" + global.username + "/settings.json", function(exists) {
    if (exists) {
      fs.readFile(global.root + "/../settings/" + global.username + "/settings.json", function(err, file) {
        if (err) {
          console.err("Error reading " + global.username + "'s settings!");
          throw err;
        } else {
          global.settings = JSON.parse(file);
          if (global.settings.isEncrypted === true) {
            // TODO Open a window asking the user to input their password for their PII
            global.encryptionWindow = new browserWin({
              width: 700,
              height: 150,
              title: "Personal Settings Password",
              resizable: false,
              frame: false
            });
            global.encryptionWindow.loadUrl("file://" + __dirname + "/views/decryptFile.html");
          } else {
            fs.readFile(global.root + "/../settings/" + global.username + "/psettings", function(err, file) {
              if (err) {
                console.error("Error reading personal settings file!");
                throw err;
              } else {
                global.psettings = JSON.parse(file);
                continueOn();
              }
            });
          }
        }
      });
      matchdb = new sqlite.Database(global.root + "/../settings/" + global.username + "/database.sqlite");
      database = require(__dirname + '/../modules/database/index.js')(matchdb);
      mAnalyzer = require(__dirname + "/../modules/matches/index.js")(matchdb);
    } else {
      fs.mkdir(global.root + "/../settings/" + global.username + "/", function(err) {
        if (err) {
          return console.error("Error making path");
        };
        matchdb = new sqlite.Database(global.root + "/../settings/" + global.username + "/database.sqlite");
        matchdb.serialize(function() {
          matchdb.run("CREATE TABLE matches (matchid INTEGER, info TEXT, heroid INTEGER, heroname TEXT, isranked INTEGER, modeid INTEGER, modename TEXT, win INTEGER, playerinfo TEXT, mmrchange INTEGER, previousmmr INTEGER, solochange INTEGER, leaverstatus INTEGER, abandon INTEGER);");
          matchdb.run("CREATE TABLE mmr (date INTEGER, mmr INTEGER);")
        });
        database = require(__dirname + '/../modules/database/index.js')(matchdb);
        mAnalyzer = require(__dirname + "/../modules/matches/index.js")(matchdb);
      });
      global.encryptionWindow = new browserWin({
        width: 500,
        height: 448,
        title: "Personal Settings Password",
        resizable: false,
        frame: false
      });
      global.encryptionWindow.loadUrl("file://" + __dirname + "/views/encryptSettings.html");
    }
  });
});

// Received new devkey from global.devKeyWindow
global.ipc.on('devKey', function(event, key) {
  dUtil.updatePSetting('devkey', key, function(err) {
    if (err) throw err;
    global.devKeyWindow.close();
    continueOn2();
  });
});

// Received updated devKey
global.ipc.on('devKeyUpdate', function(event, key) {
  dUtil.updatePSetting('devkey', key, function(err) {
    if (err) throw err;
    global.devKeyWindow.close();
    global.mainWindow.reload();
  });
});

// Check to see if the API Key is set
function continueOn() {
  if (global.psettings.devkey === null) {
    global.devKeyWindow = new browserWin({
      width: 700,
      height: 150,
      title: "Steam DevKey",
      resizable: false,
      frame: false
    });
    global.devKeyWindow.loadUrl("file://" + __dirname + "/views/devKey.html");
  } else {
    continueOn2();
  }
}

// Open main match window
function continueOn2() {
  global.mainWindow = new browserWin({
    width: size.width,
    height: size.height,
    title: "Divine",
    resizable: true,
    frame: true,
    "min-height": 768,
    "min-width": 1024
  });

  // Received confirmation of the main page loading
  global.mainWindow.webContents.on('did-finish-load', function() {
    var listIndex = 0;
    console.log("WE GOT A CALL SAYING THE PAGE FINISHED!");
    api.test(function(valid) {
      global.mainWindow.webContents.executeJavaScript(("$('#statusinfo').attr('display', 'none')"));
      global.mainWindow.webContents.executeJavaScript(("$('#statusdanger').removeAttr('display')"));
      global.mainWindow.webContents.executeJavaScript(("$('#sdangertext').text('Invalid DevKey!')"));
      if (valid === false) {
        dialog.showMessageBox(global.mainWindow, {
          type: 'warning',
          buttons: ["OK"],
          title: 'Bad DevKey!',
          message: 'The DevKey you provided is not valid, please edit the key through Edit>Edit devkey!'
        }, function() {});
      } else {
        api.getPersonalProfileInfo(function(err, info) {
          if (err) {
            global.mainWindow.webContents.executeJavaScript(("$('#statusinfo').attr('display', 'none')"));
            global.mainWindow.webContents.executeJavaScript(("$('#statusdanger').removeAttr('display')"));
            global.mainWindow.webContents.executeJavaScript(("$('#sdangertext').text('" + escape(err) + "')"));
            dialog.showMessageBox(global.mainWindow, {
              type: 'warning',
              buttons: ["OK"],
              title: 'Error',
              message: err
            }, function(response) {});
          } else {
            var name = (info.response.players[0].personaname.length > 16) ? info.response.players[0].personaname.substring(0, 13) + "..." : info.response.players[0].personaname;
            global.mainWindow.webContents.executeJavaScript(("$('#profilepic').attr('src', '" + info.response.players[0].avatarmedium + "');"));
            global.mainWindow.webContents.executeJavaScript(("$('#profilename').text('" + escape(name) + "');"));
            global.mainWindow.webContents.executeJavaScript(("$('#sinfotext').text('Updating hero list...')"));
            api.getHeroList(function(err) {
              if (err) {
                global.mainWindow.webContents.executeJavaScript(("$('#statusinfo').attr('display', 'none')"));
                global.mainWindow.webContents.executeJavaScript(("$('#statusdanger').removeAttr('display')"));
                global.mainWindow.webContents.executeJavaScript(("$('#sdangertext').text('" + escape(err) + "')"));
                dialog.showMessageBox(global.mainWindow, {
                  type: 'warning',
                  buttons: ["OK"],
                  title: 'Error',
                  message: err
                }, function(response) {});
              } else {
                global.mainWindow.webContents.executeJavaScript(("$('#sinfotext').text('Updating items...')"));
                api.getItemList(function(err) {
                  if (err) {
                    global.mainWindow.webContents.executeJavaScript(("$('#statusinfo').attr('display', 'none')"));
                    global.mainWindow.webContents.executeJavaScript(("$('#statusdanger').removeAttr('display')"));
                    global.mainWindow.webContents.executeJavaScript(("$('#sdangertext').text('" + escape(err) + "')"));
                    dialog.showMessageBox(global.mainWindow, {
                      type: 'warning',
                      buttons: ["OK"],
                      title: 'Error',
                      message: err
                    }, function(response) {});
                  } else {
                    global.mainWindow.webContents.executeJavaScript(("$('#sinfotext').text('Loading matches...')"));
                    //global.mainWindow.webContents.executeJavaScript("$('#list').empty(); $('#list').html(\"<ul class='matchlist'><ul>\")");
                    var template = handlebars.compile('<li class="{{class}}"><i class="d2mh hero-{{heroid}} matchlisticon"></i><span class="matchnumber">Match {{matchid}}</span></li>');
                    database.loadMatches(listIndex, function(err, matchesLoaded) {
                      if (err) {
                        console.error(err);
                        global.mainWindow.webContents.executeJavaScript(("$('#statusinfo').attr('display', 'none')"));
                        global.mainWindow.webContents.executeJavaScript(("$('#statusdanger').removeAttr('display')"));
                        global.mainWindow.webContents.executeJavaScript(("$('#sdangertext').text('" + escape(err) + "')"));
                      } else {
                        listIndex += matchesLoaded.length;
                        async.forEachOfSeries(matchesLoaded, function(value, num, cb) {
                          var theClass = (matchesLoaded[num].win === 1) ? "win" : "loss";
                          console.log("ADDED: " + matchesLoaded[num].matchid + " to list");
                          if (num === 0) {
                            theClass += ' top';
                          }
                          global.mainWindow.webContents.executeJavaScript("$('#list ul').append('" + template({
                            class: theClass,
                            heroid: matchesLoaded[num].heroid,
                            matchid: matchesLoaded[num].matchid
                          }) + "')");
                          return cb(null);
                        }, function(err) {
                          if (matchesLoaded.length < 25) {
                            var amt = (matchesLoaded.length === 0) ? 25 : (25 - matchesLoaded.length);
                            var newamt = amt;
                            global.mainWindow.webContents.executeJavaScript(("$('#sinfotext').text('Getting ~" + amt + " matches...')"));
                            var matchesObserved = [];
                            //if (amt > 10) amt = 10;
                            do {
                              console.log("WE ARE GOING TO REQUEST " + amt + " matches");
                              async.timesSeries(amt, function(n, next) {
                                var startAtMatchId;
                                if ((matchesLoaded.length === 0) && (n === 0)) {
                                  startAtMatchId = null;
                                } else if ((matchesLoaded.length !== 0) && (n === 0)) {
                                  startAtMatchId = matchesLoaded[matchesLoaded.length - 1].matchid;
                                } else {
                                  startAtMatchId = matchesObserved[matchesObserved.length - 1];
                                }
                                util.log("We are going to start at id " + startAtMatchId);
                                mAnalyzer.obtainMatchesAndAdd(1, startAtMatchId, function(err, obtainedMatches) {
                                  if (err) {
                                    if (err === "notPublic") {
                                      dialog.showMessageBox(global.mainWindow, {
                                        type: 'warning',
                                        buttons: ["OK"],
                                        title: 'Oops!',
                                        message: "It looks like your Dota 2 settings are set to not make your match data public! Divine requires your match data to be public because it gets its data from the WebAPI. You can change this setting through your Dota 2 settings ingame. Divine will now exit."
                                      }, function(response) {
                                        global.mainWindow.close();
                                      });
                                      global.mainWindow.webContents.executeJavaScript(("$('#statusinfo').hide()"));
                                      global.mainWindow.webContents.executeJavaScript(("$('#statussuccess').show()"));
                                      global.mainWindow.webContents.executeJavaScript(("$('#ssuccesstext').html('Done!')"));
                                    } else {
                                      console.error("WELP, we couldn't get the matches! (" + err + ")");
                                      global.mainWindow.webContents.executeJavaScript(("$('#statusinfo').hide()"));
                                      global.mainWindow.webContents.executeJavaScript(("$('#statusdanger').show()"));
                                      global.mainWindow.webContents.executeJavaScript(("$('#sdangertext').html('" + escape(err) + "')"));
                                      return next(err, null);
                                    }
                                  } else if (obtainedMatches.length === 0) {
                                    console.error("WELP, we couldn't get the matches!");
                                    global.mainWindow.webContents.executeJavaScript(("$('#statusinfo').hide()"));
                                    global.mainWindow.webContents.executeJavaScript(("$('#statusdanger').show()"));
                                    global.mainWindow.webContents.executeJavaScript(("$('#sdangertext').html('No matches received')"));
                                    return next("No matches received", null);
                                  } else {
                                    global.mainWindow.webContents.executeJavaScript(("$('#sinfotext').text('Getting ~" + --newamt + " matches...')"));
                                    listIndex += obtainedMatches.length;
                                    matchesObserved.push(obtainedMatches[0].matchid);
                                    async.forEachOfSeries(obtainedMatches, function(value, num2, cb2) {
                                      if (value.practice === true) return cb2(null);
                                      var theClass = (obtainedMatches[num2].win === 1) ? "win" : "loss";
                                      if ((matchesLoaded.length === 0) && (listIndex === 0)) {
                                        theClass += ' top';
                                      }
                                      //console.log("ADDED: " + template({class: theClass, heroid: obtainedMatches[num2].heroid, matchid: obtainedMatches[num2].matchid}));
                                      global.mainWindow.webContents.executeJavaScript("$('#list ul').append('" + template({
                                        class: theClass,
                                        heroid: value.heroid,
                                        matchid: value.matchid
                                      }) + "')");
                                      return cb2(null);
                                    }, function(err) {
                                      console.log("ADDED " + obtainedMatches.length + " matches to database and list");
                                      next(null, obtainedMatches[0]);
                                    });
                                  }
                                });
                              }, function(err) {
                                // Either we added all the matches, there was an error adding one of the matches for some reason, or we didn't receive any matches because there are none left to analyze.
                                if (err) {
                                  util.log("We received an error while getting the matches (" + err + ")");
                                } else {
                                  util.log("We didn't receive an error");
                                }
																if(amt === 0){
																	global.mainWindow.webContents.executeJavaScript(("$('#statusinfo').hide()"));
																	global.mainWindow.webContents.executeJavaScript(("$('#statussuccess').show()"));
																	global.mainWindow.webContents.executeJavaScript(("$('#ssuccesstext').html('Done!')"));
																}
                              });
                            } while (amt !== 0);
                          } else {
                            global.mainWindow.webContents.executeJavaScript(("$('#statusinfo').hide()"));
                            global.mainWindow.webContents.executeJavaScript(("$('#statussuccess').show()"));
                            global.mainWindow.webContents.executeJavaScript(("$('#ssuccesstext').html('Done!')"));
                          }
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
  });
  global.mainWindow.loadUrl("file://" + __dirname + "/views/matchesView.html");
  global.mainWindow.maximize();
}
