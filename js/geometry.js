"use strict";
var TILE_WIDTH = 80;
var TILE_HEIGHT = 36;
var HEX_GRID_SIZE = 200;
function toTileNum(position) {
    return position.y * 200 + position.x;
}
function fromTileNum(tile) {
    return { x: tile % 200, y: Math.floor(tile / 200) };
}
function tileToScreen(x, y) {
    x = 99 - x;
    var sx = 4752 + (32 * y) - (48 * x);
    var sy = (24 * y) + (12 * x);
    return { x: sx, y: sy };
}
function tileFromScreen(x, y) {
    var off_x = -4800 + x;
    var off_y = y;
    var xx = off_x - off_y * 4 / 3;
    var tx = xx / 64;
    if (xx >= 0)
        tx++;
    tx = -tx;
    var yy = off_y + off_x / 4;
    var ty = yy / 32;
    if (yy < 0)
        ty--;
    return { x: 99 - Math.round(tx), y: Math.round(ty) };
}
function hexToTile(pos) {
    var scrPos = hexToScreen(pos.x, pos.y);
    return tileFromScreen(scrPos.x, scrPos.y);
}
function centerTile() {
    return hexFromScreen(cameraX + ((SCREEN_WIDTH / 2) | 0) - 32, cameraY + ((SCREEN_HEIGHT / 2) | 0) - 16);
}
var tile_center = { x: 0, y: 0 };
function setCenterTile() {
    tile_center = centerTile();
}
function tile_coord(tileNum) {
    if (tileNum < 0 || tileNum >= 200 * 200)
        return null;
    setCenterTile();
    var tile_x = tile_center.x;
    var tile_y = tile_center.y;
    var tile_offx = 272;
    var tile_offy = 182;
    var a2 = tile_offx;
    var a3 = tile_offy;
    var v3 = 200 - 1 - (tileNum % 200);
    var v4 = Math.floor(tileNum / 200);
    var v5 = Math.floor((v3 - tile_x) / -2);
    a2 += 48 * Math.ceil((v3 - tile_x) / 2);
    a3 += 12 * v5;
    console.log("v3:", v3, "=", v3 & 1);
    if (v3 & 1) {
        if (v3 > tile_x) {
            a2 += 32;
        }
        else {
            a2 -= 16;
            a3 += 12;
        }
    }
    var v6 = v4 - tile_y;
    a2 += 16 * v6;
    a3 += 12 * v6;
    return { x: a2, y: a3 };
}
function hexToScreen(x, y) {
    var sx = 4816 - ((((x + 1) >> 1) << 5) + ((x >> 1) << 4) - (y << 4));
    var sy = ((12 * (x >> 1)) + (y * 12)) + 11;
    return { x: sx, y: sy };
}
function hexFromScreen(x, y) {
    var x0 = 4800;
    var y0 = 0;
    var nx, ny;
    if (x - x0 < 0)
        nx = (x - x0 + 1) / 16 - 1;
    else
        nx = (x - x0) / 16;
    if (y - y0 < 0)
        ny = (y - y0 + 1) / 12 - 1;
    else
        ny = (y - y0) / 12;
    if (Math.abs(nx) % 2 != Math.abs(ny) % 2)
        nx--;
    var xhBase = x0 + 16 * nx;
    var yhBase = y0 + 12 * ny;
    var hx = (4 * (yhBase - y0) - 3 * (xhBase - x0)) / 96;
    var hy = (yhBase - y0) / 12 - hx / 2;
    var dx = x - xhBase;
    var dy = y - yhBase;
    switch (dy) {
        case 0:
            if (dx < 12) {
                hy--;
                break;
            }
            if (dx > 18) {
                if (hx % 2 == 1)
                    hy--;
                hx--;
                break;
            }
        case 1:
            if (dx < 8) {
                hx--;
                break;
            }
            if (dx > 23) {
                if (hx % 2 == 1)
                    hy--;
                hx--;
                break;
            }
        case 2:
            if (dx < 4) {
                hy--;
                break;
            }
            if (dx > 28) {
                if (hx % 2 == 1)
                    hy--;
                hx--;
                break;
            }
        default:
            break;
    }
    return { x: Math.round(hx), y: Math.round(hy) };
}
function hexNeighbors(position) {
    var neighbors = [];
    var x = position.x;
    var y = position.y;
    function n(x, y) {
        neighbors.push({ x: x, y: y });
    }
    if (x % 2 === 0) {
        n(x - 1, y);
        n(x - 1, y + 1);
        n(x, y + 1);
        n(x + 1, y + 1);
        n(x + 1, y);
        n(x, y - 1);
    }
    else {
        n(x - 1, y - 1);
        n(x - 1, y);
        n(x, y + 1);
        n(x + 1, y);
        n(x + 1, y - 1);
        n(x, y - 1);
    }
    return neighbors;
}
function hexInDirection(position, dir) {
    return hexNeighbors(position)[dir];
}
function hexInDirectionDistance(position, dir, distance) {
    if (distance === 0) {
        console.log("hexInDirectionDistance: distance=0");
        return position;
    }
    var tile = hexInDirection(position, dir);
    for (var i = 0; i < distance - 1; i++)
        tile = hexInDirection(tile, dir);
    return tile;
}
function directionOfDelta(xa, ya, xb, yb) {
    var neighbors = hexNeighbors({ x: xa, y: ya });
    for (var i = 0; i < neighbors.length; i++) {
        if (neighbors[i].x === xb && neighbors[i].y === yb)
            return i;
    }
    return null;
}
function hexGridToCube(grid) {
    var z = grid.y - (grid.x + (grid.x & 1)) / 2;
    var y = -grid.x - z;
    return { x: grid.x, y: y, z: z };
}
function hexDistance(a, b) {
    var cubeA = hexGridToCube(a);
    var cubeB = hexGridToCube(b);
    return Math.max(Math.abs(cubeA.x - cubeB.x), Math.abs(cubeA.y - cubeB.y), Math.abs(cubeA.z - cubeB.z));
}
function hexDirectionTo(a, b) {
    var delta = { x: b.x - a.x, y: b.y - a.y };
    if (delta.x) {
        var angle = Math.atan2(-delta.y, delta.x) * 180 / Math.PI;
        var temp = 90 - angle | 0;
        if (temp < 0)
            temp += 360;
        return Math.min(temp / 60 | 0, 5);
    }
    else if (delta.y < 0)
        return 0;
    return 2;
}
function hexOppositeDirection(direction) {
    return (direction + 3) % 6;
}
function hexNearestNeighbor(a, b) {
    var neighbors = hexNeighbors(a);
    var min = Infinity, minIdx = -1;
    for (var i = 0; i < neighbors.length; i++) {
        var dist = hexDistance(neighbors[i], b);
        if (dist < min) {
            min = dist;
            minIdx = i;
        }
    }
    if (minIdx === -1)
        return null;
    return { hex: neighbors[minIdx], distance: min, direction: minIdx };
}
function hexLine(a, b) {
    var path = [];
    var position = { x: a.x, y: a.y };
    while (true) {
        path.push(position);
        if (position.x === b.x && position.y === b.y)
            return path;
        var nearest = hexNearestNeighbor(position, b);
        if (nearest === null)
            return null;
        position = nearest.hex;
    }
}
function hexesInRadius(center, radius) {
    var hexes = [];
    for (var x = 0; x < 200; x++) {
        for (var y = 0; y < 200; y++) {
            if (x === center.x && y === center.y)
                continue;
            var pos = { x: x, y: y };
            if (hexDistance(center, pos) <= radius)
                hexes.push(pos);
        }
    }
    return hexes;
}
function pointInBoundingBox(point, bbox) {
    return (bbox.x <= point.x && point.x <= bbox.x + bbox.w &&
        bbox.y <= point.y && point.y <= bbox.y + bbox.h);
}
function tile_in_tile_rect(tile, a, b, c, d) {
    var error = false;
    if (c.x != d.x || a.x != b.x || a.x > c.x)
        error = true;
    if (a.y != d.y || b.y != c.y || a.y > c.y)
        error = true;
    if (error) {
        console.log("This is not a rectangle: (" + a.x + "," + a.y + "), (" + b.x + "," + b.y + "), (" + c.x + "," + c.y + "), (" + d.x + "," + d.y + ")");
        return false;
    }
    var inside = true;
    if (tile.x <= a.x || tile.x >= c.x)
        inside = false;
    if (tile.y <= a.y || tile.y >= c.y)
        inside = false;
    return inside;
}
function tile_in_tile_rect2(tile, a, c) {
    var b = { x: a.x, y: c.y };
    var d = { x: c.x, y: a.y };
    return tile_in_tile_rect(tile, a, b, c, d);
}
function pointIntersectsCircle(center, radius, point) {
    return Math.abs(point.x - center.x) <= radius &&
        Math.abs(point.y - center.y) <= radius;
}
