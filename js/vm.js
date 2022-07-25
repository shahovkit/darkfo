"use strict";
function binop(f) {
    return function () {
        var rhs = this.pop();
        this.push(f(this.pop(), rhs));
    };
}
var opMap = {
    0x8002: function () { },
    0xC001: function () { this.push(this.script.read32()); },
    0x800D: function () { this.retStack.push(this.pop()); },
    0x800C: function () { this.push(this.popAddr()); },
    0x801A: function () { this.pop(); },
    0x8004: function () { this.pc = this.pop(); },
    0x8003: function () { },
    0x802B: function () {
        var argc = this.pop();
        this.retStack.push(this.dvarBase);
        this.dvarBase = this.dataStack.length - argc;
    },
    0x8019: function () {
        var a = this.popAddr();
        var b = this.popAddr();
        this.retStack.push(a);
        this.retStack.push(b);
    },
    0x802A: function () { this.dataStack.splice(this.dvarBase); },
    0x8029: function () { this.dvarBase = this.popAddr(); },
    0x802C: function () { this.svarBase = this.dataStack.length; },
    0x8013: function () { var num = this.pop(); this.dataStack[this.svarBase + num] = this.pop(); },
    0x8012: function () { var num = this.pop(); this.push(this.dataStack[this.svarBase + num]); },
    0x801C: function () {
        var addr = this.popAddr();
        if (addr === -1)
            this.halted = true;
        else
            this.pc = addr;
    },
    0x8010: function () { this.halted = true; },
    0x802F: function () { if (!this.pop()) {
        this.pc = this.pop();
    }
    else
        this.pop(); },
    0x8031: function () { var varNum = this.pop(); this.dataStack[this.dvarBase + varNum] = this.pop(); },
    0x8032: function () { this.push(this.dataStack[this.dvarBase + this.pop()]); },
    0x8046: function () { this.push(-this.pop()); },
    0x8044: function () { this.push(Math.floor(this.pop())); },
    0x801B: function () { this.push(this.dataStack[this.dataStack.length - 1]); },
    0x8030: function () {
        var cond = this.pop();
        if (!cond) {
            var pc = this.pop();
            this.pc = pc;
        }
    },
    0x8028: function () {
        this.push(this.intfile.procedures[this.pop()].index);
    },
    0x8027: function () {
        var argc = this.pop();
        var procIdx = this.pop();
        var proc = this.intfile.proceduresTable[procIdx];
        console.log("CHECK ARGS: argc=%d procIdx=%d, proc=%o", argc, procIdx, proc);
        if (argc !== proc.argc)
            throw "vm error: expected " + proc.argc + " args, got " + argc + " args when calling " + proc.name;
    },
    0x8005: function () {
        this.pc = this.intfile.proceduresTable[this.pop()].offset;
    },
    0x9001: function () {
        var num = this.script.read32();
        var nextOpcode = this.script.peek16();
        if (arrayIncludes([0x8014,
            0x8015,
            0x8016
        ], nextOpcode)) {
            if (this.intfile.identifiers[num] === undefined)
                throw Error("ScriptVM: 9001 requested identifier " + num + " but it doesn't exist");
            this.push(this.intfile.identifiers[num]);
        }
        else {
            if (this.intfile.strings[num] === undefined)
                throw Error("ScriptVM: 9001 requested string " + num + " but it doesn't exist");
            this.push(this.intfile.strings[num]);
        }
    },
    0x8045: function () { this.push(!this.pop()); },
    0x8033: binop(function (x, y) { return x == y; }),
    0x8034: binop(function (x, y) { return x != y; }),
    0x8035: binop(function (x, y) { return x <= y; }),
    0x8036: binop(function (x, y) { return x >= y; }),
    0x8037: binop(function (x, y) { return x < y; }),
    0x8038: binop(function (x, y) { return x > y; }),
    0x803E: binop(function (x, y) { return x && y; }),
    0x803F: binop(function (x, y) { return x || y; }),
    0x8040: binop(function (x, y) { return x & y; }),
    0x8041: binop(function (x, y) { return x | y; }),
    0x8039: binop(function (x, y) { return x + y; }),
    0x803A: binop(function (x, y) { return x - y; }),
    0x803B: binop(function (x, y) { return x * y; }),
    0x803d: binop(function (x, y) { return x % y; }),
    0x803C: binop(function (x, y) { return x / y | 0; })
};
var ScriptVM = (function () {
    function ScriptVM(script, intfile) {
        this.pc = 0;
        this.dataStack = [];
        this.retStack = [];
        this.svarBase = 0;
        this.dvarBase = 0;
        this.halted = false;
        this.script = script;
        this.intfile = intfile;
    }
    ScriptVM.prototype.push = function (value) {
        this.dataStack.push(value);
    };
    ScriptVM.prototype.pop = function () {
        if (this.dataStack.length === 0)
            throw "VM data stack underflow";
        return this.dataStack.pop();
    };
    ScriptVM.prototype.popAddr = function () {
        if (this.retStack.length === 0)
            throw "VM return stack underflow";
        return this.retStack.pop();
    };
    ScriptVM.prototype.dis = function () {
        var offset = this.script.offset;
        var disassembly = disassemble(this.intfile, this.script);
        this.script.seek(offset);
        return disassembly;
    };
    ScriptVM.prototype.call = function (procName, args) {
        var _this = this;
        if (args === void 0) { args = []; }
        var proc = this.intfile.procedures[procName];
        if (!proc)
            throw "ScriptVM: unknown procedure " + procName;
        args.reverse();
        args.forEach(function (arg) { return _this.push(arg); });
        this.push(args.length);
        this.retStack.push(-1);
        this.pc = proc.offset;
        this.run();
        return this.pop();
    };
    ScriptVM.prototype.step = function () {
        if (this.halted)
            return false;
        var pc = this.pc;
        this.script.seek(pc);
        var opcode = this.script.read16();
        if (opMap[opcode] !== undefined)
            opMap[opcode].call(this);
        else {
            console.warn("unimplemented opcode %s (pc=%s) in %s", opcode.toString(16), this.pc.toString(16), this.intfile.name);
            if (Config.engine.doDisasmOnUnimplOp) {
                console.log("disassembly:");
                console.log(disassemble(this.intfile, this.script));
            }
            return false;
        }
        if (this.pc === pc)
            this.pc = this.script.offset;
        return true;
    };
    ScriptVM.prototype.run = function () {
        this.halted = false;
        while (this.step()) { }
    };
    return ScriptVM;
}());
