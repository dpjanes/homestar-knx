/*
 *  KNXShutter.js
 *
 *  David Janes
 *  IOTDB
 *  2015-11-30
 */

var iotdb = require("iotdb");

exports.binding = {
    bridge: require('../KNXBridge').Bridge,
    model: require('./KnxShutter.json'),
    connectd: {
        pre_out: function (paramd) {
            var cookd = {};

            if (paramd.cookd.position !== undefined) {
                cookd.position = paramd.cookd.position;
            } else if (paramd.cookd.open !== undefined) {
                cookd.position = 100;
            } else if (paramd.cookd.close !== undefined) {
                cookd.position = 0;
            }

            return cookd;
        },
    },
};
