/*
 *  KnxLight.js
 *
 *  David Janes
 *  IOTDB
 *  2015-11-30
 */

var iotdb = require("iotdb");

exports.binding = {
    bridge: require('../KNXBridge').Bridge,
    model: require('./knx-light.json'),
    discover: false,
};
