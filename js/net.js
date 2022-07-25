"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Netcode;
(function (Netcode) {
    var ws = null;
    var connected = false;
    var handlers = {};
    Netcode.netPlayerMap = {};
    function send(t, msg) {
        if (msg === void 0) { msg = {}; }
        assert(connected, "Can't send message to unconnected socket");
        msg.t = t;
        ws.send(JSON.stringify(msg));
    }
    function on(msgType, handler) {
        if (msgType in handlers)
            console.warn("Overwriting existing message handler");
        handlers[msgType] = handler;
    }
    Netcode.on = on;
    function connect(host, onConnected) {
        ws = new WebSocket(host);
        ws.binaryType = "arraybuffer";
        ws.onopen = function (e) {
            console.log("WebSocket connected to %s", host);
            connected = true;
            onConnected && onConnected();
        };
        ws.onclose = function (e) {
            console.warn("WebSocket closed (%d): %s", e.code, e.reason);
            connected = false;
        };
        ws.onerror = function (e) {
            console.error("WebSocket error: %o", e);
            connected = false;
        };
        ws.onmessage = function (e) {
            if (typeof e.data !== "string") {
                if ("binary" in handlers)
                    handlers.binary(e.data);
                return;
            }
            var msg = JSON.parse(e.data);
            console.log("net: Got %s message", msg.t);
            if (msg.t in handlers)
                handlers[msg.t](msg);
        };
    }
    Netcode.connect = connect;
    function identify(name) {
        send("ident", { name: name });
    }
    Netcode.identify = identify;
    function findObjectByUID(uid) {
        return gMap.getObjects().find(function (obj) { return obj.uid === uid; }) || null;
    }
    function setupCommonEvents() {
        on("movePlayer", function (msg) {
            if (msg.uid in Netcode.netPlayerMap)
                Netcode.netPlayerMap[msg.uid].move(msg.position, undefined, false);
        });
        Events.on("playerMoved", function (msg) {
            send("moved", { x: msg.x, y: msg.y });
        });
        on("objSetOpen", function (msg) {
            var obj = findObjectByUID(msg.uid);
            assert(obj !== null, "net.objSetOpen: No such object");
            setObjectOpen(obj, msg.open, false, false);
        });
        Events.on("objSetOpen", function (msg) {
            send("objSetOpen", { uid: msg.obj.uid, open: msg.open });
        });
    }
    function getNetPlayers() {
        return Object.values(Netcode.netPlayerMap);
    }
    function host() {
        send("host");
        setupCommonEvents();
        on("guestJoined", function (msg) {
            console.log("Guest '%s' (%d) joined @ %d, %d", msg.name, msg.uid, msg.position.x, msg.position.y);
            var netPlayer = new NetPlayer(msg.name, msg.uid);
            netPlayer.position = msg.position;
            netPlayer.orientation = msg.orientation;
            gMap.addObject(netPlayer);
            Netcode.netPlayerMap[msg.uid] = netPlayer;
        });
        Events.on("loadMapPre", function () {
            for (var _i = 0, _a = getNetPlayers(); _i < _a.length; _i++) {
                var netPlayer = _a[_i];
                gMap.removeObject(netPlayer);
            }
        });
        Events.on("loadMapPost", function () {
            console.log("Map changed, sending map...");
            changeMap();
            for (var _i = 0, _a = getNetPlayers(); _i < _a.length; _i++) {
                var netPlayer = _a[_i];
                gMap.addObject(netPlayer);
            }
        });
        Events.on("elevationChanged", function (e) {
            if (e.isMapLoading)
                return;
            console.log("net: Changing elevation...");
            for (var _i = 0, _a = getNetPlayers(); _i < _a.length; _i++) {
                var netPlayer = _a[_i];
                arrayRemove(gMap.objects[e.oldElevation], netPlayer);
                gMap.objects[e.elevation].push(netPlayer);
            }
            send("changeElevation", { elevation: e.elevation, position: player.position, orientation: player.orientation });
        });
        Events.on("objMove", function (e) {
            if (e.obj.isPlayer)
                return;
            send("objMove", { uid: e.obj.uid, position: e.position });
        });
    }
    Netcode.host = host;
    function join() {
        send("join");
        setupCommonEvents();
        var serializedMap = null;
        on("binary", function (data) {
            console.log("Received binary remote map, decompressing...");
            console.time("map decompression");
            serializedMap = JSON.parse(pako.inflate(data, { to: "string" }));
            console.timeEnd("map decompression");
        });
        on("map", function (msg) {
            console.log("Received map change request, loading...");
            console.time("map deserialization");
            gMap.deserialize(serializedMap);
            console.timeEnd("map deserialization");
            console.log("Loaded serialized remote map.");
            player.position = msg.player.position;
            player.orientation = 0;
            player.inventory = [];
            gMap.changeElevation(msg.player.elevation, false, false);
            var netPlayer = new Netcode.NetPlayer(msg.hostPlayer.name, msg.hostPlayer.uid);
            netPlayer.position = msg.hostPlayer.position;
            netPlayer.orientation = msg.hostPlayer.orientation;
            gMap.addObject(netPlayer);
            Netcode.netPlayerMap[msg.hostPlayer.uid] = netPlayer;
            isWaitingOnRemote = false;
        });
        on("elevationChanged", function (msg) {
            var oldElevation = gMap.currentElevation;
            gMap.changeElevation(msg.elevation, false, false);
            console.log("net: Changing elevation...");
            for (var _i = 0, _a = getNetPlayers(); _i < _a.length; _i++) {
                var netPlayer = _a[_i];
                arrayRemove(gMap.objects[oldElevation], netPlayer);
                gMap.objects[gMap.currentElevation].push(netPlayer);
            }
        });
        on("objMove", function (e) {
            var obj = findObjectByUID(e.uid);
            assert(obj !== null, "net.objMove: No such object");
            console.log("Move: uid %o, obj %o, pos %o", e.uid, obj, e.position);
            obj.move(e.position);
        });
    }
    Netcode.join = join;
    function changeMap() {
        console.log("Serializing and compressing map...");
        console.time("serialize/compress map");
        ws.send(pako.deflate(JSON.stringify(gMap.serialize())));
        console.timeEnd("serialize/compress map");
        console.log("Sending map change request...");
        send("changeMap", { mapName: gMap.name,
            player: { position: player.position, elevation: gMap.currentElevation, orientation: player.orientation }
        });
    }
    Netcode.changeMap = changeMap;
    var NetPlayer = (function (_super) {
        __extends(NetPlayer, _super);
        function NetPlayer(name, uid) {
            var _this = _super.call(this) || this;
            _this.art = "art/critters/hmjmpsaa";
            _this.teamNum = 0;
            _this.position = { x: 94, y: 109 };
            _this.orientation = 3;
            _this.gender = "male";
            _this.lightRadius = 4;
            _this.lightIntensity = 65536;
            _this.name = name;
            _this.uid = uid;
            return _this;
        }
        NetPlayer.prototype.toString = function () { return "The Dude, Mk.II"; };
        return NetPlayer;
    }(Critter));
    Netcode.NetPlayer = NetPlayer;
})(Netcode || (Netcode = {}));
