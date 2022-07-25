"use strict";
var Worldmap;
(function (Worldmap) {
    var worldmap = null;
    var worldmapPlayer = null;
    var $worldmap = null;
    var $worldmapPlayer = null;
    var $worldmapTarget = null;
    var worldmapTimer = -1;
    var lastEncounterCheck = 0;
    var WORLDMAP_UNDISCOVERED = 0;
    var WORLDMAP_DISCOVERED = 1;
    var WORLDMAP_SEEN = 2;
    var NUM_SQUARES_X = 4 * 7;
    var NUM_SQUARES_Y = 5 * 6;
    var SQUARE_SIZE = 51;
    var WORLDMAP_SPEED = 2;
    var WORLDMAP_ENCOUNTER_CHECK_RATE = 800;
    function parseWorldmap(data) {
        function parseSquare(data) {
            var props = data.split(",").map(function (x) { return x.toLowerCase(); });
            return { terrainType: props[0],
                fillType: props[1],
                frequency: props[2],
                encounterType: props[5],
                difficulty: null,
                state: null
            };
        }
        function parseEncounterReference(data) {
            if (data === "special1")
                return { type: "special" };
            var party = "(?:\\((\\d+)-(\\d+)\\) ([a-z0-9_]+))";
            var re = party + " ?(?:(ambush player)|(fighting) " + party + ")?";
            var m = data.match(new RegExp(re));
            if (!m)
                throw Error("Error parsing encounter reference");
            var firstParty = { start: parseInt(m[1]),
                end: parseInt(m[2]),
                name: m[3]
            };
            if (m[4] === "ambush player") {
                return { type: "ambush", target: "player", party: firstParty };
            }
            else {
                return { type: "fighting",
                    firstParty: firstParty,
                    secondParty: {
                        start: parseInt(m[6]),
                        end: parseInt(m[7]),
                        name: m[8]
                    } };
            }
        }
        function parseEncounter(data) {
            var s = data.trim().split(",");
            var enc = {};
            var isSpecial = false;
            var i = 0;
            for (; i < s.length; i++) {
                var kv = s[i].split(":");
                if (kv.length === 2)
                    enc[kv[0].toLowerCase()] = kv[1].toLowerCase();
                if (s[i].toLowerCase().trim() === "special")
                    isSpecial = true;
            }
            var cond = s[i - 1].toLowerCase().trim();
            if (cond.indexOf('if') !== 0)
                cond = null;
            return { chance: parseInt(enc.chance),
                scenery: enc.scenery,
                enc: enc.enc ? parseEncounterReference(enc.enc) : enc.enc,
                cond: cond ? Encounters.parseConds(cond) : null,
                special: isSpecial ? enc.map : null,
                condOrig: cond
            };
        }
        function parseEncounterItem(data) {
            var m = data.match(/(?:\((\d+)-(\d+)\))?(\d+)(?:\((wielded)\))?/);
            var range = null;
            if (m[1] !== undefined)
                range = { start: parseInt(m[1]),
                    end: parseInt(m[2]) };
            var item = { range: range,
                pid: parseInt(m[3]),
                wielded: (m[4] !== undefined) };
            return item;
        }
        function parseEncounterCritter(data) {
            var s = data.trim().split(",");
            var enc = {};
            var items = [];
            var i = 0;
            for (; i < s.length; i++) {
                var kv = s[i].split(":").map(function (x) { return x.toLowerCase().trim(); });
                if (kv[0] === "item") {
                    items.push(parseEncounterItem(kv[1]));
                }
                else if (kv.length === 2)
                    enc[kv[0]] = kv[1];
            }
            var isDead = s[0] === "dead";
            var cond = s[i - 1].toLowerCase().trim();
            if (cond.indexOf('if') !== 0)
                cond = null;
            return { ratio: enc.ratio ? parseInt(enc.ratio) : null,
                pid: enc.pid ? parseInt(enc.pid) : null,
                script: enc.script ? parseInt(enc.script) : null,
                items: items,
                dead: isDead,
                cond: cond ? Encounters.parseConds(cond) : null };
        }
        function parseKeyed(data) {
            var items = data.split(",").map(function (x) { return x.trim(); });
            var out = {};
            for (var i = 0; i < items.length; i++) {
                var s = items[i].split(":");
                if (isNumeric(s[1]))
                    s[1] = parseFloat(s[1]);
                out[s[0].toLowerCase()] = s[1];
            }
            return out;
        }
        var ini = parseIni(data);
        var encounterTables = {};
        var encounterGroups = {};
        var squares = new Array(NUM_SQUARES_X);
        for (var i = 0; i < NUM_SQUARES_X; i++)
            squares[i] = new Array(NUM_SQUARES_Y);
        for (var key in ini) {
            var m = key.match(/Tile (\d+)/);
            if (m !== null) {
                var tileNum = parseInt(m[1]);
                var tileX = tileNum % 4;
                var tileY = Math.floor(tileNum / 4);
                var difficulty = parseInt(ini[key].encounter_difficulty);
                for (var position in ini[key]) {
                    var pos = position.match(/(\d)_(\d)/);
                    if (pos === null)
                        continue;
                    var x = tileX * 7 + parseInt(pos[1]);
                    var y = tileY * 6 + parseInt(pos[2]);
                    squares[x][y] = parseSquare(ini[key][position]);
                    squares[x][y].difficulty = difficulty;
                    squares[x][y].state = WORLDMAP_UNDISCOVERED;
                }
            }
            else if (key.indexOf("Encounter Table") === 0) {
                var name_1 = ini[key].lookup_name.toLowerCase();
                var maps = ini[key].maps.split(",").map(function (x) { return x.trim(); });
                var encounter = { maps: maps, encounters: [] };
                for (var prop in ini[key]) {
                    if (prop.indexOf("enc_") === 0) {
                        encounter.encounters.push(parseEncounter(ini[key][prop]));
                    }
                }
                encounterTables[name_1] = encounter;
            }
            else if (key.indexOf("Encounter:") === 0) {
                var groupName = key.slice("Encounter: ".length).toLowerCase();
                var position = null;
                if (ini[key].position !== undefined) {
                    var position_ = ini[key].position.split(",").map(function (x) { return x.trim().toLowerCase(); });
                    position = { type: position_[0], spacing: 3 };
                }
                else {
                    position = { type: "surrounding", spacing: 5 };
                }
                var group = { critters: [], position: position };
                for (var prop in ini[key]) {
                    if (prop.indexOf("type_") === 0) {
                        group.critters.push(parseEncounterCritter(ini[key][prop]));
                    }
                }
                encounterGroups[groupName] = group;
            }
        }
        var encounterRates = {};
        for (var key in ini.Data) {
            encounterRates[key.toLowerCase()] = parseInt(ini.Data[key]);
        }
        return { squares: squares, encounterTables: encounterTables, encounterGroups: encounterGroups, encounterRates: encounterRates,
            terrainSpeed: parseKeyed(ini.Data.terrain_types) };
    }
    function getEncounterGroup(groupName) {
        return worldmap.encounterGroups[groupName];
    }
    Worldmap.getEncounterGroup = getEncounterGroup;
    function positionToSquare(pos) {
        return { x: Math.floor(pos.x / SQUARE_SIZE),
            y: Math.floor(pos.y / SQUARE_SIZE) };
    }
    function setSquareStateAt(squarePos, newState, seeAdjacent) {
        if (seeAdjacent === void 0) { seeAdjacent = true; }
        if (squarePos.x < 0 || squarePos.x >= NUM_SQUARES_X ||
            squarePos.y < 0 || squarePos.y >= NUM_SQUARES_Y)
            return;
        var oldState = worldmap.squares[squarePos.x][squarePos.y].state;
        worldmap.squares[squarePos.x][squarePos.y].state = newState;
        if (oldState === WORLDMAP_DISCOVERED && newState === WORLDMAP_SEEN)
            return;
        var stateName = {};
        stateName[WORLDMAP_UNDISCOVERED] = "undiscovered";
        stateName[WORLDMAP_DISCOVERED] = "discovered";
        stateName[WORLDMAP_SEEN] = "seen";
        var $square = document.querySelector("div.worldmapSquare[square-x='" + squarePos.x + "'][square-y='" + squarePos.y + "']");
        $square.classList.remove("worldmapSquare-" + stateName[oldState]);
        $square.classList.add("worldmapSquare-" + stateName[newState]);
        if (seeAdjacent === true) {
            setSquareStateAt({ x: squarePos.x - 1, y: squarePos.y }, WORLDMAP_SEEN, false);
            if (worldmap.squares[squarePos.x][squarePos.y].fillType === "fill_w")
                return;
            setSquareStateAt({ x: squarePos.x + 1, y: squarePos.y }, WORLDMAP_SEEN, false);
            setSquareStateAt({ x: squarePos.x, y: squarePos.y - 1 }, WORLDMAP_SEEN, false);
            setSquareStateAt({ x: squarePos.x, y: squarePos.y + 1 }, WORLDMAP_SEEN, false);
            setSquareStateAt({ x: squarePos.x - 1, y: squarePos.y - 1 }, WORLDMAP_SEEN, false);
            setSquareStateAt({ x: squarePos.x + 1, y: squarePos.y - 1 }, WORLDMAP_SEEN, false);
            setSquareStateAt({ x: squarePos.x - 1, y: squarePos.y + 1 }, WORLDMAP_SEEN, false);
            setSquareStateAt({ x: squarePos.x + 1, y: squarePos.y + 1 }, WORLDMAP_SEEN, false);
        }
    }
    function execEncounter(encTable) {
        var enc = Encounters.evalEncounter(encTable);
        console.log("final: map %s, groups %o", enc.mapName, enc.groups);
        gMap.loadMap(enc.mapName, undefined, undefined, function () {
            Encounters.positionCritters(enc.groups, player.position, lookupMapFromLookup(enc.mapLookupName));
            enc.groups.forEach(function (group) {
                group.critters.forEach(function (critter) {
                    var obj = createObjectWithPID(critter.pid, critter.script ? critter.script : undefined);
                    gMap.addObject(obj);
                    obj.move(critter.position);
                });
            });
            if (enc.encounterType === "ambush" && Config.engine.doCombat === true)
                Combat.start();
        });
    }
    function doEncounter() {
        var squarePos = positionToSquare(worldmapPlayer);
        var square = worldmap.squares[squarePos.x][squarePos.y];
        var encTable = worldmap.encounterTables[square.encounterType];
        console.log("enc table: %s -> %o", square.encounterType, encTable);
        execEncounter(encTable);
    }
    Worldmap.doEncounter = doEncounter;
    function didEncounter() {
        var squarePos = positionToSquare(worldmapPlayer);
        var square = worldmap.squares[squarePos.x][squarePos.y];
        var encRate = worldmap.encounterRates[square.frequency];
        if (encRate === 0)
            return false;
        else if (encRate === 100)
            return true;
        else {
            var roll = getRandomInt(0, 100);
            console.log("encounter: rolled %d vs %d", roll, encRate);
            if (roll < encRate) {
                return true;
            }
        }
        return false;
    }
    Worldmap.didEncounter = didEncounter;
    function centerWorldmapTarget(x, y) {
        $worldmapTarget.style.left = (x - $worldmapTarget.offsetWidth / 2 | 0) + "px";
        $worldmapTarget.style.top = (y - $worldmapTarget.offsetHeight / 2 | 0) + "px";
    }
    function init() {
        $worldmapPlayer = $id("worldmapPlayer");
        $worldmapTarget = $id("worldmapTarget");
        $worldmap = $id("worldmap");
        worldmap = parseWorldmap(getFileText("data/data/worldmap.txt"));
        if (!mapAreas)
            mapAreas = loadAreas();
        $worldmap.onclick = function (e) {
            var box = this.getBoundingClientRect();
            var offsetLeft = box.left | 0 + window.pageXOffset;
            var offsetTop = box.top | 0 + window.pageYOffset;
            var x = e.pageX - offsetLeft;
            var y = e.pageY - offsetTop;
            var ax = x + this.scrollLeft;
            var ay = y + this.scrollTop;
            worldmapPlayer.target = { x: ax, y: ay };
            showv($worldmapPlayer);
            Object.assign($worldmapTarget.style, { backgroundImage: "url('art/intrface/wmaptarg.png')",
                left: ax + "px", top: ay + "px" });
            console.log("targeting: " + ax + ", " + ay);
        };
        $worldmapTarget.onclick = function (e) {
            var area = withinArea(worldmapPlayer);
            if (area !== null) {
                e.stopPropagation();
                uiWorldMapShowArea(area);
            }
            else {
            }
        };
        for (var key in mapAreas) {
            var area = mapAreas[key];
            if (area.state !== true)
                continue;
            var $area = makeEl("div", { classes: ["area"] });
            $worldmap.appendChild($area);
            var $el = makeEl("div", { classes: ["areaCircle", "areaSize-" + area.size] });
            $area.appendChild($el);
            var x = area.worldPosition.x - $el.offsetWidth / 2;
            var y = area.worldPosition.y - $el.offsetHeight / 2;
            $area.style.left = x + "px";
            $area.style.top = y + "px";
            var $label = makeEl("div", { classes: ["areaLabel"], style: { left: "0px", top: (2 + $el.offsetHeight) + "px" } });
            $area.appendChild($label);
            $label.textContent = area.name;
        }
        for (var x = 0; x < NUM_SQUARES_X; x++) {
            for (var y = 0; y < NUM_SQUARES_Y; y++) {
                var state = worldmap.squares[x][y].state;
                if (state === WORLDMAP_UNDISCOVERED)
                    state = "undiscovered";
                else if (state === WORLDMAP_DISCOVERED)
                    state = "discovered";
                else if (state === WORLDMAP_SEEN)
                    state = "seen";
                var $el = makeEl("div", { classes: ["worldmapSquare", "worldmapSquare-" + state],
                    style: {
                        left: (x * SQUARE_SIZE) + "px",
                        top: (y * SQUARE_SIZE) + "px"
                    },
                    attrs: {
                        "square-x": x + "",
                        "square-y": y + ""
                    }
                });
                $worldmap.appendChild($el);
            }
        }
        worldmapPlayer = { x: mapAreas[0].worldPosition.x, y: mapAreas[0].worldPosition.y, target: null };
        $worldmapTarget.style.left = worldmapPlayer.x + "px";
        $worldmapTarget.style.top = worldmapPlayer.y + "px";
        setSquareStateAt(positionToSquare(worldmapPlayer), WORLDMAP_DISCOVERED);
        if (withinArea(worldmapPlayer) !== null) {
            hidev($worldmapPlayer);
            $worldmapTarget.style.backgroundImage = "url('art/intrface/hotspot1.png')";
        }
    }
    Worldmap.init = init;
    function start() {
        updateWorldmapPlayer();
    }
    Worldmap.start = start;
    function stop() {
        clearTimeout(worldmapTimer);
    }
    Worldmap.stop = stop;
    function withinArea(position) {
        for (var areaNum in mapAreas) {
            var area = mapAreas[areaNum];
            var radius = (area.size === "large" ? 32 : 16);
            if (pointIntersectsCircle(area.worldPosition, radius, position)) {
                console.log("intersects " + area.name);
                return area;
            }
        }
        return null;
    }
    function updateWorldmapPlayer() {
        $worldmapPlayer.style.left = worldmapPlayer.x + "px";
        $worldmapPlayer.style.top = worldmapPlayer.y + "px";
        if (worldmapPlayer.target) {
            var dx = worldmapPlayer.target.x - worldmapPlayer.x;
            var dy = worldmapPlayer.target.y - worldmapPlayer.y;
            var len = Math.sqrt(dx * dx + dy * dy);
            var squarePos = positionToSquare(worldmapPlayer);
            var currentSquare = worldmap.squares[squarePos.x][squarePos.y];
            var speed = WORLDMAP_SPEED / worldmap.terrainSpeed[currentSquare.terrainType];
            if (len < speed) {
                worldmapPlayer.x = worldmapPlayer.target.x;
                worldmapPlayer.y = worldmapPlayer.target.y;
                worldmapPlayer.target = null;
                hidev($worldmapPlayer);
                $worldmapTarget.style.backgroundImage = "url('art/intrface/hotspot1.png')";
                centerWorldmapTarget(worldmapPlayer.x, worldmapPlayer.y);
            }
            else {
                dx /= len;
                dy /= len;
                worldmapPlayer.x += dx * speed;
                worldmapPlayer.y += dy * speed;
            }
            var width = $worldmap.offsetWidth;
            var height = $worldmap.offsetHeight;
            var sx = clamp(0, width, Math.floor(worldmapPlayer.x - width / 2));
            var sy = clamp(0, height, Math.floor(worldmapPlayer.y - height / 2));
            $worldmap.scrollLeft = sx;
            $worldmap.scrollTop = sy;
            if (currentSquare.state !== WORLDMAP_DISCOVERED)
                setSquareStateAt(squarePos, WORLDMAP_DISCOVERED);
            var time = heart.timer.getTime();
            if (Config.engine.doEncounters === true && (time >= lastEncounterCheck + WORLDMAP_ENCOUNTER_CHECK_RATE)) {
                lastEncounterCheck = time;
                var hadEncounter = didEncounter();
                if (hadEncounter === true) {
                    $worldmapPlayer.style.backgroundImage = "url('art/intrface/wmapfgt0.png')";
                    setTimeout(function () {
                        doEncounter();
                        uiCloseWorldMap();
                        $worldmapPlayer.style.backgroundImage = "url('art/intrface/wmaploc.png')";
                    }, 1000);
                    clearTimeout(worldmapTimer);
                    return;
                }
            }
        }
        worldmapTimer = setTimeout(updateWorldmapPlayer, 75);
    }
})(Worldmap || (Worldmap = {}));
