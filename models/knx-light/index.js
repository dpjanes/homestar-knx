/*
 *  KnxLight.js
 *
 *  David Janes
 *  IOTDB
 *  2015-11-30
 */

exports.binding = {
    bridge: require('../../KNXBridge').Bridge,
    model: require('./model.json'),
    discover: false,
};
