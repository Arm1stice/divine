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
*/

process.on('error', function(err) {
  console.log(err);
});
// Import Steam module and create client
var steam = global.steam =  require("steam");
var steamClient = global.steamcli = new steam.SteamClient();

// Import Dota2 module and hook steam client into it
var dota = require("./modules/dota2/");
var dotaClient = global.dotacli = dota.Dota2Client(steamClient, true);

// Import custom API module
var api = require('./modules/api/')
// Other Imports
global.info = require('./info/information.json');
var fs = require('fs');
var escape = require('escape-html');
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
var menu = require('menu');
var tray = require('tray');
var MenuItem = require('menu-item');
var encryptor = require('./modules/encryption/');
var util = require('./bin/util.js')();
var size;
global.crypt = null;
var baseSettings = {
  isEncrypted: false
};
var basePSettings = {
  twitchUsername: null,
  twitchPassword: null,
  devkey: null
};

// Check to see if
setInterval(function(){
  var windows = browserWin.getAllWindows();
  console.log("Number of window open: " + windows.length);
  if(windows.length === 0){
    if(global.isOpeningAnotherWindow === false){
      app.quit();
    }
  }
}, 15000);

// Application Functionality
app.on('window-all-closed', function(){
  if(global.isOpeningAnotherWindow === false){
    if(global.steamcli.loggedOn === true){
      global.steamcli.logOff();
    }
    app.quit();
  }else{
    global.isOpeningAnotherWindow = false;
  }
  //app.quit();
});

app.on('ready', function(){
  var atomScreen = require('screen');
  size = atomScreen.getPrimaryDisplay().workAreaSize;
  var menuTemplate = [
    {
      label: 'Divine',
      submenu: [
        {
          label: 'Check for new matches',
          click: function(){
            // TODO Actually check for new matches
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit',
          click: function(){
            global.steamcli.logOff();
            app.quit();
          }
        }
      ]
    },
    {
      label: "Edit",
      submenu: [
        {
          label: "Change devkey",
          click: function(){
            global.devKeyWindow = new browserWin({
              width: 700,
              height: 150,
              title: "Steam DevKey",
              resizable: false,
              frame: false
            });
            global.devKeyWindow.loadUrl("file://" + __dirname + "/views/devKeyUpdate.html");
            global.devKeyWindow.webContents.executeJavaScript(("$('#username').val('" + global.psettings.devkey + "');"));
            global.devKeyWindow.on('closed', function(){
              global.devKeyWindow = null;
            });
          }
        }
      ]
    }
  ];
  var matchWindowMenu = menu.buildFromTemplate(menuTemplate);
  menu.setApplicationMenu(matchWindowMenu);
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
    if(global.info.remember === true){
      global.loginWindow.webContents.executeJavaScript(("$('#remember').prop('checked', true);"));
      global.loginWindow.webContents.executeJavaScript(("$('#username').val('" + global.info.username + "');"));
    }
  });
  var trayIcon = new tray("resources/img/divinelogo.png");
  var contextMenu = new menu();
  contextMenu.append(new MenuItem({ label: 'Open Window', click: function() {
    global.encryptionWindow = new browserWin({
      width: 500,
      height: 448,
      title: "Personal Settings Password",
      resizable: false,
      frame: false
    });
    global.encryptionWindow.loadUrl("file://" + __dirname + "/views/encryptSettings.html");
  } }));
  contextMenu.append(new MenuItem({label: "Quit", click: function(){app.quit();}}));
  contextMenu.append(new MenuItem({label: "DevTools", click: function(){global.mainWindow.openDevTools({detach: true})}}));
  contextMenu.append(new MenuItem({label: "Reload", click: function(){global.mainWindow.reload();}}));
  trayIcon.setToolTip('Divine for Dota 2');
  trayIcon.setContextMenu(contextMenu);
});

// Received login request
global.ipc.on('login', steamLogin.login);

// Received request to show login explanation window.
global.ipc.on('showExplanationWindow', function(){
  if(global.steamExplanationWindow !== null) return;
  global.steamExplanationWindow = new browserWin({
    width: 700,
    height: 250,
    title: "Credentials Explanation",
    resizable: false,
    frame: false
  });
  global.steamExplanationWindow.loadUrl("file://" + __dirname + '/views/loginExplanation.html');
  global.steamExplanationWindow.on('closed', function(){
    global.steamExplanationWindow = null;
  });
});

// Received negative confirmation that we want to encrypt PSettings with password.
global.ipc.on('dontEncryptFile', function(){
  global.settings = baseSettings;
  fs.writeFile("settings/" + global.username + "/settings.json", JSON.stringify(global.settings), function(err){
    if(err){
      throw err;
    }else{
      global.psettings = basePSettings;
      fs.writeFile("settings/" + global.username + "/psettings", JSON.stringify(global.psettings), function(err){
        if(err) throw err;
        global.isOpeningAnotherWindow = true;
        global.encryptionWindow.close();
        continueOn();
      });
    }
  });
});

// Received positive confirmation that we want to encrypt with password
global.ipc.on('encryptFileWithPass', function(event, pass){
  global.settings = baseSettings;
  global.settings.isEncrypted = true;
  fs.writeFile("settings/" + global.username + "/settings.json", JSON.stringify(global.settings), function(err){
    if(err){
      throw err;
    }else{
      global.crypt = encryptor(pass);
      global.psettings = basePSettings;
      global.crypt.encrypt(global.psettings, function(result){
        fs.writeFile("settings/" + global.username + "/psettings", result, function(err){
          if(err) throw err;
          global.isOpeningAnotherWindow = true;
          global.encryptionWindow.close();
          continueOn();
        });
      });
    }
  });
});

// Received password from PSettings decryption page.
global.ipc.on('decryptPassword', function(event, pass){
  global.crypt = encryptor(pass);
  fs.readFile("settings/" + global.username + "/psettings", 'utf8', function(err, file){
    if(err) throw err;
    global.crypt.decrypt(file, function(err, result){
      if(err){
        global.encryptionWindow.webContents.send("decryptPasswordError", err);
      }else{
        global.psettings = result;
        global.isOpeningAnotherWindow = true;
        global.encryptionWindow.close();
        global.encryptionWindow.on('closed', function(){
          global.encryptionWindow = null;
        })
        continueOn();
      }
    });
  });
});

// Received confirmnation from the login page that we logged in.
global.ipc.on('loginSuccessResponseOk', function(){
  global.isOpeningAnotherWindow = true;
  global.loginWindow.on('closed', function(){
    global.loginWindow = null;
  });
  global.loginWindow.close();
  isthere("settings/" + global.username + "/settings.json", function(exists){
    if(exists){
      fs.readFile("settings/" + global.username + "/settings.json", function(err, file){
        if(err){
          console.err("Error reading " + global.username + "'s settings!");
          throw err;
        }else{
          global.settings = JSON.parse(file);
          if(global.settings.isEncrypted === true){
            // TODO Open a window asking the user to input their password for their PII
            global.encryptionWindow = new browserWin({
              width: 700,
              height: 150,
              title: "Personal Settings Password",
              resizable: false,
              frame: false
            });
            global.encryptionWindow.loadUrl("file://" + __dirname + "/views/decryptFile.html");
          }else{
            fs.readFile("settings/" + global.username + "/psettings.json", function(err, file){
              if(err){
                console.error("Error reading personal settings file!");
                throw err;
              }else{
                global.psettings = JSON.parse(file);
                continueOn();
              }
            });
          }
        }
      });
    }else{
      fs.mkdir("settings/" + global.username + "/", function(err){
        if(err){
          console.error("Error making path");
        };
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
global.ipc.on('devKey', function(event, key){
  util.updatePSetting('devkey', key, function(err){
    if(err) throw err;
    global.devKeyWindow.close();
    continueOn2();
  });
});

// Received updated devKey
global.ipc.on('devKeyUpdate', function(event, key){
  util.updatePSetting('devkey', key, function(err){
    if(err) throw err;
    global.devKeyWindow.close();
    global.mainWindow.reload();
  });
});

// Check to see if the API Key is set
function continueOn(){
  if(global.psettings.devkey === null){
    global.devKeyWindow = new browserWin({
      width: 700,
      height: 150,
      title: "Steam DevKey",
      resizable: false,
      frame: false
    });
    global.devKeyWindow.loadUrl("file://" + __dirname + "/views/devKey.html");
  }else{
    continueOn2();
  }
}

// Open main match window
var dialog = require('dialog');
function continueOn2(){
  global.mainWindow = new browserWin({
    width: size.width,
    height: size.height,
    title: "Divine",
    resizable: true,
    frame: true
  });
  global.mainWindow.loadUrl("file://" + __dirname + "/views/matchesView.html");
  global.mainWindow.maximize();
}

// Received confirmation of the main page loading
global.ipc.on('matchPageLoaded', function(){
  api.test(function(valid){
    if(valid === false){
      dialog.showMessageBox(global.mainWindow, {
        type: 'warning',
        buttons: ["OK"],
        title: 'Bad DevKey!',
        message: 'The DevKey you provided is not valid, please edit the key through Edit>Edit devkey!'
      }, function(){});
    }else{
      api.getPersonalProfileInfo(function(err, info){
        if(err){
          dialog.showMessageBox(global.mainWindow, {
            type: 'warning',
            buttons: ["OK"],
            title: 'Error',
            message: err
          }, function(response){});
        }else{
          global.mainWindow.webContents.executeJavaScript(("$('#profilepic').attr('src', '" + info.response.players[0].avatarmedium + "');"));
          global.mainWindow.webContents.executeJavaScript(("$('#profilename').text('" + info.response.players[0].personaname + "');"));
        }
      });
    }
  });
});
