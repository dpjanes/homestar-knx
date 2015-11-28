/*
 *  NOTE: prefer iotdb versions
 *
 *  This will:
 */

"use strict";

var Bridge = require('../KNXBridge').Bridge;

var exemplar = new Bridge({
    host: '192.168.80.101',
    ip: '3671',
    tunnel: "udp://0.0.0.0:13671",
});
exemplar.discovered = function (bridge) {
    console.log("+", "got one", bridge.meta());
    bridge.pulled = function (state) {
        console.log("+", "state-change", state);
    };
    bridge.connect({});
    bridge.push({
        // off: true,
    });
};
exemplar.discover();
