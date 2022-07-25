"use strict";
var NullAudioEngine = (function () {
    function NullAudioEngine() {
    }
    NullAudioEngine.prototype.playSfx = function (sfx) { };
    NullAudioEngine.prototype.playMusic = function (music) { };
    NullAudioEngine.prototype.playSound = function (soundName) { return null; };
    NullAudioEngine.prototype.stopMusic = function () { };
    NullAudioEngine.prototype.stopAll = function () { };
    NullAudioEngine.prototype.tick = function () { };
    return NullAudioEngine;
}());
var HTMLAudioEngine = (function () {
    function HTMLAudioEngine() {
        this.nextSfxTime = 0;
        this.nextSfx = null;
        this.musicAudio = null;
    }
    HTMLAudioEngine.prototype.playSfx = function (sfx) {
        this.playSound("sfx/" + sfx);
    };
    HTMLAudioEngine.prototype.playMusic = function (music) {
        this.stopMusic();
        this.musicAudio = this.playSound("music/" + music);
    };
    HTMLAudioEngine.prototype.playSound = function (soundName) {
        var sound = new Audio();
        sound.addEventListener("loadeddata", function () { return sound.play(); }, false);
        sound.src = "audio/" + soundName + ".wav";
        return sound;
    };
    HTMLAudioEngine.prototype.stopMusic = function () {
        if (this.musicAudio)
            this.musicAudio.pause();
    };
    HTMLAudioEngine.prototype.stopAll = function () {
        this.nextSfxTime = 0;
        this.nextSfx = null;
        this.stopMusic();
    };
    HTMLAudioEngine.prototype.rollNextSfx = function () {
        var curMapInfo = getCurrentMapInfo();
        if (!curMapInfo)
            return "";
        var sfx = curMapInfo.ambientSfx;
        var sumFreqs = sfx.reduce(function (sum, x) { return sum + x[1]; }, 0);
        var roll = getRandomInt(0, sumFreqs);
        for (var i = 0; i < sfx.length; i++) {
            var freq = sfx[i][1];
            if (roll >= freq)
                return sfx[i][0];
            roll -= freq;
        }
        throw Error("shouldn't be here");
    };
    HTMLAudioEngine.prototype.tick = function () {
        var time = heart.timer.getTime();
        if (!this.nextSfx)
            this.nextSfx = this.rollNextSfx();
        if (time >= this.nextSfxTime) {
            this.playSfx(this.nextSfx);
            this.nextSfx = this.rollNextSfx();
            this.nextSfxTime = time + getRandomInt(15, 20) * 1000;
        }
    };
    return HTMLAudioEngine;
}());
