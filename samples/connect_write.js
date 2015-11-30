/*
 *  NOTE: prefer iotdb versions
 *
 *  This will:
 */

"use strict";

var Bridge = require('../KNXBridge').Bridge;

var exemplar = new Bridge({
    // -- see ./README.md --
    // host: '192.168.80.101',
    // port: 3671,
    // tunnel: "udp://0.0.0.0:13671",
    raw: true, // allow GA addressing without model
    uuid: "779C4E4F-9CF5-489F-83AB-2A934B27B2B3",
});
exemplar.discovered = function (bridge) {
    console.log("+", "got one", bridge.meta());
    bridge.pulled = function (state) {
        console.log("+", "state-change", state);
    };
    bridge.push({
        '3/0/0': true,
    });
};
exemplar.discover();
