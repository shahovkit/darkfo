"use strict";
var mapAreas = null;
var proMap = null;
var lstFiles = {};
var messageFiles = {};
var mapInfo = null;
var elevatorInfo = null;
var dirtyMapCache = {};
function getElevator(type) {
    if (!elevatorInfo) {
        console.log("loading elevator info");
        elevatorInfo = getFileJSON("lut/elevators.json");
    }
    return elevatorInfo.elevators[type];
}
function parseAreas(data) {
    var areas = parseIni(data);
    var out = {};
    for (var _area in areas) {
        var area = areas[_area];
        var match = _area.match(/Area (\d+)/);
        if (match === null)
            throw "city.txt: invalid area name: " + area.area_name;
        var areaID = parseInt(match[1]);
        var worldPos = area.world_pos.split(",").map(function (x) { return parseInt(x); });
        var newArea = {
            name: area.area_name,
            id: areaID,
            size: area.size.toLowerCase(),
            state: area.start_state.toLowerCase() === "on",
            worldPosition: { x: worldPos[0], y: worldPos[1] },
            entrances: []
        };
        var mapArtIdx = parseInt(area.townmap_art_idx);
        var labelArtIdx = parseInt(area.townmap_label_art_idx);
        if (mapArtIdx !== -1)
            newArea.mapArt = lookupInterfaceArt(mapArtIdx);
        if (labelArtIdx !== -1)
            newArea.labelArt = lookupInterfaceArt(labelArtIdx);
        for (var _key in area) {
            var s = _key.split("_");
            if (s[0] === "entrance") {
                var entranceString = area[_key];
                s = entranceString.split(",");
                var mapLookupName = s[3].trim();
                var mapName = lookupMapNameFromLookup(mapLookupName);
                if (!mapName)
                    throw Error("Couldn't look up map name");
                var entrance = {
                    startState: s[0],
                    x: parseInt(s[1]),
                    y: parseInt(s[2]),
                    mapLookupName: mapLookupName,
                    mapName: mapName,
                    elevation: parseInt(s[4]),
                    tileNum: parseInt(s[5]),
                    orientation: parseInt(s[6])
                };
                newArea.entrances.push(entrance);
            }
        }
        out[areaID] = newArea;
    }
    return out;
}
function areaContainingMap(mapName) {
    if (!mapAreas)
        throw Error("mapAreas not loaded");
    for (var area in mapAreas) {
        var entrances = mapAreas[area].entrances;
        for (var i = 0; i < entrances.length; i++) {
            if (entrances[i].mapName === mapName)
                return mapAreas[area];
        }
    }
    return null;
}
function loadAreas() {
    return parseAreas(getFileText("data/data/city.txt"));
}
function allAreas() {
    if (mapAreas === null)
        mapAreas = loadAreas();
    var areas = [];
    for (var area in mapAreas)
        areas.push(mapAreas[area]);
    return areas;
}
function loadMessage(name) {
    name = name.toLowerCase();
    var msg = getFileText("data/text/english/game/" + name + ".msg");
    if (messageFiles[name] === undefined)
        messageFiles[name] = {};
    var lines = msg.split(/\r|\n/);
    for (var i = 0; i < lines.length; i++) {
        if (lines[i][0] === '#' || lines[i].trim() === '') {
            lines.splice(i--, 1);
            continue;
        }
        if (lines[i][0] !== '{') {
            lines[i - 1] += lines[i];
            lines.splice(i--, 1);
            continue;
        }
    }
    for (var i = 0; i < lines.length; i++) {
        var m = lines[i].match(/\{(\d+)\}\{.*\}\{(.*)\}/);
        if (m === null)
            throw "message parsing: not a valid line: " + lines[i];
        messageFiles[name][m[1]] = m[2].replace(/\ufffd/g, "'");
    }
}
function loadLst(lst) {
    return getFileText("data/" + lst + ".lst").split('\n');
}
function getLstId(lst, id) {
    if (lstFiles[lst] === undefined)
        lstFiles[lst] = loadLst(lst);
    if (lstFiles[lst] === undefined)
        return null;
    return lstFiles[lst][id];
}
function parseMapInfo() {
    if (mapInfo !== null)
        return;
    mapInfo = {};
    var text = getFileText("data/data/maps.txt");
    var ini = parseIni(text);
    for (var category in ini) {
        var m = category.match(/Map (\d+)/);
        if (!m)
            throw Error("maps.txt: invalid category: " + category);
        var id = m[1];
        if (id === null)
            throw "maps.txt: invalid category: " + category;
        id = parseInt(id);
        var randomStartPoints = [];
        for (var key in ini[category]) {
            if (key.indexOf("random_start_point_") === 0) {
                var startPoint = ini[category][key].match(/elev:(\d), tile_num:(\d+)/);
                if (startPoint === null)
                    throw "invalid random_start_point: " + ini[category][key];
                randomStartPoints.push({ elevation: parseInt(startPoint[1]),
                    tileNum: parseInt(startPoint[2]) });
            }
        }
        var ambientSfx = [];
        var ambient_sfx = ini[category].ambient_sfx;
        if (ambient_sfx) {
            var s = ambient_sfx.split(",");
            for (var i = 0; i < s.length; i++) {
                var kv = s[i].trim().split(":");
                ambientSfx.push([kv[0].toLowerCase(), parseInt(kv[1].toLowerCase())]);
            }
        }
        mapInfo[id] = { name: ini[category].map_name,
            lookupName: ini[category].lookup_name,
            ambientSfx: ambientSfx,
            music: (ini[category].music || "").trim().toLowerCase(),
            randomStartPoints: randomStartPoints };
    }
}
function lookupMapFromLookup(lookupName) {
    if (mapInfo === null)
        parseMapInfo();
    for (var mapID in mapInfo) {
        if (mapInfo[mapID].lookupName === lookupName)
            return mapInfo[mapID];
    }
    return null;
}
function lookupMapNameFromLookup(lookupName) {
    if (mapInfo === null)
        parseMapInfo();
    for (var mapID in mapInfo) {
        if (mapInfo[mapID].lookupName.toLowerCase() === lookupName.toLowerCase())
            return mapInfo[mapID].name;
    }
    return null;
}
function lookupMapName(mapID) {
    if (mapInfo === null)
        parseMapInfo();
    return mapInfo[mapID].name || null;
}
function getMapInfo(mapName) {
    if (mapInfo === null)
        parseMapInfo();
    for (var mapID in mapInfo) {
        if (mapInfo[mapID].name.toLowerCase() === mapName.toLowerCase())
            return mapInfo[mapID];
    }
    return null;
}
function getCurrentMapInfo() {
    return getMapInfo(gMap.name);
}
