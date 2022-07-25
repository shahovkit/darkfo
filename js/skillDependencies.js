"use strict";
var StatType;
(function (StatType) {
    StatType[StatType["STR"] = 0] = "STR";
    StatType[StatType["PER"] = 1] = "PER";
    StatType[StatType["END"] = 2] = "END";
    StatType[StatType["CHR"] = 3] = "CHR";
    StatType[StatType["INT"] = 4] = "INT";
    StatType[StatType["AGI"] = 5] = "AGI";
    StatType[StatType["LCK"] = 6] = "LCK";
    StatType[StatType["One"] = 7] = "One";
})(StatType || (StatType = {}));
var Skill = (function () {
    function Skill(startValue, dependencies) {
        this.startValue = startValue;
        this.dependencies = dependencies;
    }
    return Skill;
}());
var Dependency = (function () {
    function Dependency(statType, multiplier) {
        this.statType = statType;
        this.multiplier = multiplier;
    }
    return Dependency;
}());
var Stat = (function () {
    function Stat(min, max, defaultValue, dependencies) {
        this.min = min;
        this.max = max;
        this.defaultValue = defaultValue;
        this.dependencies = dependencies;
    }
    return Stat;
}());
var skillDependencies = {
    "Small Guns": new Skill(5, [new Dependency("AGI", 4)]),
    "Big Guns": new Skill(0, [new Dependency("AGI", 2)]),
    "Energy Weapons": new Skill(0, [new Dependency("AGI", 2)]),
    "Unarmed": new Skill(30, [new Dependency("AGI", 2), new Dependency("STR", 2)]),
    "Melee Weapons": new Skill(20, [new Dependency("AGI", 2), new Dependency("STR", 2)]),
    "Throwing": new Skill(0, [new Dependency("AGI", 4)]),
    "First Aid": new Skill(0, [new Dependency("PER", 2), new Dependency("INT", 2)]),
    "Doctor": new Skill(5, [new Dependency("PER", 1), new Dependency("INT", 1)]),
    "Sneak": new Skill(5, [new Dependency("AGI", 3)]),
    "Lockpick": new Skill(10, [new Dependency("PER", 1), new Dependency("AGI", 1)]),
    "Steal": new Skill(0, [new Dependency("AGI", 3)]),
    "Traps": new Skill(10, [new Dependency("PER", 1), new Dependency("AGI", 1)]),
    "Science": new Skill(0, [new Dependency("INT", 4)]),
    "Repair": new Skill(0, [new Dependency("INT", 3)]),
    "Speech": new Skill(0, [new Dependency("CHA", 5)]),
    "Barter": new Skill(0, [new Dependency("CHA", 4)]),
    "Gambling": new Skill(5, [new Dependency("LUK", 5)]),
    "Outdoorsman": new Skill(0, [new Dependency("END", 2), new Dependency("INT", 2)])
};
var statDependencies = {
    "STR": new Stat(1, 10, 5, []),
    "PER": new Stat(1, 10, 5, []),
    "END": new Stat(1, 10, 5, []),
    "CHA": new Stat(1, 10, 5, []),
    "INT": new Stat(1, 10, 5, []),
    "AGI": new Stat(1, 10, 5, []),
    "LUK": new Stat(1, 10, 5, []),
    "Max HP": new Stat(0, 999, 0, [new Dependency('One', 15), new Dependency('END', 2), new Dependency('STR', 2)]),
    "AP": new Stat(1, 99, 0, [new Dependency('One', 5), new Dependency('AGI', 0.5)]),
    "AC": new Stat(0, 999, 0, [new Dependency('AGI', 1)]),
    "Melee": new Stat(1, 500, 0, [new Dependency('One', -5), new Dependency('STR', 1)]),
    "Carry": new Stat(0, 999, 0, [new Dependency('One', 25), new Dependency('STR', 25)]),
    "Sequence": new Stat(0, 60, 0, [new Dependency('PER', 2)]),
    "Healing Rate": new Stat(1, 30, 0, [new Dependency('END', 1 / 3)]),
    "Critical Chance": new Stat(0, 100, 0, [new Dependency('LUK', 1)]),
    "Better Criticals": new Stat(-60, 100, 0, []),
    "DT EMP": new Stat(0, 100, 0, []),
    "DT Electrical": new Stat(0, 100, 0, []),
    "DT Explosive": new Stat(0, 100, 0, []),
    "DT Fire": new Stat(0, 100, 0, []),
    "DT Laser": new Stat(0, 100, 0, []),
    "DT Normal": new Stat(0, 100, 0, []),
    "DT Plasma": new Stat(0, 100, 0, []),
    "DR EMP": new Stat(0, 100, 0, []),
    "DR Electrical": new Stat(0, 90, 0, []),
    "DR Explosive": new Stat(0, 90, 0, []),
    "DR Fire": new Stat(0, 90, 0, []),
    "DR Laser": new Stat(0, 90, 0, []),
    "DR Normal": new Stat(0, 90, 0, []),
    "DR Plasma": new Stat(0, 90, 0, []),
    "DR Radiation": new Stat(0, 95, 0, [new Dependency('END', 2)]),
    "DR Poison": new Stat(0, 95, 0, [new Dependency('END', 5)]),
    "Age": new Stat(16, 101, 25, []),
    "Gender": new Stat(0, 1, 0, []),
    "HP": new Stat(0, 999, 1, []),
    "Poison Level": new Stat(0, 2000, 0, []),
    "Radiation Level": new Stat(0, 2000, 0, []),
    "Skill Points": new Stat(0, 999999, 0, []),
    "Level": new Stat(1, 99, 1, []),
    "Experience": new Stat(0, 99999999, 0, []),
    "Reputation": new Stat(-20, 20, 0, []),
    "Karma": new Stat(-99999999, 99999999, 0, [])
};
statDependencies['One'] = new Stat(1, 1, 1, []);
function skillImprovementCost(skillPoints) {
    if (skillPoints < 101)
        return 1;
    if (skillPoints < 126)
        return 2;
    if (skillPoints < 151)
        return 3;
    if (skillPoints < 176)
        return 4;
    if (skillPoints < 201)
        return 5;
    if (skillPoints < 301)
        return 6;
    return 999999999;
}
