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
var Ui;
(function (Ui) {
    var $uiContainer;
    function init() {
        $uiContainer = document.getElementById("game-container");
        initSkilldex();
        document.getElementById("chrButton").onclick = function () {
            Ui.characterWindow && Ui.characterWindow.close();
            initCharacterScreen();
        };
    }
    Ui.init = init;
    var WindowFrame = (function () {
        function WindowFrame(background, bbox, children) {
            this.background = background;
            this.bbox = bbox;
            this.children = [];
            this.showing = false;
            this.elem = document.createElement("div");
            Object.assign(this.elem.style, {
                position: "absolute",
                left: bbox.x + "px",
                top: bbox.y + "px",
                width: bbox.w + "px",
                height: bbox.h + "px",
                backgroundImage: "url('" + background + "')"
            });
            if (children) {
                for (var _i = 0, children_1 = children; _i < children_1.length; _i++) {
                    var child = children_1[_i];
                    this.add(child);
                }
            }
        }
        WindowFrame.prototype.add = function (widget) {
            this.children.push(widget);
            this.elem.appendChild(widget.elem);
            return this;
        };
        WindowFrame.prototype.show = function () {
            if (this.showing)
                return this;
            this.showing = true;
            $uiContainer.appendChild(this.elem);
            return this;
        };
        WindowFrame.prototype.close = function () {
            if (!this.showing)
                return;
            this.showing = false;
            this.elem.parentNode.removeChild(this.elem);
        };
        WindowFrame.prototype.toggle = function () {
            if (this.showing)
                this.close();
            else
                this.show();
            return this;
        };
        return WindowFrame;
    }());
    Ui.WindowFrame = WindowFrame;
    var Widget = (function () {
        function Widget(background, bbox) {
            this.background = background;
            this.bbox = bbox;
            this.hoverBackground = null;
            this.mouseDownBackground = null;
            this.elem = document.createElement("div");
            Object.assign(this.elem.style, {
                position: "absolute",
                left: bbox.x + "px",
                top: bbox.y + "px",
                width: bbox.w + "px",
                height: bbox.h + "px",
                backgroundImage: background && "url('" + background + "')"
            });
        }
        Widget.prototype.onClick = function (fn) {
            var _this = this;
            this.elem.onclick = function () { fn(_this); };
            return this;
        };
        Widget.prototype.hoverBG = function (background) {
            var _this = this;
            this.hoverBackground = background;
            if (!this.elem.onmouseenter) {
                this.elem.onmouseenter = function () {
                    _this.elem.style.backgroundImage = "url('" + _this.hoverBackground + "')";
                };
                this.elem.onmouseleave = function () {
                    _this.elem.style.backgroundImage = "url('" + _this.background + "')";
                };
            }
            return this;
        };
        Widget.prototype.mouseDownBG = function (background) {
            var _this = this;
            this.mouseDownBackground = background;
            if (!this.elem.onmousedown) {
                this.elem.onmousedown = function () {
                    _this.elem.style.backgroundImage = "url('" + _this.mouseDownBackground + "')";
                };
                this.elem.onmouseup = function () {
                    _this.elem.style.backgroundImage = "url('" + _this.background + "')";
                };
            }
            return this;
        };
        Widget.prototype.css = function (props) {
            Object.assign(this.elem.style, props);
            return this;
        };
        return Widget;
    }());
    Ui.Widget = Widget;
    var SmallButton = (function (_super) {
        __extends(SmallButton, _super);
        function SmallButton(x, y) {
            var _this = _super.call(this, "art/intrface/lilredup.png", { x: x, y: y, w: 15, h: 16 }) || this;
            _this.mouseDownBG("art/intrface/lilreddn.png");
            return _this;
        }
        return SmallButton;
    }(Widget));
    Ui.SmallButton = SmallButton;
    var Label = (function (_super) {
        __extends(Label, _super);
        function Label(x, y, text, textColor) {
            if (textColor === void 0) { textColor = "yellow"; }
            var _this = _super.call(this, null, { x: x, y: y, w: "auto", h: "auto" }) || this;
            _this.textColor = textColor;
            _this.setText(text);
            _this.elem.style.color = _this.textColor;
            return _this;
        }
        Label.prototype.setText = function (text) {
            this.elem.innerHTML = text;
        };
        return Label;
    }(Widget));
    Ui.Label = Label;
    var List = (function (_super) {
        __extends(List, _super);
        function List(bbox, items, textColor, selectedTextColor) {
            if (textColor === void 0) { textColor = "#00FF00"; }
            if (selectedTextColor === void 0) { selectedTextColor = "#FCFC7C"; }
            var _this = _super.call(this, null, bbox) || this;
            _this.textColor = textColor;
            _this.selectedTextColor = selectedTextColor;
            _this.items = [];
            _this.currentlySelected = null;
            _this.currentlySelectedElem = null;
            _this._lastUID = 0;
            _this.elem.style.color = _this.textColor;
            if (items) {
                for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
                    var item = items_1[_i];
                    _this.addItem(item);
                }
            }
            return _this;
        }
        List.prototype.onItemSelected = function (fn) {
            this.itemSelected = fn;
            return this;
        };
        List.prototype.getSelection = function () { return this.currentlySelected; };
        List.prototype.select = function (item, itemElem) {
            if (!itemElem)
                itemElem = this.elem.querySelector("[data-uid=\"" + item.uid + "\"]");
            if (!itemElem) {
                console.warn("Can't find item's element for item UID " + item.uid);
                return false;
            }
            this.itemSelected && this.itemSelected(item);
            item.onSelected && item.onSelected();
            if (this.currentlySelectedElem)
                this.currentlySelectedElem.style.color = this.textColor;
            itemElem.style.color = this.selectedTextColor;
            this.currentlySelected = item;
            this.currentlySelectedElem = itemElem;
            return true;
        };
        List.prototype.selectId = function (id) {
            var item = this.items.filter(function (item) { return item.id === id; })[0];
            if (!item)
                return false;
            this.select(item);
            return true;
        };
        List.prototype.addItem = function (item) {
            var _this = this;
            item.uid = this._lastUID++;
            this.items.push(item);
            var itemElem = document.createElement("div");
            itemElem.style.cursor = "pointer";
            itemElem.textContent = item.text;
            itemElem.setAttribute("data-uid", item.uid + "");
            itemElem.onclick = function () { _this.select(item, itemElem); };
            this.elem.appendChild(itemElem);
            if (!this.currentlySelected)
                this.select(item);
            return item;
        };
        List.prototype.clear = function () {
            this.items.length = 0;
            var node = this.elem;
            while (node.firstChild)
                node.removeChild(node.firstChild);
        };
        return List;
    }(Widget));
    Ui.List = List;
    function initSkilldex() {
        function useSkill(skill) {
            return function () {
                Ui.skilldexWindow.close();
                uiMode = UI_MODE_USE_SKILL;
                skillMode = skill;
                console.log("[UI] Using skill:", skill);
            };
        }
        Ui.skilldexWindow = new WindowFrame("art/intrface/skldxbox.png", { x: Config.ui.screenWidth - 185 - 5, y: Config.ui.screenHeight - 368, w: 185, h: 368 })
            .add(new Label(65, 13, "Skilldex"))
            .add(new Label(25, 85, "Lockpick").onClick(useSkill(Skills.Lockpick)))
            .add(new Label(25, 300, "Repair").onClick(useSkill(Skills.Repair)));
    }
    function initCharacterScreen() {
        var skillList = new List({ x: 380, y: 27, w: "auto", h: "auto" });
        skillList.css({ fontSize: "0.75em" });
        Ui.characterWindow = new WindowFrame("art/intrface/edtredt.png", { x: Config.ui.screenWidth / 2 - 640 / 2, y: Config.ui.screenHeight / 2 - 480 / 2, w: 640, h: 480 })
            .add(new SmallButton(455, 454).onClick(function () { })).add(new Label(455 + 18, 454, "Done"))
            .add(new SmallButton(552, 454).onClick(function () { Ui.characterWindow.close(); })).add(new Label(552 + 18, 454, "Cancel"))
            .add(new Label(22, 6, "Name"))
            .add(new Label(160, 6, "Age"))
            .add(new Label(242, 6, "Gender"))
            .add(new Label(33, 280, "Level: " + critterGetStat(player, "Level")).css({ fontSize: "0.75em", color: "#00FF00" }))
            .add(new Label(33, 292, "Exp: " + critterGetStat(player, "Experience")).css({ fontSize: "0.75em", color: "#00FF00" }))
            .add(new Label(380, 5, "Skill"))
            .add(new Label(399, 233, "Skill Points"))
            .add(new Label(194, 45, "Hit Points " + critterGetStat(player, "HP") + "/" + critterGetStat(player, "Max HP"))
            .css({ fontSize: "0.75em", color: "#00FF00" }))
            .add(skillList)
            .show();
        var skills = [
            "Small Guns",
            "Big Guns",
            "Energy Weapons",
            "Unarmed",
            "Melee Weapons",
            "Throwing",
            "First Aid",
            "Doctor",
            "Sneak",
            "Lockpick",
            "Steal",
            "Traps",
            "Science",
            "Repair",
            "Speech",
            "Barter",
            "Gambling",
            "Outdoorsman"
        ];
        var stats = [
            "STR",
            "PER",
            "END",
            "CHA",
            "INT",
            "AGI",
            "LUK"
        ];
        var statWidgets = [];
        var selectedStat = stats[0];
        var n = 0;
        var _loop_1 = function (stat) {
            var widget = new Label(20, 39 + n, "").css({ background: "black", padding: "5px" });
            widget.onClick(function () { selectedStat = stat; });
            statWidgets.push(widget);
            Ui.characterWindow.add(widget);
            n += 33;
        };
        for (var _i = 0, stats_1 = stats; _i < stats_1.length; _i++) {
            var stat = stats_1[_i];
            _loop_1(stat);
        }
        var newStatSet = player.stats.clone();
        var newSkillSet = player.skills.clone();
        var skillPointCounter = new Label(522, 230, "").css({ background: "black", padding: "5px" });
        Ui.characterWindow.add(skillPointCounter);
        var redrawStatsSkills = function () {
            skillList.clear();
            for (var _i = 0, skills_1 = skills; _i < skills_1.length; _i++) {
                var skill = skills_1[_i];
                skillList.addItem({ text: skill + " " + newSkillSet.get(skill, newStatSet) + "%", id: skill });
            }
            for (var i = 0; i < stats.length; i++) {
                var stat = stats[i];
                statWidgets[i].setText(stat + " - " + newStatSet.get(stat));
            }
            skillPointCounter.setText(pad(newSkillSet.skillPoints, 2));
        };
        redrawStatsSkills();
        var isLevelUp = true;
        var canChangeStats = true;
        if (isLevelUp) {
            var modifySkill_1 = function (inc) {
                var skill = skillList.getSelection().id;
                console.log("skill: %s currently: %d", skill, newSkillSet.get(skill, newStatSet));
                if (inc) {
                    var changed = newSkillSet.incBase(skill);
                    if (!changed) {
                        console.warn("Not enough skill points!");
                    }
                }
                else {
                    newSkillSet.decBase(skill);
                }
                redrawStatsSkills();
            };
            var toggleTagSkill_1 = function () {
                var skill = skillList.getSelection().id;
                var tagged = newSkillSet.isTagged(skill);
                console.log("skill: %s currently: %d tagged: %s", skill, newSkillSet.get(skill, newStatSet), tagged);
                if (!tagged)
                    newSkillSet.tag(skill);
                else
                    newSkillSet.untag(skill);
                redrawStatsSkills();
            };
            var modifyStat_1 = function (change) {
                console.log("stat: %s currently: %d", selectedStat, newStatSet.get(selectedStat));
                newStatSet.modifyBase(selectedStat, change);
                redrawStatsSkills();
            };
            Ui.characterWindow.add(new Label(580, 236, "-").onClick(function () { console.log("-"); modifySkill_1(false); }));
            Ui.characterWindow.add(new Label(600, 236, "+").onClick(function () { console.log("+"); modifySkill_1(true); }));
            Ui.characterWindow.add(new Label(620, 236, "Tag").onClick(function () { console.log("Tag"); toggleTagSkill_1(); }));
            if (canChangeStats) {
                Ui.characterWindow.add(new Label(115, 260, "-").onClick(function () { console.log("-"); modifyStat_1(-1); }));
                Ui.characterWindow.add(new Label(135, 260, "+").onClick(function () { console.log("+"); modifyStat_1(+1); }));
            }
        }
    }
})(Ui || (Ui = {}));
var UI_MODE_NONE = 0, UI_MODE_DIALOGUE = 1, UI_MODE_BARTER = 2, UI_MODE_LOOT = 3, UI_MODE_INVENTORY = 4, UI_MODE_WORLDMAP = 5, UI_MODE_ELEVATOR = 6, UI_MODE_CALLED_SHOT = 7, UI_MODE_SKILLDEX = 8, UI_MODE_USE_SKILL = 9, UI_MODE_CONTEXT_MENU = 10, UI_MODE_SAVELOAD = 11, UI_MODE_CHAR = 12;
var uiMode = UI_MODE_NONE;
function $id(id) {
    return document.getElementById(id);
}
function $img(id) {
    return document.getElementById(id);
}
function $q(selector) {
    return document.querySelector(selector);
}
function $qa(selector) {
    return Array.from(document.querySelectorAll(selector));
}
function clearEl($el) {
    $el.innerHTML = "";
}
function show($el) {
    $el.style.display = "block";
}
function hide($el) {
    $el.style.display = "none";
}
function showv($el) {
    $el.style.visibility = "visible";
}
function hidev($el) {
    $el.style.visibility = "hidden";
}
function off($el, events) {
    var eventList = events.split(" ");
    for (var _i = 0, eventList_1 = eventList; _i < eventList_1.length; _i++) {
        var event_1 = eventList_1[_i];
        $el["on" + event_1] = null;
    }
}
function appendHTML($el, html) {
    $el.insertAdjacentHTML("beforeend", html);
}
function makeEl(tag, options) {
    var $el = document.createElement(tag);
    if (options.id !== undefined)
        $el.id = options.id;
    if (options.src !== undefined)
        $el.src = options.src;
    if (options.classes !== undefined)
        $el.className = options.classes.join(" ");
    if (options.click !== undefined)
        $el.onclick = options.click;
    if (options.style !== undefined)
        Object.assign($el.style, options.style);
    if (options.children !== undefined) {
        for (var _i = 0, _a = options.children; _i < _a.length; _i++) {
            var child = _a[_i];
            $el.appendChild(child);
        }
    }
    if (options.attrs !== undefined) {
        for (var prop in options.attrs)
            $el.setAttribute(prop, options.attrs[prop] + "");
    }
    return $el;
}
function initUI() {
    Ui.init();
    makeDropTarget($id("inventoryBoxList"), function (data) { uiMoveSlot(data, "inventory"); });
    makeDropTarget($id("inventoryBoxItem1"), function (data) { uiMoveSlot(data, "leftHand"); });
    makeDropTarget($id("inventoryBoxItem2"), function (data) { uiMoveSlot(data, "rightHand"); });
    for (var i = 0; i < 2; i++) {
        for (var _i = 0, _a = Array.from(document.querySelectorAll("#calledShotBox .calledShotChance")); _i < _a.length; _i++) {
            var $chance = _a[_i];
            $chance.appendChild(makeEl("div", { classes: ["number"], style: { left: (i * 9) + "px" }, id: "digit" + (i + 1) }));
        }
    }
    $id("calledShotCancelBtn").onclick = function () { uiCloseCalledShot(); };
    $id("inventoryButton").onclick = function () { uiInventoryScreen(); };
    $id("inventoryDoneButton").onclick = function () {
        uiMode = UI_MODE_NONE;
        $id("inventoryBox").style.visibility = "hidden";
        uiDrawWeapon();
    };
    $id("lootBoxDoneButton").onclick = function () { uiEndLoot(); };
    $id("attackButtonContainer").onclick = function () {
        if (!Config.engine.doCombat)
            return;
        if (inCombat) {
        }
        else {
            Combat.start();
        }
    };
    $id("attackButtonContainer").oncontextmenu = function () {
        var wep = critterGetEquippedWeapon(player);
        if (!wep || !wep.weapon)
            return false;
        wep.weapon.cycleMode();
        uiDrawWeapon();
        return false;
    };
    $id("endTurnButton").onclick = function () {
        if (inCombat && combat.inPlayerTurn) {
            if (player.anim !== null && player.anim !== "idle") {
                console.log("Can't end turn while player is in an animation.");
                return;
            }
            console.log("[TURN]");
            combat.nextTurn();
        }
    };
    $id("endCombatButton").onclick = function () {
        if (inCombat)
            combat.end();
    };
    $id("endContainer").addEventListener("animationiteration", uiEndCombatAnimationDone);
    $id("endContainer").addEventListener("webkitAnimationIteration", uiEndCombatAnimationDone);
    $id("skilldexButton").onclick = function () { Ui.skilldexWindow.toggle(); };
    function makeScrollable($el, scroll) {
        if (scroll === void 0) { scroll = 60; }
        $el.onwheel = function (e) {
            var delta = e.deltaY > 0 ? 1 : -1;
            $el.scrollTop = $el.scrollTop + scroll * delta;
            e.preventDefault();
        };
    }
    makeScrollable($id("inventoryBoxList"));
    makeScrollable($id("barterBoxInventoryLeft"));
    makeScrollable($id("barterBoxInventoryRight"));
    makeScrollable($id("barterBoxLeft"));
    makeScrollable($id("barterBoxRight"));
    makeScrollable($id("lootBoxLeft"));
    makeScrollable($id("lootBoxRight"));
    makeScrollable($id("worldMapLabels"));
    makeScrollable($id("displayLog"));
    makeScrollable($id("dialogueBoxReply"), 30);
    drawHP(critterGetStat(player, "HP"));
    uiDrawWeapon();
}
function uiHideContextMenu() {
    uiMode = UI_MODE_NONE;
    $id("itemContextMenu").style.visibility = "hidden";
}
function uiContextMenu(obj, evt) {
    uiMode = UI_MODE_CONTEXT_MENU;
    function button(obj, action, onclick) {
        return makeEl("img", { id: "context_" + action,
            classes: ["itemContextMenuButton"],
            click: function () { onclick(); uiHideContextMenu(); }
        });
    }
    var $menu = $id("itemContextMenu");
    clearEl($menu);
    Object.assign($menu.style, {
        visibility: "visible",
        left: evt.clientX + "px",
        top: evt.clientY + "px"
    });
    var cancelBtn = button(obj, "cancel", function () { });
    var lookBtn = button(obj, "look", function () { return uiLog("You see: " + obj.getDescription()); });
    var useBtn = button(obj, "use", function () { return playerUse(); });
    var talkBtn = button(obj, "talk", function () {
        console.log("talking to " + obj.name);
        if (!obj._script) {
            console.warn("obj has no script");
            return;
        }
        Scripting.talk(obj._script, obj);
    });
    var pickupBtn = button(obj, "pickup", function () { return pickupObject(obj, player); });
    $menu.appendChild(cancelBtn);
    $menu.appendChild(lookBtn);
    if (obj._script && obj._script.talk_p_proc !== undefined)
        $menu.appendChild(talkBtn);
    if (canUseObject(obj))
        $menu.appendChild(useBtn);
    $menu.appendChild(pickupBtn);
}
function uiStartCombat() {
    Object.assign($id("endContainer").style, { animationPlayState: "running", webkitAnimationPlayState: "running" });
}
function uiEndCombat() {
    Object.assign($id("endContainer").style, { animationPlayState: "running", webkitAnimationPlayState: "running" });
    hidev($id("endTurnButton"));
    hidev($id("endCombatButton"));
}
function uiEndCombatAnimationDone() {
    Object.assign(this.style, { animationPlayState: "paused", webkitAnimationPlayState: "paused" });
    if (inCombat) {
        showv($id("endTurnButton"));
        showv($id("endCombatButton"));
    }
}
function uiDrawWeapon() {
    var weapon = critterGetEquippedWeapon(player);
    clearEl($id("attackButton"));
    if (!weapon || !weapon.weapon)
        return;
    if (weapon.weapon.type !== "melee") {
        var $attackButtonWeapon = $id("attackButtonWeapon");
        $attackButtonWeapon.onload = null;
        $attackButtonWeapon.onload = function () {
            if (!this.complete)
                return;
            Object.assign(this.style, {
                position: "absolute",
                top: "5px",
                left: ($id("attackButton").offsetWidth / 2 - this.width / 2) + "px",
                maxHeight: ($id("attackButton").offsetHeight - 10) + "px"
            });
            this.setAttribute("draggable", "false");
        };
        $attackButtonWeapon.src = weapon.invArt + ".png";
    }
    var CHAR_W = 10;
    var digit = weapon.weapon.getAPCost(1);
    if (digit === undefined || digit > 9)
        return;
    $id("attackButtonAPDigit").style.backgroundPosition = (0 - CHAR_W * digit) + "px";
    var wepTypes = { "melee": "punch", "gun": "single" };
    var type = wepTypes[weapon.weapon.type];
    $img("attackButtonType").src = "art/intrface/" + type + ".png";
    if (weapon.weapon.mode === "called")
        show($id("attackButtonCalled"));
    else
        hide($id("attackButtonCalled"));
}
function uiMoveSlot(data, target) {
    var playerUnsafe = player;
    var obj = null;
    if (data[0] === "i") {
        if (target === "inventory")
            return;
        var idx = parseInt(data.slice(1));
        console.log("idx: " + idx);
        obj = player.inventory[idx];
        player.inventory.splice(idx, 1);
    }
    else {
        obj = playerUnsafe[data];
        playerUnsafe[data] = null;
    }
    console.log("obj: " + obj + " (data: " + data + ", target: " + target + ")");
    if (target === "inventory")
        player.inventory.push(obj);
    else {
        if (playerUnsafe[target] !== undefined && playerUnsafe[target] !== null) {
            if (data[0] === "i")
                player.inventory.push(playerUnsafe[target]);
            else
                playerUnsafe[data] = playerUnsafe[target];
        }
        playerUnsafe[target] = obj;
    }
    uiInventoryScreen();
}
function makeDropTarget($el, dropCallback) {
    $el.ondrop = function (e) {
        var data = e.dataTransfer.getData("text/plain");
        dropCallback(data, e);
        return false;
    };
    $el.ondragenter = function () { return false; };
    $el.ondragover = function () { return false; };
}
function makeDraggable($el, data, endCallback) {
    $el.setAttribute("draggable", "true");
    $el.ondragstart = function (e) {
        e.dataTransfer.setData('text/plain', data);
        console.log("start drag");
    };
    $el.ondragend = function (e) {
        if (e.dataTransfer.dropEffect !== "none") {
            endCallback && endCallback();
        }
    };
}
function uiInventoryScreen() {
    uiMode = UI_MODE_INVENTORY;
    showv($id("inventoryBox"));
    drawInventory($id("inventoryBoxList"), player.inventory, function (obj, e) {
        makeItemContextMenu(e, obj, "inventory");
    });
    function drawInventory($el, objects, clickCallback) {
        clearEl($el);
        clearEl($id("inventoryBoxItem1"));
        clearEl($id("inventoryBoxItem2"));
        var _loop_2 = function (i) {
            var invObj = objects[i];
            var img = makeEl("img", { src: invObj.invArt + '.png',
                attrs: { width: 72, height: 60, title: invObj.name },
                click: clickCallback ? function (e) { clickCallback(invObj, e); } : undefined });
            $el.appendChild(img);
            $el.insertAdjacentHTML("beforeend", "x" + invObj.amount);
            makeDraggable(img, "i" + i, function () { uiInventoryScreen(); });
        };
        for (var i = 0; i < objects.length; i++) {
            _loop_2(i);
        }
    }
    function itemAction(obj, slot, action) {
        switch (action) {
            case "cancel": break;
            case "use":
                console.log("using object: " + obj.art);
                useObject(obj, player);
                break;
            case "drop":
                console.log("dropping: " + obj.art + " with pid " + obj.pid);
                if (slot !== "inventory") {
                    console.log("moving into inventory first");
                    player.inventory.push(obj);
                    player[slot] = null;
                }
                dropObject(player, obj);
                uiInventoryScreen();
                break;
        }
    }
    function makeContextButton(obj, slot, action) {
        return makeEl("img", { id: "context_" + action,
            classes: ["itemContextMenuButton"],
            click: function () {
                itemAction(obj, slot, action);
                hidev($id("itemContextMenu"));
            }
        });
    }
    function makeItemContextMenu(e, obj, slot) {
        var $menu = $id("itemContextMenu");
        clearEl($menu);
        Object.assign($menu.style, {
            visibility: "visible",
            left: e.clientX + "px",
            top: e.clientY + "px"
        });
        var cancelBtn = makeContextButton(obj, slot, "cancel");
        var useBtn = makeContextButton(obj, slot, "use");
        var dropBtn = makeContextButton(obj, slot, "drop");
        $menu.appendChild(cancelBtn);
        if (canUseObject(obj))
            $menu.appendChild(useBtn);
        $menu.appendChild(dropBtn);
    }
    function drawSlot(slot, slotID) {
        var art = player[slot].invArt;
        var img = makeEl("img", { src: art + '.png',
            attrs: { width: 72, height: 60, title: player[slot].name },
            click: function (e) { makeItemContextMenu(e, player[slot], slot); }
        });
        makeDraggable(img, slot);
        var $slotEl = $id(slotID);
        clearEl($slotEl);
        $slotEl.appendChild(img);
    }
    if (player.leftHand)
        drawSlot("leftHand", "inventoryBoxItem1");
    if (player.rightHand)
        drawSlot("rightHand", "inventoryBoxItem2");
}
function drawHP(hp) {
    drawDigits("#hpDigit", hp, 4, true);
}
function drawDigits(idPrefix, amount, maxDigits, hasSign) {
    var CHAR_W = 9, CHAR_NEG = 12;
    var sign = (amount < 0) ? CHAR_NEG : 0;
    if (amount < 0)
        amount = -amount;
    var digits = amount.toString();
    var firstDigitIdx = (hasSign ? 2 : 1);
    if (hasSign)
        $q(idPrefix + "1").style.backgroundPosition = (0 - CHAR_W * sign) + "px";
    for (var i = firstDigitIdx; i <= maxDigits - digits.length; i++)
        $q(idPrefix + i).style.backgroundPosition = "0px";
    for (var i = 0; i < digits.length; i++) {
        var idx = digits.length - 1 - i;
        if (digits[idx] === '-')
            var digit = 12;
        else
            var digit = parseInt(digits[idx]);
        $q(idPrefix + (maxDigits - i)).style.backgroundPosition = (0 - CHAR_W * digit) + "px";
    }
}
function uiAnimateBox($el, origin, target, callback) {
    var style = $el.style;
    if (origin !== null) {
        style.transition = "none";
        style.top = origin + "px";
    }
    setTimeout(function () {
        if (callback) {
            var listener_1 = function () {
                callback();
                $el.removeEventListener("transitionend", listener_1);
                listener_1 = null;
            };
            $el.addEventListener("transitionend", listener_1);
        }
        $el.style.transition = "top 1s ease";
        $el.style.top = target + "px";
    }, 1);
}
function uiStartDialogue(force, target) {
    if (uiMode === UI_MODE_BARTER && force !== true)
        return;
    uiMode = UI_MODE_DIALOGUE;
    $id("dialogueContainer").style.visibility = "visible";
    $id("dialogueBox").style.visibility = "visible";
    uiAnimateBox($id("dialogueBox"), 480, 290);
    if (!target)
        return;
    var bbox = objectBoundingBox(target);
    if (bbox !== null) {
        var dc = $id("dialogueContainer");
        var dx = (dc.offsetWidth / 2 | 0) + dc.offsetLeft;
        var dy = (dc.offsetHeight / 4 | 0) + dc.offsetTop - (bbox.h / 2 | 0);
        cameraX = bbox.x - dx;
        cameraY = bbox.y - dy;
    }
}
function uiEndDialogue() {
    uiMode = UI_MODE_NONE;
    $id("dialogueContainer").style.visibility = "hidden";
    $id("dialogueBox").style.visibility = "hidden";
    $id("dialogueBoxReply").innerHTML = "";
}
function uiSetDialogueReply(reply) {
    var $dialogueBoxReply = $id("dialogueBoxReply");
    $dialogueBoxReply.innerHTML = reply;
    $dialogueBoxReply.scrollTop = 0;
    $id("dialogueBoxTextArea").innerHTML = "";
}
function uiAddDialogueOption(msg, optionID) {
    $id("dialogueBoxTextArea").insertAdjacentHTML("beforeend", "<li><a href=\"javascript:dialogueReply(" + optionID + ")\">" + msg + "</a></li>");
}
function uiGetAmount(item) {
    while (true) {
        var amount = prompt("How many?");
        if (amount === null)
            return 0;
        else if (amount === "")
            return item.amount;
        else
            amount = parseInt(amount);
        if (isNaN(amount) || item.amount < amount)
            alert("Invalid amount");
        else
            return amount;
    }
}
function _uiAddItem(items, item, count) {
    for (var i = 0; i < items.length; i++) {
        if (items[i].approxEq(item)) {
            items[i].amount += count;
            return;
        }
    }
    items.push(item.clone().setAmount(count));
}
function uiSwapItem(a, item, b, amount) {
    if (amount === 0)
        return;
    var idx = -1;
    for (var i = 0; i < a.length; i++) {
        if (a[i].approxEq(item)) {
            idx = i;
            break;
        }
    }
    if (idx === -1)
        throw "item (" + item + ") does not exist in a";
    if (amount < item.amount)
        item.amount -= amount;
    else
        a.splice(idx, 1);
    _uiAddItem(b, item, amount);
}
function uiEndBarterMode() {
    var $barterBox = $id("barterBox");
    uiAnimateBox($barterBox, null, 480, function () {
        hidev($id("barterBox"));
        off($id("barterBoxLeft"), "drop dragenter dragover");
        off($id("barterBoxRight"), "drop dragenter dragover");
        off($id("barterBoxInventoryLeft"), "drop dragenter dragover");
        off($id("barterBoxInventoryRight"), "drop dragenter dragover");
        off($id("barterTalkButton"), "click");
        off($id("barterOfferButton"), "click");
        uiStartDialogue(true);
    });
}
function uiBarterMode(merchant) {
    uiMode = UI_MODE_BARTER;
    var $dialogueBox = $id("dialogueBox");
    uiAnimateBox($dialogueBox, null, 480, function () {
        $dialogueBox.style.visibility = "hidden";
        console.log("going to pop up barter box");
        var $barterBox = $id("barterBox");
        $barterBox.style.visibility = "visible";
        uiAnimateBox($barterBox, 480, 290);
    });
    var workingPlayerInventory = player.inventory.map(cloneItem);
    var workingMerchantInventory = merchant.inventory.map(cloneItem);
    var playerBarterTable = [];
    var merchantBarterTable = [];
    function totalAmount(objects) {
        var total = 0;
        for (var i = 0; i < objects.length; i++) {
            total += objects[i].pro.extra.cost * objects[i].amount;
        }
        return total;
    }
    function offer() {
        console.log("[OFFER]");
        var merchantOffered = totalAmount(merchantBarterTable);
        var playerOffered = totalAmount(playerBarterTable);
        var diffOffered = playerOffered - merchantOffered;
        if (diffOffered >= 0) {
            console.log("[OFFER OK]");
            merchant.inventory = workingMerchantInventory;
            player.inventory = workingPlayerInventory;
            for (var i = 0; i < merchantBarterTable.length; i++)
                player.addInventoryItem(merchantBarterTable[i], merchantBarterTable[i].amount);
            for (var i = 0; i < playerBarterTable.length; i++)
                merchant.addInventoryItem(playerBarterTable[i], playerBarterTable[i].amount);
            workingPlayerInventory = player.inventory.map(cloneItem);
            workingMerchantInventory = merchant.inventory.map(cloneItem);
            playerBarterTable = [];
            merchantBarterTable = [];
            redrawBarterInventory();
        }
        else {
            console.log("[OFFER REFUSED]");
        }
    }
    function drawInventory($el, who, objects) {
        clearEl($el);
        for (var i = 0; i < objects.length; i++) {
            var inventoryImage = objects[i].invArt;
            var img = makeEl("img", { src: inventoryImage + '.png',
                attrs: { width: 72, height: 60, title: objects[i].name } });
            $el.appendChild(img);
            $el.insertAdjacentHTML("beforeend", "x" + objects[i].amount);
            makeDraggable(img, who + i);
        }
    }
    function uiBarterMove(data, where) {
        console.log("barter: move " + data + " to " + where);
        var from = { "p": workingPlayerInventory,
            "m": workingMerchantInventory,
            "l": playerBarterTable,
            "r": merchantBarterTable }[data[0]];
        if (from === undefined)
            throw "uiBarterMove: wrong data: " + data;
        var idx = parseInt(data.slice(1));
        var obj = from[idx];
        if (obj === undefined)
            throw "uiBarterMove: obj not found in list (" + idx + ")";
        if (data[0] === "p" && where !== "left" && where !== "leftInv")
            return;
        if (data[0] === "m" && where !== "right" && where !== "rightInv")
            return;
        var to = { "left": playerBarterTable,
            "right": merchantBarterTable,
            "leftInv": workingPlayerInventory,
            "rightInv": workingMerchantInventory }[where];
        if (to === undefined)
            throw "uiBarterMove: invalid location: " + where;
        else if (to === from)
            return;
        else if (obj.amount > 1)
            uiSwapItem(from, obj, to, uiGetAmount(obj));
        else
            uiSwapItem(from, obj, to, 1);
        redrawBarterInventory();
    }
    makeDropTarget($id("barterBoxLeft"), function (data) { uiBarterMove(data, "left"); });
    makeDropTarget($id("barterBoxRight"), function (data) { uiBarterMove(data, "right"); });
    makeDropTarget($id("barterBoxInventoryLeft"), function (data) { uiBarterMove(data, "leftInv"); });
    makeDropTarget($id("barterBoxInventoryRight"), function (data) { uiBarterMove(data, "rightInv"); });
    $id("barterTalkButton").onclick = uiEndBarterMode;
    $id("barterOfferButton").onclick = offer;
    function redrawBarterInventory() {
        drawInventory($id("barterBoxInventoryLeft"), "p", workingPlayerInventory);
        drawInventory($id("barterBoxInventoryRight"), "m", workingMerchantInventory);
        drawInventory($id("barterBoxLeft"), "l", playerBarterTable);
        drawInventory($id("barterBoxRight"), "r", merchantBarterTable);
        var moneyLeft = totalAmount(playerBarterTable);
        var moneyRight = totalAmount(merchantBarterTable);
        $id("barterBoxLeftAmount").innerHTML = "$" + moneyLeft;
        $id("barterBoxRightAmount").innerHTML = "$" + moneyRight;
    }
    redrawBarterInventory();
}
function uiEndLoot() {
    uiMode = UI_MODE_NONE;
    hidev($id("lootBox"));
    off($id("lootBoxLeft"), "drop dragenter dragover");
    off($id("lootBoxRight"), "drop dragenter dragover");
    off($id("lootBoxTakeAllButton"), "click");
}
function uiLoot(object) {
    uiMode = UI_MODE_LOOT;
    function uiLootMove(data, where) {
        console.log("loot: move " + data + " to " + where);
        var from = { "l": player.inventory,
            "r": object.inventory }[data[0]];
        if (from === undefined)
            throw "uiLootMove: wrong data: " + data;
        var idx = parseInt(data.slice(1));
        var obj = from[idx];
        if (obj === undefined)
            throw "uiLootMove: obj not found in list (" + idx + ")";
        var to = { "left": player.inventory,
            "right": object.inventory }[where];
        if (to === undefined)
            throw "uiLootMove: invalid location: " + where;
        else if (to === from)
            return;
        else if (obj.amount > 1)
            uiSwapItem(from, obj, to, uiGetAmount(obj));
        else
            uiSwapItem(from, obj, to, 1);
        drawLoot();
    }
    function drawInventory($el, who, objects) {
        clearEl($el);
        for (var i = 0; i < objects.length; i++) {
            var inventoryImage = objects[i].invArt;
            var img = makeEl("img", { src: inventoryImage + '.png',
                attrs: { width: 72, height: 60, title: objects[i].name } });
            $el.appendChild(img);
            $el.insertAdjacentHTML("beforeend", "x" + objects[i].amount);
            makeDraggable(img, who + i);
        }
    }
    console.log("looting...");
    showv($id("lootBox"));
    makeDropTarget($id("lootBoxLeft"), function (data) { uiLootMove(data, "left"); });
    makeDropTarget($id("lootBoxRight"), function (data) { uiLootMove(data, "right"); });
    $id("lootBoxTakeAllButton").onclick = function () {
        console.log("take all...");
        var inv = object.inventory.slice(0);
        for (var i = 0; i < inv.length; i++)
            uiSwapItem(object.inventory, inv[i], player.inventory, inv[i].amount);
        drawLoot();
    };
    function drawLoot() {
        drawInventory($id("lootBoxLeft"), "l", player.inventory);
        drawInventory($id("lootBoxRight"), "r", object.inventory);
    }
    drawLoot();
}
function uiLog(msg) {
    var $log = $id("displayLog");
    $log.insertAdjacentHTML("beforeend", "<li>" + msg + "</li>");
    $log.scrollTop = $log.scrollHeight;
}
function uiCloseWorldMap() {
    uiMode = UI_MODE_NONE;
    hide($id("worldMapContainer"));
    hidev($id("areamap"));
    hidev($id("worldmap"));
    Worldmap.stop();
}
function uiWorldMap(onAreaMap) {
    if (onAreaMap === void 0) { onAreaMap = false; }
    uiMode = UI_MODE_WORLDMAP;
    show($id("worldMapContainer"));
    if (!mapAreas)
        mapAreas = loadAreas();
    if (onAreaMap)
        uiWorldMapAreaView();
    else
        uiWorldMapWorldView();
    uiWorldMapLabels();
}
function uiWorldMapAreaView() {
    hidev($id("worldmap"));
    showv($id("areamap"));
    Worldmap.stop();
}
function uiWorldMapWorldView() {
    showv($id("worldmap"));
    hidev($id("areamap"));
    Worldmap.start();
}
function uiWorldMapShowArea(area) {
    uiWorldMapAreaView();
    var $areamap = $id("areamap");
    $areamap.style.backgroundImage = "url('" + area.mapArt + ".png')";
    clearEl($areamap);
    var _loop_3 = function (entrance) {
        console.log("Area entrance: " + entrance.mapLookupName);
        $entranceEl = makeEl("div", { classes: ["worldmapEntrance"] });
        $hotspot = makeEl("div", { classes: ["worldmapEntranceHotspot"] });
        $hotspot.onclick = function () {
            var mapName = lookupMapNameFromLookup(entrance.mapLookupName);
            console.log("hotspot -> " + mapName + " (via " +
                entrance.mapLookupName + ")");
            gMap.loadMap(mapName);
            uiCloseWorldMap();
        };
        $entranceEl.appendChild($hotspot);
        appendHTML($entranceEl, entrance.mapLookupName);
        $entranceEl.style.left = entrance.x + "px";
        $entranceEl.style.top = entrance.y + "px";
        $id("areamap").appendChild($entranceEl);
    };
    var $entranceEl, $hotspot;
    for (var _i = 0, _a = area.entrances; _i < _a.length; _i++) {
        var entrance = _a[_i];
        _loop_3(entrance);
    }
}
function uiWorldMapLabels() {
    $id("worldMapLabels").innerHTML = "<div id='worldMapLabelsBackground'></div>";
    var i = 0;
    var _loop_4 = function (areaID) {
        area = mapAreas[areaID];
        if (!area.labelArt)
            return "continue";
        label = makeEl("img", { classes: ["worldMapLabelImage"], src: area.labelArt + ".png" });
        labelButton = makeEl("div", { classes: ["worldMapLabelButton"],
            click: function () { uiWorldMapShowArea(mapAreas[areaID]); } });
        areaLabel = makeEl("div", { classes: ["worldMapLabel"], style: { top: (1 + i * 27) + "px" },
            children: [label, labelButton] });
        $id("worldMapLabels").appendChild(areaLabel);
        i++;
    };
    var area, label, labelButton, areaLabel;
    for (var areaID in mapAreas) {
        _loop_4(areaID);
    }
}
function uiElevatorDone() {
    uiMode = UI_MODE_NONE;
    hidev($id("elevatorBox"));
    for (var _i = 0, _a = $qa(".elevatorButton"); _i < _a.length; _i++) {
        var $elevatorButton = _a[_i];
        hidev($elevatorButton);
        $elevatorButton.onclick = null;
    }
    hidev($id("elevatorLabel"));
}
function uiElevator(elevator) {
    uiMode = UI_MODE_ELEVATOR;
    var art = lookupInterfaceArt(elevator.type);
    console.log("elevator art: " + art);
    console.log("buttons: " + elevator.buttonCount);
    if (elevator.labels !== -1) {
        var labelArt = lookupInterfaceArt(elevator.labels);
        console.log("elevator label art: " + labelArt);
        var $elevatorLabel = $id("elevatorLabel");
        showv($elevatorLabel);
        $elevatorLabel.style.backgroundImage = "url('" + labelArt + ".png')";
    }
    var $elevatorBox = $id("elevatorBox");
    showv($elevatorBox);
    $elevatorBox.style.backgroundImage = "url('" + art + ".png')";
    var _loop_5 = function (i) {
        var $elevatorButton = $id("elevatorButton" + i);
        showv($elevatorButton);
        $elevatorButton.onclick = function () {
            var mapID = elevator.buttons[i - 1].mapID;
            var level = elevator.buttons[i - 1].level;
            var position = fromTileNum(elevator.buttons[i - 1].tileNum);
            if (mapID !== gMap.mapID) {
                console.log("elevator -> map " + mapID + ", level " + level + " @ " +
                    position.x + ", " + position.y);
                gMap.loadMapByID(mapID, position, level);
            }
            else if (level !== currentElevation) {
                console.log("elevator -> level " + level + " @ " +
                    position.x + ", " + position.y);
                player.move(position);
                gMap.changeElevation(level, true);
            }
            uiElevatorDone();
        };
    };
    for (var i = 1; i <= elevator.buttonCount; i++) {
        _loop_5(i);
    }
}
function uiCloseCalledShot() {
    uiMode = UI_MODE_NONE;
    hide($id("calledShotBox"));
}
function uiCalledShot(art, target, callback) {
    uiMode = UI_MODE_CALLED_SHOT;
    show($id("calledShotBox"));
    function drawChance(region) {
        var chance = Combat.prototype.getHitChance(player, target, region).hit;
        console.log("id: %s | chance: %d", "#calledShot-" + region + "-chance #digit", chance);
        if (chance <= 0)
            chance = "--";
        drawDigits("#calledShot-" + region + "-chance #digit", chance, 2, false);
    }
    drawChance("torso");
    drawChance("head");
    drawChance("eyes");
    drawChance("groin");
    drawChance("leftArm");
    drawChance("rightArm");
    drawChance("leftLeg");
    drawChance("rightLeg");
    $id("calledShotBackground").style.backgroundImage = "url('" + art + ".png')";
    for (var _i = 0, _a = $qa(".calledShotLabel"); _i < _a.length; _i++) {
        var $label = _a[_i];
        $label.onclick = function (evt) {
            var id = evt.target.id;
            var regionHit = id.split("-")[1];
            console.log("clicked a called location (%s)", regionHit);
            if (callback)
                callback(regionHit);
        };
    }
}
function uiSaveLoad(isSave) {
    uiMode = UI_MODE_SAVELOAD;
    var saveList = new Ui.List({ x: 55, y: 50, w: "auto", h: "auto" });
    var saveInfo = new Ui.Label(404, 262, "", "#00FF00");
    Object.assign(saveInfo.elem.style, {
        width: "154px", height: "33px",
        fontSize: "8pt",
        overflow: "hidden"
    });
    var saveLoadWindow = new Ui.WindowFrame("art/intrface/lsgame.png", { x: 80, y: 20, w: 640, h: 480 })
        .add(new Ui.Widget("art/intrface/lscover.png", { x: 340, y: 40, w: 275, h: 173 }))
        .add(new Ui.Label(50, 26, isSave ? "Save Game" : "Load Game"))
        .add(new Ui.SmallButton(391, 349).onClick(selected)).add(new Ui.Label(391 + 18, 349, "Done"))
        .add(new Ui.SmallButton(495, 349).onClick(done)).add(new Ui.Label(495 + 18, 349, "Cancel"))
        .add(saveInfo)
        .add(saveList)
        .show();
    if (isSave) {
        saveList.select(saveList.addItem({ text: "<New Slot>", id: -1, onSelected: function () {
                saveInfo.setText("New save");
            } }));
    }
    SaveLoad.saveList(function (saves) {
        var _loop_6 = function (save) {
            saveList.addItem({ text: save.name, id: save.id, onSelected: function () {
                    saveInfo.setText(SaveLoad.formatSaveDate(save) + "<br>" + save.currentMap);
                } });
        };
        for (var _i = 0, saves_1 = saves; _i < saves_1.length; _i++) {
            var save = saves_1[_i];
            _loop_6(save);
        }
    });
    function done() {
        uiMode = UI_MODE_NONE;
        saveLoadWindow.close();
    }
    function selected() {
        var item = saveList.getSelection();
        if (!item)
            return;
        var saveID = item.id;
        console.log("[UI] %s save #%d.", isSave ? "Saving" : "Loading", saveID);
        if (isSave) {
            var name_1 = prompt("Save Name?");
            if (saveID !== -1) {
                if (!confirm("Are you sure you want to overwrite that save slot?"))
                    return;
            }
            SaveLoad.save(name_1, saveID === -1 ? undefined : saveID, done);
        }
        else {
            SaveLoad.load(saveID);
            done();
        }
    }
}
