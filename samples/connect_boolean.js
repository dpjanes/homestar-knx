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
});
exemplar.discovered = function (bridge) {
    console.log("+", "got one", bridge.meta());
    bridge.pulled = function (state) {
        console.log("+", "state-change", state);
    };
    bridge.connect({
        subscribes: ['3/0/1'],
    })
    bridge.push({
        // off: true,
    });
};
exemplar.discover();
