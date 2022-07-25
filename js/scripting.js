"use strict";
var Scripting;
(function (Scripting) {
    var gameObjects = null;
    var mapVars = null;
    var globalVars = {
        0: 50,
        531: 1,
        452: 2,
        88: 0,
        83: 2,
        616: 0,
        345: 16,
        357: 2
    };
    var currentMapID = null;
    var currentMapObject = null;
    var mapFirstRun = true;
    var scriptMessages = {};
    var dialogueOptionProcs = [];
    var currentDialogueObject = null;
    Scripting.timeEventList = [];
    var overrideStartPos = null;
    var statMap = {
        0: "STR", 1: "PER", 2: "END", 3: "CHA", 4: "INT",
        5: "AGI", 6: "LUK",
        35: "HP", 7: "Max HP"
    };
    function stub(name, args, type) {
        if (Config.scripting.debugLogShowType.stub === false || Config.scripting.debugLogShowType[type] === false)
            return;
        var a = "";
        for (var i = 0; i < args.length; i++)
            if (i === args.length - 1)
                a += args[i];
            else
                a += args[i] + ", ";
        console.log("STUB: " + name + ": " + a);
    }
    function log(name, args, type) {
        if (Config.scripting.debugLogShowType.log === false || Config.scripting.debugLogShowType[type] === false)
            return;
        var a = "";
        for (var i = 0; i < args.length; i++)
            if (i === args.length - 1)
                a += args[i];
            else
                a += args[i] + ", ";
        console.log("log: " + name + ": " + a);
    }
    function warn(msg, type, script) {
        if (type !== undefined && Config.scripting.debugLogShowType[type] === false)
            return;
        if (script)
            console.log("WARNING [" + script._vm.intfile.name + "]: " + msg);
        else
            console.log("WARNING: " + msg);
    }
    function info(msg, type, script) {
        if (type !== undefined && Config.scripting.debugLogShowType[type] === false)
            return;
        if (script)
            console.log("INFO [" + script._vm.intfile.name + "]: " + msg);
        else
            console.log("INFO: " + msg);
    }
    Scripting.info = info;
    function seed(s) {
        Math.random = function () {
            s = Math.sin(s) * 10000;
            return s - Math.floor(s);
        };
    }
    function getGlobalVar(gvar) {
        return (globalVars[gvar] !== undefined) ? globalVars[gvar] : 0;
    }
    Scripting.getGlobalVar = getGlobalVar;
    function getGlobalVars() {
        return globalVars;
    }
    Scripting.getGlobalVars = getGlobalVars;
    function isGameObject(obj) {
        if (obj === undefined || obj === null)
            return false;
        if (obj.isPlayer === true)
            return true;
        if (obj.type === "item" || obj.type === "critter" || obj.type === "scenery" ||
            obj.type === "wall" || obj.type === "tile" || obj.type === "misc")
            return true;
        console.log("is NOT GO: %o", obj);
        return false;
    }
    function isSpatial(obj) {
        if (!obj)
            return false;
        return obj.isSpatial === true;
    }
    function getScriptName(id) {
        return lookupScriptName(id);
    }
    function getScriptMessage(id, msg) {
        if (typeof msg === "string")
            return msg;
        var name = getScriptName(id);
        if (name === null) {
            warn("getScriptMessage: no script with ID " + id);
            return null;
        }
        if (scriptMessages[name] === undefined)
            loadMessageFile(name);
        if (scriptMessages[name] === undefined)
            throw "getScriptMessage: loadMessageFile failed?";
        if (scriptMessages[name][msg] === undefined)
            throw "getScriptMessage: no message " + msg + " for script " + id + " (" + name + ")";
        return scriptMessages[name][msg];
    }
    function dialogueReply(id) {
        var f = dialogueOptionProcs[id];
        dialogueOptionProcs = [];
        f();
        if (currentDialogueObject !== null && dialogueOptionProcs.length === 0) {
            console.log("[dialogue exit via dialogueReply (no replies)]");
            dialogueExit();
        }
    }
    Scripting.dialogueReply = dialogueReply;
    function dialogueEnd() {
        console.log("[dialogue exit via dialogueExit]");
        dialogueExit();
    }
    Scripting.dialogueEnd = dialogueEnd;
    function dialogueExit() {
        uiEndDialogue();
        info("[dialogue exit]");
        if (currentDialogueObject) {
            var vm = currentDialogueObject._script._vm;
            vm.pc = vm.popAddr();
            info("[resuming from gsay_end (pc=0x" + vm.pc.toString(16) + ")]");
            vm.run();
        }
        currentDialogueObject = null;
    }
    function canSee(obj, target) {
        var dir = Math.abs(obj.orientation - hexDirectionTo(obj.position, target.position));
        return [0, 1, 5].indexOf(dir) !== -1;
    }
    function isWithinPerception(obj, target) {
        var dist = hexDistance(obj.position, target.position);
        var perception = critterGetStat(obj, "PER");
        var sneakSkill = critterGetSkill(target, "Sneak");
        var reqDist;
        if (canSee(obj, target)) {
            reqDist = perception * 5;
            if (false)
                reqDist /= 2;
            if (target === player) {
                if (false) {
                    reqDist /= 4;
                    if (sneakSkill > 120)
                        reqDist--;
                }
                else if (false)
                    reqDist = reqDist * 2 / 3;
            }
            if (dist <= reqDist)
                return true;
        }
        reqDist = inCombat ? perception * 2 : perception;
        if (target === player) {
            if (false) {
                reqDist /= 4;
                if (sneakSkill > 120)
                    reqDist--;
            }
            else if (false)
                reqDist = reqDist * 2 / 3;
        }
        return dist <= reqDist;
    }
    function objCanSeeObj(obj, target) {
        if (target.type !== "critter" || isWithinPerception(obj, target)) {
            var hit = hexLinecast(obj.position, target.position);
            return !hit;
        }
        return false;
    }
    var Script = (function () {
        function Script() {
            this._didOverride = false;
        }
        Script.prototype.set_global_var = function (gvar, value) {
            globalVars[gvar] = value;
            info("set_global_var: " + gvar + " = " + value, "gvars");
            log("set_global_var", arguments, "gvars");
        };
        Script.prototype.set_local_var = function (lvar, value) {
            this.lvars[lvar] = value;
            info("set_local_var: " + lvar + " = " + value + " [" + this.scriptName + "]", "lvars");
            log("set_local_var", arguments, "lvars");
        };
        Script.prototype.local_var = function (lvar) {
            log("local_var", arguments, "lvars");
            if (this.lvars[lvar] === undefined) {
                warn("local_var: setting default value (0) for LVAR " + lvar, "lvars");
                this.lvars[lvar] = 0;
            }
            return this.lvars[lvar];
        };
        Script.prototype.map_var = function (mvar) {
            if (this._mapScript === undefined) {
                warn("map_var: no map script");
                return;
            }
            var scriptName = this._mapScript.scriptName;
            if (scriptName === undefined) {
                warn("map_var: map script has no name");
                return;
            }
            else if (mapVars[scriptName] === undefined)
                mapVars[scriptName] = {};
            else if (mapVars[scriptName][mvar] === undefined) {
                warn("map_var: setting default value (0) for MVAR " + mvar, "mvars");
                mapVars[scriptName][mvar] = 0;
            }
            return mapVars[scriptName][mvar];
        };
        Script.prototype.set_map_var = function (mvar, value) {
            if (!this._mapScript)
                throw Error("set_map_var: no map script");
            var scriptName = this._mapScript.scriptName;
            if (scriptName === undefined) {
                warn("map_var: map script has no name");
                return;
            }
            info("set_map_var: " + mvar + " = " + value, "mvars");
            if (mapVars[scriptName] === undefined)
                mapVars[scriptName] = {};
            mapVars[scriptName][mvar] = value;
        };
        Script.prototype.global_var = function (gvar) {
            if (globalVars[gvar] === undefined) {
                warn("global_var: unknown gvar " + gvar + ", using default (0)", "gvars");
                globalVars[gvar] = 0;
            }
            return globalVars[gvar];
        };
        Script.prototype.random = function (min, max) { log("random", arguments); return getRandomInt(min, max); };
        Script.prototype.debug_msg = function (msg) { log("debug_msg", arguments); info("DEBUG MSG: [" + this.scriptName + "]: " + msg, "debugMessage"); };
        Script.prototype.display_msg = function (msg) { log("display_msg", arguments); info("DISPLAY MSG: " + msg, "displayMessage"); uiLog(msg); };
        Script.prototype.message_str = function (msgList, msgNum) { return getScriptMessage(msgList, msgNum); };
        Script.prototype.metarule = function (id, target) {
            switch (id) {
                case 14: return mapFirstRun;
                case 15:
                    if (target !== -1)
                        throw "elevator given explicit type";
                    useElevator();
                    break;
                case 17:
                    stub("metarule", arguments);
                    return 0;
                case 18: return 0;
                case 22: return 0;
                case 46: return 0;
                case 48: return 2;
                case 49:
                    switch (objectGetDamageType(target)) {
                        case "explosion": return 6;
                        default: throw "unknown damage type";
                    }
                default:
                    stub("metarule", arguments);
                    break;
            }
        };
        Script.prototype.metarule3 = function (id, obj, userdata, radius) {
            if (id === 100) {
                for (var i = 0; i < Scripting.timeEventList.length; i++) {
                    if (Scripting.timeEventList[i].obj === obj &&
                        Scripting.timeEventList[i].userdata === userdata) {
                        info("removing timed event (userdata " + userdata + ")", "timer");
                        Scripting.timeEventList.splice(i, 1);
                        return;
                    }
                }
            }
            else if (id === 106) {
                var tile = obj, elevation = userdata, lastCritter = radius;
                var objs = objectsAtPosition(fromTileNum(tile));
                log("metarule3 106 (tile_get_next_critter)", arguments);
                for (var i = 0; i < objs.length; i++) {
                    if (objs[i].type === "critter" && !objs[i].isPlayer)
                        return objs[i];
                }
                return 0;
            }
            stub("metarule3", arguments);
        };
        Script.prototype.script_overrides = function () {
            log("script_overrides", arguments);
            info("[SCRIPT OVERRIDES]");
            this._didOverride = true;
        };
        Script.prototype.give_exp_points = function (xp) { stub("give_exp_points", arguments); };
        Script.prototype.get_critter_stat = function (obj, stat) {
            if (stat === 34) {
                if (obj.isPlayer)
                    return obj.gender === "female" ? 1 : 0;
                return 0;
            }
            var namedStat = statMap[stat];
            if (namedStat !== undefined)
                return critterGetStat(obj, namedStat);
            stub("get_critter_stat", arguments);
            return 5;
        };
        Script.prototype.has_trait = function (traitType, obj, trait) {
            if (!isGameObject(obj)) {
                warn("has_trait: not game object: " + obj, undefined, this);
                return 0;
            }
            if (traitType === 1) {
                switch (trait) {
                    case 5: break;
                    case 6: break;
                    case 10: return obj.orientation;
                    case 666:
                        return (obj.visible === false) ? 0 : 1;
                    case 669: break;
                }
            }
            stub("has_trait", arguments);
            return 0;
        };
        Script.prototype.critter_add_trait = function (obj, traitType, trait, amount) {
            stub("critter_add_trait", arguments);
            if (!isGameObject(obj)) {
                warn("critter_add_trait: not game object: " + obj, undefined, this);
                return;
            }
            if (obj.type !== "critter") {
                warn("critter_add_trait: not a critter: " + obj, undefined, this);
                return;
            }
            if (traitType === 1) {
                switch (trait) {
                    case 5:
                        info("Setting critter AI packet to " + amount, undefined, this);
                        obj.aiNum = amount;
                        break;
                    case 6:
                        info("Setting critter team to " + amount, undefined, this);
                        obj.teamNum = amount;
                        break;
                    case 10: break;
                    case 666: break;
                    case 669: break;
                }
            }
        };
        Script.prototype.item_caps_total = function (obj) {
            if (!isGameObject(obj))
                throw "item_caps_total: not game object";
            return objectGetMoney(obj);
        };
        Script.prototype.item_caps_adjust = function (obj, amount) { stub("item_caps_adjust", arguments); };
        Script.prototype.move_obj_inven_to_obj = function (obj, other) {
            if (obj === null || other === null) {
                warn("move_obj_inven_to_obj: null pointer passed in");
                return;
            }
            if (!isGameObject(obj) || !isGameObject(other)) {
                warn("move_obj_inven_to_obj: not game object");
                return;
            }
            info("move_obj_inven_to_obj: " + obj.inventory.length + " to " + other.inventory.length, "inventory");
            other.inventory = obj.inventory;
            obj.inventory = [];
        };
        Script.prototype.obj_is_carrying_obj_pid = function (obj, pid) {
            log("obj_is_carrying_obj_pid", arguments);
            if (!isGameObject(obj)) {
                warn("obj_is_carrying_obj_pid: not a game object");
                return 0;
            }
            else if (obj.inventory === undefined) {
                warn("obj_is_carrying_obj_pid: object has no inventory!");
                return 0;
            }
            var count = 0;
            for (var i = 0; i < obj.inventory.length; i++) {
                if (obj.inventory[i].pid === pid)
                    count++;
            }
            return count;
        };
        Script.prototype.add_mult_objs_to_inven = function (obj, item, count) {
            if (!isGameObject(obj)) {
                warn("add_mult_objs_to_inven: not a game object");
                return;
            }
            else if (!isGameObject(item)) {
                warn("add_mult_objs_to_inven: item not a game object: " + item);
                return;
            }
            else if (obj.inventory === undefined) {
                warn("add_mult_objs_to_inven: object has no inventory!");
                return;
            }
            console.log("add_mult_objs_to_inven: %d counts of %o to %o", count, item, obj);
            obj.addInventoryItem(item, count);
        };
        Script.prototype.rm_mult_objs_from_inven = function (obj, item, count) {
            stub("rm_mult_objs_from_inven", arguments);
        };
        Script.prototype.add_obj_to_inven = function (obj, item) {
            this.add_mult_objs_to_inven(obj, item, 1);
        };
        Script.prototype.rm_obj_from_inven = function (obj, item) {
            this.rm_mult_objs_from_inven(obj, item, 1);
        };
        Script.prototype.obj_carrying_pid_obj = function (obj, pid) {
            log("obj_carrying_pid_obj", arguments);
            if (!isGameObject(obj)) {
                warn("obj_carrying_pid_obj: not a game object: " + obj);
                return 0;
            }
            for (var i = 0; i < obj.inventory.length; i++) {
                if (obj.inventory[i].pid === pid)
                    return obj.inventory[i];
            }
            return 0;
        };
        Script.prototype.elevation = function (obj) {
            if (isSpatial(obj) || isGameObject(obj))
                return currentElevation;
            else {
                warn("elevation: not an object: " + obj);
                return -1;
            }
        };
        Script.prototype.obj_can_see_obj = function (a, b) {
            log("obj_can_see_obj", arguments);
            if (!isGameObject(a) || !isGameObject(b)) {
                warn("obj_can_see_obj: not game object: a=" + a + " b=" + b, undefined, this);
                return 0;
            }
            return +objCanSeeObj(a, b);
        };
        Script.prototype.obj_can_hear_obj = function (a, b) { return 0; };
        Script.prototype.critter_mod_skill = function (obj, skill, amount) { stub("critter_mod_skill", arguments); return 0; };
        Script.prototype.using_skill = function (obj, skill) { stub("using_skill", arguments); return 0; };
        Script.prototype.has_skill = function (obj, skill) { stub("has_skill", arguments); return 100; };
        Script.prototype.roll_vs_skill = function (obj, skill, bonus) { stub("roll_vs_skill", arguments); return 1; };
        Script.prototype.do_check = function (obj, check, modifier) { stub("do_check", arguments); return 1; };
        Script.prototype.is_success = function (roll) { stub("is_success", arguments); return 1; };
        Script.prototype.is_critical = function (roll) { stub("is_critical", arguments); return 0; };
        Script.prototype.critter_inven_obj = function (obj, where) {
            if (!isGameObject(obj))
                throw "critter_inven_obj: not game object";
            if (where === 0) { }
            else if (where === 1)
                return obj.rightHand;
            else if (where === 2)
                return obj.leftHand;
            else if (where === -2) {
                warn("INVEN_TYPE_INV_COUNT", "inventory", this);
                return 0;
            }
            stub("critter_inven_obj", arguments);
            return null;
        };
        Script.prototype.inven_cmds = function (obj, invenCmd, itemIndex) {
            stub("inven_cmds", arguments, "inventory");
            assert(invenCmd === 13, "Invalid invenCmd");
            return null;
        };
        Script.prototype.critter_attempt_placement = function (obj, tileNum, elevation) {
            stub("critter_attempt_placement", arguments);
            return this.move_to(obj, tileNum, elevation);
        };
        Script.prototype.critter_state = function (obj) {
            if (!isGameObject(obj)) {
                warn("critter_state: not game object: " + obj);
                return 0;
            }
            var state = 0;
            if (obj.dead === true)
                state |= 1;
            return state;
        };
        Script.prototype.kill_critter = function (obj, deathFrame) {
            log("kill_critter", arguments);
            critterKill(obj);
        };
        Script.prototype.get_poison = function (obj) { stub("get_poison", arguments); return 0; };
        Script.prototype.get_pc_stat = function (pcstat) {
            switch (pcstat) {
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                    stub("get_pc_stat", arguments);
                    return 0;
                default: throw "get_pc_stat: unhandled " + pcstat;
            }
        };
        Script.prototype.critter_injure = function (obj, how) { stub("critter_injure", arguments); };
        Script.prototype.critter_is_fleeing = function (obj) { stub("critter_is_fleeing", arguments); return 0; };
        Script.prototype.wield_obj_critter = function (obj, item) { stub("wield_obj_critter", arguments); };
        Script.prototype.critter_dmg = function (obj, damage, damageType) {
            if (!isGameObject(obj)) {
                warn("critter_dmg: not game object: " + obj);
                return;
            }
            critterDamage(obj, damage, this.self_obj, true, true, damageType);
        };
        Script.prototype.critter_heal = function (obj, amount) {
            stub("critter_heal", arguments);
        };
        Script.prototype.poison = function (obj, amount) { stub("poison", arguments); };
        Script.prototype.radiation_dec = function (obj, amount) { stub("radiation_dec", arguments); };
        Script.prototype.attack_complex = function (obj, calledShot, numAttacks, bonus, minDmg, maxDmg, attackerResults, targetResults) {
            info("[enter combat via attack_complex]");
            if (Config.engine.doCombat)
                Combat.start(this.self_obj);
        };
        Script.prototype.terminate_combat = function () {
            info("[terminate_combat]");
            if (combat)
                combat.end();
        };
        Script.prototype.critter_set_flee_state = function (obj, isFleeing) { stub("critter_set_flee_state", arguments); };
        Script.prototype.obj_is_locked = function (obj) {
            log("obj_is_locked", arguments);
            if (!isGameObject(obj)) {
                warn("obj_is_locked: not game object: " + obj, undefined, this);
                return 1;
            }
            return obj.locked ? 1 : 0;
        };
        Script.prototype.obj_lock = function (obj) {
            log("obj_lock", arguments);
            if (!isGameObject(obj)) {
                warn("obj_lock: not game object: " + obj, undefined, this);
                return;
            }
            obj.locked = true;
        };
        Script.prototype.obj_unlock = function (obj) {
            log("obj_unlock", arguments);
            if (!isGameObject(obj)) {
                warn("obj_unlock: not game object: " + obj, undefined, this);
                return;
            }
            obj.locked = false;
        };
        Script.prototype.obj_is_open = function (obj) {
            log("obj_is_open", arguments);
            if (!isGameObject(obj)) {
                warn("obj_is_open: not game object: " + obj, undefined, this);
                return 0;
            }
            return obj.open ? 1 : 0;
        };
        Script.prototype.obj_close = function (obj) {
            if (!isGameObject(obj)) {
                warn("obj_close: not game object: " + obj);
                return;
            }
            info("obj_close");
            if (!obj.open)
                return;
            useObject(obj, this.self_obj, false);
        };
        Script.prototype.obj_open = function (obj) {
            if (!isGameObject(obj)) {
                warn("obj_open: not game object: " + obj);
                return;
            }
            info("obj_open");
            if (obj.open)
                return;
            useObject(obj, this.self_obj, false);
        };
        Script.prototype.proto_data = function (pid, data_member) { stub("proto_data", arguments); return null; };
        Script.prototype.create_object_sid = function (pid, tile, elev, sid) {
            info("create_object_sid: pid=" + pid + " tile=" + tile + " elev=" + elev + " sid=" + sid, undefined, this);
            if (elev < 0 || elev > 2)
                throw "create_object_sid: elev out of range: elev=" + elev;
            var obj = createObjectWithPID(pid, sid);
            if (!obj) {
                warn("create_object_sid: couldn't create object", undefined, this);
                return null;
            }
            obj.position = fromTileNum(tile);
            gMap.addObject(obj, elev);
            return obj;
        };
        Script.prototype.obj_name = function (obj) { return obj.name; };
        Script.prototype.obj_item_subtype = function (obj) {
            if (!isGameObject(obj)) {
                warn("obj_item_subtype: not game object: " + obj);
                return null;
            }
            if (obj.type === "item" && obj.pro !== undefined)
                return obj.pro.extra.subtype;
            stub("obj_item_subtype", arguments);
            return null;
        };
        Script.prototype.anim_busy = function (obj) {
            log("anim_busy", arguments);
            if (!isGameObject(obj)) {
                warn("anim_busy: not game object: " + obj);
                return false;
            }
            return obj.inAnim();
        };
        Script.prototype.obj_art_fid = function (obj) { stub("obj_art_fid", arguments); return 0; };
        Script.prototype.art_anim = function (fid) { stub("art_anim", arguments); return 0; };
        Script.prototype.set_obj_visibility = function (obj, visibility) {
            if (!isGameObject(obj)) {
                warn("set_obj_visibility: not a game object: " + obj);
                return;
            }
            obj.visible = !visibility;
        };
        Script.prototype.use_obj_on_obj = function (obj, who) { stub("use_obj_on_obj", arguments); };
        Script.prototype.use_obj = function (obj) { stub("use_obj", arguments); };
        Script.prototype.anim = function (obj, anim, param) {
            if (!isGameObject(obj)) {
                warn("anim: not a game object: " + obj);
                return;
            }
            stub("anim", arguments);
            if (anim === 1000)
                obj.orientation = param;
            else if (anim === 1010)
                obj.frame = param;
            else
                warn("anim: unknown anim request: " + anim);
        };
        Script.prototype.set_light_level = function (level) { stub("set_light_level", arguments); };
        Script.prototype.obj_set_light_level = function (obj, intensity, distance) { stub("obj_set_light_level", arguments); };
        Script.prototype.override_map_start = function (x, y, elevation, rotation) {
            log("override_map_start", arguments);
            info("override_map_start: " + x + ", " + y + " / elevation " + elevation);
            overrideStartPos = { position: { x: x, y: y }, orientation: rotation, elevation: elevation };
        };
        Script.prototype.obj_pid = function (obj) {
            if (!isGameObject(obj)) {
                warn("obj_pid: not game object: " + obj, undefined, this);
                return null;
            }
            return obj.pid;
        };
        Script.prototype.obj_on_screen = function (obj) {
            log("obj_on_screen", arguments);
            if (!isGameObject(obj)) {
                warn("obj_on_screen: not a game object: " + obj);
                return 0;
            }
            return objectOnScreen(obj) ? 1 : 0;
        };
        Script.prototype.obj_type = function (obj) {
            if (!isGameObject(obj)) {
                warn("obj_type: not game object: " + obj);
                return null;
            }
            else if (obj.type === "critter")
                return 1;
            else if (obj.pid === undefined) {
                warn("obj_type: no PID");
                return null;
            }
            return (obj.pid >> 24) & 0xff;
        };
        Script.prototype.destroy_object = function (obj) {
            log("destroy_object", arguments);
            gMap.destroyObject(obj);
        };
        Script.prototype.set_exit_grids = function (onElev, mapID, elevation, tileNum, rotation) {
            stub("set_exit_grids", arguments);
            for (var i = 0; i < gameObjects.length; i++) {
                var obj = gameObjects[i];
                if (obj.type === "misc" && obj.extra && obj.extra.exitMapID !== undefined) {
                    obj.extra.exitMapID = mapID;
                    obj.extra.startingPosition = tileNum;
                    obj.extra.startingElevation = elevation;
                }
            }
        };
        Script.prototype.tile_distance_objs = function (a, b) {
            if ((!isSpatial(a) && !isSpatial(b)) && (!isGameObject(a) || !isGameObject(b))) {
                warn("tile_distance_objs: " + a + " or " + b + " are not game objects");
                return null;
            }
            return hexDistance(a.position, b.position);
        };
        Script.prototype.tile_distance = function (a, b) {
            if (a === -1 || b === -1)
                return 9999;
            return hexDistance(fromTileNum(a), fromTileNum(b));
        };
        Script.prototype.tile_num = function (obj) {
            if (!isSpatial(obj) && !isGameObject(obj)) {
                warn("tile_num: not a game object: " + obj, undefined, this);
                return null;
            }
            return toTileNum(obj.position);
        };
        Script.prototype.tile_contains_pid_obj = function (tile, elevation, pid) {
            stub("tile_contains_pid_obj", arguments, "tiles");
            var pos = fromTileNum(tile);
            var objects = gMap.getObjects(elevation);
            for (var i = 0; i < objects.length; i++) {
                if (objects[i].position.x === pos.x && objects[i].position.y === pos.y &&
                    objects[i].pid === pid) {
                    return objects[i];
                }
            }
            return 0;
        };
        Script.prototype.tile_is_visible = function (tile) {
            stub("tile_is_visible", arguments, "tiles");
            return 1;
        };
        Script.prototype.tile_num_in_direction = function (tile, direction, distance) {
            if (distance === 0) {
                return -1;
            }
            var newTile = hexInDirection(fromTileNum(tile), direction);
            for (var i = 0; i < distance - 1; i++)
                newTile = hexInDirection(newTile, direction);
            return toTileNum(newTile);
        };
        Script.prototype.tile_in_tile_rect = function (ul, ur, ll, lr, t) {
            var _ul = fromTileNum(ul), _ur = fromTileNum(ur);
            var _ll = fromTileNum(ll), _lr = fromTileNum(lr);
            var _t = fromTileNum(t);
            return (tile_in_tile_rect(_t, _ur, _lr, _ll, _ul) ? 1 : 0);
        };
        Script.prototype.tile_contains_obj_pid = function (tile, elevation, pid) {
            if (elevation !== currentElevation) {
                warn("tile_contains_obj_pid: not same elevation");
                return 0;
            }
            var objs = objectsAtPosition(fromTileNum(tile));
            for (var i = 0; i < objs.length; i++) {
                if (objs[i].pid === pid)
                    return 1;
            }
            return 0;
        };
        Script.prototype.rotation_to_tile = function (srcTile, destTile) {
            var src = fromTileNum(srcTile), dest = fromTileNum(destTile);
            var hex = hexNearestNeighbor(src, dest);
            if (hex !== null)
                return hex.direction;
            warn("rotation_to_tile: invalid hex: " + srcTile + " / " + destTile);
            return -1;
        };
        Script.prototype.move_to = function (obj, tileNum, elevation) {
            if (!isGameObject(obj)) {
                warn("move_to: not a game object: " + obj);
                return;
            }
            if (elevation !== currentElevation) {
                info("move_to: moving to elevation " + elevation);
                if (obj instanceof Critter && obj.isPlayer)
                    gMap.changeElevation(elevation, true);
                else {
                    gMap.removeObject(obj);
                    gMap.addObject(obj, elevation);
                }
            }
            obj.position = fromTileNum(tileNum);
            if (obj instanceof Critter && obj.isPlayer)
                centerCamera(obj.position);
        };
        Script.prototype.node998 = function () {
            console.log("[enter combat]");
        };
        Script.prototype.node999 = function () {
            info("DIALOGUE EXIT (Node999)");
            dialogueExit();
        };
        Script.prototype.gdialog_set_barter_mod = function (mod) { stub("gdialog_set_barter_mod", arguments); };
        Script.prototype.gdialog_mod_barter = function (mod) {
            log("gdialog_mod_barter", arguments);
            console.log("--> barter mode");
            if (!this.self_obj)
                throw "need self_obj";
            uiBarterMode(this.self_obj);
        };
        Script.prototype.start_gdialog = function (msgFileID, obj, mood, headNum, backgroundID) {
            log("start_gdialog", arguments);
            info("DIALOGUE START", "dialogue");
            if (!this.self_obj)
                throw "no self_obj for start_gdialog";
            currentDialogueObject = this.self_obj;
            uiStartDialogue(false, this.self_obj);
        };
        Script.prototype.gsay_start = function () { stub("gSay_Start", arguments); };
        Script.prototype.gsay_reply = function (msgList, msgID) {
            log("gSay_Reply", arguments);
            var msg = getScriptMessage(msgList, msgID);
            if (msg === null)
                throw Error("gsay_reply: msg is null");
            info("REPLY: " + msg, "dialogue");
            uiSetDialogueReply(msg);
        };
        Script.prototype.gsay_message = function (msgList, msgID, reaction) {
            log("gsay_message", arguments);
        };
        Script.prototype.gsay_end = function () { stub("gSay_End", arguments); };
        Script.prototype.end_dialogue = function () { stub("end_dialogue", arguments); };
        Script.prototype.giq_option = function (iqTest, msgList, msgID, target, reaction) {
            log("giQ_Option", arguments);
            var msg = getScriptMessage(msgList, msgID);
            if (msg === null) {
                console.warn("giq_option: msg is null");
                return;
            }
            info("DIALOGUE OPTION: " + msg +
                " [INT " + ((iqTest >= 0) ? (">=" + iqTest) : ("<=" + -iqTest)) + "]", "dialogue");
            var INT = critterGetStat(player, "INT");
            if ((iqTest > 0 && INT < iqTest) || (iqTest < 0 && INT > -iqTest))
                return;
            dialogueOptionProcs.push(target.bind(this));
            uiAddDialogueOption(msg, dialogueOptionProcs.length - 1);
        };
        Script.prototype.dialogue_system_enter = function () {
            log("dialogue_system_enter", arguments);
            if (!this.self_obj) {
                warn("dialogue_system_enter: no self_obj");
                return;
            }
            talk(this.self_obj._script, this.self_obj);
        };
        Script.prototype.float_msg = function (obj, msg, type) {
            log("float_msg", arguments);
            if (!isGameObject(obj)) {
                warn("float_msg: not game object: " + obj);
                return;
            }
            var colorMap = {
                0: "white",
                1: "black",
                2: "red",
                3: "green",
                4: "blue",
                5: "purple",
                6: "white",
                7: "red",
                8: "white",
                9: "white",
                10: "dark gray",
                11: "dark gray",
                12: "light gray"
            };
            var color = colorMap[type];
            if (type === -2 || type === -1)
                color = colorMap[9];
            floatMessages.push({ msg: msg, obj: this.self_obj, startTime: heart.timer.getTime(),
                color: color });
        };
        Script.prototype.reg_anim_func = function (_1, _2) { stub("reg_anim_func", arguments, "animation"); };
        Script.prototype.reg_anim_animate = function (obj, anim, delay) { stub("reg_anim_animate", arguments, "animation"); };
        Script.prototype.reg_anim_animate_forever = function (obj, anim) {
            log("reg_anim_animate_forever", arguments, "animation");
            if (!isGameObject(obj)) {
                warn("reg_anim_animate_forever: not a game object");
                return;
            }
            if (anim !== 0)
                warn("reg_anim_animate_forever: anim = " + anim);
            function animate() { objectSingleAnim(obj, false, animate); }
            animate();
        };
        Script.prototype.animate_move_obj_to_tile = function (obj, tileNum, isRun) {
            log("animate_move_obj_to_tile", arguments, "movement");
            if (!isGameObject(obj)) {
                warn("animate_move_obj_to_tile: not a game object", "movement", this);
                return;
            }
            if (typeof (tileNum) === "function")
                tileNum = tileNum.call(this);
            if (isNaN(tileNum)) {
                warn("animate_move_obj_to_tile: invalid tile num", "movement", this);
                return;
            }
            var tile = fromTileNum(tileNum);
            if (tile.x < 0 || tile.x >= 200 || tile.y < 0 || tile.y >= 200) {
                warn("animate_move_obj_to_tile: invalid tile: " + tile.x +
                    ", " + tile.y + " (" + tileNum + ")", "movement", this);
                return;
            }
            if (!obj.walkTo(tile, !!isRun)) {
                warn("animate_move_obj_to_tile: no path", "movement", this);
                return;
            }
        };
        Script.prototype.reg_anim_obj_move_to_tile = function (obj, tileNum, delay) { stub("reg_anim_obj_move_to_tile", arguments, "movement"); };
        Script.prototype.animate_stand_obj = function (obj) {
            stub("animate_stand_obj", arguments, "animation");
        };
        Script.prototype.explosion = function (tile, elevation, damage) {
            log("explosion", arguments);
            var explosives = createObjectWithPID(makePID(0, 85), -1);
            explosives.position = fromTileNum(tile);
            gMap.addObject(explosives);
            objectExplode(explosives, explosives, 0, 100);
            gMap.removeObject(explosives);
        };
        Script.prototype.gfade_out = function (time) { stub("gfade_out", arguments); };
        Script.prototype.gfade_in = function (time) { stub("gfade_in", arguments); };
        Script.prototype.add_timer_event = function (obj, ticks, userdata) {
            log("add_timer_event", arguments);
            if (!obj || !obj._script) {
                warn("add_timer_event: not a scriptable object: " + obj);
                return;
            }
            info("timer event added in " + ticks + " ticks (userdata " + userdata + ")", "timer");
            Scripting.timeEventList.push({ ticks: ticks, obj: obj, userdata: userdata, fn: function () {
                    timedEvent(obj._script, userdata);
                }.bind(this) });
        };
        Script.prototype.rm_timer_event = function (obj) {
            log("rm_timer_event", arguments);
            info("rm_timer_event: " + obj + ", " + obj.pid);
            for (var i = 0; i < Scripting.timeEventList.length; i++) {
                var timedEvent_1 = Scripting.timeEventList[i];
                if (timedEvent_1.obj && timedEvent_1.obj.pid === obj.pid) {
                    info("removing timed event for obj");
                    Scripting.timeEventList.splice(i--, 1);
                    break;
                }
            }
        };
        Script.prototype.game_ticks = function (seconds) { return seconds * 10; };
        Script.prototype.game_time_advance = function (ticks) {
            log("game_time_advance", arguments);
            info("advancing time " + ticks + " ticks " + "(" + ticks / 10 + " seconds)");
            gameTickTime += ticks;
        };
        Script.prototype.load_map = function (map, startLocation) {
            log("load_map", arguments);
            info("load_map: " + map);
            if (typeof map === "string")
                gMap.loadMap(map.split(".")[0].toLowerCase());
            else
                gMap.loadMapByID(map);
        };
        Script.prototype.play_gmovie = function (movieID) { stub("play_gmovie", arguments); };
        Script.prototype.mark_area_known = function (areaType, area, markState) {
            if (areaType === 0) {
                switch (markState) {
                    case 0: break;
                    case 1:
                        info("TODO: Mark area " + area + " on map");
                        return;
                    case 2: break;
                    case -66: break;
                }
                stub("mark_area_known", arguments);
            }
            else if (areaType === 1) {
                stub("mark_area_known", arguments);
            }
            else
                throw "mark_area_known: invalid area type " + areaType;
        };
        Script.prototype.wm_area_set_pos = function (area, x, y) { stub("wm_area_set_pos", arguments); };
        Script.prototype.game_ui_disable = function () { stub("game_ui_disable", arguments); };
        Script.prototype.game_ui_enable = function () { stub("game_ui_enable", arguments); };
        Script.prototype.play_sfx = function (sfx) { stub("play_sfx", arguments); };
        Script.prototype.party_member_obj = function (pid) {
            log("party_member_obj", arguments, "party");
            return gParty.getPartyMemberByPID(pid) || 0;
        };
        Script.prototype.party_add = function (obj) {
            log("party_add", arguments);
            gParty.addPartyMember(obj);
        };
        Script.prototype.party_remove = function (obj) {
            log("party_remove", arguments);
            gParty.removePartyMember(obj);
        };
        Script.prototype._serialize = function () {
            return { name: this.scriptName,
                lvars: Object.assign({}, this.lvars) };
        };
        return Script;
    }());
    Scripting.Script = Script;
    function deserializeScript(obj) {
        var script = loadScript(obj.name);
        script.lvars = obj.lvars;
        return script;
    }
    Scripting.deserializeScript = deserializeScript;
    function loadMessageFile(name) {
        name = name.toLowerCase();
        info("loading message file: " + name, "load");
        var msg = getFileText("data/text/english/dialog/" + name + ".msg");
        if (scriptMessages[name] === undefined)
            scriptMessages[name] = {};
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
            scriptMessages[name][parseInt(m[1])] = m[2].replace(/\ufffd/g, "'");
        }
    }
    function setMapScript(script) {
        currentMapObject = script;
    }
    Scripting.setMapScript = setMapScript;
    function loadScript(name) {
        info("loading script " + name, "load");
        var path = "data/scripts/" + name.toLowerCase() + ".int";
        var data = getFileBinarySync(path);
        var reader = new BinaryReader(data);
        var intfile = parseIntFile(reader, name.toLowerCase());
        if (!currentMapObject)
            console.log("note: using current script (%s) as map script for this object", intfile.name);
        reader.seek(0);
        var vm = new ScriptVMBridge.GameScriptVM(reader, intfile);
        vm.scriptObj.scriptName = name;
        vm.scriptObj.lvars = {};
        vm.scriptObj._mapScript = currentMapObject || vm.scriptObj;
        vm.scriptObj._vm = vm;
        vm.run();
        return vm.scriptObj;
    }
    Scripting.loadScript = loadScript;
    function initScript(script, obj) {
        script.self_obj = obj;
        script.cur_map_index = currentMapID;
        if (script.start !== undefined)
            script.start();
    }
    Scripting.initScript = initScript;
    function timedEvent(script, userdata) {
        info("timedEvent: " + script.scriptName + ": " + userdata, "timer");
        if (script.timed_event_p_proc === undefined) {
            warn("timedEvent called on script without a timed_event_p_proc! script: " + script.scriptName + " userdata: " + userdata);
            return false;
        }
        script.fixed_param = userdata;
        script._didOverride = false;
        script.timed_event_p_proc();
        return script._didOverride;
    }
    Scripting.timedEvent = timedEvent;
    function use(obj, source) {
        if (!obj._script || obj._script.use_p_proc === undefined)
            return null;
        obj._script.source_obj = source;
        obj._script.self_obj = obj;
        obj._script._didOverride = false;
        obj._script.use_p_proc();
        return obj._script._didOverride;
    }
    Scripting.use = use;
    function talk(script, obj) {
        script.self_obj = obj;
        script.game_time = Math.max(1, gameTickTime);
        script.cur_map_index = currentMapID;
        script._didOverride = false;
        script.talk_p_proc();
        return script._didOverride;
    }
    Scripting.talk = talk;
    function updateCritter(script, obj) {
        if (!script.critter_p_proc)
            return false;
        script.game_time = gameTickTime;
        script.cur_map_index = currentMapID;
        script._didOverride = false;
        script.self_obj = obj;
        script.self_tile = toTileNum(obj.position);
        script.critter_p_proc();
        return script._didOverride;
    }
    Scripting.updateCritter = updateCritter;
    function spatial(spatialObj, source) {
        var script = spatialObj._script;
        if (!script)
            throw Error("spatial without a script being triggered");
        if (!script.spatial_p_proc)
            throw Error("spatial script without a spatial_p_proc triggered");
        script.game_time = gameTickTime;
        script.cur_map_index = currentMapID;
        script.source_obj = source;
        script.self_obj = spatialObj;
        script.spatial_p_proc();
    }
    Scripting.spatial = spatial;
    function destroy(obj, source) {
        if (!obj._script || !obj._script.destroy_p_proc)
            return null;
        obj._script.self_obj = obj;
        obj._script.source_obj = source || 0;
        obj._script.game_time = Math.max(1, gameTickTime);
        obj._script.cur_map_index = currentMapID;
        obj._script._didOverride = false;
        obj._script.destroy_p_proc();
        return obj._script._didOverride;
    }
    Scripting.destroy = destroy;
    function damage(obj, target, source, damage) {
        if (!obj._script || obj._script.damage_p_proc === undefined)
            return null;
        obj._script.self_obj = obj;
        obj._script.target_obj = target;
        obj._script.source_obj = source;
        obj._script.game_time = Math.max(1, gameTickTime);
        obj._script.cur_map_index = currentMapID;
        obj._script._didOverride = false;
        obj._script.damage_p_proc();
        return obj._script._didOverride;
    }
    Scripting.damage = damage;
    function useSkillOn(who, skillId, obj) {
        if (!obj._script)
            throw Error("useSkillOn: Object has no script");
        obj._script.self_obj = obj;
        obj._script.source_obj = who;
        obj._script.cur_map_index = currentMapID;
        obj._script._didOverride = false;
        obj._script.action_being_used = skillId;
        obj._script.use_skill_on_p_proc();
        return obj._script._didOverride;
    }
    Scripting.useSkillOn = useSkillOn;
    function pickup(obj, source) {
        if (!obj._script)
            throw Error("pickup: Object has no script");
        obj._script.self_obj = obj;
        obj._script.source_obj = source;
        obj._script.cur_map_index = currentMapID;
        obj._script._didOverride = false;
        obj._script.pickup_p_proc();
        return obj._script._didOverride;
    }
    Scripting.pickup = pickup;
    function combatEvent(obj, event) {
        if (!obj._script)
            throw Error("combatEvent: Object has no script");
        var fixed_param = null;
        switch (event) {
            case "turnBegin":
                fixed_param = 4;
                break;
            default: throw "combatEvent: unknown event " + event;
        }
        if (!obj._script.combat_p_proc)
            return false;
        info("[COMBAT EVENT " + event + "]");
        obj._script.combat_is_initialized = 1;
        obj._script.fixed_param = fixed_param;
        obj._script.self_obj = obj;
        obj._script.game_time = Math.max(1, gameTickTime);
        obj._script.cur_map_index = currentMapID;
        obj._script._didOverride = false;
        var doTerminate = false;
        obj._script.terminate_combat = function () { doTerminate = true; };
        obj._script.combat_p_proc();
        if (doTerminate) {
            console.log("DUH DUH TERMINATE!");
            Script.prototype.terminate_combat.call(obj._script);
        }
        return doTerminate;
    }
    Scripting.combatEvent = combatEvent;
    function updateMap(mapScript, objects, elevation) {
        gameObjects = objects;
        mapFirstRun = false;
        if (mapScript) {
            mapScript.combat_is_initialized = inCombat ? 1 : 0;
            if (mapScript.map_update_p_proc !== undefined) {
                mapScript.self_obj = { _script: mapScript };
                mapScript.map_update_p_proc();
            }
        }
        var updated = 0;
        for (var i = 0; i < gameObjects.length; i++) {
            var script = gameObjects[i]._script;
            if (script !== undefined && script.map_update_p_proc !== undefined) {
                script.combat_is_initialized = inCombat ? 1 : 0;
                script.self_obj = gameObjects[i];
                script.game_time = Math.max(1, gameTickTime);
                script.game_time_hour = 1200;
                script.cur_map_index = currentMapID;
                script.map_update_p_proc();
                updated++;
            }
        }
    }
    Scripting.updateMap = updateMap;
    function enterMap(mapScript, objects, elevation, mapID, isFirstRun) {
        gameObjects = objects;
        currentMapID = mapID;
        mapFirstRun = isFirstRun;
        if (mapScript && mapScript.map_enter_p_proc !== undefined) {
            info("calling map enter");
            mapScript.self_obj = { _script: mapScript };
            mapScript.map_enter_p_proc();
        }
        if (overrideStartPos) {
            var r = overrideStartPos;
            overrideStartPos = null;
            return r;
        }
        return null;
    }
    Scripting.enterMap = enterMap;
    function objectEnterMap(obj, elevation, mapID) {
        var script = obj._script;
        if (script !== undefined && script.map_enter_p_proc !== undefined) {
            script.combat_is_initialized = 0;
            script.self_obj = obj;
            script.game_time = Math.max(1, gameTickTime);
            script.game_time_hour = 1200;
            script.cur_map_index = currentMapID;
            script.map_enter_p_proc();
        }
    }
    Scripting.objectEnterMap = objectEnterMap;
    function reset(mapName, mapID) {
        Scripting.timeEventList.length = 0;
        dialogueOptionProcs.length = 0;
        gameObjects = null;
        currentMapObject = null;
        currentMapID = (mapID !== undefined) ? mapID : null;
        mapVars = {};
    }
    Scripting.reset = reset;
    function init(mapName, mapID) {
        seed(123);
        reset(mapName, mapID);
    }
    Scripting.init = init;
})(Scripting || (Scripting = {}));
