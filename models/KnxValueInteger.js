/*
 *  KnxValueInteger.js
 *
 *  David Janes
 *  IOTDB
 *  2015-11-29
 */

var iotdb = require("iotdb");

exports.Model = iotdb.make_model('KnxValueInteger')
    .io("value", iotdb.integer.value)
    .make();

exports.binding = {
    bridge: require('../KNXBridge').Bridge,
    model: exports.Model,
    discover: false,
};
