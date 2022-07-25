"use strict";
var IDBCache;
(function (IDBCache) {
    var db = null;
    function withTransaction(f, finished) {
        var trans = db.transaction("cache", "readwrite");
        trans.oncomplete = finished;
        f(trans);
    }
    function nuke() {
        withTransaction(function (trans) {
            trans.objectStore("cache").clear();
        });
    }
    IDBCache.nuke = nuke;
    function add(key, value) {
        withTransaction(function (trans) {
            trans.objectStore("cache").add({ key: key, value: value });
        });
        return value;
    }
    IDBCache.add = add;
    function exists(key, callback) {
        withTransaction(function (trans) {
            var req = trans.objectStore("cache").count(key);
            req.onsuccess = function (e) { callback(e.result !== 0); };
        });
    }
    IDBCache.exists = exists;
    function get(key, callback) {
        withTransaction(function (trans) {
            trans.objectStore("cache").get(key).onsuccess = function (e) {
                var result = e.target.result;
                callback(result ? result.value : null);
            };
        });
    }
    IDBCache.get = get;
    function init(callback) {
        var request = indexedDB.open("darkfo-cache", 1);
        request.onupgradeneeded = function () {
            var db = request.result;
            var store = db.createObjectStore("cache", { keyPath: "key" });
        };
        request.onsuccess = function () {
            db = request.result;
            db.onerror = function (e) {
                console.error("Database error: " + e.target.errorCode, e.target);
            };
            console.log("Established Cache DB connection");
            callback && callback();
        };
    }
    IDBCache.init = init;
})(IDBCache || (IDBCache = {}));
