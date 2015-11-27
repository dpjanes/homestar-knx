/*
 *  KNXBoolean.js
 *
 *  David Janes
 *  IOTDB
 *  YYYY-MM-DD
 */

var iotdb = require("iotdb");

exports.Model = iotdb.make_model('KNXBoolean')
    .io("value", iotdb.boolean.value)
    .make();

exports.binding = {
    bridge: require('../KNXBridge').Bridge,
    model: exports.Model,
};
