"use strict";
var Party = (function () {
    function Party() {
        this.party = [];
    }
    Party.prototype.addPartyMember = function (obj) {
        console.log("party member %o added", obj);
        this.party.push(obj);
    };
    Party.prototype.removePartyMember = function (obj) {
        console.log("party member %o removed", obj);
        if (!arrayRemove(this.party, obj))
            throw Error("Could not remove party member");
    };
    Party.prototype.getPartyMembers = function () {
        return this.party;
    };
    Party.prototype.getPartyMembersAndPlayer = function () {
        return [player].concat(this.party);
    };
    Party.prototype.isPartyMember = function (obj) {
        return arrayIncludes(this.party, obj);
    };
    Party.prototype.getPartyMemberByPID = function (pid) {
        return this.party.find(function (obj) { return obj.pid === pid; }) || null;
    };
    Party.prototype.serialize = function () {
        return this.party.map(function (obj) { return obj.serialize(); });
    };
    Party.prototype.deserialize = function (objs) {
        this.party.length = 0;
        for (var _i = 0, objs_1 = objs; _i < objs_1.length; _i++) {
            var obj = objs_1[_i];
            this.party.push(deserializeObj(obj));
        }
    };
    return Party;
}());
var gParty = new Party();
