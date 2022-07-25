"use strict";
var gMap;
var images = {};
var imageInfo = null;
var currentElevation = 0;
var hexOverlay = null;
var tempCanvas = null;
var tempCanvasCtx = null;
var cameraX = 3580;
var cameraY = 1020;
var SCREEN_WIDTH = Config.ui.screenWidth;
var SCREEN_HEIGHT = Config.ui.screenHeight;
var gameTickTime = 0;
var lastGameTick = 0;
var combat = null;
var inCombat = false;
var gameHasFocus = false;
var lastMousePickTime = 0;
var _lastFPSTime = 0;
var Skills;
(function (Skills) {
    Skills[Skills["None"] = 0] = "None";
    Skills[Skills["Lockpick"] = 1] = "Lockpick";
    Skills[Skills["Repair"] = 2] = "Repair";
})(Skills || (Skills = {}));
var skillMode = Skills.None;
var isLoading = true;
var isWaitingOnRemote = false;
var isInitializing = true;
var loadingAssetsLoaded = 0;
var loadingAssetsTotal = 0;
var loadingLoadedCallback = null;
var lazyAssetLoadingQueue = {};
var floatMessages = [];
var player;
var renderer;
var audioEngine;
var $fpsOverlay = null;
function repr(obj) { return JSON.stringify(obj, null, 2); }
function lazyLoadImage(art, callback, isHeartImg) {
    if (images[art] !== undefined) {
        if (callback)
            callback(isHeartImg ? images[art] : images[art].img);
        return;
    }
    if (lazyAssetLoadingQueue[art] !== undefined) {
        if (callback)
            lazyAssetLoadingQueue[art].push(callback);
        return;
    }
    if (Config.engine.doLogLazyLoads)
        console.log("lazy loading " + art + "...");
    lazyAssetLoadingQueue[art] = (callback ? [callback] : []);
    var img = new Image();
    img.onload = function () {
        images[art] = new heart.HeartImage(img);
        var callbacks = lazyAssetLoadingQueue[art];
        if (callbacks !== undefined) {
            for (var i = 0; i < callbacks.length; i++)
                callbacks[i](images[art]);
            lazyAssetLoadingQueue[art] = undefined;
        }
    };
    img.src = art + '.png';
}
function lookupScriptName(scriptID) {
    console.log("SID: " + scriptID);
    var lookupName = getLstId("scripts/scripts", scriptID - 1);
    if (lookupName === null)
        throw Error("lookupScriptName: failed to look up script name");
    return lookupName.split('.')[0].toLowerCase();
}
function dropObject(source, obj) {
    var removed = false;
    for (var i = 0; i < source.inventory.length; i++) {
        if (source.inventory[i].pid === obj.pid) {
            removed = true;
            source.inventory.splice(i, 1);
            break;
        }
    }
    if (!removed)
        throw "dropObject: couldn't find object";
    gMap.addObject(obj);
    var idx = gMap.getObjects().length - 1;
    obj.move({ x: source.position.x, y: source.position.y }, idx);
}
function pickupObject(obj, source) {
    if (obj._script) {
        console.log("picking up %o", obj);
        Scripting.pickup(obj, source);
    }
}
function hexLinecast(a, b) {
    var line = hexLine(a, b);
    if (line === null)
        return null;
    line = line.slice(1, -1);
    for (var i = 0; i < line.length; i++) {
        var obj = objectsAtPosition(line[i]);
        if (obj.length !== 0)
            return obj[0];
    }
    return null;
}
function objectsAtPosition(position) {
    return gMap.getObjects().filter(function (obj) { return obj.position.x === position.x && obj.position.y === position.y; });
}
function critterAtPosition(position) {
    return objectsAtPosition(position).find(function (obj) { return obj.type === "critter"; }) || null;
}
function centerCamera(around) {
    var scr = hexToScreen(around.x, around.y);
    cameraX = Math.max(0, scr.x - SCREEN_WIDTH / 2 | 0);
    cameraY = Math.max(0, scr.y - SCREEN_HEIGHT / 2 | 0);
}
function initGame() {
    player = new Player();
    gMap = new GameMap();
    uiLog("Welcome to DarkFO");
    if (location.search !== "") {
        var query = location.search.slice(1);
        if (query.indexOf("host=") === 0) {
            var mapName = query.split("host=")[1];
            console.log("MP host map", mapName);
            Config.engine.doCombat = false;
            gMap.loadMap(mapName);
            Netcode.connect("ws://localhost:8090", function () {
                console.log("connected");
                Netcode.identify("Host Player");
                Netcode.host();
                Netcode.changeMap();
            });
        }
        else if (query.indexOf("join=") === 0) {
            var host = query.split("join=")[1];
            console.log("MP server host: %s", host);
            Config.engine.doLoadScripts = false;
            Config.engine.doUpdateCritters = false;
            Config.engine.doTimedEvents = false;
            Config.engine.doSaveDirtyMaps = false;
            Config.engine.doSpatials = false;
            Config.engine.doEncounters = false;
            Config.engine.doCombat = false;
            isWaitingOnRemote = true;
            Netcode.connect("ws://" + host + ":8090", function () {
                console.log("connected");
                Netcode.identify("Guest Player");
                Netcode.join();
            });
        }
        else
            gMap.loadMap(location.search.slice(1));
    }
    else
        gMap.loadMap("artemple");
    if (Config.engine.doCombat === true)
        CriticalEffects.loadTable();
    document.oncontextmenu = function () { return false; };
    var $cnv = document.getElementById("cnv");
    $cnv.onmouseenter = function () { gameHasFocus = true; };
    $cnv.onmouseleave = function () { gameHasFocus = false; };
    tempCanvas = document.createElement("canvas");
    tempCanvas.width = SCREEN_WIDTH;
    tempCanvas.height = SCREEN_HEIGHT;
    tempCanvasCtx = tempCanvas.getContext("2d");
    SaveLoad.init();
    Worldmap.init();
    initUI();
    if (Config.ui.hideRoofWhenUnder) {
        Events.on("playerMoved", function (e) {
            Config.ui.showRoof = !gMap.hasRoofAt(e);
        });
    }
}
heart.load = function () {
    isInitializing = true;
    $fpsOverlay = document.getElementById("fpsOverlay");
    if (Config.engine.renderer === "canvas")
        renderer = new CanvasRenderer();
    else if (Config.engine.renderer === "webgl")
        renderer = new WebGLRenderer();
    else {
        console.error("No renderer backend named '%s'", Config.engine.renderer);
        throw new Error("Invalid renderer backend");
    }
    renderer.init();
    if (Config.engine.doAudio)
        audioEngine = new HTMLAudioEngine();
    else
        audioEngine = new NullAudioEngine();
    function cachedJSON(key, path, callback) {
        IDBCache.get(key, function (value) {
            if (value) {
                console.log("[Main] %s loaded from cache DB", key);
                callback(value);
            }
            else {
                value = getFileJSON(path);
                IDBCache.add(key, value);
                console.log("[Main] %s loaded and cached", key);
                callback(value);
            }
        });
    }
    IDBCache.init(function () {
        cachedJSON("imageMap", "art/imageMap.json", function (value) {
            imageInfo = value;
            cachedJSON("proMap", "proto/pro.json", function (value) {
                proMap = value;
                initGame();
                isInitializing = false;
            });
        });
    });
};
function isSelectableObject(obj) {
    return obj.visible !== false && (canUseObject(obj) || obj.type === "critter");
}
function isPassiveSkill(skill) {
    switch (skill) {
        case Skills.Lockpick: return false;
        case Skills.Repair: return false;
        default: throw "TODO: is passive skill " + skill;
    }
}
function getSkillID(skill) {
    switch (skill) {
        case Skills.Lockpick: return 9;
        case Skills.Repair: return 13;
    }
    console.log("unimplemented skill %d", skill);
    return -1;
}
function playerUseSkill(skill, obj) {
    console.log("use skill %o on %o", skill, obj);
    if (!obj && !isPassiveSkill(skill))
        throw "trying to use non-passive skill without a target";
    if (!isPassiveSkill(skill)) {
        Scripting.useSkillOn(player, getSkillID(skill), obj);
    }
    else
        console.log("passive skills are not implemented");
}
function playerUse() {
    var mousePos = heart.mouse.getPosition();
    var mouseHex = hexFromScreen(mousePos[0] + cameraX, mousePos[1] + cameraY);
    var obj = getObjectUnderCursor(isSelectableObject);
    var who = obj;
    if (uiMode === UI_MODE_USE_SKILL) {
        obj = getObjectUnderCursor(function (_) { return true; });
        if (!obj)
            return;
        try {
            playerUseSkill(skillMode, obj);
        }
        finally {
            skillMode = Skills.None;
            uiMode = UI_MODE_NONE;
        }
        return;
    }
    if (obj === null) {
        if (inCombat) {
            if (!(combat.inPlayerTurn || Config.combat.allowWalkDuringAnyTurn)) {
                console.log("Wait your turn.");
                return;
            }
            if (player.AP.getAvailableMoveAP() === 0) {
                uiLog(getProtoMsg(700));
                return;
            }
            var maxWalkingDist = player.AP.getAvailableMoveAP();
            if (!player.walkTo(mouseHex, Config.engine.doAlwaysRun, undefined, maxWalkingDist)) {
                console.log("Cannot walk there");
            }
            else {
                if (!player.AP.subtractMoveAP(player.path.path.length - 1))
                    throw "subtraction issue: has AP: " + player.AP.getAvailableMoveAP() +
                        " needs AP:" + player.path.path.length + " and maxDist was:" + maxWalkingDist;
            }
        }
        if (!player.walkTo(mouseHex, Config.engine.doAlwaysRun))
            console.log("Cannot walk there");
        return;
    }
    if (obj.type === "critter") {
        if (obj === player)
            return;
        if (inCombat && !who.dead) {
            if (!combat.inPlayerTurn || player.inAnim()) {
                console.log("You can't do that yet.");
                return;
            }
            if (player.AP.getAvailableCombatAP() < 4) {
                uiLog(getProtoMsg(700));
                return;
            }
            var weapon = critterGetEquippedWeapon(player);
            if (weapon === null) {
                console.log("You have no weapon equipped!");
                return;
            }
            if (weapon.weapon.isCalled()) {
                var art = "art/critters/hmjmpsna";
                if (critterHasAnim(who, "called-shot"))
                    art = critterGetAnim(who, "called-shot");
                console.log("art: %s", art);
                uiCalledShot(art, who, function (region) {
                    player.AP.subtractCombatAP(4);
                    console.log("Attacking %s...", region);
                    combat.attack(player, obj, region);
                    uiCloseCalledShot();
                });
            }
            else {
                player.AP.subtractCombatAP(4);
                console.log("Attacking the torso...");
                combat.attack(player, obj, "torso");
            }
            return;
        }
    }
    var callback = function () {
        player.clearAnim();
        if (!obj)
            throw Error();
        if (obj.type === "critter") {
            if (who.dead !== true && inCombat !== true &&
                obj._script && obj._script.talk_p_proc !== undefined) {
                console.log("Talking to " + who.name);
                if (!who._script) {
                    console.warn("obj has no script");
                    return;
                }
                Scripting.talk(who._script, who);
            }
            else if (who.dead === true) {
                uiLoot(obj);
            }
            else
                console.log("Cannot talk to/loot that critter");
        }
        else
            useObject(obj, player);
    };
    if (Config.engine.doInfiniteUse === true)
        callback();
    else
        player.walkInFrontOf(obj.position, callback);
}
heart.mousepressed = function (x, y, btn) {
    if (isInitializing || isLoading || isWaitingOnRemote)
        return;
    else if (btn === "l")
        playerUse();
    else if (btn === "r") {
        var obj = getObjectUnderCursor(isSelectableObject);
        if (obj)
            uiContextMenu(obj, { clientX: x, clientY: y });
    }
};
heart.keydown = function (k) {
    if (isLoading === true)
        return;
    var mousePos = heart.mouse.getPosition();
    var mouseHex = hexFromScreen(mousePos[0] + cameraX, mousePos[1] + cameraY);
    if (k === Config.controls.cameraDown)
        cameraY += 15;
    if (k === Config.controls.cameraRight)
        cameraX += 15;
    if (k === Config.controls.cameraLeft)
        cameraX -= 15;
    if (k === Config.controls.cameraUp)
        cameraY -= 15;
    if (k === Config.controls.elevationDown) {
        if (currentElevation - 1 >= 0)
            gMap.changeElevation(currentElevation - 1, true);
    }
    if (k === Config.controls.elevationUp) {
        if (currentElevation + 1 < gMap.numLevels)
            gMap.changeElevation(currentElevation + 1, true);
    }
    if (k === Config.controls.showRoof) {
        Config.ui.showRoof = !Config.ui.showRoof;
    }
    if (k === Config.controls.showFloor) {
        Config.ui.showFloor = !Config.ui.showFloor;
    }
    if (k === Config.controls.showObjects) {
        Config.ui.showObjects = !Config.ui.showObjects;
    }
    if (k === Config.controls.showWalls)
        Config.ui.showWalls = !Config.ui.showWalls;
    if (k === Config.controls.talkTo) {
        var critter = critterAtPosition(mouseHex);
        if (critter) {
            if (critter._script && critter._script.talk_p_proc !== undefined) {
                console.log("talking to " + critter.name);
                Scripting.talk(critter._script, critter);
            }
        }
    }
    if (k === Config.controls.inspect) {
        gMap.getObjects().forEach(function (obj, idx) {
            if (obj.position.x === mouseHex.x && obj.position.y === mouseHex.y) {
                var hasScripts = (obj.script !== undefined ? ("yes (" + obj.script + ")") : "no") + " " + (obj._script === undefined ? "and is NOT loaded" : "and is loaded");
                console.log("object is at index " + idx + ", of type " + obj.type + ", has art " + obj.art + ", and has scripts? " + hasScripts + " -> %o", obj);
            }
        });
    }
    if (k === Config.controls.moveTo) {
        player.walkTo(mouseHex);
    }
    if (k === Config.controls.runTo) {
        player.walkTo(mouseHex, true);
    }
    if (k === Config.controls.attack) {
        if (!inCombat || !combat.inPlayerTurn || player.anim !== "idle") {
            console.log("You can't do that yet.");
            return;
        }
        if (player.AP.getAvailableCombatAP() < 4) {
            uiLog(getProtoMsg(700));
            return;
        }
        for (var i = 0; i < combat.combatants.length; i++) {
            if (combat.combatants[i].position.x === mouseHex.x && combat.combatants[i].position.y === mouseHex.y && !combat.combatants[i].dead) {
                player.AP.subtractCombatAP(4);
                console.log("Attacking...");
                combat.attack(player, combat.combatants[i]);
                break;
            }
        }
    }
    if (k === Config.controls.combat) {
        if (!Config.engine.doCombat)
            return;
        if (inCombat === true && combat.inPlayerTurn === true) {
            console.log("[TURN]");
            combat.nextTurn();
        }
        else if (inCombat === true) {
            console.log("Wait your turn...");
        }
        else {
            console.log("[COMBAT BEGIN]");
            inCombat = true;
            combat = new Combat(gMap.getObjects());
            combat.nextTurn();
        }
    }
    if (k === Config.controls.playerToTargetRaycast) {
        var obj = objectsAtPosition(mouseHex)[0];
        if (obj !== undefined) {
            var hit = hexLinecast(player.position, obj.position);
            if (!hit)
                return;
            console.log("hit obj: " + hit.art);
        }
    }
    if (k === Config.controls.showTargetInventory) {
        var obj = objectsAtPosition(mouseHex)[0];
        if (obj !== undefined) {
            console.log("PID: " + obj.pid);
            console.log("inventory: " + JSON.stringify(obj.inventory));
            uiLoot(obj);
        }
    }
    if (k === Config.controls.use) {
        var objs = objectsAtPosition(mouseHex);
        for (var i = 0; i < objs.length; i++) {
            useObject(objs[i]);
        }
    }
    if (k === 'h')
        player.move(mouseHex);
    if (k === Config.controls.kill) {
        var critter = critterAtPosition(mouseHex);
        if (critter)
            critterKill(critter, player);
    }
    if (k === Config.controls.worldmap)
        uiWorldMap();
    if (k === Config.controls.saveKey)
        uiSaveLoad(true);
    if (k === Config.controls.loadKey)
        uiSaveLoad(false);
};
function recalcPath(start, goal, isGoalBlocking) {
    var matrix = new Array(HEX_GRID_SIZE);
    for (var y = 0; y < HEX_GRID_SIZE; y++)
        matrix[y] = new Array(HEX_GRID_SIZE);
    for (var _i = 0, _a = gMap.getObjects(); _i < _a.length; _i++) {
        var obj = _a[_i];
        matrix[obj.position.y][obj.position.x] |= obj.blocks();
    }
    if (isGoalBlocking === false)
        matrix[goal.y][goal.x] = 0;
    var grid = new PF.Grid(HEX_GRID_SIZE, HEX_GRID_SIZE, matrix);
    var finder = new PF.BestFirstFinder();
    return finder.findPath(start.x, start.y, goal.x, goal.y, grid);
}
function changeCursor(image) {
    document.getElementById("cnv").style.cursor = image;
}
function objectTransparentAt(obj, position) {
    var frame = obj.frame !== undefined ? obj.frame : 0;
    var sx = imageInfo[obj.art].frameOffsets[obj.orientation][frame].sx;
    if (!tempCanvasCtx)
        throw Error();
    tempCanvasCtx.clearRect(0, 0, 1, 1);
    tempCanvasCtx.drawImage(images[obj.art].img, sx + position.x, position.y, 1, 1, 0, 0, 1, 1);
    var pixelAlpha = tempCanvasCtx.getImageData(0, 0, 1, 1).data[3];
    return (pixelAlpha === 0);
}
function getObjectUnderCursor(p) {
    var mouse = heart.mouse.getPosition();
    mouse = { x: mouse[0] + cameraX, y: mouse[1] + cameraY };
    var objects = gMap.getObjects();
    for (var i = objects.length - 1; i > 0; i--) {
        var bbox = objectBoundingBox(objects[i]);
        if (bbox === null)
            continue;
        if (pointInBoundingBox(mouse, bbox))
            if (p === undefined || p(objects[i]) === true) {
                var mouseRel = { x: mouse.x - bbox.x, y: mouse.y - bbox.y };
                if (!objectTransparentAt(objects[i], mouseRel))
                    return objects[i];
            }
    }
    return null;
}
heart.update = function () {
    if (isInitializing || isWaitingOnRemote)
        return;
    else if (isLoading) {
        if (loadingAssetsLoaded === loadingAssetsTotal) {
            isLoading = false;
            if (loadingLoadedCallback)
                loadingLoadedCallback();
        }
        else
            return;
    }
    if (uiMode !== UI_MODE_NONE)
        return;
    var time = heart.timer.getTime();
    if (time - _lastFPSTime >= 500) {
        $fpsOverlay.textContent = "fps: " + heart.timer.getFPS();
        _lastFPSTime = time;
    }
    if (gameHasFocus) {
        var mousePos = heart.mouse.getPosition();
        if (mousePos[0] <= Config.ui.scrollPadding)
            cameraX -= 15;
        if (mousePos[0] >= SCREEN_WIDTH - Config.ui.scrollPadding)
            cameraX += 15;
        if (mousePos[1] <= Config.ui.scrollPadding)
            cameraY -= 15;
        if (mousePos[1] >= SCREEN_HEIGHT - Config.ui.scrollPadding)
            cameraY += 15;
        if (time >= lastMousePickTime + 750) {
            lastMousePickTime = time;
            var obj = getObjectUnderCursor(isSelectableObject);
            if (obj !== null)
                changeCursor("pointer");
            else
                changeCursor("auto");
        }
        for (var i = 0; i < floatMessages.length; i++) {
            if (time >= floatMessages[i].startTime + 1000 * Config.ui.floatMessageDuration) {
                floatMessages.splice(i--, 1);
                continue;
            }
        }
    }
    var didTick = (time - lastGameTick >= 1000 / 10);
    if (didTick) {
        lastGameTick = time;
        gameTickTime++;
        if (Config.engine.doTimedEvents && !inCombat) {
            var timedEvents = Scripting.timeEventList;
            var numEvents = timedEvents.length;
            for (var i = 0; i < numEvents; i++) {
                var event_1 = timedEvents[i];
                var obj_1 = event_1.obj;
                if (obj_1 && obj_1 instanceof Critter && obj_1.dead) {
                    console.log("removing timed event for dead object");
                    timedEvents.splice(i--, 1);
                    numEvents--;
                    continue;
                }
                event_1.ticks--;
                if (event_1.ticks <= 0) {
                    Scripting.info("timed event triggered", "timer");
                    event_1.fn();
                    timedEvents.splice(i--, 1);
                    numEvents--;
                }
            }
        }
        audioEngine.tick();
    }
    for (var _i = 0, _a = gMap.getObjects(); _i < _a.length; _i++) {
        var obj_2 = _a[_i];
        if (obj_2.type === "critter") {
            if (didTick && Config.engine.doUpdateCritters && !inCombat && !obj_2.dead &&
                !obj_2.inAnim() && obj_2._script)
                Scripting.updateCritter(obj_2._script, obj_2);
        }
        obj_2.updateAnim();
    }
};
function objectBoundingBox(obj) {
    var scr = hexToScreen(obj.position.x, obj.position.y);
    if (images[obj.art] === undefined)
        return null;
    var info = imageInfo[obj.art];
    if (info === undefined)
        throw "No image map info for: " + obj.art;
    var frameIdx = 0;
    if (obj.frame !== undefined)
        frameIdx += obj.frame;
    if (!(obj.orientation in info.frameOffsets))
        obj.orientation = 0;
    var frameInfo = info.frameOffsets[obj.orientation][frameIdx];
    var dirOffset = info.directionOffsets[obj.orientation];
    var offsetX = Math.floor(frameInfo.w / 2) - dirOffset.x - frameInfo.ox;
    var offsetY = frameInfo.h - dirOffset.y - frameInfo.oy;
    return { x: scr.x - offsetX, y: scr.y - offsetY, w: frameInfo.w, h: frameInfo.h };
}
function objectOnScreen(obj) {
    var bbox = objectBoundingBox(obj);
    if (bbox === null)
        return false;
    if (bbox.x + bbox.w < cameraX || bbox.y + bbox.h < cameraY ||
        bbox.x >= cameraX + SCREEN_WIDTH || bbox.y >= cameraY + SCREEN_HEIGHT)
        return false;
    return true;
}
heart.draw = function () {
    if (isWaitingOnRemote)
        return;
    return renderer.render();
};
function allCritters() { return gMap.getObjects().filter(function (obj) { return obj instanceof Critter; }); }
function dialogueReply(id) { Scripting.dialogueReply(id); }
function dialogueEnd() { Scripting.dialogueEnd(); }
