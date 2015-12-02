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
            var max = 255;  // this should be soft

            if (paramd.cookd.position !== undefined) {
                cookd.position = Math.round(paramd.cookd.position * 255 / 100);
            } else if (paramd.cookd.open !== undefined) {
                cookd.position = max;
            } else if (paramd.cookd.close !== undefined) {
                cookd.position = 0;
            }

            return cookd;
        },
    },
};
