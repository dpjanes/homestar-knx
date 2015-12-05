/*
 *  KnxShutterRaw.js
 *
 *  David Janes
 *  IOTDB
 *  2015-12-02
 */

var iotdb = require("iotdb");

exports.binding = {
    bridge: require('../KNXBridge').Bridge,
    model: require('./KnxShutterRaw.json'),
    discover: false,
};
