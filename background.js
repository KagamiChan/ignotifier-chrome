var tm, resetTm, unreadObjs = [], loggedins  = [];

/** Compatibility set **/
var prefs = {
  get feeds () {
    if (!localStorage['feeds']) {
      localStorage['feeds'] = "https://mail.google.com/mail/u/0/feed/atom, https://mail.google.com/mail/u/1/feed/atom, https://mail.google.com/mail/u/2/feed/atom, https://mail.google.com/mail/u/3/feed/atom";
    }
    return localStorage['feeds'];  
  },
  set feeds (val) {localStorage['feeds'] = val},
  get period () {
    if (!localStorage['period']) {
      localStorage['period'] = "15";
    }
    var tmp = parseInt(localStorage['period']);
    return (tmp > 10 ? tmp : 10) * 1000;
  },
  set period (val) {
    localStorage['period'] = val
  },
  get resetPeriod () {
    if (!localStorage['resetPeriod']) {
      localStorage['resetPeriod'] = "0";
    }
    var tmp = parseInt(localStorage['resetPeriod']);
    if (!tmp) {
      return 0;
    }
    return (tmp > 1 ? tmp : 1) * 1000 * 60;
  },
  get firstTime () {
    if (!localStorage['initialPeriod']) {
      localStorage['initialPeriod'] = "1";
    }
    var tmp = parseInt(localStorage['initialPeriod']);
    return (tmp > 1 ? tmp : 1) * 1000;
  },
  get soundVolume () {
    if (!localStorage['soundVolume']) {
      localStorage['soundVolume'] = "80";
    }
    var tmp = parseInt(localStorage['soundVolume']);
    return (tmp >= 0 && tmp <= 100 ? tmp : 80) / 100;
  },
  get alphabetic () {
    return localStorage['alphabetic'] == "true" ? true : false
  },
  set alphabetic (val) {localStorage['alphabetic'] = val},
  get notification () {
    if (!localStorage['notification']) {
      localStorage['notification'] = "true";
    }
    return localStorage['notification'] == "true" ? true : false
  },
  set notification (val) {localStorage['notification'] = val},
  get desktopNotification () {
    if (!localStorage['desktopNotification']) {
      localStorage['desktopNotification'] = "3";
    }
    var tmp = parseInt(localStorage['desktopNotification']);
    return (tmp > 3 ? tmp : 3) * 1000;
  },  
  get alert () {
    if (!localStorage['alert']) {
      localStorage['alert'] = "true";
    }
    return localStorage['alert'] == "true" ? true : false;
  },
  set alert (val) {localStorage['alert'] = val},
  get doReadOnArchive () {
    if (!localStorage['doReadOnArchive']) {
      localStorage['doReadOnArchive'] = "true";
    }
    return localStorage['doReadOnArchive'] == "true" ? true : false;
  },
  set doReadOnArchive (val) {localStorage['doReadOnArchive'] = val},
  get soundNotification () {
    if (!localStorage['soundNotification']) {
      localStorage['soundNotification'] = "1";
    }
    return localStorage['soundNotification'];
  },
  get showDetails () {
    if (!localStorage['showDetails']) {
      localStorage['showDetails'] = "true";
    }
    return localStorage['showDetails'] == "true" ? true : false;
  },
  set showDetails (val) {localStorage['showDetails'] = val},
  get size () {
    if (!localStorage['size']) {
      localStorage['size'] = "0";
    }
    return localStorage['size'];
  },
  set size (val) {localStorage['size'] = val}
}
var _ = chrome.i18n.getMessage, timer = window, contentCache = [];
/** Internal configurations **/
var config = {
  //Gmail
  email: {
    url: "https://mail.google.com/mail/u/0",
    FEEDS: "https://mail.google.com/mail/u/0/feed/atom," + 
      "https://mail.google.com/mail/u/1/feed/atom," + 
      "https://mail.google.com/mail/u/2/feed/atom," + 
      "https://mail.google.com/mail/u/3/feed/atom",
    get feeds() {
      //server implementation only supports atom feeds
      var temp = (prefs.feeds.replace(/rss20/g, "atom10") || FEEDS).split(",");
      //Check Feed formats
      temp.forEach(function (feed, index) {
        temp[index] = feed.replace(/^\s\s*/, '').replace(/\s\s*$/, '')
      });
      return temp;
    },
    maxCount: 20
  },
  //Toolbar
  defaultTooltip: _("gmail") + "\n\n" + _("tooltip")
};

/** URL parser **/
function url_parse (url) {
  var temp = /^(http.*):\/\/w{0,3}\.*([^\#\?]*)[^\#]*#*([^\/]*)/.exec(url.replace("gmail", "mail.google"));
  var temp2 =  /message_id\=([^&]*)|\#[^\/]*\/([^&]*)/.exec(url);
  return {
    protocol: temp && temp[1] ? temp[1] : "https",
    base: temp && temp[2] ? temp[2].replace(/\/$/, '') : config.email.url,
    label: temp && temp[3] ? temp[3] : "inbox",
    id: temp2 && (temp2[1] || temp2[2]) ? temp2[1] || temp2[2] : ""
  }
}

/** curl **/
function curl (url, callback, pointer) {
  var req = new XMLHttpRequest(); 
  req.open('GET', url, true);
  req.onreadystatechange = function () {
    if (req.readyState == 4) {
      if (callback) callback.apply(pointer, [req]);
    }
  };
  req.send(null);
}

/** Open new Tab or reuse old tabs to open the url **/
function open (url, inBackground) {
  var parse2 = url_parse(url);
  
  chrome.tabs.getSelected(null, function(tab) {
    var activeTab = tab;
    chrome.tabs.getAllInWindow(null, function(tabs) {
      for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        if (tab.url == url) {
          notify(_("gmail"), _("msg8"));
          return;
        }
        var parse1 = url_parse(tab.url);
        if (parse1.base == parse2.base && !/to\=/.test(url)) {
          var reload = parse2.id && tab.url.indexOf(parse2.id) == -1;
          if (tab.url == activeTab.url && !reload) {
            notify(_("gmail"), _("msg8"));
          }
          else if (tab.url == activeTab.url && reload) {
            chrome.tabs.update(null, {url: url}, null);
          }
          if (tab.url != activeTab.url) {
            chrome.tabs.update(tab.id, {active: true});
            if (reload) {
              chrome.tabs.update(null, {url: url}, null);
            }
          }
          return;
        }
      }
      chrome.tabs.create({
        url: url, 
        active: inBackground ? inBackground : true
      });
    });
  });
}

/** onCommand **/
chrome.browserAction.onClicked.addListener(function(tab) {
  if (!unreadObjs.length) {
    open(config.email.url);
  }
});
/** Popup lisstener **/
chrome[chrome.runtime && chrome.runtime.onMessage ? "runtime" : "extension"].onMessage.addListener(function(request, sender, callback) {
  switch (request.cmd) {
    case "rc_%5Ei":
    case "tr":
    case "sp":
    case "rd":
    case "rd-all":
      action(request.link, request.cmd, function (bol, err) {
        callback(request.cmd);
        tm.reset();
        if (!bol) {
          notify(_("gmail"), err);
        }
      });
      break;
    case "decrease_mails":
      //decrease the number of mails
      unreadObjs[request.iIndex].entries.splice(request.jIndex, 1);
      unreadObjs[request.iIndex].count -= 1;

      var total = 0;
      unreadObjs.forEach(function (e, i) {
        total += e.count;
      });

      if (total > 0) {
        icon(total, "red");
      }
      else {
        icon(total, "gray");
      }
      break;
    default:
      console.log("Unknown request: " + request.cmd);
  }
  return true;
});

/** icon designer**/
var icon = (function () {
  var i = 0, t;
  
  var canvas = document.createElement('canvas');
  var context = canvas.getContext('2d');
  var base_image = new Image();
  base_image.src = 'toolbar.png';
  base_image.onload = function() {
    context.drawImage(base_image, 0, 0);
  }

  return function (number, clr) {
    chrome.browserAction.setBadgeText({text: (number ? number : "") + ""})
    var imageData;
    if (clr == "load") {
      if (t) window.clearTimeout(t);
      t = timer.setTimeout(function () {
        if (i == 0) {
          imageData = context.getImageData(0, 0, 19, 19);
        }
        else if (i == 1) {
          imageData = context.getImageData(19, 0, 19, 19);
        }
        else if (i == 2) {
          imageData = context.getImageData(38, 0, 19, 19);
        }
        else if (i == 3) {
          imageData = context.getImageData(57, 0, 19, 19);
        }
        else {
          imageData = context.getImageData(76, 0, 19, 19);
        }
        chrome.browserAction.setIcon({
          imageData: imageData
        });
        i += 1;
        i = i % 5;
        icon(number, "load");
      }, 200);
    }
    else if (clr == "new") {
      if (t) window.clearTimeout(t);
      t = timer.setTimeout(function () {
        chrome.browserAction.setIcon({
          imageData: context.getImageData(i % 2 ? 114 : 152, 0, 19, 19)
        });
        if (i < 7) {
          i += 1;
          icon(number, "new");
        }
        else {
          i = 0;
        }
      }, 300);
    }
    else {
      i = 0;
      if (t) window.clearTimeout(t);
      if (clr == "blue") {
        imageData = context.getImageData(95, 0, 19, 19);
      }
      else if (clr == "red") {
        imageData = context.getImageData(114, 0, 19, 19);
      }
      else {
        imageData = context.getImageData(133, 0, 19, 19);
      };
      chrome.browserAction.setIcon({
        imageData: imageData
      });
    }
  }
})();

/** Interval manager **/
var manager = function (once, period, func) {
  var _timer, first = true;
  function run (once, period, param) {
    _timer = timer.setTimeout(function () {
      func(first ? param : null);
      first = false;
      run(once, period);
    }, first ? prefs[once] : prefs[period]); 
  }
  run(once, period);
  
  return {
    reset: function (forced) {
      timer.clearTimeout(_timer);
      first = true;
      run(0, period, forced);
    },
    stop: function () {
      timer.clearTimeout(_timer);
      first = true; 
    }
  }
};

/** Reset timer to remind user for unread emails **/
var reset = function () {
  tm.reset(true);
}

/** on prefs.reset **/
onResetPeriod = (function () {
  var _timer;
  return function () {
    if (_timer) timer.clearTimeout(_timer);
    _timer = timer.setTimeout(function () {
      if (prefs.resetPeriod) {
        if (resetTm) {
          resetTm.reset();
        }
        else {
          resetTm = new manager ("resetPeriod", "resetPeriod", reset);
        }
      }
      else {
        resetTm.stop();
      }
    }, 10000);  // No notification during the setting change
  }
})();

/** Server **/
var server = {
  parse: function (req, feed) {
    var xml;
    if (req.responseXML) {
      xml = req.responseXML;
    }
    else {
      if (!req.responseText) return;
      
      var parser = new DOMParser();
      xml = parser.parseFromString(req.responseText, "text/xml");
    }
    //Sometimes id is wrong in the feed structure!
    function fixID (link) {
      var id = /u\/\d/.exec(feed);  
      if (id.length) {
        return link.replace(/u\/\d/, id[0]);
      };
      return link;
    } 
    return {
      get fullcount () {
        var temp = 0;
        var tags = xml.getElementsByTagName("fullcount");
        var entries = xml.getElementsByTagName("entry");
        try {
          var temp = (tags && tags.length) ? parseInt(tags[0].textContent) : 0;
          temp = Math.max(temp, (entries && entries.length) ? entries.length : 0);
        } catch(e) {}
        return temp;
      },
      get title () {
        var temp = "";
        try {
          temp = xml.getElementsByTagName("title")[0].childNodes[0].nodeValue;
          temp = temp.match(/[^ ]+@.+\.[^ ]+/)[0];
        } catch(e) {}
        return temp;
      },
      get label () {
        var label = "";
        try {
          var tagline = xml.getElementsByTagName("tagline")[0].childNodes[0].nodeValue;
          if (tagline) {
            var match = tagline.match(/\'(.*)\' label/);
            if (match.length == 2) {
              label = match[1];
            }
          }
        } catch(e) {}
        return label;
      },
      get link () {
        var temp = config.email.url,
            label;
        try {
          temp = xml.getElementsByTagName("link")[0].getAttribute("href").replace("http://", "https://");
          temp = fixID (temp);
          label = this.label;
          if (label) {
            temp += "/?shva=1#label/" + label;
          }
        } catch(e) {}
        return temp;
      },
      get authorized () {
        var temp = "";
        try {
          temp = xml.getElementsByTagName("TITLE")[0].childNodes[0].nodeValue;
        } catch(e){}
        return temp;
      },
      get entries () {
        var tmp = Array.prototype.slice.call( xml.getElementsByTagName("entry") );
        function toObj (entry) {
          return {
            get title () {
              return entry.getElementsByTagName("title")[0].textContent;
            },
            get summary () {
              return entry.getElementsByTagName("summary")[0].textContent;
            },
            get modified () {
              return entry.getElementsByTagName("modified")[0].textContent;
            },
            get issued () {
              return entry.getElementsByTagName("issued")[0].textContent;
            },
            get author_name () {
              return entry.getElementsByTagName("author")[0]
                .getElementsByTagName("name")[0].textContent;
            },
            get author_email () {
              return entry.getElementsByTagName("author")[0]
                .getElementsByTagName("email")[0].textContent;
            },
            get id () {
              return entry.getElementsByTagName("id")[0].textContent;
            },
            get link () {
              var temp = entry.getElementsByTagName("link")[0].getAttribute("href").replace("http://", "https://");
              temp = fixID (temp);
              return temp;
            }
          }
        }
        var rtn = [];
        tmp.forEach(function (entry) {
          rtn.push(new toObj(entry));
        });
        
        return rtn;
      }
    }
  },
  /* check gmail
   * feed: feed url
   * callback: callback function [xml, count, color, [title, text]]
   * pointer: callback this pointer
   */
  mCheck: function (feed, callback, pointer) {
    var state = false,
        msgs = [],
        oldCount = 0; //For more than 20 unreads
    /*
     * forced: is this a forced check?
     * isRecent: did user recently receive a notification?
     */
    return function (forced, isRecent) {
      //Check state
      if (state && !forced) {
        return;
      }
      //Initializing
      state = true;

      curl(feed, function (req) {
        if (!req) return;
        var xml = new server.parse(req, feed);
        
        var count = 0;
        var normal = false; //not logged-in but normal response from gmail
        var newUnread = false, newText;
        var exist = (req.status == 200 || req.status == 500);  //Gmail account is logged-in
        if (exist) {
          count = xml.fullcount;
          if (oldCount > config.email.maxCount || count > config.email.maxCount) {
            newUnread = (count > oldCount)
          }
          else {
            xml.entries.forEach(function (entry, i) {
              if (msgs.indexOf(entry.id) == -1) {
                newUnread = true;
                newText = _("msg10") + " " + entry.author_name + "\n" + _("msg11") + " " + entry.title + "\n"; // + _("msg12") + " " + entry.summary;
              }
            });
          }
          oldCount = count;
          msgs = [];
          xml.entries.forEach(function (entry, i) {
            msgs.push(entry.id);
          });
        }
        else {
          msgs = [];
          oldCount = 0;
        }

        if (!exist && req.responseText && xml.authorized == "Unauthorized") {
          normal = true;
        }
        state = false;
        
        //Gmail logged-in && has count && new count && forced
        if (exist && count && newUnread && forced) {
                                              /* xml, count, showAlert, color, message */
          if (callback) callback.apply(pointer, [xml, count, true, "red", [xml.title, count, newText]])
          return;
        }
        //Gmail logged-in && has count && new count && no force
        if (exist && count && newUnread && !forced) {
          if (callback) callback.apply(pointer, [xml, count, true, "red", [xml.title, count, newText]])
          return;
        }
        //Gmail logged-in && has count && old count && forced
        if (exist && count && !newUnread && forced) {
          if (callback) callback.apply(pointer, [xml, count, true, "red", [xml.title, count]])
          return;
        }
        //Gmail logged-in && has count && old count && no forces
        if (exist && count && !newUnread && !forced) {
          if (callback) callback.apply(pointer, [xml, count, false, "red", [xml.title, count]])
          return;
        }
        //Gmail logged-in && has no-count && new count && forced
        if (exist && !count && newUnread && forced) {
          if (callback) callback.apply(pointer, [xml, 0, false, "gray"])
          return;
        }
        //Gmail logged-in && has no-count && new count && no force
        if (exist && !count && !newUnread && !forced) {
          if (callback) callback.apply(pointer, [xml, 0, false, "gray"])
          return;
        }
        //Gmail logged-in && has no-count && old count && forced
        if (exist && !count && !newUnread && forced) {
          if (callback) callback.apply(pointer, [xml, 0, false, "gray"])
          return;
        }
        //Gmail logged-in && has no-count && old count && no forced
        if (exist && !count && !newUnread && !forced) {
          if (callback) callback.apply(pointer, [xml, 0, false, "gray"])
          return;
        }
        //Gmail not logged-in && no error && forced
        if (!exist && normal && forced) {
          if (!isRecent) open(config.email.url);
          
          if (callback) callback.apply(pointer, [xml, null, false, "unknown", 
            isRecent ? null : ["", _("msg1")]]);
          return;
        }
        //Gmail not logged-in && no error && no force
        if (!exist && normal && !forced) {
          if (callback) callback.apply(pointer, [xml, null, false, "unknown"])
          return;
        }
        //Gmail not logged-in && error && forced
        if (!exist && !normal && forced) {
          if (callback) callback.apply(pointer, [xml, null, false, "unknown", 
          isRecent ? null : [_("error") + ": ", _("msg2")]]);
          return;
        }
        //Gmail not logged-in && error && no force
        if (!exist && !normal && !forced) {
          if (callback) callback.apply(pointer, [xml, null, false, "unknown"])
          return;
        }
      });
    }
  }
}

/** checkAllMails **/
var checkAllMails = (function () {
  var len = config.email.feeds.length,
      pushCount,
      isForced,
      results = [],
      gClients = [];
  config.email.feeds.forEach(function (feed, index) {
    gClients[index] = new server.mCheck(feed, step1);
  });
  
  function step1(xml, count, alert, color, msgObj) {
    results.push({xml: xml, count: count, alert: alert, color: color, msgObj: msgObj});
    
    pushCount -= 1;
    if (!pushCount) step2();
  }
  function step2 () {
    //clear old feeds
    unreadObjs = [];
    loggedins  = [];
    //Notifications
    var text = "", tooltiptext = "", total = 0;
    var showAlert = false;
    //Sort accounts
    results.sort(function(a,b) {
      var var1, var2;
      if (prefs.alphabetic) {
        var1 = a.xml.title;
        var2 = b.xml.title;
      }
      else {
        var1 = a.xml.link;
        var2 = b.xml.link;
      }
      
      if (var1 > var2) return 1;
      if (var1 < var2) return -1;
      return 0;
    });
    //Execute
    var singleLink = null;
    results.forEach(function (r, i) {
      //
      if (r.msgObj) {
        if (typeof(r.msgObj[1]) == "number") {
          var label = r.xml.label;
          var msg = r.msgObj[0] + (label ? "/" + label : "") + " (" + r.msgObj[1] + ")";
          var msg =
            r.msgObj[0] + (label ? "/" + label : "") + 
            " (" + r.msgObj[1] + ")" +
            (r.msgObj[2] && prefs.showDetails ? "\n" + r.msgObj[2] : "");
          if (r.alert) {
            text += (text ? " \n " : "") + msg;
            if (singleLink === null) {
              singleLink = r.xml.link;
            }
          }
          tooltiptext += (tooltiptext ? "\n" : "") + msg;
          total += r.msgObj[1];
          unreadObjs.push({
            link: r.xml.link, 
            count: r.msgObj[1],
            account: r.msgObj[0] + (label ? " [" + label + "]" : label),
            entries: r.xml.entries
            });
        }
        else {
          text += (text ? " - " : "") + r.msgObj[0] + " " + r.msgObj[1];
        }
      }
      showAlert = showAlert || r.alert;
      //Menuitems
      if (r.count !== null) {
        loggedins.push({label: r.xml.title, link: r.xml.link});
      }
    });
    if (prefs.notification && (isForced || showAlert) && text) {
      notify(_("gmail"), text, singleLink);
    }
    
    if (prefs.alert && showAlert && text) {
      play.now();
    }
    //Tooltiptext
    chrome.browserAction.setTitle({
      title: tooltiptext ? tooltiptext : config.defaultTooltip
    });
    //Icon
    var isRed = false,
        isGray = false;
    results.forEach(function (r, i) {
      if (r.color == "red") isRed = true;
      if (r.color == "gray") isGray = true;
    });

    if (isRed) {
      icon(total, (isForced || showAlert) ? "new" : "red");
    }
    else if (isGray)       icon(null,  "gray");
    if (!isRed && !isGray) icon(null,  "blue");
    //Update panel if it is open
    var popupWindows = chrome.extension.getViews({type:'popup'});
    if (popupWindows.length) {
      if (unreadObjs.length) {
        popupWindows[0].tools.onCommand();
      }
      else {
        popupWindows[0].close();
      }
    }
    chrome.browserAction.setPopup({popup: unreadObjs.length ? "popup/popup.html" : ""});
  }

  return function (forced) {
    if (forced) icon(null, "load");
  
    pushCount = len;
    results = [];
    isForced = forced;
    gClients.forEach(function(gClient, index) {
      gClient(forced, index ? true : false)
    });
  }
})();

/**
 * Send archive, mark as read, mark as unread, and trash commands to Gmail server
 * @param {String} link, xml.link address
 * @param {String} cmd: rd, ur, rc_%5Ei, tr, sp
 * @param {Function} callback, callback function. True for successful action
 * @return {Object} pointer, callback apply object.
 */
var action = (function () {
  function getAt_2 (url, callback, pointer) {
    new curl(url + "h/" + Math.ceil(1000000 * Math.random()), function (req) {
      if (!req) return;
      if(req.status == 200) {
        var tmp = /at\=([^\"\&]*)/.exec(req.responseText);
        if (callback) callback.apply(pointer, [tmp && tmp.length > 1 ? tmp[1] : null]);
      }
      else {
        if (callback) callback.apply(pointer, [null]);
      }
    });
  }
  function getAt (url, callback, pointer) {
    new curl(url, function (req) {
      if(req.status == 200) {
        var tmp = /GM_ACTION_TOKEN\=\"([^\"]*)\"/.exec(req.responseText);
        if (tmp && tmp.length) {
          if (callback) callback.call(pointer, tmp[1]);
        }
        else {
          getAt_2(url, callback, pointer);
        }
      }
      else {
        if (callback) callback.apply(pointer, [null]);
      }
    });
  }
  function sendCmd (url, at, threads, cmd, callback, pointer) {
    if (cmd == "rc_%5Ei" && prefs.doReadOnArchive) {
      sendCmd(url, at, threads, "rd");
    }
    var u = url + "?at=" + at + "&act=" + cmd.replace("rd-all", "rd");
    u += "&t=" + threads.join("&t=");
    new curl(u, function (req) {
      if (!req) return;
      if(req.status == 200) {
        if (callback) callback.apply(pointer, [true]);
      }
      else {
        if (callback) callback.apply(pointer, [false]);
      }
    });
  }
  
  return function (links, cmd, callback, pointer) {
    if (typeof(links) == "string") {
      links = [links];
    }

    var url = /[^\?]*/.exec(links[0])[0] + "/";
    
    getAt(url, function (at) {
      if (at) {
        var threads = [];
        links.forEach(function (link) {
          var thread = /message\_id\=([^\&]*)/.exec(link);
          if (thread && thread.length) {
            threads.push(thread[1]);
          }
        });
        if (threads.length) {
          sendCmd(url, at, threads, cmd, function () {
            if (callback) callback.apply(pointer, [true]);
          });
        }
        else {
          if (callback) callback.apply(pointer, [false, "Error at resolving thread"]);
        }
      }
      else {
        if (callback) callback.apply(pointer, [false, "Error at fetching 'at'"]); 
      }
    });
  }
})();

/** Get mail body **/
function getPlainText(node) {
  var normalize = function(a){
    if(!a) return "";
    return a
      .replace(/ +/g, " ")
      .replace(/[\t]+/gm, "")
      .replace(/[ ]+$/gm, "")
      .replace(/^[ ]+/gm, "")
      .replace(/\n{2,}/g, "\n\n")
      .replace(/\n+$/, "")
      .replace(/^\n+/, "")
      .replace(/\nNEWLINE\n/g, "\n\n")
      .replace(/NEWLINE\n/g, "\n\n")
      .replace(/NEWLINE/g, "\n");
  }
  var removeWhiteSpace = function(node){
    var isWhite = function(node) {
      return !(/[^\t\n\r ]/.test(node.nodeValue));
    }
    var ws = [];
    var findWhite = function(node){
      for (var i = 0; i < node.childNodes.length; i++){
        var n = node.childNodes[i];
        if (n.nodeType == 3 && isWhite(n)){
          ws.push(n)
        }else if(n.hasChildNodes()){
          findWhite(n);
        }
      }
    }
    findWhite(node);
    for(var i=0; i< ws.length; i++) {
      ws[i].parentNode.removeChild(ws[i])
    }
  }
  var sty = function(n, prop) {
    var s = n.currentStyle || window.getComputedStyle(n, null);
    if(n.tagName == "SCRIPT") return "none";
    if(!s[prop]) return "LI,P,TR".indexOf(n.tagName) > -1 ? "block" : n.style[prop];
    if(s[prop] =="block" && n.tagName=="TD") return "feaux-inline";
    return s[prop];
  }

  var blockTypeNodes = "table-row,block,list-item";
  var isBlock = function(n){
    var s = sty(n, "display") || "feaux-inline";
    if(blockTypeNodes.indexOf(s) > -1) return true;
    return false;
  }
  var recurse = function(n){
    if(/pre/.test(sty(n, "whiteSpace"))) {
      t += n.innerHTML
        .replace(/\t/g, " ")
        .replace(/\n/g, " ");
      return "";
    }
    var s = sty(n, "display");
    if(s == "none") return "";
    var gap = isBlock(n) ? "\n" : " ";
    t += gap;
    for (var i=0; i<n.childNodes.length;i++) {
      var c = n.childNodes[i];
      if (c.localName == "a" && c.href && c.textContent) {
        t += "<a href='" + c.href + "'>" + c.textContent + "</a>";
      }
      else if (c.nodeType == 3) {
        t += c.nodeValue;
      }
      else if(c.childNodes.length) {
        recurse(c);
      }
    }
    t += gap;
    return t;
  }
  node = node.cloneNode(true);
  node.innerHTML = node.innerHTML.replace(/<br>/g, "\n");
  var paras = node.getElementsByTagName("p");
  for(var i=0; i<paras.length;i++){
    paras[i].innerHTML += "NEWLINE";
  }
  var t = "";
  removeWhiteSpace(node);
  return normalize(recurse(node))
    .replace(/^\s\s*/, '').replace(/\s\s*$/, '')
    .replace(/\n\s{2,}\n/g, '\n\n');
}

var getBody = (function () {
  function getIK (url, callback, pointer) {
    new curl(url, function (req) {
      var tmp = /var GLOBALS\=\[(?:([^\,]*)\,){10}/.exec(req.responseText || "");
      if (callback) {
        callback.apply(pointer, [tmp && tmp.length > 1 ? tmp[1].replace(/[\"\']/g, "") : null]);
      }
    });
  }
  
  return function (link, callback, pointer) {
    link = link.replace("http://", "https://");
    var url = /[^\?]*/.exec(link)[0] + "/";
    var thread = /message\_id\=([^\&]*)/.exec(link);
    if (thread.length > 1) {
      getIK(url, function (ik) {
        if (!ik) {
          if (callback) callback.apply(pointer, ["Error at resolving user's static ID"]);
          return;
        }
        new curl(url + "?ui=2&ik=" + ik + "&view=pt&search=all&th=" + thread[1], function (req) {
          var parser = new DOMParser();
          var html = parser.parseFromString(req.responseText, "text/html");
          var message = html.documentElement.getElementsByClassName("message");
          var body = "...";
          try {
            body = getPlainText(message[message.length - 1].children[0].children[2]);
          } catch (e) {
            console.log(e);
          }
          if (callback) callback.apply(pointer, [body]);
        });
      });
    }
    else {
      if (callback) callback.apply(pointer, ["Error at resolving thread"]);
    }
  }
})();

/** Notifier **/
var notify = function (title, text, link) {
  var notification = webkitNotifications.createNotification(
    'notification.png',  title,  text
  );
  notification.addEventListener("click", function () {
    chrome.windows.getCurrent(null, function (w) {
      if (!w) {
        chrome.windows.create(null, function () {
          open(link)
        }) 
      }
      else {
        open(link)
      }
    }); 
  }, true);
  notification.show();
  timer.setTimeout(function () {
    notification.cancel();
  }, prefs.desktopNotification);
}

/** Player **/
var play = (function () {
  var audioElement
  function reset () {
    audioElement = document.createElement('audio');
    audioElement.setAttribute("preload", "auto");
    audioElement.autobuffer = true;
    var source = document.createElement('source');
    var data = localStorage['sound'];
    if (prefs.soundNotification == "2" && data) {
      source.type = localStorage['soundMime'] ? localStorage['soundMime'] : 'audio/wav';
      source.src = data;
    }
    else {
      source.type = 'audio/wav';
      source.src = 'alert.wav';
    } 
    audioElement.appendChild(source);
  }
  reset();

  return {
    now: function () {
      audioElement.volume = prefs.soundVolume;
      audioElement.load;
      audioElement.play();
    },
    reset: reset
  }
})();

/** Initialize **/
var version = chrome[chrome.runtime && chrome.runtime.getManifest ? "runtime" : "extension"].getManifest().version;
if (localStorage['version'] != version) {
  localStorage['version'] = version;
  chrome.tabs.create({
    url: "http://add0n.com/gmail-notifier-chrome.html", 
    active: true
  });
}

tm = new manager ("firstTime", "period", checkAllMails);
if (prefs.resetPeriod) {
  resetTm = new manager ("resetPeriod", "resetPeriod", reset);
} 
chrome.browserAction.setTitle({
  title: config.defaultTooltip
});



