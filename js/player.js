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
var Player = (function (_super) {
    __extends(Player, _super);
    function Player() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.name = "Player";
        _this.isPlayer = true;
        _this.art = "art/critters/hmjmpsaa";
        _this.stats = new StatSet({ AGI: 8, INT: 8, STR: 8, CHA: 8, HP: 100 });
        _this.skills = new SkillSet(undefined, undefined, 10);
        _this.teamNum = 0;
        _this.position = { x: 94, y: 109 };
        _this.orientation = 3;
        _this.gender = "male";
        _this.leftHand = createObjectWithPID(9);
        _this.inventory = [createObjectWithPID(41).setAmount(1337)];
        _this.lightRadius = 4;
        _this.lightIntensity = 65536;
        return _this;
    }
    Player.prototype.toString = function () { return "The Dude"; };
    Player.prototype.move = function (position, curIdx, signalEvents) {
        if (signalEvents === void 0) { signalEvents = true; }
        if (!_super.prototype.move.call(this, position, curIdx, signalEvents))
            return false;
        if (signalEvents)
            Events.emit("playerMoved", position);
        var objs = objectsAtPosition(this.position);
        for (var i = 0; i < objs.length; i++) {
            if (objs[i].type === "misc" && objs[i].extra && objs[i].extra.exitMapID !== undefined) {
                var exitMapID = objs[i].extra.exitMapID;
                var startingPosition = fromTileNum(objs[i].extra.startingPosition);
                var startingElevation = objs[i].extra.startingElevation;
                this.clearAnim();
                if (startingPosition.x === -1 || startingPosition.y === -1 ||
                    exitMapID < 0) {
                    console.log("exit grid -> worldmap");
                    uiWorldMap();
                }
                else {
                    console.log("exit grid -> map " + exitMapID + " elevation " + startingElevation +
                        " @ " + startingPosition.x + ", " + startingPosition.y);
                    if (exitMapID === gMap.mapID) {
                        gMap.changeElevation(startingElevation, true);
                        player.move(startingPosition);
                        centerCamera(player.position);
                    }
                    else
                        gMap.loadMapByID(exitMapID, startingPosition, startingElevation);
                }
                return false;
            }
        }
        return true;
    };
    return Player;
}(Critter));
