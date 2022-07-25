"use strict";
var SkillSet = (function () {
    function SkillSet(baseSkills, tagged, skillPoints) {
        this.baseSkills = {};
        this.tagged = [];
        this.skillPoints = 0;
        if (baseSkills)
            this.baseSkills = baseSkills;
        if (tagged)
            this.tagged = tagged;
        if (skillPoints)
            this.skillPoints = skillPoints;
    }
    SkillSet.prototype.clone = function () {
        return new SkillSet(this.baseSkills, this.tagged, this.skillPoints);
    };
    SkillSet.fromPro = function (skills) {
        return new SkillSet(skills);
    };
    SkillSet.prototype.getBase = function (skill) {
        var skillDep = skillDependencies[skill];
        if (!skillDep)
            throw Error("No dependencies for skill '" + skill + "'");
        return this.baseSkills[skill] || skillDep.startValue;
    };
    SkillSet.prototype.get = function (skill, stats) {
        var base = this.getBase(skill);
        var skillDep = skillDependencies[skill];
        if (!skillDep)
            throw Error("No dependencies for skill '" + skill + "'");
        var skillValue = base;
        if (this.isTagged(skill)) {
            skillValue = skillDep.startValue + (skillValue - skillDep.startValue) * 2 + 20;
        }
        for (var _i = 0, _a = skillDep.dependencies; _i < _a.length; _i++) {
            var dep = _a[_i];
            if (dep.statType)
                skillValue += Math.floor(stats.get(dep.statType) * dep.multiplier);
        }
        return skillValue;
    };
    SkillSet.prototype.setBase = function (skill, skillValue) {
        this.baseSkills[skill] = skillValue;
    };
    SkillSet.prototype.incBase = function (skill, useSkillPoints) {
        if (useSkillPoints === void 0) { useSkillPoints = true; }
        var base = this.getBase(skill);
        if (useSkillPoints) {
            var cost = skillImprovementCost(base);
            if (this.skillPoints < cost) {
                return false;
            }
            this.skillPoints -= cost;
        }
        this.setBase(skill, base + 1);
        return true;
    };
    SkillSet.prototype.decBase = function (skill, useSkillPoints) {
        if (useSkillPoints === void 0) { useSkillPoints = true; }
        var base = this.getBase(skill);
        if (useSkillPoints) {
            var cost = skillImprovementCost(base - 1);
            this.skillPoints += cost;
        }
        this.setBase(skill, base - 1);
    };
    SkillSet.prototype.isTagged = function (skill) {
        return this.tagged.indexOf(skill) !== -1;
    };
    SkillSet.prototype.tag = function (skill) {
        this.tagged.push(skill);
    };
    SkillSet.prototype.untag = function (skill) {
        if (this.isTagged(skill))
            this.tagged.splice(this.tagged.indexOf(skill), 1);
    };
    return SkillSet;
}());
var StatSet = (function () {
    function StatSet(baseStats, useBonuses) {
        if (useBonuses === void 0) { useBonuses = true; }
        this.baseStats = {};
        if (baseStats)
            this.baseStats = baseStats;
        this.useBonuses = useBonuses;
    }
    StatSet.prototype.clone = function () {
        return new StatSet(this.baseStats, this.useBonuses);
    };
    StatSet.fromPro = function (pro) {
        var _a = pro.extra, baseStats = _a.baseStats, bonusStats = _a.bonusStats;
        var stats = Object.assign({}, baseStats);
        for (var stat in stats) {
            if (bonusStats[stat] !== undefined)
                stats[stat] += bonusStats[stat];
        }
        if (stats["Max HP"] === undefined && stats["HP"] !== undefined)
            stats["Max HP"] = stats["HP"];
        if (stats["HP"] === undefined && stats["Max HP"] !== undefined)
            stats["HP"] = stats["Max HP"];
        return new StatSet(stats, false);
    };
    StatSet.prototype.getBase = function (stat) {
        var statDep = statDependencies[stat];
        if (!statDep)
            throw Error("No dependencies for stat '" + stat + "'");
        return this.baseStats[stat] || statDep.defaultValue;
    };
    StatSet.prototype.get = function (stat) {
        var base = this.getBase(stat);
        var statDep = statDependencies[stat];
        if (!statDep)
            throw Error("No dependencies for stat '" + stat + "'");
        var statValue = base;
        if (this.useBonuses) {
            for (var _i = 0, _a = statDep.dependencies; _i < _a.length; _i++) {
                var dep = _a[_i];
                if (dep.statType)
                    statValue += Math.floor(this.get(dep.statType) * dep.multiplier);
            }
        }
        return clamp(statDep.min, statDep.max, statValue);
    };
    StatSet.prototype.setBase = function (stat, statValue) {
        this.baseStats[stat] = statValue;
    };
    StatSet.prototype.modifyBase = function (stat, change) {
        this.setBase(stat, this.getBase(stat) + change);
    };
    return StatSet;
}());
