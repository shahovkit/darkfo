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
function getPixelIndex(x, y, w) {
    return (x + y * w) * 4;
}
var CanvasRenderer = (function (_super) {
    __extends(CanvasRenderer, _super);
    function CanvasRenderer() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.tileDataCache = {};
        return _this;
    }
    CanvasRenderer.prototype.init = function () {
        heart.attach("cnv");
    };
    CanvasRenderer.prototype.color = function (r, g, b, a) {
        if (a === void 0) { a = 255; }
        heart.graphics.setColor(r, g, b, a);
    };
    CanvasRenderer.prototype.rectangle = function (x, y, w, h, filled) {
        if (filled === void 0) { filled = true; }
        heart.graphics.rectangle(filled ? "fill" : "stroke", x, y, w, h);
    };
    CanvasRenderer.prototype.text = function (txt, x, y) {
        heart.graphics.print(txt, x, y);
    };
    CanvasRenderer.prototype.image = function (img, x, y, w, h) {
        heart.graphics.draw(img, x, y, w, h);
    };
    CanvasRenderer.prototype.clear = function (r, g, b) {
        heart.graphics.setBackgroundColor(r, g, b);
    };
    CanvasRenderer.prototype.renderLitFloor = function (matrix, useColorTable) {
        if (useColorTable === void 0) { useColorTable = false; }
        var imageData = heart.ctx.getImageData(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        var screenWidth = imageData.width;
        var tmpCtx = null;
        var tileData;
        if (useColorTable) {
            if (Lighting.colorLUT === null) {
                Lighting.colorLUT = getFileJSON("lut/color_lut.json");
                Lighting.colorRGB = getFileJSON("lut/color_rgb.json");
            }
        }
        for (var i = matrix.length - 1; i >= 0; i--) {
            for (var j = 0; j < matrix[0].length; j++) {
                var tile = matrix[j][i];
                if (tile === "grid000")
                    continue;
                var img = "art/tiles/" + tile;
                if (images[img] !== undefined) {
                    var scr = tileToScreen(i, j);
                    if (scr.x + TILE_WIDTH < cameraX || scr.y + TILE_HEIGHT < cameraY ||
                        scr.x >= cameraX + SCREEN_WIDTH || scr.y >= cameraY + SCREEN_HEIGHT)
                        continue;
                    var sx = scr.x - cameraX;
                    var sy = scr.y - cameraY;
                    var hex = hexFromScreen(scr.x - 13, scr.y + 13);
                    if (this.tileDataCache[img] === undefined) {
                        if (!tmpCtx)
                            tmpCtx = document.createElement("canvas").getContext("2d");
                        tmpCtx.drawImage(images[img].img, 0, 0);
                        tileData = tmpCtx.getImageData(0, 0, images[img].img.width, images[img].img.height);
                        this.tileDataCache[img] = tileData;
                    }
                    else
                        tileData = this.tileDataCache[img];
                    var tileWidth = tileData.width;
                    var isTriangleLit = Lighting.initTile(hex);
                    var framebuffer = void 0;
                    var intensity_ = void 0;
                    if (isTriangleLit)
                        framebuffer = Lighting.computeFrame();
                    var w = Math.min(SCREEN_WIDTH - sx, 80);
                    var h = Math.min(SCREEN_HEIGHT - sy, 36);
                    for (var y = 0; y < h; y++) {
                        for (var x = 0; x < w; x++) {
                            if ((sx + x) < 0 || (sy + y) < 0)
                                continue;
                            var tileIndex = getPixelIndex(x, y, tileWidth);
                            if (tileData.data[tileIndex + 3] === 0)
                                continue;
                            if (isTriangleLit) {
                                intensity_ = framebuffer[160 + 80 * y + x];
                            }
                            else {
                                intensity_ = Lighting.vertices[3];
                            }
                            var screenIndex = getPixelIndex(sx + x, sy + y, screenWidth);
                            var intensity = Math.min(1.0, intensity_ / 65536);
                            if (useColorTable) {
                                var orig_color = (tileData.data[tileIndex + 0] << 16) | (tileData.data[tileIndex + 1] << 8) | tileData.data[tileIndex + 2];
                                var palIdx = Lighting.colorLUT[orig_color];
                                var tableIdx = palIdx * 256 + (intensity_ / 512 | 0);
                                var colorPal = Lighting.intensityColorTable[tableIdx];
                                var color = Lighting.colorRGB[colorPal];
                                imageData.data[screenIndex + 0] = color[0];
                                imageData.data[screenIndex + 1] = color[1];
                                imageData.data[screenIndex + 2] = color[2];
                            }
                            else {
                                imageData.data[screenIndex + 0] = tileData.data[tileIndex + 0] * intensity | 0;
                                imageData.data[screenIndex + 1] = tileData.data[tileIndex + 1] * intensity | 0;
                                imageData.data[screenIndex + 2] = tileData.data[tileIndex + 2] * intensity | 0;
                            }
                        }
                    }
                }
            }
        }
        heart.ctx.putImageData(imageData, 0, 0);
    };
    CanvasRenderer.prototype.drawTileMap = function (matrix, offsetY) {
        for (var i = 0; i < matrix.length; i++) {
            for (var j = 0; j < matrix[0].length; j++) {
                var tile = matrix[j][i];
                if (tile === "grid000")
                    continue;
                var img = "art/tiles/" + tile;
                if (images[img] !== undefined) {
                    var scr = tileToScreen(i, j);
                    scr.y += offsetY;
                    if (scr.x + TILE_WIDTH < cameraX || scr.y + TILE_HEIGHT < cameraY ||
                        scr.x >= cameraX + SCREEN_WIDTH || scr.y >= cameraY + SCREEN_HEIGHT)
                        continue;
                    heart.graphics.draw(images[img], scr.x - cameraX, scr.y - cameraY);
                }
                else {
                    lazyLoadImage(img);
                }
            }
        }
    };
    CanvasRenderer.prototype.renderRoof = function (roof) {
        this.drawTileMap(roof, -96);
    };
    CanvasRenderer.prototype.renderFloor = function (floor) {
        if (Config.engine.doFloorLighting)
            this.renderLitFloor(floor, Config.engine.useLightColorLUT);
        else
            this.drawTileMap(floor, 0);
    };
    CanvasRenderer.prototype.renderObjectOutlined = function (obj) {
        if (!obj.outline)
            throw Error("renderObjectOutlined received an object without an outline");
        var renderInfo = this.objectRenderInfo(obj);
        if (!renderInfo || !renderInfo.visible)
            return;
        if (!tempCanvasCtx)
            throw Error();
        tempCanvasCtx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        var img = images[obj.art].img;
        var w = renderInfo.frameWidth;
        var h = renderInfo.frameHeight;
        var srcX = renderInfo.spriteX;
        tempCanvasCtx.drawImage(img, srcX, 0, w, h, 1 + 1, 0 + 1, w, h);
        tempCanvasCtx.drawImage(img, srcX, 0, w, h, -1 + 1, 0 + 1, w, h);
        tempCanvasCtx.drawImage(img, srcX, 0, w, h, 0 + 1, -1 + 1, w, h);
        tempCanvasCtx.drawImage(img, srcX, 0, w, h, 0 + 1, 1 + 1, w, h);
        tempCanvasCtx.drawImage(img, srcX, 0, w, h, -1 + 1, -1 + 1, w, h);
        tempCanvasCtx.drawImage(img, srcX, 0, w, h, 1 + 1, 1 + 1, w, h);
        tempCanvasCtx.drawImage(img, srcX, 0, w, h, -1 + 1, 1 + 1, w, h);
        tempCanvasCtx.drawImage(img, srcX, 0, w, h, 1 + 1, -1 + 1, w, h);
        tempCanvasCtx.globalCompositeOperation = "source-in";
        tempCanvasCtx.fillStyle = obj.outline;
        tempCanvasCtx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        tempCanvasCtx.globalCompositeOperation = "source-over";
        tempCanvasCtx.drawImage(img, srcX, 0, w, h, 1, 1, w, h);
        heart.ctx.drawImage(tempCanvas, 0, 0, renderInfo.frameWidth + 2, renderInfo.frameHeight + 2, renderInfo.x - cameraX, renderInfo.y - cameraY, renderInfo.frameWidth + 2, renderInfo.frameHeight + 2);
    };
    CanvasRenderer.prototype.renderObject = function (obj) {
        var renderInfo = this.objectRenderInfo(obj);
        if (!renderInfo || !renderInfo.visible)
            return;
        heart.ctx.drawImage(images[obj.art].img, renderInfo.spriteX, 0, renderInfo.frameWidth, renderInfo.frameHeight, renderInfo.x - cameraX, renderInfo.y - cameraY, renderInfo.frameWidth, renderInfo.frameHeight);
    };
    return CanvasRenderer;
}(Renderer));
