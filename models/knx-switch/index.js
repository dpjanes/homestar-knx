/*
 *  KnxSwitch.js
 *
 *  David Janes
 *  IOTDB
 *  2015-12-05
 */

exports.binding = {
    bridge: require('../../KNXBridge').Bridge,
    model: require('./model.json'),
    discover: false,
};
