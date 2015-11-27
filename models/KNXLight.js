/*
 *  KNXLight.js
 *
 *  David Janes
 *  IOTDB
 *  YYYY-MM-DD
 */

var iotdb = require("iotdb");

exports.Model = iotdb.make_model('KNXLight')
    .facet(":lighting")
    .name("KNX Light")
    .io("on", iotdb.boolean.on)
    .make();

exports.binding = {
    bridge: require('../KNXBridge').Bridge,
    model: exports.Model,
};
