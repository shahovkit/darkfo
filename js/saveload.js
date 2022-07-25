"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var SaveLoad;
(function (SaveLoad) {
    var db;
    function gatherSaveData(name) {
        var _a;
        var curMap = gMap.serialize();
        return { version: 1,
            name: name,
            timestamp: Date.now(),
            currentElevation: currentElevation,
            currentMap: curMap.name,
            player: { position: player.position, orientation: player.orientation, inventory: player.inventory.map(function (obj) { return obj.serialize(); }) },
            party: gParty.serialize(),
            savedMaps: __assign((_a = {}, _a[curMap.name] = curMap, _a), dirtyMapCache)
        };
    }
    function formatSaveDate(save) {
        var date = new Date(save.timestamp);
        return date.getMonth() + 1 + "/" + date.getDate() + "/" + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    }
    SaveLoad.formatSaveDate = formatSaveDate;
    function withTransaction(f, finished) {
        var trans = db.transaction("saves", "readwrite");
        if (finished)
            trans.oncomplete = finished;
        trans.onerror = function (e) { console.error("Database error: " + e.target.errorCode); };
        f(trans);
    }
    function getAll(store, callback) {
        var out = [];
        store.openCursor().onsuccess = function (e) {
            var cursor = e.target.result;
            if (cursor) {
                out.push(cursor.value);
                cursor["continue"]();
            }
            else if (callback)
                callback(out);
        };
    }
    function saveList(callback) {
        withTransaction(function (trans) {
            getAll(trans.objectStore("saves"), callback);
        });
    }
    SaveLoad.saveList = saveList;
    function debugSaveList() {
        saveList(function (saves) {
            console.log("Save List:");
            for (var _i = 0, saves_1 = saves; _i < saves_1.length; _i++) {
                var savegame = saves_1[_i];
                console.log("  -", savegame.name, formatSaveDate(savegame), savegame);
            }
        });
    }
    SaveLoad.debugSaveList = debugSaveList;
    function debugSave() {
        save("debug", undefined, function () { console.log("[SaveLoad] Done"); });
    }
    SaveLoad.debugSave = debugSave;
    function save(name, slot, callback) {
        if (slot === void 0) { slot = -1; }
        var save = gatherSaveData(name);
        var dirtyMapNames = Object.keys(dirtyMapCache);
        console.log("[SaveLoad] Saving " + (1 + dirtyMapNames.length) + " maps (current: " + gMap.name + " plus dirty maps: " + dirtyMapNames.join(", ") + ")");
        if (slot !== -1)
            save.id = slot;
        withTransaction(function (trans) {
            trans.objectStore("saves").put(save);
            console.log("[SaveLoad] Saving game data as '%s'", name);
        }, callback);
    }
    SaveLoad.save = save;
    function load(id) {
        withTransaction(function (trans) {
            trans.objectStore("saves").get(id).onsuccess = function (e) {
                var save = e.target.result;
                var savedMap = save.savedMaps[save.currentMap];
                console.log("[SaveLoad] Loading save #%d ('%s') from %s", id, save.name, formatSaveDate(save));
                gMap.deserialize(savedMap);
                console.log("[SaveLoad] Finished map deserialization");
                player.position = save.player.position;
                player.orientation = save.player.orientation;
                player.inventory = save.player.inventory.map(function (obj) { return deserializeObj(obj); });
                gParty.deserialize(save.party);
                gMap.changeElevation(save.currentElevation, false);
                dirtyMapCache = __assign({}, save.savedMaps);
                delete dirtyMapCache[savedMap.name];
                console.log("[SaveLoad] Finished loading map %s", savedMap.name);
            };
        });
    }
    SaveLoad.load = load;
    function init() {
        var request = indexedDB.open("darkfo", 1);
        request.onupgradeneeded = function () {
            var db = request.result;
            var store = db.createObjectStore("saves", { keyPath: "id", autoIncrement: true });
        };
        request.onsuccess = function () {
            db = request.result;
            db.onerror = function (e) {
                console.error("Database error: " + e.target.errorCode);
            };
            console.log("Established DB connection");
        };
    }
    SaveLoad.init = init;
})(SaveLoad || (SaveLoad = {}));
