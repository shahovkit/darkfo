"use strict";
var Events;
(function (Events) {
    var handlers = {};
    function on(msgType, handler) {
        if (msgType in handlers)
            handlers[msgType].push(handler);
        else
            handlers[msgType] = [handler];
    }
    Events.on = on;
    function emit(msgType, msg) {
        if (msgType in handlers) {
            for (var _i = 0, _a = handlers[msgType]; _i < _a.length; _i++) {
                var handler = _a[_i];
                handler(msg);
            }
        }
    }
    Events.emit = emit;
})(Events || (Events = {}));
