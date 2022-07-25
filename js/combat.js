"use strict";
var ActionPoints = (function () {
    function ActionPoints(obj) {
        this.combat = 0;
        this.move = 0;
        this.attachedCritter = obj;
        this.resetAP();
    }
    ActionPoints.prototype.resetAP = function () {
        var AP = this.getMaxAP();
        this.combat = AP.combat;
        this.move = AP.move;
    };
    ActionPoints.prototype.getMaxAP = function () {
        var bonusCombatAP = 0;
        var bonusMoveAP = 0;
        return { combat: 5 + Math.floor(critterGetStat(this.attachedCritter, "AGI") / 2) + bonusCombatAP, move: bonusMoveAP };
    };
    ActionPoints.prototype.getAvailableMoveAP = function () {
        return this.combat + this.move;
    };
    ActionPoints.prototype.getAvailableCombatAP = function () {
        return this.combat;
    };
    ActionPoints.prototype.subtractMoveAP = function (value) {
        if (this.getAvailableMoveAP() < value)
            return false;
        this.move -= value;
        if (this.move < 0) {
            if (this.subtractCombatAP(-this.move)) {
                this.move = 0;
                return true;
            }
            return false;
        }
        return true;
    };
    ActionPoints.prototype.subtractCombatAP = function (value) {
        if (this.combat < value)
            return false;
        this.combat -= value;
        return true;
    };
    return ActionPoints;
}());
var AI = (function () {
    function AI(combatant) {
        this.combatant = combatant;
        if (AI.aiTxt === null)
            AI.init();
        this.info = AI.getPacketInfo(this.combatant.aiNum);
        if (!this.info)
            throw "no AI packet for " + combatant.toString() +
                " (packet " + this.combatant.aiNum + ")";
    }
    AI.init = function () {
        if (AI.aiTxt !== null)
            return;
        AI.aiTxt = {};
        var ini = parseIni(getFileText("data/data/ai.txt"));
        if (ini === null)
            throw "couldn't load AI.TXT";
        for (var key in ini) {
            ini[key].keyName = key;
            AI.aiTxt[ini[key].packet_num] = ini[key];
        }
    };
    AI.getPacketInfo = function (aiNum) {
        return AI.aiTxt[aiNum] || null;
    };
    AI.aiTxt = null;
    return AI;
}());
var Combat = (function () {
    function Combat(objects) {
        this.combatants = objects.filter(function (obj) {
            if (obj instanceof Critter) {
                if (obj.dead || !obj.visible)
                    return false;
                if (!obj.isPlayer && !obj.ai)
                    obj.ai = new AI(obj);
                if (obj.stats === undefined)
                    throw "no stats";
                obj.dead = false;
                obj.AP = new ActionPoints(obj);
                return true;
            }
            return false;
        });
        this.playerIdx = this.combatants.findIndex(function (x) { return x.isPlayer; });
        if (this.playerIdx === -1)
            throw "combat: couldn't find player?";
        this.player = this.combatants[this.playerIdx];
        this.turnNum = 1;
        this.whoseTurn = this.playerIdx - 1;
        this.inPlayerTurn = true;
        this.player.clearAnim();
        uiStartCombat();
    }
    Combat.prototype.log = function (msg) {
        console.log(msg);
    };
    Combat.prototype.accountForPartialCover = function (obj, target) {
        return 0;
    };
    Combat.prototype.getHitDistanceModifier = function (obj, target, weapon) {
        var distModifier = 2;
        var minDistance = 0;
        var perception = critterGetStat(obj, "PER");
        var distance = hexDistance(obj.position, target.position);
        if (distance < minDistance)
            distance += minDistance;
        else {
            var tempPER = perception;
            if (obj.isPlayer === true)
                tempPER -= 2;
            distance -= tempPER * distModifier;
        }
        if (-2 * perception > distance)
            distance = -2 * perception;
        var objHasEyeDamage = false;
        if (distance >= 0 && objHasEyeDamage)
            distance *= 12;
        else
            distance *= 4;
        if (distance >= 0)
            return distance;
        else
            return 0;
    };
    Combat.prototype.getHitChance = function (obj, target, region) {
        var weaponObj = critterGetEquippedWeapon(obj);
        if (weaponObj === null)
            return { hit: -1, crit: -1 };
        var weapon = weaponObj.weapon;
        var weaponSkill;
        if (!weapon)
            throw Error("getHitChance: No weapon");
        if (weapon.weaponSkillType === undefined) {
            this.log("weaponSkillType is undefined");
            weaponSkill = 0;
        }
        else
            weaponSkill = critterGetSkill(obj, weapon.weaponSkillType);
        var hitDistanceModifier = this.getHitDistanceModifier(obj, target, weaponObj);
        var bonusAC = 0;
        var AC = critterGetStat(target, "AC") + bonusAC;
        var bonusCrit = 0;
        var baseCrit = critterGetStat(obj, "Critical Chance") + bonusCrit;
        var hitChance = weaponSkill - AC - CriticalEffects.regionHitChanceDecTable[region] - hitDistanceModifier;
        var critChance = baseCrit + CriticalEffects.regionHitChanceDecTable[region];
        if (isNaN(hitChance))
            throw "something went wrong with hit chance calculation";
        hitChance = Math.min(95, hitChance);
        return { hit: hitChance, crit: critChance };
    };
    Combat.prototype.rollHit = function (obj, target, region) {
        var critModifer = critterGetStat(obj, "Better Criticals");
        var hitChance = this.getHitChance(obj, target, region);
        var roll = getRandomInt(1, 101);
        if (hitChance.hit - roll > 0) {
            var isCrit = false;
            if (rollSkillCheck(Math.floor(hitChance.hit - roll) / 10, hitChance.crit, false) === true)
                isCrit = true;
            if (isCrit === true) {
                var critLevel = Math.floor(Math.max(0, getRandomInt(critModifer, 100 + critModifer)) / 20);
                this.log("crit level: " + critLevel);
                var crit = CriticalEffects.getCritical(critterGetKillType(target), region, critLevel);
                var critStatus = crit.doEffectsOn(target);
                return { hit: true, crit: true, DM: critStatus.DM, msgID: critStatus.msgID };
            }
            return { hit: true, crit: false };
        }
        var isCrit = false;
        if (rollSkillCheck(Math.floor(roll - hitChance.hit) / 10, 0, false))
            isCrit = true;
        return { hit: false, crit: isCrit };
    };
    Combat.prototype.getDamageDone = function (obj, target, critModifer) {
        var weapon = critterGetEquippedWeapon(obj);
        if (!weapon)
            throw Error("getDamageDone: No weapon");
        var wep = weapon.weapon;
        if (!wep)
            throw Error("getDamageDone: Weapon has no weapon data");
        var damageType = wep.getDamageType();
        var RD = getRandomInt(wep.minDmg, wep.maxDmg);
        var RB = 0;
        var CM = critModifer;
        var ADR = critterGetStat(target, "DR " + damageType);
        var ADT = critterGetStat(target, "DT " + damageType);
        var X = 2;
        var Y = 1;
        var RM = 0;
        var CD = 100;
        var ammoDamageMult = X / Y;
        var baseDamage = (CM / 2) * ammoDamageMult * (RD + RB) * (CD / 100);
        var adjustedDamage = Math.max(0, baseDamage - ADT);
        console.log("RD: " + RD + " | CM: " + CM + " | ADR: " + ADR + " | ADT: " + ADT + " | Base Dmg: " + baseDamage + " Adj Dmg: " + adjustedDamage + " | Type: " + damageType);
        return Math.ceil(adjustedDamage * (1 - (ADR + RM) / 100));
    };
    Combat.prototype.getCombatMsg = function (id) {
        return getMessage("combat", id);
    };
    Combat.prototype.attack = function (obj, target, region, callback) {
        if (region === void 0) { region = "torso"; }
        var hex = hexNearestNeighbor(obj.position, target.position);
        if (hex !== null)
            obj.orientation = hex.direction;
        critterStaticAnim(obj, "attack", callback);
        var who = obj.isPlayer ? "You" : obj.name;
        var targetName = target.isPlayer ? "you" : target.name;
        var hitRoll = this.rollHit(obj, target, region);
        this.log("hit% is " + this.getHitChance(obj, target, region).hit);
        if (hitRoll.hit === true) {
            var critModifier = hitRoll.crit ? hitRoll.DM : 2;
            var damage = this.getDamageDone(obj, target, critModifier);
            var extraMsg = hitRoll.crit === true ? (this.getCombatMsg(hitRoll.msgID) || "") : "";
            this.log(who + " hit " + targetName + " for " + damage + " damage" + extraMsg);
            critterDamage(target, damage, obj);
            if (target.dead)
                this.perish(target);
        }
        else {
            this.log(who + " missed " + targetName + (hitRoll.crit === true ? " critically" : ""));
            if (hitRoll.crit === true) {
                var critFailMod = (critterGetStat(obj, "LUK") - 5) * -5;
                var critFailRoll = Math.floor(getRandomInt(1, 100) - critFailMod);
                var critFailLevel = 1;
                if (critFailRoll <= 20)
                    critFailLevel = 1;
                else if (critFailRoll <= 50)
                    critFailLevel = 2;
                else if (critFailRoll <= 75)
                    critFailLevel = 3;
                else if (critFailRoll <= 95)
                    critFailLevel = 4;
                else
                    critFailLevel = 5;
                this.log(who + " failed at fail level " + critFailLevel);
                var critFailEffect = CriticalEffects.criticalFailTable.unarmed[critFailLevel];
                CriticalEffects.temporaryDoCritFail(critFailEffect, obj);
            }
        }
    };
    Combat.prototype.perish = function (obj) {
        this.log("...And killed them.");
    };
    Combat.prototype.getCombatAIMessage = function (id) {
        return getMessage("combatai", id);
    };
    Combat.prototype.maybeTaunt = function (obj, type, roll) {
        if (roll === false)
            return;
        var msgID = getRandomInt(parseInt(obj.ai.info[type + "_start"]), parseInt(obj.ai.info[type + "_end"]));
        this.log("[TAUNT " + obj.name + ": " + this.getCombatAIMessage(msgID) + "]");
    };
    Combat.prototype.findTarget = function (obj) {
        var targets = this.combatants.filter(function (x) { return !x.dead && x.teamNum !== obj.teamNum; });
        if (targets.length === 0)
            return null;
        targets.sort(function (a, b) { return hexDistance(obj.position, a.position) - hexDistance(obj.position, b.position); });
        return targets[0];
    };
    Combat.prototype.walkUpTo = function (obj, idx, target, maxDistance, callback) {
        if (obj.walkTo(target, false, callback, maxDistance)) {
            if (obj.AP.subtractMoveAP(obj.path.path.length - 1) === false)
                throw "subtraction issue: has AP: " + obj.AP.getAvailableMoveAP() +
                    " needs AP:" + obj.path.path.length + " and maxDist was:" + maxDistance;
            return true;
        }
        return false;
    };
    Combat.prototype.doAITurn = function (obj, idx, depth) {
        if (depth > Config.combat.maxAIDepth) {
            console.warn("Bailing out of " + depth + "-deep AI turn recursion");
            return this.nextTurn();
        }
        var that = this;
        var target = this.findTarget(obj);
        if (!target) {
            console.log("[AI has no target]");
            return this.nextTurn();
        }
        var distance = hexDistance(obj.position, target.position);
        var AP = obj.AP;
        var messageRoll = rollSkillCheck(obj.ai.info.chance, 0, false);
        if (Config.engine.doLoadScripts === true && obj._script !== undefined) {
            if (Scripting.combatEvent(obj, "turnBegin") === true)
                return;
        }
        if (AP.getAvailableMoveAP() <= 0)
            return this.nextTurn();
        if (critterGetStat(obj, "HP") <= obj.ai.info.min_hp) {
            this.log("[AI FLEES]");
            this.maybeTaunt(obj, "run", messageRoll);
            var targetPos = { x: 128, y: obj.position.y };
            var callback = function () {
                obj.clearAnim();
                that.doAITurn(obj, idx, depth + 1);
            };
            if (!this.walkUpTo(obj, idx, targetPos, AP.getAvailableMoveAP(), callback)) {
                return this.nextTurn();
            }
            return;
        }
        var weaponObj = critterGetEquippedWeapon(obj);
        if (!weaponObj)
            throw Error("AI has no weapon");
        var weapon = weaponObj.weapon;
        if (!weapon)
            throw Error("AI weapon has no weapon data");
        var fireDistance = weapon.getMaximumRange(1);
        this.log("DEBUG: weapon: " + weapon + " fireDistance: " + fireDistance +
            " obj: " + obj.art + " distance: " + distance);
        if (distance > fireDistance) {
            this.log("[AI CREEPS]");
            var neighbors = hexNeighbors(target.position);
            var maxDistance = Math.min(AP.getAvailableMoveAP(), distance - fireDistance);
            this.maybeTaunt(obj, "move", messageRoll);
            var didCreep = false;
            for (var i = 0; i < neighbors.length; i++) {
                if (obj.walkTo(neighbors[i], false, function () {
                    obj.clearAnim();
                    that.doAITurn(obj, idx, depth + 1);
                }, maxDistance) !== false) {
                    didCreep = true;
                    if (AP.subtractMoveAP(obj.path.path.length - 1) === false)
                        throw "subtraction issue: has AP: " + AP.getAvailableMoveAP() +
                            " needs AP:" + obj.path.path.length + " and maxDist was:" + maxDistance;
                    break;
                }
            }
            if (!didCreep) {
                this.log("[NO PATH]");
                that.doAITurn(obj, idx, depth + 1);
            }
        }
        else if (AP.getAvailableCombatAP() >= 4) {
            this.log("[ATTACKING]");
            AP.subtractCombatAP(4);
            if (critterGetEquippedWeapon(obj) === null)
                throw "combatant has no equipped weapon";
            this.attack(obj, target, "torso", function () {
                obj.clearAnim();
                that.doAITurn(obj, idx, depth + 1);
            });
        }
        else {
            console.log("[AI IS STUMPED]");
            this.nextTurn();
        }
    };
    Combat.start = function (forceTurn) {
        inCombat = true;
        combat = new Combat(gMap.getObjects());
        if (forceTurn)
            combat.forceTurn(forceTurn);
        combat.nextTurn();
        gMap.updateMap();
    };
    Combat.prototype.end = function () {
        for (var _i = 0, _a = this.combatants; _i < _a.length; _i++) {
            var combatant = _a[_i];
            combatant.hostile = false;
            combatant.outline = null;
        }
        console.log("[end combat]");
        combat = null;
        inCombat = false;
        gMap.updateMap();
        uiEndCombat();
    };
    Combat.prototype.forceTurn = function (obj) {
        if (obj.isPlayer)
            this.whoseTurn = this.playerIdx - 1;
        else {
            var idx = this.combatants.indexOf(obj);
            if (idx === -1)
                throw "forceTurn: no combatant '" + obj.name + '';
            this.whoseTurn = idx - 1;
        }
    };
    Combat.prototype.nextTurn = function () {
        var numActive = 0;
        for (var i = 0; i < this.combatants.length; i++) {
            var obj = this.combatants[i];
            if (obj.dead || obj.isPlayer)
                continue;
            var inRange = hexDistance(obj.position, this.player.position) <= obj.ai.info.max_dist;
            if (inRange || obj.hostile) {
                obj.hostile = true;
                obj.outline = obj.teamNum !== player.teamNum ? "red" : "green";
                numActive++;
            }
        }
        if (numActive === 0 && this.turnNum !== 1)
            return this.end();
        this.turnNum++;
        this.whoseTurn++;
        if (this.whoseTurn >= this.combatants.length)
            this.whoseTurn = 0;
        if (this.combatants[this.whoseTurn].isPlayer) {
            this.inPlayerTurn = true;
            this.player.AP.resetAP();
        }
        else {
            this.inPlayerTurn = false;
            var critter = this.combatants[this.whoseTurn];
            if (critter.dead === true || critter.hostile !== true)
                return this.nextTurn();
            critter.AP.resetAP();
            this.doAITurn(critter, this.whoseTurn, 1);
        }
    };
    return Combat;
}());
