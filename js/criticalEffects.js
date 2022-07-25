"use strict";
var CriticalEffects;
(function (CriticalEffects) {
    var generalRegionName = {
        0: "head", 1: "leftArm", 2: "rightArm", 3: "torso", 4: "rightLeg", 5: "leftLeg", 6: "eyes", 7: "groin", 8: "uncalled"
    };
    CriticalEffects.regionHitChanceDecTable = {
        "torso": 0, "leftLeg": 20, "rightLeg": 20, "groin": 30, "leftArm": 30, "rightArm": 30, "head": 40, "eyes": 60
    };
    var critterTable;
    var critFailEffects = {
        damageSelf: function (target) {
            console.log(target.name + " has damaged themselves. This does not do anything yet");
        },
        crippleRandomAppendage: function (target) {
            console.log(target.name + " has crippled a random appendage. This does not do anything yet");
        },
        hitRandomly: function (target) {
            console.log(target.name + " has hit randomly. This does not do anything yet");
        },
        hitSelf: function (target) {
            console.log(target.name + " has hit themselves. This does not do anything yet");
        },
        loseAmmo: function (target) {
            console.log(target.name + " has lost their ammo. This does not do anything yet");
        },
        destroyWeapon: function (target) {
            console.log(target.name + " has had their weapon blow up in their face. Ouch. This does not do anything yet");
        }
    };
    var critterEffects = {
        knockout: function (target) {
            console.log(target.name + " has been knocked out. This does not do anything yet");
        },
        knockdown: function (target) {
            console.log(target.name + " has been knocked down. This does not do anything yet");
        },
        crippledLeftLeg: function (target) {
            console.log(target.name + " has been crippled in the left leg. This does not do anything yet");
        },
        crippledRightLeg: function (target) {
            console.log(target.name + " has been crippled in the right leg. This does not do anything yet");
        },
        crippledLeftArm: function (target) {
            console.log(target.name + " has been crippled in the left arm. This does not do anything yet");
        },
        crippledRightArm: function (target) {
            console.log(target.name + " has been crippled in the right arm. This does not do anything yet");
        },
        blinded: function (target) {
            console.log(target.name + " has been blinded by delight. This does not do anything yet");
        },
        death: function (target) {
            console.log(target.name + " has met the reaperpony. This does not do anything yet");
        },
        onFire: function (target) {
            console.log(target.name + " just got a flame lit in their heart. This does not do anything yet");
        },
        bypassArmor: function (target) {
            console.log(target.name + " is being hit by an armor bypassing bullet, blame the Zebras. This does not do anything yet");
        },
        droppedWeapon: function (target) {
            console.log(target.name + " needs to drop their weapon like it's hot. The documentation claims this is broken. This does not do anything yet");
        },
        loseNextTurn: function (target) {
            console.log(target.name + " lost their next turn. This does not do anything yet");
        },
        random: function (target) {
            console.log(target.name + " is affected by a random effect. How random! This does not do anything yet");
        }
    };
    var Effects = (function () {
        function Effects(effectCallbackList) {
            this.effects = effectCallbackList;
        }
        Effects.prototype.doEffectsOn = function (target) {
            for (var i = 0; i < this.effects.length; i++)
                this.effects[i](target);
        };
        return Effects;
    }());
    var StatCheck = (function () {
        function StatCheck(stat, modifier, effects, failEffectMessageID) {
            this.stat = stat;
            this.modifier = modifier;
            this.effects = effects;
            this.failEffectMessageID = failEffectMessageID;
        }
        StatCheck.prototype.doEffectsOn = function (target) {
            if (this.stat === undefined)
                return { success: false };
            var statToRollAgainst = critterGetStat(target, this.stat);
            statToRollAgainst += this.modifier;
            if (!rollSkillCheck(statToRollAgainst * 10, 0, false)) {
                this.effects.doEffectsOn(target);
                return { success: true, msgID: this.failEffectMessageID };
            }
            return { success: false };
        };
        return StatCheck;
    }());
    var CritType = (function () {
        function CritType(damageMultiplier, effects, statCheck, effectMsg) {
            this.DM = damageMultiplier;
            this.effects = effects;
            this.statCheck = statCheck;
            this.msgID = effectMsg;
        }
        CritType.prototype.doEffectsOn = function (target) {
            var returnMsgID = this.msgID;
            var statCheckResults = this.statCheck.doEffectsOn(target);
            this.effects.doEffectsOn(target);
            if (statCheckResults.success === true)
                returnMsgID = statCheckResults.msgID;
            return { DM: this.DM, msgID: returnMsgID };
        };
        return CritType;
    }());
    function parseCritLevel(critLevel) {
        var stat = critLevel.statCheck;
        var statVal = undefined;
        if (stat.stat != -1)
            statVal = StatType[stat.stat];
        var tempStatCheck = new StatCheck(statVal, stat.checkModifier, parseEffects(stat.failureEffect), stat.failureMessage);
        var retCritLevel = new CritType(critLevel.dmgMultiplier, parseEffects(critLevel.critEffect), tempStatCheck, critLevel.msg);
        return retCritLevel;
    }
    function parseEffects(effects) {
        var tempEffects = [];
        for (var i = 0; i < effects.length; i++)
            tempEffects[i] = critterEffects[effects[i]];
        return new Effects(tempEffects);
    }
    function getCritical(critterKillType, region, critLevel) {
        var ret = undefined;
        try {
            var actualLevel = Math.min(critLevel, critterTable[critterKillType][region].length - 1);
            ret = critterTable[critterKillType][region][actualLevel];
        }
        catch (e) {
        }
        if (ret === undefined) {
            console.log("error: could not find critical: " + critterKillType + "/" + region + "/" + critLevel);
            ret = defaultCritType(critterKillType, region, critLevel);
        }
        return ret;
    }
    CriticalEffects.getCritical = getCritical;
    function defaultCritType(critterKillType, region, critLevel) {
        return new CritType(2, new Effects([]), new StatCheck(undefined, undefined, undefined, undefined), undefined);
    }
    function getCriticalFail(weaponType, failLevel) {
        var ret = undefined;
        try {
            ret = CriticalEffects.criticalFailTable[weaponType][failLevel];
        }
        catch (e) {
        }
        if (ret === undefined)
            ret = [function (critter) { console.log("error: could not find critical fail: " + weaponType + "/" + failLevel); }];
        return ret;
    }
    CriticalEffects.getCriticalFail = getCriticalFail;
    function loadTable() {
        var haveTable = true;
        var table = getFileJSON("lut/criticalTables.json", function () {
            haveTable = false;
        });
        if (!haveTable) {
            console.log("lut/criticalTables.json not found, not loading critical hit/miss table");
            return;
        }
        critterTable = new Array(table.length);
        for (var i = 0; i < table.length; i++) {
            critterTable[i] = {};
            for (var region in table[i]) {
                critterTable[i][region] = new Array(table[i][region].length);
                for (var critLevel = 0; critLevel < table[i][region].length; critLevel++)
                    critterTable[i][region][critLevel] = parseCritLevel(table[i][region][critLevel]);
            }
        }
    }
    CriticalEffects.loadTable = loadTable;
    CriticalEffects.criticalFailTable = {
        unarmed: {
            1: [],
            2: [critterEffects.loseNextTurn],
            3: [critterEffects.loseNextTurn],
            4: [critFailEffects.damageSelf, critterEffects.knockdown],
            5: [critFailEffects.crippleRandomAppendage]
        },
        melee: {
            1: [],
            2: [critterEffects.loseNextTurn],
            3: [critterEffects.droppedWeapon],
            4: [critFailEffects.hitRandomly],
            5: [critFailEffects.hitSelf]
        },
        firearms: {
            1: [],
            2: [critFailEffects.loseAmmo],
            3: [critterEffects.droppedWeapon],
            4: [critFailEffects.hitRandomly],
            5: [critFailEffects.destroyWeapon]
        },
        energy: {
            1: [critterEffects.loseNextTurn],
            2: [critFailEffects.loseAmmo, critterEffects.loseNextTurn],
            3: [critterEffects.droppedWeapon, critterEffects.loseNextTurn],
            4: [critFailEffects.hitRandomly],
            5: [critFailEffects.destroyWeapon, critterEffects.loseNextTurn]
        },
        grenades: {
            1: [],
            2: [critterEffects.droppedWeapon],
            3: [critFailEffects.damageSelf, critterEffects.droppedWeapon],
            4: [critFailEffects.hitRandomly],
            5: [critFailEffects.destroyWeapon]
        },
        rocketlauncher: {
            1: [critterEffects.loseNextTurn],
            2: [],
            3: [critFailEffects.destroyWeapon],
            4: [critFailEffects.hitRandomly],
            5: [critFailEffects.destroyWeapon, critterEffects.loseNextTurn, critterEffects.knockdown]
        },
        flamers: {
            1: [],
            2: [critterEffects.loseNextTurn],
            3: [critFailEffects.hitRandomly],
            4: [critFailEffects.destroyWeapon],
            5: [critFailEffects.destroyWeapon, critterEffects.loseNextTurn, critterEffects.onFire]
        }
    };
    function temporaryDoCritFail(critFail, target) {
        for (var i = 0; i < critFail.length; i++) {
            critFail[i](target);
        }
    }
    CriticalEffects.temporaryDoCritFail = temporaryDoCritFail;
})(CriticalEffects || (CriticalEffects = {}));
