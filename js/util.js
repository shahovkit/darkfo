"use strict";
function parseIni(text) {
    var ini = {};
    var lines = text.split('\n');
    var category = null;
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].replace(/\s*;.*/, "");
        if (line.trim() === '') { }
        else if (line[0] === '[')
            category = line.trim().slice(1, -1);
        else {
            var kv = line.match(/(.+?)=(.+)/);
            if (kv === null) {
                console.log("warning: parseIni: not a key=value line: " + line);
                continue;
            }
            if (category === null)
                throw "parseIni: key=value not in category: " + line;
            if (ini[category] === undefined)
                ini[category] = {};
            ini[category][kv[1]] = kv[2];
        }
    }
    return ini;
}
function getFileText(path, err) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", path, false);
    xhr.send(null);
    if (xhr.status !== 200)
        throw Error("getFileText: got status " + xhr.status + " when requesting '" + path + "'");
    return xhr.responseText;
}
function getFileJSON(path, err) {
    return JSON.parse(getFileText(path, err));
}
function getFileBinaryAsync(path, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", path, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = function (evt) { callback(new DataView(xhr.response)); };
    xhr.send(null);
}
function getFileBinarySync(path) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", path, false);
    xhr.overrideMimeType("text/plain; charset=x-user-defined");
    xhr.send(null);
    if (xhr.status !== 200)
        throw Error("getFileBinarySync: got status " + xhr.status + " when requesting '" + path + "'");
    var data = xhr.responseText;
    var buffer = new ArrayBuffer(data.length);
    var arr = new Uint8Array(buffer);
    for (var i = 0; i < data.length; i++)
        arr[i] = data.charCodeAt(i) & 0xff;
    return new DataView(buffer);
}
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function rollSkillCheck(skill, modifier, isBounded) {
    var tempSkill = skill + modifier;
    if (isBounded)
        clamp(0, 95, tempSkill);
    var roll = getRandomInt(0, 100);
    return roll < tempSkill;
}
function rollVsSkill(who, skill, modifier) {
    if (modifier === void 0) { modifier = 0; }
    var skillLevel = critterGetSkill(who, skill) + modifier;
    var roll = skillLevel - getRandomInt(1, 100);
    if (roll <= 0) {
        if ((-roll) / 10 > getRandomInt(1, 100))
            return 0;
        return 1;
    }
    else {
        var critChance = critterGetStat(who, "Critical Chance");
        if ((roll / 10 + critChance) > getRandomInt(1, 100))
            return 3;
        return 2;
    }
}
function rollIsSuccess(roll) {
    return (roll == 2) || (roll == 3);
}
function rollIsCritical(roll) {
    return (roll == 0) || (roll == 3);
}
function arrayRemove(array, value) {
    var index = array.indexOf(value);
    if (index !== -1) {
        array.splice(index, 1);
        return true;
    }
    return false;
}
function arrayWithout(array, value) {
    return array.filter(function (x) { return x !== value; });
}
function arrayIncludes(array, value) {
    return array.indexOf(value) !== -1;
}
function clamp(min, max, value) {
    return Math.max(min, Math.min(max, value));
}
function getMessage(name, id) {
    if (messageFiles[name] !== undefined && messageFiles[name][id] !== undefined)
        return messageFiles[name][id];
    else {
        loadMessage(name);
        if (messageFiles[name] !== undefined && messageFiles[name][id] !== undefined)
            return messageFiles[name][id];
        else
            return null;
    }
}
function getProtoMsg(id) {
    return getMessage("proto", id);
}
function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}
var BinaryReader = (function () {
    function BinaryReader(data) {
        this.offset = 0;
        this.data = data;
        this.length = data.byteLength;
    }
    BinaryReader.prototype.seek = function (offset) { this.offset = offset; };
    BinaryReader.prototype.read8 = function () { return this.data.getUint8(this.offset++); };
    BinaryReader.prototype.read16 = function () { var r = this.data.getUint16(this.offset); this.offset += 2; return r; };
    BinaryReader.prototype.read32 = function () { var r = this.data.getUint32(this.offset); this.offset += 4; return r; };
    BinaryReader.prototype.peek8 = function () { return this.data.getUint8(this.offset); };
    BinaryReader.prototype.peek16 = function () { return this.data.getUint16(this.offset); };
    BinaryReader.prototype.peek32 = function () { return this.data.getUint32(this.offset); };
    return BinaryReader;
}());
function assert(value, message) {
    if (!value)
        throw "AssertionError: " + message;
}
function assertEq(value, expected, message) {
    if (value !== expected)
        throw "AssertionError: value (" + value + ") does not match expected (" + expected + "): " + message;
}
function jQuery_isPlainObject(obj) {
    var proto, Ctor;
    if (!obj || toString.call(obj) !== "[object Object]") {
        return false;
    }
    proto = Object.getPrototypeOf(obj);
    if (!proto) {
        return true;
    }
    Ctor = Object.hasOwnProperty.call(proto, "constructor") && proto.constructor;
    return typeof Ctor === "function" && Object.toString.call(Ctor) === Object.toString.call(Object);
}
function jQuery_extend(deep, target, obj) {
    var options, name, src, copy, copyIsArray, clone, target = arguments[0] || {}, i = 1, length = arguments.length, deep = false;
    if (typeof target === "boolean") {
        deep = target;
        target = arguments[i] || {};
        i++;
    }
    if (typeof target !== "object" && typeof (target) !== "function") {
        target = {};
    }
    if (i === length) {
        target = this;
        i--;
    }
    for (; i < length; i++) {
        if ((options = arguments[i]) != null) {
            for (name in options) {
                src = target[name];
                copy = options[name];
                if (target === copy) {
                    continue;
                }
                if (deep && copy && (jQuery_isPlainObject(copy) ||
                    (copyIsArray = Array.isArray(copy)))) {
                    if (copyIsArray) {
                        copyIsArray = false;
                        clone = src && Array.isArray(src) ? src : [];
                    }
                    else {
                        clone = src && jQuery_isPlainObject(src) ? src : {};
                    }
                    target[name] = jQuery_extend(deep, clone, copy);
                }
                else if (copy !== undefined) {
                    target[name] = copy;
                }
            }
        }
    }
    return target;
}
;
function deepClone(obj) {
    return jQuery_extend(true, {}, obj);
}
function isNumeric(str) {
    return !isNaN(str - parseFloat(str));
}
