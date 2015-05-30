/*
  Divine - A Personal Dota 2 Stats Aggregator
  reources/js/handleLogin.js

  created by Wyatt Calandro
  Copyright (c) 2015 Wyatt Calandro
*/
//console.log(__dirname);
//var jQuery = require(__dirname + '../jquery-2.1.4.min.js');
var uBox = $("#username");
var passBox = $("#password");
var remBox = $("#remember");
var authCode = $("#authCode");
var login = $("#login");
var form = $("#loginform");
var gif = $("#logingif");
var ipc = require('ipc');
var remote = require('remote');

$.fn.pressEnter = function(fn) {

    return this.each(function() {
        $(this).bind('enterPress', fn);
        $(this).keyup(function(e){
            if(e.keyCode == 13)
            {
              $(this).trigger("enterPress");
            }
        })
    });
 };
uBox.pressEnter(function(){
  login.click();
});
passBox.pressEnter(function(){
  login.click();
})
$('body').on('click', '.btn', function(e){
    e.stopImmediatePropagation();
    $(this).removeClass('active');
});
$("#authshow").click(function(){
  $(this).hide();
  authCode.show();
});
$("#steamexplanation").click(function(){
  ipc.send('showExplanationWindow', null);
});
login.click(function(){
  form.hide();
  gif.show();
  if(uBox.val() == "" || passBox.val() == ""){
    remote.require('dialog').showMessageBox(remote.getCurrentWindow(), {
      type: "warning",
      buttons: ["OK"],
      message: "Username and Password fields are required!",
      title: "Login Error"
    }, function(response){
      passBox.val('');
      authCode.val('');
      gif.hide();
      form.show();
    });
  }else{
    if(authCode.val() === ""){
      ipc.send('login', {
        username: uBox.val(),
        password: passBox.val(),
        authCode: null,
        remember: $("#remember").prop('checked')
      });
    }else{
      ipc.send('login', {
        username: uBox.val(),
        password: passBox.val(),
        authCode: authCode.val(),
        remember: $("#remember").prop('checked')
      });
    }
  }
});

ipc.on('loggedOn', function(obj){
  if(obj.error === false){
    ipc.send('loginSuccessResponseOk', null);
    console.log("We logged on!");
  }else{
    remote.require('dialog').showMessageBox(remote.getCurrentWindow(), {
      type: "warning",
      buttons: ["OK"],
      message: obj.message,
      title: "Login Error"
    }, function(response){
      passBox.val('');
      authCode.val('');
      gif.hide();
      form.show();
      if(obj.message == "SteamGuard Auth Code required. Check your email and try logging in again with your SteamGuard code."){
        $("#authshow").hide();
        authCode.show();
      }
    });
  }
});
