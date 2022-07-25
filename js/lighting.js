"use strict";
var Lighting;
(function (Lighting) {
    var rightside_up_triangles = [2, 3, 0, 3, 4, 1, 5, 6, 3, 6, 7, 4, 8, 9, 6];
    var upside_down_triangles = [0, 3, 1, 2, 5, 3, 3, 6, 4, 5, 8, 6, 6, 9, 7];
    var rightside_up_table = [
        -1,
        0x2,
        0x4E,
        0x2,
        0x4C,
        0x6,
        0x49,
        0x8,
        0x47,
        0x0A,
        0x44,
        0x0E,
        0x41,
        0x10,
        0x3F,
        0x12,
        0x3D,
        0x14,
        0x3A,
        0x18,
        0x37,
        0x1A,
        0x35,
        0x1C,
        0x32,
        0x20
    ];
    var upside_down_table = [
        0x0,
        0x20,
        0x30,
        0x20,
        0x31,
        0x1E,
        0x34,
        0x1A,
        0x37,
        0x18,
        0x39,
        0x16,
        0x3C,
        0x12,
        0x3F,
        0x10,
        0x41,
        0x0E,
        0x43,
        0x0C,
        0x46,
        0x8,
        0x49,
        0x6,
        0x4B,
        0x4
    ];
    Lighting.vertices = [
        0x10,
        -1,
        -201,
        0x0,
        0x30,
        -2,
        -2,
        0x0,
        0x3C0,
        0x0,
        0x0,
        0x0,
        0x3E0,
        0x0C7,
        -1,
        0x0,
        0x400,
        0x0C6,
        0x0C6,
        0x0,
        0x790,
        0x0C8,
        0x0C8,
        0x0,
        0x7B0,
        0x18F,
        0x0C7,
        0x0,
        0x7D0,
        0x18E,
        0x18E,
        0x0,
        0x0B60,
        0x190,
        0x190,
        0x0,
        0x0B80,
        0x257,
        0x18F,
        0x0
    ];
    Lighting.intensity_map = new Array(1024 * 12);
    for (var i = 0; i < Lighting.intensity_map.length; i++)
        Lighting.intensity_map[i] = 0;
    var ambient = 0xA000;
    Lighting.colorLUT = null;
    Lighting.colorRGB = null;
    function light_get_tile(tilenum) {
        return Math.min(65536, Lightmap.tile_intensity[tilenum]);
    }
    function init(tilenum) {
        var start = (tilenum & 1);
        for (var i = 0, j = start; i <= 36; i += 4, j += 4) {
            var offset = Lighting.vertices[1 + j];
            var t = tilenum + offset;
            var light = Math.max(light_get_tile(t), ambient);
            Lighting.vertices[3 + i] = light;
        }
        if (Lighting.vertices[7] !== Lighting.vertices[3])
            return true;
        var uni = 1;
        for (var i = 4; i < 36; i += 4) {
            if (Lighting.vertices[7 + i] === Lighting.vertices[3 + i])
                uni++;
        }
        return (uni !== 9);
    }
    function renderTris(isRightsideUp) {
        var tris = isRightsideUp ? rightside_up_triangles : upside_down_triangles;
        var table = isRightsideUp ? rightside_up_table : upside_down_table;
        for (var i = 0; i < 15; i += 3) {
            var a = tris[i + 0];
            var b = tris[i + 1];
            var c = tris[i + 2];
            var x = Lighting.vertices[3 + 4 * a];
            var y = Lighting.vertices[3 + 4 * b];
            var z = Lighting.vertices[3 + 4 * c];
            var inc, intensityIdx, baseLight, lightInc;
            if (isRightsideUp) {
                inc = (x - z) / 13 | 0;
                lightInc = (y - x) / 32 | 0;
                intensityIdx = Lighting.vertices[4 * c];
                baseLight = z;
            }
            else {
                inc = (y - x) / 13 | 0;
                lightInc = (z - x) / 32 | 0;
                intensityIdx = Lighting.vertices[4 * a];
                baseLight = x;
            }
            for (var j = 0; j < 26; j += 2) {
                var edx = table[1 + j];
                intensityIdx += table[j];
                var light = baseLight;
                for (var k = 0; k < edx; k++) {
                    if (intensityIdx < 0 || intensityIdx >= Lighting.intensity_map.length)
                        throw "guard";
                    Lighting.intensity_map[intensityIdx++] = light;
                    light += lightInc;
                }
                baseLight += inc;
            }
        }
    }
    function initTile(hex) {
        return init(toTileNum(hex));
    }
    Lighting.initTile = initTile;
    function computeFrame() {
        renderTris(true);
        renderTris(false);
        return Lighting.intensity_map;
    }
    Lighting.computeFrame = computeFrame;
})(Lighting || (Lighting = {}));
