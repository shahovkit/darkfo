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
var animInfo = {
    "idle": { type: "static" },
    "attack": { type: "static" },
    "weapon-reload": { type: "static" },
    "walk": { type: "move" },
    "static-idle": { type: "static" },
    "static": { type: "static" },
    "use": { type: "static" },
    "pickUp": { type: "static" },
    "climb": { type: "static" },
    "hitFront": { type: "static" },
    "death": { type: "static" },
    "death-explode": { type: "static" },
    "run": { type: "move" }
};
var weaponSkins = {
    "uzi": 'i', "rifle": 'j'
};
var weaponAnims = {
    'punch': { 'idle': 'aa', 'attack': 'aq' }
};
var attackMode = {
    'none': 0, 'punch': 1, 'kick': 2, 'swing': 3,
    'thrust': 4, 'throw': 5, 'fire single': 6,
    'fire burst': 7, 'flame': 8,
    0: 'none', 1: 'punch', 2: 'kick', 3: 'swing',
    4: 'thrust', 5: 'throw', 6: 'fire single',
    7: 'fire burst', 8: 'flame'
};
var damageType = {
    'Normal': 0, 'Laser': 1, 'Fire': 2, 'Plasma': 3,
    'Electrical': 4, 'EMP': 5, 'Explosive': 6,
    0: 'Normal', 1: 'Laser', 2: 'Fire', 3: 'Plasma',
    4: 'Electrical', 5: 'EMP', 6: 'Explosive'
};
var weaponSkillMap = {
    'uzi': 'Small Guns',
    'rifle': 'Small Guns',
    'spear': 'Melee Weapons',
    'knife': 'Melee Weapons',
    'club': 'Melee Weapons',
    'sledge': 'Melee Weapons',
    'flamethr': 'Big Guns',
    'pistol': 'Small Guns'
};
function parseAttack(weapon) {
    var attackModes = weapon.pro.extra['attackMode'];
    var modeOne = attackMode[attackModes & 0xf];
    var modeTwo = attackMode[(attackModes >> 4) & 0xf];
    var attackOne = { mode: modeOne, APCost: 0, maxRange: 0 };
    var attackTwo = { mode: modeTwo, APCost: 0, maxRange: 0 };
    if (modeOne !== attackMode.none) {
        attackOne.APCost = weapon.pro.extra.APCost1;
        attackOne.maxRange = weapon.pro.extra.maxRange1;
    }
    if (modeTwo !== attackMode.none) {
        attackTwo.APCost = weapon.pro.extra.APCost2;
        attackTwo.maxRange = weapon.pro.extra.maxRange2;
    }
    return { first: attackOne, second: attackTwo };
}
var Weapon = (function () {
    function Weapon(weapon) {
        this.weapon = weapon;
        this.modes = ['single', 'called'];
        if (weapon === null) {
            this.type = 'melee';
            this.minDmg = 1;
            this.maxDmg = 2;
            this.name = 'punch';
            this.weaponSkillType = 'Unarmed';
            this.weapon = {};
            this.weapon.pro = { extra: {} };
            this.weapon.pro.extra.maxRange1 = 1;
            this.weapon.pro.extra.maxRange2 = 1;
            this.weapon.pro.extra.APCost1 = 4;
            this.weapon.pro.extra.APCost2 = 4;
        }
        else {
            this.type = 'gun';
            this.minDmg = weapon.pro.extra.minDmg;
            this.maxDmg = weapon.pro.extra.maxDmg;
            var s = weapon.art.split('/');
            this.name = s[s.length - 1];
            var attacks = parseAttack(weapon);
            this.attackOne = attacks.first;
            this.attackTwo = attacks.second;
            this.weaponSkillType = weaponSkillMap[this.name];
            if (this.weaponSkillType === undefined)
                console.log("unknown weapon type for " + this.name);
        }
        this.mode = this.modes[0];
    }
    Weapon.prototype.cycleMode = function () {
        this.mode = this.modes[(this.modes.indexOf(this.mode) + 1) % this.modes.length];
    };
    Weapon.prototype.isCalled = function () {
        return this.mode === "called";
    };
    Weapon.prototype.getProjectilePID = function () {
        if (this.type === "melee")
            return -1;
        return this.weapon.pro.extra.projPID;
    };
    Weapon.prototype.getMaximumRange = function (attackType) {
        if (attackType === 1)
            return this.weapon.pro.extra.maxRange1;
        if (attackType === 2)
            return this.weapon.pro.extra.maxRange2;
        else
            throw "invalid attack type " + attackType;
    };
    Weapon.prototype.getAPCost = function (attackMode) {
        return this.weapon.pro.extra["APCost" + attackMode];
    };
    Weapon.prototype.getSkin = function () {
        if (this.weapon.pro === undefined || this.weapon.pro.extra === undefined)
            return null;
        var animCodeMap = {
            0: 'a',
            1: 'd',
            2: 'e',
            3: 'f',
            4: 'g',
            5: 'h',
            6: 'i',
            7: 'j',
            8: 'k',
            9: 'l',
            10: 'm'
        };
        return animCodeMap[this.weapon.pro.extra.animCode];
    };
    Weapon.prototype.getAttackSkin = function () {
        if (this.weapon.pro === undefined || this.weapon.pro.extra === undefined)
            return null;
        if (this.weapon === 'punch')
            return 'q';
        var modeSkinMap = {
            'punch': 'q',
            'kick': 'r',
            'swing': 'g',
            'thrust': 'f',
            'throw': 's',
            'fire single': 'j',
            'fire burst': 'k',
            'flame': 'l'
        };
        if (this.attackOne.mode !== attackMode.none) {
            return modeSkinMap[this.attackOne.mode];
        }
        throw "TODO";
    };
    Weapon.prototype.getAnim = function (anim) {
        if (weaponAnims[this.name] && weaponAnims[this.name][anim])
            return weaponAnims[this.name][anim];
        var wep = this.getSkin() || 'a';
        switch (anim) {
            case 'idle': return wep + 'a';
            case 'walk': return wep + 'b';
            case 'attack':
                var attackSkin = this.getAttackSkin();
                return wep + attackSkin;
            default: return null;
        }
    };
    Weapon.prototype.canEquip = function (obj) {
        return imageInfo[critterGetBase(obj) + this.getAnim('attack')] !== undefined;
    };
    Weapon.prototype.getDamageType = function () {
        var rawDmgType = this.weapon.pro.extra.dmgType;
        return rawDmgType !== undefined ? damageType[rawDmgType] : "Normal";
    };
    return Weapon;
}());
function critterGetBase(obj) {
    return obj.art.slice(0, -2);
}
function critterGetEquippedWeapon(obj) {
    if (objectIsWeapon(obj.leftHand))
        return obj.leftHand || null;
    if (objectIsWeapon(obj.rightHand))
        return obj.rightHand || null;
    return null;
}
function critterGetAnim(obj, anim) {
    var base = critterGetBase(obj);
    var weaponObj = critterGetEquippedWeapon(obj);
    if (weaponObj !== null && Config.engine.doUseWeaponModel === true) {
        if (!weaponObj.weapon)
            throw Error();
        var wepAnim = weaponObj.weapon.getAnim(anim);
        if (wepAnim)
            return base + wepAnim;
    }
    var wep = 'a';
    switch (anim) {
        case "attack":
            console.log("default attack animation instead of weapon animation.");
            return base + wep + 'a';
        case "idle": return base + wep + 'a';
        case "walk": return base + wep + 'b';
        case "run": return base + wep + 't';
        case "shoot": return base + wep + 'j';
        case "weapon-reload": return base + wep + 'a';
        case "static-idle": return base + wep + 'a';
        case "static": return obj.art;
        case "hitFront": return base + 'ao';
        case "use": return base + 'al';
        case "pickUp": return base + 'ak';
        case "climb": return base + 'ae';
        case "called-shot": return base + 'na';
        case "death":
            if (obj.pro && obj.pro.extra.killType === 18) {
                console.log("Boss death...");
                return base + 'bl';
            }
            return base + 'bo';
        case "death-explode": return base + 'bl';
        default: throw "Unknown animation: " + anim;
    }
}
function critterHasAnim(obj, anim) {
    return imageInfo[critterGetAnim(obj, anim)] !== undefined;
}
function critterGetKillType(obj) {
    if (obj.isPlayer)
        return 19;
    if (!obj.pro || !obj.pro.extra)
        return null;
    return obj.pro.extra.killType;
}
function getAnimDistance(art) {
    var info = imageInfo[art];
    if (info === undefined)
        throw "no image info for " + art;
    var firstShift = info.frameOffsets[0][0].ox;
    var lastShift = info.frameOffsets[1][info.numFrames - 1].ox;
    return Math.floor((lastShift - firstShift + 16) / 32);
}
function critterStaticAnim(obj, anim, callback, waitForLoad) {
    if (waitForLoad === void 0) { waitForLoad = true; }
    obj.art = critterGetAnim(obj, anim);
    obj.frame = 0;
    obj.lastFrameTime = 0;
    if (waitForLoad) {
        lazyLoadImage(obj.art, function () {
            obj.anim = anim;
            obj.animCallback = callback || (function () { return obj.clearAnim(); });
        });
    }
    else {
        obj.anim = anim;
        obj.animCallback = callback || (function () { return obj.clearAnim(); });
    }
}
function getDirectionalOffset(obj) {
    var info = imageInfo[obj.art];
    if (info === undefined)
        throw "No image map info for: " + obj.art;
    return info.directionOffsets[obj.orientation];
}
function getAnimPartialActions(art, anim) {
    var partialActions = { movement: 0, actions: [] };
    var numPartials = 1;
    if (anim === "walk" || anim === "run") {
        numPartials = getAnimDistance(art);
        partialActions.movement = numPartials;
    }
    if (numPartials === 0)
        numPartials = 1;
    var delta = Math.floor(imageInfo[art].numFrames / numPartials);
    var startFrame = 0;
    var endFrame = delta;
    for (var i = 0; i < numPartials; i++) {
        partialActions.actions.push({ startFrame: startFrame,
            endFrame: endFrame,
            step: i });
        startFrame += delta;
        endFrame += delta;
    }
    partialActions.actions[partialActions.actions.length - 1].endFrame = imageInfo[art].numFrames;
    return partialActions;
}
function hitSpatialTrigger(position) {
    return gMap.getSpatials().filter(function (spatial) { return hexDistance(position, spatial.position) <= spatial.range; });
}
function critterKill(obj, source, useScript, animName, callback) {
    obj.dead = true;
    obj.outline = null;
    if (useScript === undefined || useScript === true) {
        Scripting.destroy(obj, source);
    }
    if (!animName || !critterHasAnim(obj, animName))
        animName = "death";
    critterStaticAnim(obj, animName, function () {
        obj.frame--;
        obj.anim = undefined;
        if (callback)
            callback();
    }, true);
}
function critterDamage(obj, damage, source, useScript, useAnim, damageType, callback) {
    if (useScript === void 0) { useScript = true; }
    if (useAnim === void 0) { useAnim = true; }
    obj.stats.modifyBase("HP", -damage);
    if (critterGetStat(obj, "HP") <= 0)
        return critterKill(obj, source, useScript);
    if (useScript) {
    }
    if (useAnim && critterHasAnim(obj, "hitFront")) {
        critterStaticAnim(obj, "hitFront", function () {
            obj.clearAnim();
            if (callback)
                callback();
        });
    }
}
function critterGetStat(obj, stat) {
    return obj.stats.get(stat);
}
function critterGetRawStat(obj, stat) {
    return obj.stats.getBase(stat);
}
function critterSetRawStat(obj, stat, amount) {
    console.warn("TODO: Change stat " + stat + " to " + amount);
}
function critterGetSkill(obj, skill) {
    return obj.skills.get(skill, obj.stats);
}
function critterGetRawSkill(obj, skill) {
    return obj.skills.getBase(skill);
}
function critterSetRawSkill(obj, skill, amount) {
    console.warn("TODO: Change skill " + skill + " to " + amount);
}
var SERIALIZED_CRITTER_PROPS = ["stats", "skills", "aiNum", "teamNum", "hostile", "isPlayer", "dead"];
var Critter = (function (_super) {
    __extends(Critter, _super);
    function Critter() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.type = "critter";
        _this.anim = "idle";
        _this.path = null;
        _this.AP = null;
        _this.aiNum = -1;
        _this.teamNum = -1;
        _this.ai = null;
        _this.hostile = false;
        _this.isPlayer = false;
        _this.dead = false;
        return _this;
    }
    Critter.fromPID = function (pid, sid) {
        return Obj.fromPID_(new Critter(), pid, sid);
    };
    Critter.fromMapObject = function (mobj, deserializing) {
        if (deserializing === void 0) { deserializing = false; }
        var obj = Obj.fromMapObject_(new Critter(), mobj, deserializing);
        if (deserializing) {
            console.log("Deserializing critter");
            for (var _i = 0, SERIALIZED_CRITTER_PROPS_1 = SERIALIZED_CRITTER_PROPS; _i < SERIALIZED_CRITTER_PROPS_1.length; _i++) {
                var prop = SERIALIZED_CRITTER_PROPS_1[_i];
                obj[prop] = mobj[prop];
            }
            if (mobj.stats) {
                obj.stats = new StatSet(mobj.stats.baseStats, mobj.stats.useBonuses);
                console.warn("Deserializing stat set: %o to: %o", mobj.stats, obj.stats);
            }
            if (mobj.skills) {
                obj.skills = new SkillSet(mobj.skills.baseSkills, mobj.skills.tagged, mobj.skills.skillPoints);
                console.warn("Deserializing skill set: %o to: %o", mobj.skills, obj.skills);
            }
        }
        return obj;
    };
    Critter.prototype.init = function () {
        var _this = this;
        _super.prototype.init.call(this);
        this.stats = StatSet.fromPro(this.pro);
        this.skills = SkillSet.fromPro(this.pro.extra.skills);
        this.name = getMessage("pro_crit", this.pro.textID) || "";
        this.aiNum = this.pro.extra.AI;
        this.teamNum = this.pro.extra.team;
        this.inventory.forEach(function (inv) {
            if (inv.subtype === "weapon") {
                var w = inv;
                if (_this.leftHand === undefined) {
                    if (w.weapon.canEquip(_this))
                        _this.leftHand = w;
                }
                else if (_this.rightHand === undefined) {
                    if (w.weapon.canEquip(_this))
                        _this.rightHand = w;
                }
            }
        });
        if (!this.leftHand)
            this.leftHand = { type: "item", subtype: "weapon", weapon: new Weapon(null) };
        if (!this.rightHand)
            this.rightHand = { type: "item", subtype: "weapon", weapon: new Weapon(null) };
        this.art = critterGetAnim(this, "idle");
    };
    Critter.prototype.updateStaticAnim = function () {
        var time = heart.timer.getTime();
        var fps = 8;
        if (time - this.lastFrameTime >= 1000 / fps) {
            this.frame++;
            this.lastFrameTime = time;
            if (this.frame === imageInfo[this.art].numFrames) {
                if (this.animCallback)
                    this.animCallback();
            }
        }
    };
    Critter.prototype.updateAnim = function () {
        if (!this.anim || this.anim === "idle")
            return;
        if (animInfo[this.anim].type === "static")
            return this.updateStaticAnim();
        var time = heart.timer.getTime();
        var fps = imageInfo[this.art].fps;
        var targetScreen = hexToScreen(this.path.target.x, this.path.target.y);
        var partials = getAnimPartialActions(this.art, this.anim);
        var currentPartial = partials.actions[this.path.partial];
        if (time - this.lastFrameTime >= 1000 / fps) {
            this.lastFrameTime = time;
            if (this.frame === currentPartial.endFrame || this.frame + 1 >= imageInfo[this.art].numFrames) {
                if (this.path.partial + 1 < partials.actions.length) {
                    this.path.partial++;
                }
                else {
                    this.path.partial = 0;
                }
                var nextFrame = partials.actions[this.path.partial].startFrame + 1;
                if (this.path.partial === 0)
                    nextFrame = 0;
                this.frame = nextFrame;
                this.shift = { x: 0, y: 0 };
                var pos = this.path.path[this.path.index++];
                var hex = { x: pos[0], y: pos[1] };
                if (!this.move(hex))
                    return;
                if (!this.path)
                    return;
                pos = this.path.path[this.path.index];
                if (pos) {
                    var dir = directionOfDelta(this.position.x, this.position.y, pos[0], pos[1]);
                    if (dir == null)
                        throw Error();
                    this.orientation = dir;
                }
            }
            else {
                this.frame++;
                var info = imageInfo[this.art];
                if (info === undefined)
                    throw "No image map info for: " + this.art;
                var frameInfo = info.frameOffsets[this.orientation][this.frame];
                this.shift.x += frameInfo.x;
                this.shift.y += frameInfo.y;
            }
            if (this.position.x === this.path.target.x && this.position.y === this.path.target.y) {
                var callback = this.animCallback;
                this.clearAnim();
                if (callback)
                    callback();
            }
        }
    };
    Critter.prototype.blocks = function () {
        return (this.dead !== true) && (this.visible !== false);
    };
    Critter.prototype.inAnim = function () {
        return !!(this.path || this.animCallback);
    };
    Critter.prototype.move = function (position, curIdx, signalEvents) {
        if (signalEvents === void 0) { signalEvents = true; }
        if (!_super.prototype.move.call(this, position, curIdx, signalEvents))
            return false;
        if (Config.engine.doSpatials !== false) {
            var hitSpatials = hitSpatialTrigger(position);
            for (var i = 0; i < hitSpatials.length; i++) {
                var spatial = hitSpatials[i];
                console.log("triggered spatial " + spatial.script + " (" + spatial.range + ") @ " +
                    spatial.position.x + ", " + spatial.position.y);
                Scripting.spatial(spatial, this);
            }
        }
        return true;
    };
    Critter.prototype.canRun = function () {
        return critterHasAnim(this, "run");
    };
    Critter.prototype.clearAnim = function () {
        _super.prototype.clearAnim.call(this);
        this.path = null;
        this.anim = "idle";
        this.art = critterGetAnim(this, "idle");
    };
    Critter.prototype.walkTo = function (target, running, callback, maxLength, path) {
        var _this = this;
        if (this.position.x === target.x && this.position.y === target.y) {
            return false;
        }
        if (path === undefined)
            path = recalcPath(this.position, target);
        if (path.length === 0) {
            return false;
        }
        if (maxLength !== undefined && path.length > maxLength) {
            console.log("truncating path (to length " + maxLength + ")");
            path = path.slice(0, maxLength + 1);
        }
        if (running && !this.canRun())
            running = false;
        var actualTarget = { x: path[path.length - 1][0], y: path[path.length - 1][1] };
        this.path = { path: path, index: 1, target: actualTarget, partial: 0 };
        this.anim = running ? "run" : "walk";
        this.art = critterGetAnim(this, this.anim);
        this.animCallback = callback || (function () { return _this.clearAnim(); });
        this.frame = 0;
        this.lastFrameTime = heart.timer.getTime();
        this.shift = { x: 0, y: 0 };
        var dir = directionOfDelta(this.position.x, this.position.y, path[1][0], path[1][1]);
        if (dir == null)
            throw Error();
        this.orientation = dir;
        return true;
    };
    Critter.prototype.walkInFrontOf = function (targetPos, callback) {
        var path = recalcPath(this.position, targetPos, false);
        if (path.length === 0)
            return false;
        else if (path.length <= 2) {
            if (callback)
                callback();
            return true;
        }
        path.pop();
        var target = path[path.length - 1];
        targetPos = { x: target[0], y: target[1] };
        var running = Config.engine.doAlwaysRun;
        if (hexDistance(this.position, targetPos) > 5)
            running = true;
        return this.walkTo(targetPos, running, callback, undefined, path);
    };
    Critter.prototype.serialize = function () {
        var obj = _super.prototype.serialize.call(this);
        for (var _i = 0, SERIALIZED_CRITTER_PROPS_2 = SERIALIZED_CRITTER_PROPS; _i < SERIALIZED_CRITTER_PROPS_2.length; _i++) {
            var prop = SERIALIZED_CRITTER_PROPS_2[_i];
            obj[prop] = this[prop];
        }
        return obj;
    };
    return Critter;
}(Obj));
