"use strict";
var Renderer = (function () {
    function Renderer() {
    }
    Renderer.prototype.initData = function (roof, floor, objects) {
        this.roofTiles = roof;
        this.floorTiles = floor;
        this.objects = objects;
    };
    Renderer.prototype.render = function () {
        var _this = this;
        this.clear(127, 127, 127);
        if (isLoading) {
            this.color(0, 0, 0);
            var w = 256, h = 40;
            var w2 = (loadingAssetsLoaded / loadingAssetsTotal) * w;
            this.rectangle(SCREEN_WIDTH / 2 - w / 2, SCREEN_HEIGHT / 2, w, h, false);
            this.rectangle(SCREEN_WIDTH / 2 - w / 2 + 2, SCREEN_HEIGHT / 2 + 2, w2 - 4, h - 4);
            return;
        }
        this.color(255, 255, 255);
        var mousePos = heart.mouse.getPosition();
        var mouseHex = hexFromScreen(mousePos[0] + cameraX, mousePos[1] + cameraY);
        var mouseSquare = tileFromScreen(mousePos[0] + cameraX, mousePos[1] + cameraY);
        if (Config.ui.showFloor)
            this.renderFloor(this.floorTiles);
        if (Config.ui.showCursor && hexOverlay) {
            var scr = hexToScreen(mouseHex.x, mouseHex.y);
            this.image(hexOverlay, scr.x - 16 - cameraX, scr.y - 12 - cameraY);
        }
        if (Config.ui.showObjects)
            this.renderObjects(this.objects);
        if (Config.ui.showRoof)
            this.renderRoof(this.roofTiles);
        if (inCombat) {
            var whose = combat.inPlayerTurn ? "player" : combat.combatants[combat.whoseTurn].name;
            var AP = combat.inPlayerTurn ? player.AP : combat.combatants[combat.whoseTurn].AP;
            this.text("[turn " + combat.turnNum + " of " + whose + " AP: " + AP.getAvailableMoveAP() + "]", SCREEN_WIDTH - 200, 15);
        }
        if (Config.ui.showSpatials && Config.engine.doSpatials) {
            gMap.getSpatials().forEach(function (spatial) {
                var scr = hexToScreen(spatial.position.x, spatial.position.y);
                _this.text(spatial.script, scr.x - 10 - cameraX, scr.y - 3 - cameraY);
            });
        }
        this.text("mh: " + mouseHex.x + "," + mouseHex.y, 5, 15);
        this.text("mt: " + mouseSquare.x + "," + mouseSquare.y, 75, 15);
        this.text("m: " + mousePos[0] + ", " + mousePos[1], 175, 15);
        for (var i = 0; i < floatMessages.length; i++) {
            var bbox = objectBoundingBox(floatMessages[i].obj);
            if (bbox === null)
                continue;
            heart.ctx.fillStyle = floatMessages[i].color;
            var centerX = bbox.x - bbox.w / 2 - cameraX;
            this.text(floatMessages[i].msg, centerX, bbox.y - cameraY - 16);
        }
        if (player.dead) {
            this.color(255, 0, 0, 50);
            this.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        }
    };
    Renderer.prototype.objectRenderInfo = function (obj) {
        var scr = hexToScreen(obj.position.x, obj.position.y);
        var visible = obj.visible;
        if (images[obj.art] === undefined) {
            lazyLoadImage(obj.art);
            return null;
        }
        var info = imageInfo[obj.art];
        if (info === undefined)
            throw "No image map info for: " + obj.art;
        if (!(obj.orientation in info.frameOffsets))
            obj.orientation = 0;
        var frameInfo = info.frameOffsets[obj.orientation][obj.frame];
        var dirOffset = info.directionOffsets[obj.orientation];
        var offsetX = -(frameInfo.w / 2 | 0) + dirOffset.x;
        var offsetY = -frameInfo.h + dirOffset.y;
        if (obj.shift) {
            offsetX += obj.shift.x;
            offsetY += obj.shift.y;
        }
        else {
            offsetX += frameInfo.ox;
            offsetY += frameInfo.oy;
        }
        var scrX = scr.x + offsetX, scrY = scr.y + offsetY;
        if (scrX + frameInfo.w < cameraX || scrY + frameInfo.h < cameraY ||
            scrX >= cameraX + SCREEN_WIDTH || scrY >= cameraY + SCREEN_HEIGHT)
            visible = false;
        var spriteFrameNum = info.numFrames * obj.orientation + obj.frame;
        var sx = spriteFrameNum * info.frameWidth;
        return { x: scrX, y: scrY, spriteX: sx,
            frameWidth: frameInfo.w, frameHeight: frameInfo.h,
            uniformFrameWidth: info.frameWidth,
            uniformFrameHeight: info.frameHeight,
            spriteFrameNum: spriteFrameNum,
            artInfo: info,
            visible: visible };
    };
    Renderer.prototype.renderObjects = function (objs) {
        for (var _i = 0, objs_1 = objs; _i < objs_1.length; _i++) {
            var obj = objs_1[_i];
            if (!Config.ui.showWalls && obj.type === "wall")
                continue;
            if (obj.outline)
                this.renderObjectOutlined(obj);
            else
                this.renderObject(obj);
        }
    };
    Renderer.prototype.init = function () { };
    Renderer.prototype.clear = function (r, g, b) { };
    Renderer.prototype.color = function (r, g, b, a) {
        if (a === void 0) { a = 255; }
    };
    Renderer.prototype.rectangle = function (x, y, w, h, filled) {
        if (filled === void 0) { filled = true; }
    };
    Renderer.prototype.text = function (txt, x, y) { };
    Renderer.prototype.image = function (img, x, y, w, h) { };
    Renderer.prototype.renderRoof = function (roof) { };
    Renderer.prototype.renderFloor = function (floor) { };
    Renderer.prototype.renderObjectOutlined = function (obj) { this.renderObject(obj); };
    Renderer.prototype.renderObject = function (obj) { };
    return Renderer;
}());
