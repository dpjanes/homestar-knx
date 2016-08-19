/*
 *  KnxSwitch.js
 *
 *  David Janes
 *  IOTDB
 *  2015-12-05
 */

var iotdb = require("iotdb");

exports.binding = {
    bridge: require('../KNXBridge').Bridge,
    model: require('./knx-switch.json'),
    discover: false,
};
