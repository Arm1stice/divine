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


// Import Steam module and create client
var steam = global.steam =  require("steam");
var steamClient = global.steamcli = new steam.SteamClient();

// Import Dota2 module and hook steam client into it
var dota = require("./modules/dota2/");
var dotaClient = global.dotacli = dota.Dota2Client(steamClient, true);

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
var steamLogin = new sLogin();
var sEvents = require('./bin/steamEvents.js');
var menu = require('menu');
var tray = require('tray');
var MenuItem = require('menu-item');
var size;
// Application Functionality

app.on('window-all-closed', function(){
  if(global.isOpeningAnotherWindow === false){
    if(global.steamcli.loggedOn === true){
      global.steamcli.logOff();
    }
    app.quit();
  }
});

app.on('ready', function(){
  var atomScreen = require('screen');
  size = atomScreen.getPrimaryDisplay().workAreaSize;
  //var trayIcon = new tray("resources/img/divinelogo.png");
  //var contextMenu = new menu();
  //contextMenu.append(new MenuItem({ label: 'Quit', click: function() { app.quit(); } }));
  //trayIcon.setToolTip('Divine for Dota 2');
  //trayIcon.setContextMenu(contextMenu);
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
});
var steamExplanationWindow = null;
// IPC Stuffs
global.ipc.on('login', steamLogin.login);
global.ipc.on('showExplanationWindow', function(){
  if(steamExplanationWindow !== null) return;
  steamExplanationWindow = new browserWin({
    width: 700,
    height: 250,
    title: "Credentials Explanation",
    resizable: false,
    frame: false
  });
  steamExplanationWindow.loadUrl("file://" + __dirname + '/views/loginExplanation.html');
  steamExplanationWindow.on('closed', function(){
    steamExplanationWindow = null;
  });
});
global.ipc.on('loginSuccessResponseOk', function(){
  global.isOpeningAnotherWindow = true;
  global.loginWindow.on('closed', function(){
    global.loginWindow = null;
  });
  global.loginWindow.close();
  global.mainWindow = new browserWin({
    width: size.width,
    height: size.height,
    title: "Divine",
    resizable: true,
    frame: true
  });
  global.isOpeningAnotherWindow = false;
  global.mainWindow.loadUrl("file://" + __dirname + "/views/matchesView.html");
  global.mainWindow.maximize();
  if(global.info.devkey === null){
    global.devKeyWindow = new browserWin({
      width: 700,
      height: 150,
      title: "Steam DevKey",
      resizable: false,
      frame: false
    });
    global.devKeyWindow.loadUrl("file://" + __dirname + "/views/devKey.html");
  }
});
// Listen for internprocess events
