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
var ScriptVMBridge;
(function (ScriptVMBridge) {
    function bridged(procName, argc, pushResult) {
        if (pushResult === void 0) { pushResult = true; }
        return function () {
            var args = [];
            for (var i = 0; i < argc; i++)
                args.push(this.pop());
            args.reverse();
            var r = this.scriptObj[procName].apply(this.scriptObj, args);
            if (pushResult)
                this.push(r);
        };
    }
    function varName(value) {
        if (typeof value === "number")
            return this.intfile.identifiers[value];
        return value;
    }
    var bridgeOpMap = {
        0x80BF: function () { this.push(player); },
        0x80BC: function () { this.push(this.scriptObj.self_obj); },
        0x8128: function () { this.push(this.scriptObj.combat_is_initialized); },
        0x8118: function () { this.push(1); },
        0x80F6: function () { this.push(1200); },
        0x80EA: function () { this.push(this.scriptObj.game_time); },
        0x8119: function () { this.push(0); },
        0x8101: function () { this.push(this.scriptObj.cur_map_index); },
        0x80BD: function () { this.push(this.scriptObj.source_obj); },
        0x80FA: function () { this.push(this.scriptObj.action_being_used); },
        0x80BE: function () { this.push(this.scriptObj.target_obj); },
        0x80F7: function () { this.push(this.scriptObj.fixed_param); },
        0x8016: function () { this.mapScript()[this.pop()] = 0; },
        0x8015: function () { var name = varName.call(this, this.pop()); this.mapScript()[name] = this.pop(); },
        0x8014: function () { this.push(this.mapScript()[varName.call(this, this.pop())]); },
        0x80B9: bridged("script_overrides", 0, false),
        0x80B4: bridged("random", 2),
        0x80E1: bridged("metarule3", 4),
        0x80CA: bridged("get_critter_stat", 2),
        0x8105: bridged("message_str", 2),
        0x80B8: bridged("display_msg", 1, false),
        0x810E: bridged("reg_anim_func", 2, false),
        0x8126: bridged("reg_anim_animate_forever", 2, false),
        0x810F: bridged("reg_anim_animate", 3, false),
        0x810C: bridged("anim", 3, false),
        0x80E7: bridged("anim_busy", 1),
        0x810B: bridged("metarule", 2),
        0x80C1: bridged("local_var", 1),
        0x80C2: bridged("set_local_var", 2, false),
        0x80C5: bridged("global_var", 1),
        0x80C6: bridged("set_global_var", 2, false),
        0x80C3: bridged("map_var", 1),
        0x80C4: bridged("set_map_var", 2, false),
        0x80B2: bridged("mark_area_known", 3, false),
        0x80E5: bridged("wm_area_set_pos", 3, false),
        0x80B7: bridged("create_object_sid", 4),
        0x8102: bridged("critter_add_trait", 4),
        0x8106: bridged("critter_inven_obj", 2),
        0x8109: bridged("inven_cmds", 3),
        0x80FF: bridged("critter_attempt_placement", 3),
        0x8127: bridged("critter_injure", 2, false),
        0x80E8: bridged("critter_heal", 2, false),
        0x8151: bridged("critter_is_fleeing", 1),
        0x8152: bridged("critter_set_flee_state", 2, false),
        0x80DA: bridged("wield_obj_critter", 2, false),
        0x8116: bridged("add_mult_objs_to_inven", 3, false),
        0x8117: bridged("rm_mult_objs_from_inven", 3),
        0x80D8: bridged("add_obj_to_inven", 2, false),
        0x80DC: bridged("obj_can_see_obj", 2),
        0x80E9: bridged("set_light_level", 1),
        0x80BB: bridged("tile_contains_obj_pid", 3),
        0x80D3: bridged("tile_distance_objs", 2),
        0x80D2: bridged("tile_distance", 2),
        0x80A7: bridged("tile_contains_pid_obj", 3),
        0x814C: bridged("rotation_to_tile", 2),
        0x80AE: bridged("do_check", 3),
        0x814a: bridged("art_anim", 1),
        0x80F4: bridged("destroy_object", 1, false),
        0x80A9: bridged("override_map_start", 4, false),
        0x8154: bridged("debug_msg", 1, false),
        0x80F3: bridged("has_trait", 3),
        0x80C9: bridged("obj_item_subtype", 1),
        0x80BA: bridged("obj_is_carrying_obj_pid", 2),
        0x810D: bridged("obj_carrying_pid_obj", 2),
        0x80B6: bridged("move_to", 3),
        0x8147: bridged("move_obj_inven_to_obj", 2, false),
        0x8100: bridged("obj_pid", 1),
        0x80A4: bridged("obj_name", 1),
        0x8149: bridged("obj_art_fid", 1),
        0x8150: bridged("obj_on_screen", 1),
        0x80f5: bridged("obj_can_hear_obj", 2),
        0x80E3: bridged("set_obj_visibility", 2, false),
        0x8130: bridged("obj_is_open", 1),
        0x80C8: bridged("obj_type", 1),
        0x8131: bridged("obj_open", 1, false),
        0x8132: bridged("obj_close", 1, false),
        0x812E: bridged("obj_lock", 1, false),
        0x812F: bridged("obj_unlock", 1, false),
        0x812D: bridged("obj_is_locked", 1),
        0x80AC: bridged("roll_vs_skill", 3),
        0x80AF: bridged("is_success", 1),
        0x80B0: bridged("is_critical", 1),
        0x80AA: bridged("has_skill", 2),
        0x80AB: bridged("using_skill", 2),
        0x813C: bridged("critter_mod_skill", 3),
        0x80EF: bridged("critter_dmg", 3, false),
        0x80ed: bridged("kill_critter", 2, false),
        0x811a: bridged("explosion", 3),
        0x8123: bridged("get_poison", 1),
        0x80A1: bridged("give_exp_points", 1, false),
        0x8138: bridged("item_caps_total", 1),
        0x8139: bridged("item_caps_adjust", 2),
        0x80FB: bridged("critter_state", 1),
        0x8124: bridged("party_add", 1, false),
        0x8125: bridged("party_remove", 1, false),
        0x814B: bridged("party_member_obj", 1),
        0x80EC: bridged("elevation", 1),
        0x80F2: bridged("game_ticks", 1),
        0x8133: bridged("game_ui_disable", 0, false),
        0x8134: bridged("game_ui_enable", 0, false),
        0x80f8: bridged("tile_is_visible", 1),
        0x80CF: bridged("tile_in_tile_rect", 5),
        0x80D4: bridged("tile_num", 1),
        0x80D5: bridged("tile_num_in_direction", 3),
        0x80CE: bridged("animate_move_obj_to_tile", 3, false),
        0x80CC: bridged("animate_stand_obj", 1, false),
        0x80D0: bridged("attack_complex", 8, false),
        0x8153: bridged("terminate_combat", 0, false),
        0x8145: bridged("use_obj_on_obj", 2, false),
        0x80E4: bridged("load_map", 2, false),
        0x8115: bridged("play_gmovie", 1, false),
        0x80A3: bridged("play_sfx", 1, false),
        0x80FC: bridged("game_time_advance", 1, false),
        0x8137: bridged("gfade_in", 1, false),
        0x8136: bridged("gfade_out", 1, false),
        0x810A: bridged("float_msg", 3, false),
        0x80F0: bridged("add_timer_event", 3, false),
        0x80F1: bridged("rm_timer_event", 1, false),
        0x80F9: bridged("dialogue_system_enter", 0, false),
        0x8129: bridged("gdialog_mod_barter", 1, false),
        0x80DE: bridged("start_gdialog", 5, false),
        0x811C: bridged("gsay_start", 0),
        0x811E: bridged("gsay_reply", 2, false),
        0x80DF: bridged("end_dialogue", 0),
        0x8120: bridged("gsay_message", 3, false),
        0x814E: bridged("gdialog_set_barter_mod", 1, false),
        0x811D: function () {
            console.log("halting in gsay_end (pc=0x%s)", this.pc.toString(16));
            this.retStack.push(this.pc + 2);
            this.halted = true;
            this.scriptObj.gsay_end();
        },
        0x8121: function () {
            var _this = this;
            var reaction = this.pop();
            var target = this.pop();
            var msgId = this.pop();
            var msgList = this.pop();
            var iqTest = this.pop();
            var targetProc = this.intfile.proceduresTable[target].name;
            var targetFn = function () { _this.call(targetProc); };
            this.scriptObj.giq_option(iqTest, msgList, msgId, targetFn, reaction);
        }
    };
    Object.assign(opMap, bridgeOpMap);
    var GameScriptVM = (function (_super) {
        __extends(GameScriptVM, _super);
        function GameScriptVM(script, intfile) {
            var _this = _super.call(this, script, intfile) || this;
            _this.scriptObj = new Scripting.Script();
            var _loop_1 = function (procName) {
                this_1.scriptObj[procName] = function () { _this.call(procName); };
            };
            var this_1 = this;
            for (var procName in _this.intfile.procedures) {
                _loop_1(procName);
            }
            return _this;
        }
        GameScriptVM.prototype.mapScript = function () {
            if (this.scriptObj._mapScript)
                return this.scriptObj._mapScript;
            return this.scriptObj;
        };
        return GameScriptVM;
    }(ScriptVM));
    ScriptVMBridge.GameScriptVM = GameScriptVM;
})(ScriptVMBridge || (ScriptVMBridge = {}));
