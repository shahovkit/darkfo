"use strict";
var GameMap = (function () {
    function GameMap() {
        this.name = null;
        this.currentElevation = 0;
        this.floorMap = null;
        this.roofMap = null;
        this.mapScript = null;
        this.objects = null;
        this.spatials = null;
        this.mapObj = null;
    }
    GameMap.prototype.getObjects = function (level) {
        return this.objects[level === undefined ? this.currentElevation : level];
    };
    GameMap.prototype.getSpatials = function (level) {
        return this.spatials[level === undefined ? this.currentElevation : level];
    };
    GameMap.prototype.getObjectsAndSpatials = function (level) {
        return this.getObjects().concat(this.getSpatials());
    };
    GameMap.prototype.addObject = function (obj, level) {
        this.objects[level === undefined ? this.currentElevation : level].push(obj);
    };
    GameMap.prototype.removeObject = function (obj) {
        for (var level = 0; level < this.numLevels; level++) {
            var objects = this.objects[level];
            for (var i = 0; i < objects.length; i++) {
                if (objects[i] === obj) {
                    console.log("removeObject: destroying index %d (%o/%o)", i, obj, objects[i]);
                    this.objects[level].splice(i, 1);
                    return;
                }
            }
        }
        console.log("removeObject: couldn't find object on map");
        console.trace();
    };
    GameMap.prototype.destroyObject = function (obj) {
        this.removeObject(obj);
    };
    GameMap.prototype.hasRoofAt = function (pos, elevation) {
        if (elevation === undefined)
            elevation = this.currentElevation;
        var tilePos = hexToTile(pos);
        return this.mapObj.levels[elevation].tiles.roof[tilePos.y][tilePos.x] !== "grid000";
    };
    GameMap.prototype.updateMap = function () {
        Scripting.updateMap(this.mapScript, this.getObjectsAndSpatials(), this.currentElevation);
    };
    GameMap.prototype.changeElevation = function (level, updateScripts, isMapLoading) {
        if (updateScripts === void 0) { updateScripts = false; }
        if (isMapLoading === void 0) { isMapLoading = false; }
        var oldElevation = this.currentElevation;
        this.currentElevation = level;
        currentElevation = level;
        this.floorMap = this.mapObj.levels[level].tiles.floor;
        this.roofMap = this.mapObj.levels[level].tiles.roof;
        if (inCombat)
            combat.end();
        player.clearAnim();
        for (var _i = 0, _a = gParty.getPartyMembersAndPlayer(); _i < _a.length; _i++) {
            var obj = _a[_i];
            if (!isMapLoading)
                arrayRemove(this.objects[oldElevation], obj);
            if (this.objects[level].indexOf(obj) === -1)
                this.objects[level].push(obj);
        }
        this.placeParty();
        renderer.initData(this.roofMap, this.floorMap, this.getObjects());
        if (updateScripts) {
            Scripting.updateMap(this.mapScript, this.getObjectsAndSpatials(), level);
        }
        if (Config.engine.doFloorLighting) {
            Lightmap.resetLight();
            Lightmap.rebuildLight();
        }
        centerCamera(player.position);
        Events.emit("elevationChanged", { elevation: level, oldElevation: oldElevation, isMapLoading: isMapLoading });
    };
    GameMap.prototype.placeParty = function () {
        gParty.getPartyMembers().forEach(function (obj) {
            var placed = false;
            for (var dist = 1; dist < 3; dist++) {
                for (var dir = 0; dir < 6; dir++) {
                    var pos = hexInDirectionDistance(player.position, dir, dist);
                    if (objectsAtPosition(pos).length === 0) {
                        obj.position = pos;
                        console.log("placed %o @ %o", obj, pos);
                        placed = true;
                        break;
                    }
                }
                if (placed)
                    break;
            }
            if (!placed)
                console.log("couldn't place %o (player position: %o)", obj, player.position);
        });
    };
    GameMap.prototype.doEnterNewMap = function (isFirstRun) {
        var _this = this;
        var objectsAndSpatials = this.getObjectsAndSpatials();
        var overridenStartPos = Scripting.enterMap(this.mapScript, objectsAndSpatials, this.currentElevation, this.mapID, isFirstRun);
        if (overridenStartPos) {
            console.log("Starting position overriden to %o", overridenStartPos);
            player.position = overridenStartPos.position;
            player.orientation = overridenStartPos.orientation;
            this.currentElevation = currentElevation = overridenStartPos.elevation;
        }
        this.placeParty();
        this.objects.forEach(function (level) { return level.forEach(function (obj) { return obj.enterMap(); }); });
        this.spatials.forEach(function (level) { return level.forEach(function (spatial) { return Scripting.objectEnterMap(spatial, _this.currentElevation, _this.mapID); }); });
        Scripting.updateMap(this.mapScript, objectsAndSpatials, this.currentElevation);
    };
    GameMap.prototype.loadMap = function (mapName, startingPosition, startingElevation, loadedCallback) {
        if (startingElevation === void 0) { startingElevation = 0; }
        if (Config.engine.doSaveDirtyMaps && this.name !== null) {
            console.log("[Main] Serializing map " + this.name + " and committing to dirty map cache");
            dirtyMapCache[this.name] = this.serialize();
        }
        if (mapName in dirtyMapCache) {
            console.log("[Main] Loading map " + mapName + " from dirty map cache");
            Events.emit("loadMapPre");
            var map = dirtyMapCache[mapName];
            this.deserialize(map);
            if (startingPosition !== undefined)
                player.position = startingPosition;
            else
                player.position = map.mapObj.startPosition;
            player.orientation = map.mapObj.startOrientation;
            this.currentElevation = currentElevation = startingElevation;
            this.changeElevation(this.currentElevation, false, true);
            this.doEnterNewMap(false);
            this.changeElevation(this.currentElevation, true, false);
            console.log("[Main] Loaded from dirty map cache");
            loadedCallback && loadedCallback();
            Events.emit("loadMapPost");
        }
        else {
            console.log("[Main] Loading map " + mapName + " from clean load");
            this.loadNewMap(mapName, startingPosition, startingElevation, loadedCallback);
        }
    };
    GameMap.prototype.loadNewMap = function (mapName, startingPosition, startingElevation, loadedCallback) {
        var _this = this;
        function load(file, callback) {
            if (images[file] !== undefined)
                return;
            loadingAssetsTotal++;
            heart.graphics.newImage(file + ".png", function (r) {
                images[file] = r;
                loadingAssetsLoaded++;
                if (callback)
                    callback(r);
            });
        }
        this.name = mapName.toLowerCase();
        Events.emit("loadMapPre");
        isLoading = true;
        loadingAssetsTotal = 1;
        loadingAssetsLoaded = 0;
        loadingLoadedCallback = loadedCallback || null;
        this.objects = null;
        this.mapScript = null;
        Scripting.reset(this.name);
        player.clearAnim();
        console.log("loading map " + mapName);
        var mapImages = getFileJSON("maps/" + mapName + ".images.json");
        for (var i = 0; i < mapImages.length; i++)
            load(mapImages[i]);
        console.log("loading " + mapImages.length + " images");
        var map = getFileJSON("maps/" + mapName + ".json");
        this.mapObj = map;
        this.mapID = map.mapID;
        this.numLevels = map.levels.length;
        var elevation = (startingElevation !== undefined) ? startingElevation : 0;
        if (Config.engine.doLoadScripts) {
            Scripting.init(mapName);
            try {
                this.mapScript = Scripting.loadScript(mapName);
                Scripting.setMapScript(this.mapScript);
            }
            catch (e) {
                this.mapScript = null;
                console.log("ERROR LOADING MAP SCRIPT:", e.message);
            }
        }
        else
            this.mapScript = null;
        player.position = startingPosition || map.startPosition;
        player.orientation = map.startOrientation;
        if (Config.engine.doSpatials) {
            this.spatials = map.levels.map(function (level) { return level.spatials; });
            if (Config.engine.doLoadScripts) {
                this.spatials.forEach(function (level) { return level.forEach(function (spatial) {
                    var script = Scripting.loadScript(spatial.script);
                    if (script === null)
                        console.log("load script failed for spatial " + spatial.script);
                    else {
                        spatial._script = script;
                    }
                    spatial.isSpatial = true;
                    spatial.position = fromTileNum(spatial.tileNum);
                }); });
            }
        }
        else
            this.spatials = map.levels.map(function (_) { return []; });
        this.objects = new Array(map.levels.length);
        for (var level = 0; level < map.levels.length; level++) {
            this.objects[level] = map.levels[level].objects.map(function (obj) { return objFromMapObject(obj); });
        }
        this.changeElevation(elevation, false, true);
        var objectsAndSpatials = this.getObjectsAndSpatials();
        if (Config.engine.doLoadScripts) {
            gParty.getPartyMembers().forEach(function (obj) {
                obj._script._mapScript = _this.mapScript;
            });
            this.doEnterNewMap(true);
            elevation = this.currentElevation;
            this.changeElevation(this.currentElevation, true, true);
        }
        console.log("loaded (" + map.levels.length + " levels, " + this.getObjects().length + " objects on elevation " + elevation + ")");
        load("art/critters/hmjmpsat");
        load("hex_outline", function (r) { hexOverlay = r; });
        loadingAssetsTotal--;
        var curMapInfo = getCurrentMapInfo();
        audioEngine.stopAll();
        if (curMapInfo && curMapInfo.music)
            audioEngine.playMusic(curMapInfo.music);
        Events.emit("loadMapPost");
    };
    GameMap.prototype.loadMapByID = function (mapID, startingPosition, startingElevation) {
        var mapName = lookupMapName(mapID);
        if (mapName !== null)
            this.loadMap(mapName, startingPosition, startingElevation);
        else
            console.log("couldn't lookup map name for map ID " + mapID);
    };
    GameMap.prototype.serialize = function () {
        return {
            name: this.name,
            mapID: this.mapID,
            numLevels: this.numLevels,
            mapObj: { levels: this.mapObj.levels.map(function (level) { return ({ tiles: level.tiles }); }),
                startPosition: this.mapObj.startPosition,
                startOrientation: this.mapObj.startOrientation
            },
            roofMap: this.roofMap,
            floorMap: this.floorMap,
            mapScript: this.mapScript ? this.mapScript._serialize() : null,
            objects: this.objects.map(function (level) {
                return arrayWithout(level, player).map(function (obj) { return obj.serialize(); });
            }),
            spatials: null
        };
    };
    GameMap.prototype.deserialize = function (obj) {
        this.name = obj.name;
        this.mapID = obj.mapID;
        this.numLevels = obj.numLevels;
        this.mapObj = obj.mapObj;
        this.mapScript = obj.mapScript ? Scripting.deserializeScript(obj.mapScript) : null;
        this.objects = obj.objects.map(function (level) { return level.map(function (obj) { return deserializeObj(obj); }); });
        this.spatials = [[], [], []];
        this.roofMap = obj.roofMap;
        this.floorMap = obj.floorMap;
        this.currentElevation = 0;
    };
    return GameMap;
}());
