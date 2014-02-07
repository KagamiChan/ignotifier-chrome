var $ = (function() {
  var cache = [];
  return function(id) {
    if (cache[id]) {
      return cache[id];
    }
    cache[id] = document.getElementById(id);
    return cache[id];
  }
})();
function IsNumeric(input) {
  return (input - 0) == input && (input + '').replace(/^\s+|\s+$/g, "").length > 0;
}

var period;

function load () {
  $("period").value = chrome.extension.getBackgroundPage().prefs.period / 1000;
  $("resetPeriod").value = chrome.extension.getBackgroundPage().prefs.resetPeriod / (1000 * 60);
  $("initialPeriod").value = chrome.extension.getBackgroundPage().prefs.firstTime / 1000;
  $("feeds").value = chrome.extension.getBackgroundPage().prefs.feeds;
  $("notification").checked = chrome.extension.getBackgroundPage().prefs.notification;
  $("showDetails").checked = chrome.extension.getBackgroundPage().prefs.showDetails;
  $("alert").checked = chrome.extension.getBackgroundPage().prefs.alert;
  $("doReadOnArchive").checked = chrome.extension.getBackgroundPage().prefs.doReadOnArchive;
  $("alphabetic").checked = chrome.extension.getBackgroundPage().prefs.alphabetic;
  $("soundNotification").value = chrome.extension.getBackgroundPage().prefs.soundNotification;
  $("size").value = chrome.extension.getBackgroundPage().prefs.size;
  $("soundVolume").value = chrome.extension.getBackgroundPage().prefs.soundVolume * 100;
}

window.addEventListener("load", function () {
  load ();
  
  var period = function (id, min, e, checkFor) {
    e.preventDefault();
    var value = $(id).value;

    if (!IsNumeric (value) || parseInt(value) < min) {
      $(id).value = min;
      localStorage[id] = min;
    }
    else {
      localStorage[id] = parseInt(value);
    }
  }
  $("period").addEventListener("keyup", function (e) {period("period", 10, e)}, false);
  $("period").addEventListener("change", function (e) {period("period", 10, e)}, false);
  $("initialPeriod").addEventListener("keyup", function (e) {period("initialPeriod", 1, e)}, false);
  $("initialPeriod").addEventListener("change", function (e) {period("initialPeriod", 1, e)}, false);
  $("soundVolume").addEventListener("keyup", function (e) {period("soundVolume", 0, e)}, false);
  $("soundVolume").addEventListener("change", function (e) {period("soundVolume", 0, e)}, false);
  $("resetPeriod").addEventListener("keyup", function (e) {
    period("resetPeriod", 0, e);
    chrome.extension.getBackgroundPage().onResetPeriod();
  }, false);
  $("resetPeriod").addEventListener("change", function (e) {
    period("resetPeriod", 0, e);
    chrome.extension.getBackgroundPage().onResetPeriod();
  }, false);
  
  $("feeds").addEventListener("keyup", function () {
    localStorage['feeds'] = $("feeds").value;
  }, false);
  $("notification").addEventListener("change", function () {
    localStorage['notification'] = $("notification").checked;
  }, false);
  $("showDetails").addEventListener("change", function () {
    localStorage['showDetails'] = $("showDetails").checked;
  }, false);
  $("alert").addEventListener("change", function () {
    localStorage['alert'] = $("alert").checked;
  }, false);
  $("doReadOnArchive").addEventListener("change", function () {
    localStorage['doReadOnArchive'] = $("doReadOnArchive").checked;
  }, false);
  $("alphabetic").addEventListener("change", function () {
    localStorage['alphabetic'] = $("alphabetic").checked;
  }, false);
  $("soundNotification").addEventListener("change", function () {
    var value = $("soundNotification").value;
    localStorage['soundNotification'] = value;
    chrome.extension.getBackgroundPage().play.reset();
  }, false);
  $("size").addEventListener("change", function () {
    var value = $("size").value;
    localStorage['size'] = value;
  }, false);
  $("sound").addEventListener("change", function () {
    var file = $("sound").files[0];
    var reader = new FileReader()
    reader.onload = function(e) {
      localStorage['soundMime'] = file.type;
      localStorage['sound'] = e.target.result;
      chrome.extension.getBackgroundPage().play.reset();
    }
    reader.readAsDataURL(file);
  }, false);
  $("reset").addEventListener("click", function () {
    localStorage['alphabetic']         = false;
    localStorage['alert']              = true;
    localStorage['doReadOnArchive']    = true;
    localStorage['notification']       = true;
    localStorage['period']             = 15;
    localStorage['soundNotification']  = 1;
    localStorage['resetPeriod']        = 0;
    localStorage['initialPeriod']      = 1;
    localStorage['soundVolume']        = 80;
    localStorage['feeds']              = "https://mail.google.com/mail/u/0/feed/atom, https://mail.google.com/mail/u/1/feed/atom, https://mail.google.com/mail/u/2/feed/atom, https://mail.google.com/mail/u/3/feed/atom";
    localStorage['showDetails']        = true;
    localStorage['size']               = 0;

    chrome.extension.getBackgroundPage().play.reset();
    load();
  }, false);

}, false);