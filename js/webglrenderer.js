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
var WebGLRenderer = (function (_super) {
    __extends(WebGLRenderer, _super);
    function WebGLRenderer() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.textures = {};
        return _this;
    }
    WebGLRenderer.prototype.newTexture = function (key, img, doCache) {
        if (doCache === void 0) { doCache = true; }
        var gl = this.gl;
        var texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        if (doCache)
            this.textures[key] = texture;
        return texture;
    };
    WebGLRenderer.prototype.getTexture = function (name) {
        var texture = this.textures[name];
        if (texture !== undefined)
            return texture;
        return null;
    };
    WebGLRenderer.prototype.getTextureFromHack = function (name) {
        if (this.textures[name] === undefined) {
            if (images[name] !== undefined) {
                return this.newTexture(name, images[name].img);
            }
            return null;
        }
        return this.textures[name];
    };
    WebGLRenderer.prototype.textureFromArray = function (arr, size) {
        if (size === void 0) { size = 256; }
        var buf = new Float32Array(size * size * 4);
        for (var i = 0; i < arr.length; i++) {
            buf[i * 4] = arr[i];
        }
        var gl = this.gl;
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.FLOAT, buf);
        return texture;
    };
    WebGLRenderer.prototype.textureFromColorArray = function (arr, width) {
        var gl = this.gl;
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, width, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, arr);
        return texture;
    };
    WebGLRenderer.prototype.init = function () {
        this.canvas = document.getElementById("cnv");
        heart.canvas = this.canvas;
        heart.ctx = null;
        heart._bg = null;
        var gl = this.canvas.getContext("webgl") || this.canvas.getContext("experimental-webgl");
        if (!gl) {
            alert("error getting WebGL context");
            return;
        }
        this.gl = gl;
        if (!gl.getExtension("OES_texture_float"))
            throw "no texture float extension";
        this.gl.clearColor(0.75, 0.75, 0.75, 1.0);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.enable(this.gl.BLEND);
        this.tileShader = this.getProgram(this.gl, "2d-vertex-shader", "2d-fragment-shader");
        this.gl.useProgram(this.tileShader);
        this.positionLocation = gl.getAttribLocation(this.tileShader, "a_position");
        this.offsetLocation = gl.getUniformLocation(this.tileShader, "u_offset");
        var resolutionLocation = gl.getUniformLocation(this.tileShader, "u_resolution");
        gl.uniform2f(resolutionLocation, this.canvas.width, this.canvas.height);
        this.texCoordLocation = gl.getAttribLocation(this.tileShader, "a_texCoord");
        this.uNumFramesLocation = gl.getUniformLocation(this.tileShader, "u_numFrames");
        this.uFrameLocation = gl.getUniformLocation(this.tileShader, "u_frame");
        this.uScaleLocation = gl.getUniformLocation(this.tileShader, "u_scale");
        this.texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0.0, 0.0,
            1.0, 0.0,
            0.0, 1.0,
            0.0, 1.0,
            1.0, 0.0,
            1.0, 1.0
        ]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.texCoordLocation);
        gl.vertexAttribPointer(this.texCoordLocation, 2, gl.FLOAT, false, 0, 0);
        this.objectUVBuffer = gl.createBuffer();
        this.tileBuffer = this.rectangleBuffer(this.gl, 0, 0, 1, 1);
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
        if (Config.engine.doFloorLighting) {
            this.floorLightShader = this.getProgram(this.gl, "2d-vertex-shader", "2d-lighting-fragment-shader");
            gl.useProgram(this.floorLightShader);
            this.litOffsetLocation = gl.getUniformLocation(this.floorLightShader, "u_offset");
            this.litScaleLocation = gl.getUniformLocation(this.floorLightShader, "u_scale");
            this.uLightBuffer = gl.getUniformLocation(this.floorLightShader, "u_lightBuffer");
            var litResolutionLocation = gl.getUniformLocation(this.floorLightShader, "u_resolution");
            var litPositionLocation = gl.getAttribLocation(this.floorLightShader, "a_position");
            gl.uniform2f(litResolutionLocation, this.canvas.width, this.canvas.height);
            var litTexCoordLocation = gl.getAttribLocation(this.floorLightShader, "a_texCoord");
            gl.enableVertexAttribArray(litTexCoordLocation);
            gl.vertexAttribPointer(litTexCoordLocation, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(litPositionLocation);
            gl.vertexAttribPointer(litPositionLocation, 2, gl.FLOAT, false, 0, 0);
            this.u_colorTable = gl.getUniformLocation(this.floorLightShader, "u_colorTable");
            this.u_intensityColorTable = gl.getUniformLocation(this.floorLightShader, "u_intensityColorTable");
            this.u_paletteRGB = gl.getUniformLocation(this.floorLightShader, "u_paletteRGB");
            var _colorTable = getFileJSON("colorTable.json");
            gl.activeTexture(gl.TEXTURE2);
            this.textureFromArray(_colorTable);
            gl.uniform1i(this.u_colorTable, 2);
            var _intensityColorTable = Lighting.intensityColorTable;
            var intensityColorTable = new Uint8Array(65536);
            for (var i = 0; i < 65536; i++)
                intensityColorTable[i] = _intensityColorTable[i];
            gl.activeTexture(gl.TEXTURE3);
            this.textureFromArray(intensityColorTable);
            gl.uniform1i(this.u_intensityColorTable, 3);
            var _colorRGB = getFileJSON("color_rgb.json");
            var paletteRGB = new Uint8Array(256 * 3);
            for (var i = 0; i < 256; i++) {
                paletteRGB[i * 3 + 0] = _colorRGB[i][0];
                paletteRGB[i * 3 + 1] = _colorRGB[i][1];
                paletteRGB[i * 3 + 2] = _colorRGB[i][2];
            }
            gl.activeTexture(gl.TEXTURE4);
            this.textureFromColorArray(paletteRGB, 256);
            gl.uniform1i(this.u_paletteRGB, 4);
            gl.activeTexture(gl.TEXTURE1);
            this.lightBufferTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.lightBufferTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.uniform1i(this.uLightBuffer, 1);
            gl.activeTexture(gl.TEXTURE0);
            gl.useProgram(this.tileShader);
        }
    };
    WebGLRenderer.prototype.rectangleBuffer = function (gl, x, y, width, height) {
        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        var x1 = x;
        var x2 = x + width;
        var y1 = y;
        var y2 = y + height;
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            x1, y1,
            x2, y1,
            x1, y2,
            x1, y2,
            x2, y1,
            x2, y2
        ]), gl.STATIC_DRAW);
        return buffer;
    };
    WebGLRenderer.prototype.getShader = function (gl, id) {
        var el = document.getElementById(id);
        var source = el.text;
        var shader = gl.createShader(el.type === "x-shader/x-fragment" ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.log("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    };
    WebGLRenderer.prototype.getProgram = function (gl, vid, fid) {
        var fsh = this.getShader(gl, fid);
        var vsh = this.getShader(gl, vid);
        var program = gl.createProgram();
        gl.attachShader(program, vsh);
        gl.attachShader(program, fsh);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.log("Unable to initialize the shader program.");
            return null;
        }
        return program;
    };
    WebGLRenderer.prototype.color = function (r, g, b, a) {
        if (a === void 0) { a = 255; }
    };
    WebGLRenderer.prototype.rectangle = function (x, y, w, h, filled) {
        if (filled === void 0) { filled = true; }
    };
    WebGLRenderer.prototype.text = function (txt, x, y) {
    };
    WebGLRenderer.prototype.image = function (img, x, y, w, h) {
    };
    WebGLRenderer.prototype.clear = function (r, g, b) {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    };
    WebGLRenderer.prototype.renderLitFloor = function (tilemap, useColorTable) {
        if (useColorTable === void 0) { useColorTable = true; }
        if (useColorTable) {
            if (Lighting.colorLUT === null) {
                Lighting.colorLUT = getFileJSON("color_lut.json");
                Lighting.colorRGB = getFileJSON("color_rgb.json");
            }
        }
        var gl = this.gl;
        gl.useProgram(this.floorLightShader);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.tileBuffer);
        gl.uniform2f(this.litScaleLocation, 80, 36);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.lightBufferTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, 80, 36, 0, gl.ALPHA, gl.FLOAT, null);
        var lightBuffer = new Float32Array(80 * 36);
        var lastTexture = null;
        for (var i = tilemap.length - 1; i >= 0; i--) {
            for (var j = 0; j < tilemap[0].length; j++) {
                var tile = tilemap[j][i];
                if (tile === "grid000")
                    continue;
                var img = "art/tiles/" + tile;
                var scr = tileToScreen(i, j);
                if (scr.x + TILE_WIDTH < cameraX || scr.y + TILE_HEIGHT < cameraY ||
                    scr.x >= cameraX + SCREEN_WIDTH || scr.y >= cameraY + SCREEN_HEIGHT)
                    continue;
                if (img !== lastTexture) {
                    gl.activeTexture(gl.TEXTURE0);
                    var texture = this.getTextureFromHack(img);
                    if (!texture) {
                        console.log("skipping tile without a texture: " + img);
                        continue;
                    }
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    lastTexture = img;
                }
                var hex = hexFromScreen(scr.x - 13, scr.y + 13);
                var isTriangleLit = Lighting.initTile(hex);
                var framebuffer;
                var intensity_;
                if (isTriangleLit)
                    framebuffer = Lighting.computeFrame();
                for (var y = 0; y < 36; y++) {
                    for (var x = 0; x < 80; x++) {
                        if (isTriangleLit) {
                            intensity_ = framebuffer[160 + 80 * y + x];
                        }
                        else {
                            intensity_ = Lighting.vertices[3];
                        }
                        lightBuffer[y * 80 + x] = intensity_;
                    }
                }
                gl.activeTexture(gl.TEXTURE1);
                gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 80, 36, gl.ALPHA, gl.FLOAT, lightBuffer);
                gl.uniform2f(this.litOffsetLocation, scr.x - cameraX, scr.y - cameraY);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            }
        }
        gl.activeTexture(gl.TEXTURE0);
        gl.useProgram(this.tileShader);
    };
    WebGLRenderer.prototype.drawTileMap = function (tilemap, offsetY) {
        var gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.tileBuffer);
        gl.uniform1f(this.uNumFramesLocation, 1);
        gl.uniform1f(this.uFrameLocation, 0);
        gl.uniform2f(this.uScaleLocation, 80, 36);
        for (var i = 0; i < tilemap.length; i++) {
            for (var j = 0; j < tilemap[0].length; j++) {
                var tile = tilemap[j][i];
                if (tile === "grid000")
                    continue;
                var img = "art/tiles/" + tile;
                var scr = tileToScreen(i, j);
                scr.y += offsetY;
                if (scr.x + TILE_WIDTH < cameraX || scr.y + TILE_HEIGHT < cameraY ||
                    scr.x >= cameraX + SCREEN_WIDTH || scr.y >= cameraY + SCREEN_HEIGHT)
                    continue;
                var texture = this.getTextureFromHack(img);
                if (!texture) {
                    console.log("skipping tile without a texture: " + img);
                    continue;
                }
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.uniform2f(this.offsetLocation, scr.x - cameraX, scr.y - cameraY);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            }
        }
    };
    WebGLRenderer.prototype.renderRoof = function (roof) {
        this.drawTileMap(roof, -96);
    };
    WebGLRenderer.prototype.renderFloor = function (floor) {
        if (Config.engine.doFloorLighting)
            this.renderLitFloor(floor);
        else
            this.drawTileMap(floor, 0);
    };
    WebGLRenderer.prototype.renderObject = function (obj) {
        var renderInfo = this.objectRenderInfo(obj);
        if (!renderInfo || !renderInfo.visible)
            return;
        var texture = this.getTextureFromHack(obj.art);
        if (!texture) {
            console.log("no texture for object");
            return;
        }
        var gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1f(this.uNumFramesLocation, renderInfo.artInfo.totalFrames);
        gl.uniform1f(this.uFrameLocation, renderInfo.spriteFrameNum);
        gl.uniform2f(this.offsetLocation, renderInfo.x - cameraX, renderInfo.y - cameraY);
        gl.uniform2f(this.uScaleLocation, renderInfo.uniformFrameWidth, renderInfo.uniformFrameHeight);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    return WebGLRenderer;
}(Renderer));
