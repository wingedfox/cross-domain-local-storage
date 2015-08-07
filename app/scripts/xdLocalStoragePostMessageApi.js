/**
 * Created by dagan on 07/04/2014.
 */
'use strict';
/* global XdUtils */
(function () {

  var MESSAGE_NAMESPACE = 'cross-domain-local-message';
  var STORAGE_KEY_PREFIX = '';

  var defaultData = {
    namespace: MESSAGE_NAMESPACE
  };

  function postData(id, data) {
    var mergedData = XdUtils.extend(data, defaultData);
    mergedData.id = id;
    parent.postMessage(JSON.stringify(mergedData), '*');
  }

  function getData(id, key) {
    var value = localStorage.getItem(key);
    var data = {
      key: key,
      value: value
    };
    postData(id, data);
  }

  function setData(id, key, value) {
    var oldValue = localStorage.getItem(key);
    localStorage.setItem(key, value);
    var checkGet = localStorage.getItem(key);
    var data = {
      success: checkGet === value,
      oldValue: oldValue
    };
    postData(id, data);
  }

  function removeData(id, key) {
    var oldValue = localStorage.getItem(key);
    localStorage.removeItem(key);
    var data = {
        oldValue: oldValue
    }
    postData(id, data);
  }

  function getKey(id, index) {
    var key = localStorage.key(index);
    postData(id, {key: key});
  }

  function clear(id, key) {
    var keys = [];
    for (var i in localStorage) {
        if (i.indexOf(key) === 0) {
            keys.push({
                key: i,
                oldValue: localStorage.getItem(i)
            });
            localStorage.removeItem(i);
        }
    }
    postData(id, keys);
  }

  function receiveMessage(event) {
    var data;
    try {
      data = JSON.parse(event.data);
    } catch (err) {
      //not our message, can ignore
    }
    if (data && data.namespace === MESSAGE_NAMESPACE) {
      if (data.action === 'set') {
        setData(data.id, data.key, data.value);
      } else if (data.action === 'get') {
        getData(data.id, data.key);
      } else if (data.action === 'remove') {
        removeData(data.id, data.key);
      } else if (data.action === 'key') {
        getKey(data.id, data.key);
      } else if (data.action === 'clear') {
        clear(data.id, data.key);
      }
    }
  }

  function sendNotification(event) {
    console.info('xdSendNotification', event)
    var data = {
      data: {
          key: event.key,
          newValue: event.newValue,
          oldValue: event.oldValue,
          timeStamp: event.timeStamp,
          type: event.type,
          url: event.url
      }
    };
    postData('storage-event', data);
  }

  var storagemap = {};
  function fireStorageEvent(e,k,v) {
    if(e) {
      if (storagemap[e.key] != e.newValue) {
        sendNotification (e);
        storagemap[e.key] = e.newValue;
      }
    } else {
      if (storagemap[k] != v) {
        sendNotification ({
          key: k,
          oldValue: storagemap[k],
          newValue: v
        });
        storagemap[k] = v;
      }
    }
  }
  
  if (window.addEventListener) {
    window.addEventListener('message', receiveMessage, false);
    window.addEventListener('storage', fireStorageEvent, false);
  } else {
    window.attachEvent('onmessage', receiveMessage);
    window.attachEvent('storage', fireStorageEvent);
  }

  function sendOnLoad() {
    console.log('xdSendOnLoad');
    var data = {
      namespace: MESSAGE_NAMESPACE,
      id: 'iframe-ready'
    };
    parent.postMessage(JSON.stringify(data), '*');
    for(var i=0;i<localStorage.length;i++){
        storagemap[localStorage.key(i)] = localStorage.getItem(localStorage.key(i));
      }
    setInterval(function(){
        localStorage.setItem('xdLocalStorageRefreshToken',Math.random());
        localStorage.removeItem('xdLocalStorageRefreshToken');
        for(var i=0;i<localStorage.length;i++){
            fireStorageEvent(null, localStorage.key(i), localStorage.getItem(localStorage.key(i)));
        }
    },500);
  }
  //on creation
  sendOnLoad();
})();
