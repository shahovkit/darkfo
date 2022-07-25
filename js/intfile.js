"use strict";
function parseIntFile(reader, name) {
    if (name === void 0) { name = ""; }
    reader.seek(0x2A);
    var numProcs = reader.read32();
    var procs = [];
    var procedures = {};
    for (var i = 0; i < numProcs; i++) {
        var nameIndex = reader.read32();
        var flags = reader.read32();
        assertEq(reader.read32(), 0, "unk0 != 0");
        assertEq(reader.read32(), 0, "unk1 != 0");
        var offset = reader.read32();
        var argc = reader.read32();
        procs.push({ nameIndex: nameIndex,
            name: "",
            offset: offset,
            index: i,
            argc: argc
        });
    }
    var identEnd = reader.read32();
    var identifiers = {};
    var baseOffset = reader.offset;
    while (true) {
        if (reader.offset - baseOffset >= identEnd)
            break;
        var len = reader.read16();
        var offset = reader.offset - baseOffset + 4;
        var str = "";
        for (var j = 0; j < len; j++) {
            var c = reader.read8();
            if (c)
                str += String.fromCharCode(c);
        }
        identifiers[offset] = str;
    }
    assertEq(reader.read32(), 0xFFFFFFFF, "did not get 0xFFFFFFFF signature");
    procs.forEach(function (proc) { return proc.name = identifiers[proc.nameIndex]; });
    procs.forEach(function (proc) { return procedures[proc.name] = proc; });
    var stringEnd = reader.read32();
    var strings = {};
    if (stringEnd !== 0xFFFFFFFF) {
        var baseOffset = reader.offset;
        while (true) {
            if (reader.offset - baseOffset >= stringEnd)
                break;
            var len = reader.read16();
            var offset = reader.offset - baseOffset + 4;
            var str = "";
            for (var j = 0; j < len; j++) {
                var c = reader.read8();
                if (c)
                    str += String.fromCharCode(c);
            }
            strings[offset] = str;
        }
    }
    var codeOffset = reader.offset;
    return { procedures: procedures,
        proceduresTable: procs,
        identifiers: identifiers,
        strings: strings,
        codeOffset: codeOffset,
        name: name };
}
