/**
 * Created by dagan on 07/04/2014.
 */
'use strict';
/* global console, XdUtils */
window.xdLocalStorage = window.xdLocalStorage || (function () {
  var MESSAGE_NAMESPACE = 'cross-domain-local-message';
  var options = {
    iframeId: 'cross-domain-iframe',
    iframeUrl: undefined,
    initCallback: function () {}
  };
  var requestId = -1;
  var iframe;
  var requests = {};
  var wasInit = false;
  var iframeReady = false;
  var messageCache = [];
  var listeners = [];

  function applyCallback(data) {
    if (requests[data.id]) {
      requests[data.id](data);
      delete requests[data.id];
    }
  }

  function receiveMessage(event) {
    var data;
    try {
      data = JSON.parse(event.data);
    } catch (err) {
      //not our message, can ignore
    }
    if (data && data.namespace === MESSAGE_NAMESPACE) {
      if (data.id === 'iframe-ready') {
        iframeReady = true;
        options.initCallback();
        messageCache.forEach(function (data) {
            iframe.contentWindow.postMessage(JSON.stringify(data), '*');
          });
        messageCache.length = 0;
      } else if (data.id === 'storage-event') {
        listeners.forEach(function(v){v(data.data)});
      } else {
        applyCallback(data);
      }
    }
  }

  /**
   * Builds message to be sent to the remote window
   *
   * @param {String} action - action name
   * @param {String} key - optional storage key
   * @param {String} value - optional storage value
   * @param {Function} callback - callback to fire when reply is get back
   * @return {Boolean} build status, true when message is successfully sent
   */
  function buildMessage(action, key, value, callback) {
    if (!wasInit) {
      console.log('You must call xdLocalStorage.init() before using it.');
      return false;
    }

    requestId++;
    requests[requestId] = callback;

    var data = {
      namespace: MESSAGE_NAMESPACE,
      id: requestId,
      action: action,
      key: key,
      value: value
    };

    if (iframeReady) {
      // send message
      iframe.contentWindow.postMessage(JSON.stringify(data), '*');
    } else {
      // cache message if connection is not set yet
      messageCache.push(data);
    }

    return true;
  }

  function init(customOptions) {
    if (wasInit) {
      console.log('xdLocalStorage was already initialized!');
      return;
    }
    wasInit = true;
    options = XdUtils.extend(customOptions, options);

    if (window.addEventListener) {
      window.addEventListener('message', receiveMessage, false);
    } else {
      window.attachEvent('onmessage', receiveMessage);
    }

    // setup frame transport
    var temp = document.createDocumentFragment();
    iframe = temp.ownerDocument.createElement('iframe');
    iframe.id = options.iframeId;
    iframe.style = "position: absolute; left: -9999px; top: -9999px; width:0; height:0";
    iframe.src = options.iframeUrl;
    temp.appendChild(iframe);
    document.body.appendChild(temp);
  }

  return {
    //callback is optional for cases you use the api before window load.
    init: function (customOptions) {
      if (!customOptions.iframeUrl) {
        throw 'You must specify iframeUrl';
      }
      init(customOptions);
    },

    isInit: function () {
      return wasInit;
    },

    setItem: function (key, value, callback) {
      return buildMessage('set', key, value, callback);
    },

    getItem: function (key, callback) {
      return buildMessage('get', key,  null, callback);
    },

    removeItem: function (key, callback) {
      return buildMessage('remove', key,  null, callback);
    },

    key: function (index, callback) {
      return buildMessage('key', index,  null, callback);
    },

    clear: function (callback) {
      return buildMessage('clear', null,  null, callback);
    },

    on: function (callback) {
        if (listeners.indexOf(callback) < 0) {
           listeners.push(callback);
        }
    },

    off: function (callback) {
        listeners = listeners.filter(function(v){ return v !== callback});
    }
  };
})();