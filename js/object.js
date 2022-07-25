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
var _lastObjectUID = 0;
function objectGetMoney(obj) {
    var MONEY_PID = 41;
    for (var i = 0; i < obj.inventory.length; i++) {
        if (obj.inventory[i].pid === MONEY_PID) {
            return obj.inventory[i].amount;
        }
    }
    return 0;
}
function objectSingleAnim(obj, reversed, callback) {
    if (reversed)
        obj.frame = imageInfo[obj.art].numFrames - 1;
    else
        obj.frame = 0;
    obj.lastFrameTime = 0;
    obj.anim = reversed ? "reverse" : "single";
    obj.animCallback = callback || (function () { obj.anim = null; });
}
function canUseObject(obj, source) {
    if (obj._script !== undefined && obj._script.use_p_proc !== undefined)
        return true;
    else if (obj.type === "item" || obj.type === "scenery")
        if (objectIsDoor(obj) || objectIsStairs(obj) || objectIsLadder(obj))
            return true;
        else
            return (obj.pro.extra.actionFlags & 8) != 0;
    return false;
}
function objectIsDoor(obj) {
    return (obj.type === "scenery" && obj.pro.extra.subType === 0);
}
function objectIsStairs(obj) {
    return (obj.type === "scenery" && obj.pro.extra.subType === 1);
}
function objectIsLadder(obj) {
    return (obj.type === "scenery" &&
        (obj.pro.extra.subType === 3 ||
            obj.pro.extra.subType === 4));
}
function objectIsContainer(obj) {
    return (obj.type === "item" && obj.pro.extra.subType === 1);
}
function objectIsWeapon(obj) {
    if (obj === undefined || obj === null)
        return false;
    return obj.weapon !== undefined;
}
function objectIsExplosive(obj) {
    return (obj.pid === 85 || obj.pid === 51);
}
function objectFindItemIndex(obj, item) {
    for (var i = 0; i < obj.inventory.length; i++) {
        if (obj.inventory[i].pid === item.pid)
            return i;
    }
    return -1;
}
function cloneItem(item) { return Object.assign({}, item); }
function objectSwapItem(a, item, b, amount) {
    if (amount === 0)
        return;
    var idx = objectFindItemIndex(a, item);
    if (idx === -1)
        throw "item (" + item + ") does not exist in a";
    if (amount !== undefined && amount < item.amount) {
        item.amount -= amount;
        b.addInventoryItem(cloneItem(item), amount);
    }
    else {
        a.inventory.splice(idx, 1);
        b.addInventoryItem(item, amount || 1);
    }
}
function objectGetDamageType(obj) {
    if (obj.dmgType !== undefined)
        return obj.dmgType;
    throw "no damage type for obj: " + obj;
}
function objectExplode(obj, source, minDmg, maxDmg) {
    var damage = maxDmg;
    var explosion = createObjectWithPID(makePID(5, 14), -1);
    explosion.position.x = obj.position.x;
    explosion.position.y = obj.position.y;
    obj.dmgType = "explosion";
    lazyLoadImage(explosion.art, function () {
        gMap.addObject(explosion);
        console.log("adding explosion");
        objectSingleAnim(explosion, false, function () {
            gMap.destroyObject(explosion);
            var hexes = hexesInRadius(obj.position, 8);
            for (var i = 0; i < hexes.length; i++) {
                var objs = objectsAtPosition(hexes[i]);
                for (var j = 0; j < objs.length; j++) {
                    if (objs[j].type === "critter")
                        console.log("todo: damage", objs[j].name);
                    Scripting.damage(objs[j], obj, obj, damage);
                }
            }
            gMap.destroyObject(obj);
        });
    });
}
function useExplosive(obj, source) {
    if (source.isPlayer !== true)
        return;
    var mins, secs;
    while (true) {
        var time = prompt("Time to detonate?", "1:00");
        if (time === null)
            return;
        var s = time.split(':');
        if (s.length !== 2)
            continue;
        mins = parseInt(s[0]);
        secs = parseInt(s[1]);
        if (isNaN(mins) || isNaN(secs))
            continue;
        break;
    }
    var ticks = (mins * 60 * 10) + secs * 10;
    console.log("arming explosive for " + ticks + " ticks");
    Scripting.timeEventList.push({ ticks: ticks, obj: null, userdata: null, fn: function () {
            objectExplode(obj, source, 10, 25);
        } });
}
function setObjectOpen(obj, open, loot, signalEvent) {
    if (loot === void 0) { loot = true; }
    if (signalEvent === void 0) { signalEvent = true; }
    if (!objectIsDoor(obj) && !objectIsContainer(obj))
        return false;
    if (obj.locked)
        return false;
    obj.open = open;
    if (signalEvent) {
        Events.emit("objSetOpen", { obj: obj, open: open });
        Events.emit(open ? "objOpen" : "objClose", { obj: obj });
    }
    objectSingleAnim(obj, !open, function () {
        obj.anim = null;
        if (loot && objectIsContainer(obj) && open) {
            uiLoot(obj);
        }
    });
    return true;
}
function toggleObjectOpen(obj, loot, signalEvent) {
    if (loot === void 0) { loot = true; }
    if (signalEvent === void 0) { signalEvent = true; }
    return setObjectOpen(obj, !obj.open, loot, signalEvent);
}
function useObject(obj, source, useScript) {
    if (canUseObject(obj, source) === false) {
        console.log("can't use object");
        return false;
    }
    if (useScript !== false && obj._script && obj._script.use_p_proc !== undefined) {
        if (source === undefined)
            source = player;
        if (Scripting.use(obj, source) === true) {
            console.log("useObject: overriden");
            return true;
        }
    }
    else if (obj.script !== undefined && !obj._script)
        console.log("object used has script but is not loaded: " + obj.script);
    if (objectIsExplosive(obj)) {
        useExplosive(obj, source);
        return true;
    }
    if (objectIsDoor(obj) || objectIsContainer(obj)) {
        toggleObjectOpen(obj, true, true);
    }
    else if (objectIsStairs(obj)) {
        var destTile = fromTileNum(obj.extra.destination & 0xffff);
        var destElev = ((obj.extra.destination >> 28) & 0xf) >> 1;
        if (obj.extra.destinationMap === -1 && obj.extra.destination !== -1) {
            console.log("stairs: tile: " + destTile.x + ", " + destTile.y + ", elev: " + destElev);
            player.position = destTile;
            gMap.changeElevation(destElev);
        }
        else {
            console.log("stairs -> " + obj.extra.destinationMap + " @ " + destTile.x +
                ", " + destTile.y + ", elev: " + destElev);
            gMap.loadMapByID(obj.extra.destinationMap, destTile, destElev);
        }
    }
    else if (objectIsLadder(obj)) {
        var isTop = (obj.pro.extra.subType === 4);
        var level = isTop ? currentElevation + 1 : currentElevation - 1;
        var destTile = fromTileNum(obj.extra.destination & 0xffff);
        console.log("ladder (" + (isTop ? "top" : "bottom") + " -> level " + level + ")");
        player.position = destTile;
        gMap.changeElevation(level);
    }
    else
        objectSingleAnim(obj);
    gMap.updateMap();
    return true;
}
function objectFindIndex(obj) {
    return gMap.getObjects().findIndex(function (object) { return object === obj; });
}
function objectZCompare(a, b) {
    var aY = a.position.y;
    var bY = b.position.y;
    var aX = a.position.x;
    var bX = b.position.x;
    if (aY === bY) {
        if (aX < bX)
            return -1;
        else if (aX > bX)
            return 1;
        else if (aX === bX) {
            if (a.type === "wall")
                return -1;
            else if (b.type === "wall")
                return 1;
            else
                return 0;
        }
    }
    else if (aY < bY)
        return -1;
    else if (aY > bY)
        return 1;
    throw "unreachable";
}
function objectZOrder(obj, index) {
    var oldIdx = (index !== undefined) ? index : objectFindIndex(obj);
    if (oldIdx === -1) {
        console.log("objectZOrder: no such object...");
        return;
    }
    var objects = gMap.getObjects();
    objects.splice(oldIdx, 1);
    var inserted = false;
    for (var i = 0; i < objects.length; i++) {
        var zc = objectZCompare(obj, objects[i]);
        if (zc === -1) {
            objects.splice(i, 0, obj);
            inserted = true;
            break;
        }
    }
    if (!inserted)
        objects.push(obj);
}
function zsort(objects) {
    objects.sort(objectZCompare);
}
function useElevator() {
    console.log("[elevator]");
    var center = player.position;
    var hexes = hexesInRadius(center, 11);
    var elevatorStub = null;
    for (var i = 0; i < hexes.length; i++) {
        var objs = objectsAtPosition(hexes[i]);
        for (var j = 0; j < objs.length; j++) {
            var obj = objs[j];
            if (obj.type === "scenery" && obj.pidID === 1293) {
                console.log("elevator stub @ " + hexes[i].x +
                    ", " + hexes[i].y);
                elevatorStub = obj;
                break;
            }
        }
    }
    if (elevatorStub === null)
        throw "couldn't find elevator stub near " + center.x + ", " + center.y;
    console.log("elevator type: " + elevatorStub.extra.type + ", " +
        "level: " + elevatorStub.extra.level);
    var elevator = getElevator(elevatorStub.extra.type);
    if (!elevator)
        throw "no elevator: " + elevatorStub.extra.type;
    uiElevator(elevator);
}
var Obj = (function () {
    function Obj() {
        this.uid = -1;
        this.type = null;
        this.pro = null;
        this.flags = 0;
        this.frmPID = null;
        this.orientation = null;
        this.visible = true;
        this.open = false;
        this.locked = false;
        this.anim = null;
        this.animCallback = null;
        this.frame = 0;
        this.lastFrameTime = 0;
        this.shift = null;
        this.outline = null;
        this.amount = 1;
        this.position = { x: -1, y: -1 };
        this.inventory = [];
        this.lightRadius = 0;
        this.lightIntensity = 655;
    }
    Obj.fromPID = function (pid, sid) {
        return Obj.fromPID_(new Obj(), pid, sid);
    };
    Obj.fromPID_ = function (obj, pid, sid) {
        console.log("fromPID: pid=" + pid + ", sid=" + sid);
        var pidType = (pid >> 24) & 0xff;
        var pidID = pid & 0xffff;
        var pro = loadPRO(pid, pidID);
        obj.type = getPROTypeName(pidType);
        obj.pid = pid;
        obj.pro = pro;
        obj.flags = obj.pro.flags;
        if (pidType == 0) {
            obj.subtype = getPROSubTypeName(pro.extra.subtype);
            obj.name = getMessage("pro_item", pro.textID);
            var invPID = pro.extra.invFRM & 0xffff;
            console.log("invPID: " + invPID + ", pid=" + pid);
            if (invPID !== 0xffff)
                obj.invArt = "art/inven/" + getLstId("art/inven/inven", invPID).split('.')[0];
        }
        if (obj.pro !== undefined)
            obj.art = lookupArt(makePID(obj.pro.frmType, obj.pro.frmPID));
        else
            obj.art = "art/items/RESERVED";
        obj.init();
        obj.loadScript(sid);
        return obj;
    };
    Obj.fromMapObject = function (mobj, deserializing) {
        if (deserializing === void 0) { deserializing = false; }
        return Obj.fromMapObject_(new Obj(), mobj, deserializing);
    };
    Obj.fromMapObject_ = function (obj, mobj, deserializing) {
        if (deserializing === void 0) { deserializing = false; }
        if (mobj.uid)
            obj.uid = mobj.uid;
        obj.pid = mobj.pid;
        obj.pidID = mobj.pidID;
        obj.frmPID = mobj.frmPID;
        obj.orientation = mobj.orientation;
        if (obj.type === null)
            obj.type = mobj.type;
        obj.art = mobj.art;
        obj.position = mobj.position;
        obj.lightRadius = mobj.lightRadius;
        obj.lightIntensity = mobj.lightIntensity;
        obj.subtype = mobj.subtype;
        obj.amount = mobj.amount;
        obj.inventory = mobj.inventory;
        obj.script = mobj.script;
        obj.extra = mobj.extra;
        obj.pro = mobj.pro || loadPRO(obj.pid, obj.pidID);
        obj.flags = mobj.flags;
        obj.init();
        if (deserializing) {
            obj.inventory = mobj.inventory.map(function (obj) { return deserializeObj(obj); });
            obj.script = mobj.script;
            if (mobj._script)
                obj._script = Scripting.deserializeScript(mobj._script);
        }
        else if (Config.engine.doLoadScripts)
            obj.loadScript();
        return obj;
    };
    Obj.prototype.init = function () {
        if (this.uid === -1)
            this.uid = _lastObjectUID++;
        if (this.inventory !== undefined)
            this.inventory = this.inventory.map(function (obj) { return objFromMapObject(obj); });
    };
    Obj.prototype.loadScript = function (sid) {
        if (sid === void 0) { sid = -1; }
        var scriptName = null;
        if (sid >= 0)
            scriptName = lookupScriptName(sid);
        else if (this.script)
            scriptName = this.script;
        else if (this.pro) {
            if (this.pro.extra !== undefined && this.pro.extra.scriptID >= 0) {
                console.warn("PRO says sid is " + (this.pro.extra.scriptID & 0xffff) + " (" + scriptName + "), but we're not ascribing it one (test)");
            }
            else if (this.pro.scriptID >= 0) {
                console.warn("PRO says sid is " + (this.pro.extra.scriptID & 0xffff) + " (" + scriptName + "), but we're not ascribing it one (test)");
            }
        }
        if (scriptName != null) {
            if (Config.engine.doLogScriptLoads)
                console.log("loadScript: loading %s (sid=%d)", scriptName, sid);
            var script = Scripting.loadScript(scriptName);
            if (!script) {
                console.log("loadScript: load script failed for %s (sid=%d)", scriptName, sid);
            }
            else {
                this.script = scriptName;
                this._script = script;
                Scripting.initScript(this._script, this);
            }
        }
    };
    Obj.prototype.enterMap = function () {
        if (this._script)
            Scripting.objectEnterMap(this, currentElevation, gMap.mapID);
    };
    Obj.prototype.setAmount = function (amount) {
        this.amount = amount;
        return this;
    };
    Obj.prototype.move = function (position, curIdx, signalEvents) {
        if (signalEvents === void 0) { signalEvents = true; }
        this.position = position;
        if (signalEvents)
            Events.emit("objMove", { obj: this, position: position });
        if (Config.engine.doFloorLighting)
            Lightmap.rebuildLight();
        if (Config.engine.doZOrder !== false)
            objectZOrder(this, curIdx);
        return true;
    };
    Obj.prototype.updateAnim = function () {
        if (!this.anim)
            return;
        var time = heart.timer.getTime();
        var fps = imageInfo[this.art].fps;
        if (fps === 0)
            fps = 10;
        if (time - this.lastFrameTime >= 1000 / fps) {
            if (this.anim === "reverse")
                this.frame--;
            else
                this.frame++;
            this.lastFrameTime = time;
            if (this.frame === -1 || this.frame === imageInfo[this.art].numFrames) {
                if (this.anim === "reverse")
                    this.frame++;
                else
                    this.frame--;
                if (this.animCallback)
                    this.animCallback();
            }
        }
    };
    Obj.prototype.blocks = function () {
        if (this.type === "misc")
            return false;
        if (!this.pro)
            return true;
        if (this.subtype === "door")
            return !this.open;
        if (this.visible === false)
            return false;
        return !(this.pro.flags & 0x00000010);
    };
    Obj.prototype.inAnim = function () {
        return !!this.animCallback;
    };
    Obj.prototype.clearAnim = function () {
        this.frame = 0;
        this.animCallback = null;
        this.anim = null;
        this.shift = null;
    };
    Obj.prototype.approxEq = function (obj) {
        return (this.pid === obj.pid);
    };
    Obj.prototype.clone = function () {
        if (this._script) {
            console.log("cloning an object with a script: %o", this);
            var _script = this._script;
            this._script = null;
            var obj = deepClone(this);
            this._script = _script;
            obj.loadScript();
            return obj;
        }
        return deepClone(this);
    };
    Obj.prototype.addInventoryItem = function (item, count) {
        if (count === void 0) { count = 1; }
        for (var i = 0; i < this.inventory.length; i++) {
            if (this.inventory[i].approxEq(item)) {
                this.inventory[i].amount += count;
                return;
            }
        }
        this.inventory.push(item.clone().setAmount(count));
    };
    Obj.prototype.getMessageCategory = function () {
        var categories = {
            "item": "pro_item",
            "critter": "pro_crit",
            "scenery": "pro_scen",
            "wall": "pro_wall",
            "misc": "pro_misc"
        };
        return categories[this.type];
    };
    Obj.prototype.getDescription = function () {
        if (!this.pro)
            return null;
        return getMessage(this.getMessageCategory(), this.pro.textID + 1) || null;
    };
    Obj.prototype.serialize = function () {
        return {
            uid: this.uid,
            pid: this.pid,
            pidID: this.pidID,
            type: this.type,
            pro: this.pro,
            flags: this.flags,
            art: this.art,
            frmPID: this.frmPID,
            orientation: this.orientation,
            visible: this.visible,
            extra: this.extra,
            script: this.script,
            _script: this._script ? this._script._serialize() : null,
            name: this.name,
            subtype: this.subtype,
            invArt: this.invArt,
            frame: this.frame,
            amount: this.amount,
            position: { x: this.position.x, y: this.position.y },
            inventory: this.inventory.map(function (obj) { return obj.serialize(); }),
            lightRadius: this.lightRadius,
            lightIntensity: this.lightIntensity
        };
    };
    return Obj;
}());
var Item = (function (_super) {
    __extends(Item, _super);
    function Item() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.type = "item";
        return _this;
    }
    Item.fromPID = function (pid, sid) { return Obj.fromPID_(new Item(), pid, sid); };
    Item.fromMapObject = function (mobj, deserializing) {
        if (deserializing === void 0) { deserializing = false; }
        return Obj.fromMapObject_(new Item(), mobj, deserializing);
    };
    Item.prototype.init = function () {
        _super.prototype.init.call(this);
        if (this.pro === null)
            return;
        this.name = getMessage("pro_item", this.pro.textID);
        var invPID = this.pro.extra.invFRM & 0xffff;
        if (invPID !== 0xffff)
            this.invArt = "art/inven/" + getLstId("art/inven/inven", invPID).split('.')[0];
    };
    return Item;
}(Obj));
var WeaponObj = (function (_super) {
    __extends(WeaponObj, _super);
    function WeaponObj() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.weapon = null;
        return _this;
    }
    WeaponObj.fromPID = function (pid, sid) { return Obj.fromPID_(new WeaponObj(), pid, sid); };
    WeaponObj.fromMapObject = function (mobj, deserializing) {
        if (deserializing === void 0) { deserializing = false; }
        return Obj.fromMapObject_(new WeaponObj(), mobj, deserializing);
    };
    WeaponObj.prototype.init = function () {
        _super.prototype.init.call(this);
        this.weapon = new Weapon(this);
    };
    return WeaponObj;
}(Item));
var Scenery = (function (_super) {
    __extends(Scenery, _super);
    function Scenery() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.type = "scenery";
        return _this;
    }
    Scenery.fromPID = function (pid, sid) { return Obj.fromPID_(new Scenery(), pid, sid); };
    Scenery.fromMapObject = function (mobj, deserializing) {
        if (deserializing === void 0) { deserializing = false; }
        return Obj.fromMapObject_(new Scenery(), mobj, deserializing);
    };
    Scenery.prototype.init = function () {
        _super.prototype.init.call(this);
        if (!this.pro)
            return;
        var subtypeMap = {
            0: "door", 1: "stairs", 2: "elevator", 3: "ladder",
            4: "ladder", 5: "generic"
        };
        this.subtype = subtypeMap[this.pro.extra.subType];
    };
    return Scenery;
}(Obj));
var Door = (function (_super) {
    __extends(Door, _super);
    function Door() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Door.fromPID = function (pid, sid) { return Obj.fromPID_(new Door(), pid, sid); };
    Door.fromMapObject = function (mobj, deserializing) {
        if (deserializing === void 0) { deserializing = false; }
        return Obj.fromMapObject_(new Door(), mobj, deserializing);
    };
    Door.prototype.init = function () {
        _super.prototype.init.call(this);
    };
    return Door;
}(Scenery));
function createObjectWithPID(pid, sid) {
    var pidType = (pid >> 24) & 0xff;
    if (pidType == 1)
        return Critter.fromPID(pid, sid);
    else if (pidType == 0) {
        var pro = loadPRO(pid, pid & 0xffff);
        if (pro && pro.extra && pro.extra.subType == 3)
            return WeaponObj.fromPID(pid, sid);
        else
            return Item.fromPID(pid, sid);
    }
    else if (pidType == 2) {
        var pro = loadPRO(pid, pid & 0xffff);
        if (pro && pro.extra && pro.extra.subType == 0)
            return Door.fromPID(pid, sid);
        else
            return Scenery.fromPID(pid, sid);
    }
    else
        return Obj.fromPID(pid, sid);
}
function objFromMapObject(mobj, deserializing) {
    if (deserializing === void 0) { deserializing = false; }
    var pid = mobj.pid;
    var pidType = (pid >> 24) & 0xff;
    if (pidType == 1)
        return Critter.fromMapObject(mobj, deserializing);
    else if (pidType == 0) {
        var pro = mobj.pro || loadPRO(pid, pid & 0xffff);
        if (pro && pro.extra && pro.extra.subType == 3)
            return WeaponObj.fromMapObject(mobj, deserializing);
        else
            return Item.fromMapObject(mobj, deserializing);
    }
    else if (pidType == 2) {
        var pro = mobj.pro || loadPRO(pid, pid & 0xffff);
        if (pro && pro.extra && pro.extra.subType == 0)
            return Door.fromMapObject(mobj, deserializing);
        else
            return Scenery.fromMapObject(mobj, deserializing);
    }
    else
        return Obj.fromMapObject(mobj, deserializing);
}
function deserializeObj(mobj) {
    return objFromMapObject(mobj, true);
}
