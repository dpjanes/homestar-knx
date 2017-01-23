/*
 *  KnxDimmer.js
 *
 *  David Janes
 *  IOTDB
 *  2015-12-05
 */

exports.binding = {
    bridge: require('../../KNXBridge').Bridge,
    model: require('./model.json'),
    discover: false,
    connectd: {
        pre_out: function (paramd) {
            var cookd = {};
            var max = 255; // this should be soft

            if (paramd.cookd.brightness !== undefined) {
                cookd.brightness = Math.round(paramd.cookd.brightness * max / 100);
                if (cookd.brightness > 0) {
                    cookd.on = true;
                } else {
                    cookd.on = false;
                }
            } else if (paramd.cookd.on !== undefined) {
                cookd.on = paramd.cookd.on;
                cookd.brightness = paramd.cookd.on ? max : 0;
            }

            return cookd;
        },
        post_in: function (paramd) {
            var cookd = {};
            var max = 255; // this should be soft

            if (paramd.cookd.brightness !== undefined) {
                cookd.brightness = (parseInt(paramd.cookd.brightness) * 100 / max);
            }
            if (paramd.cookd.on !== undefined) {
                cookd.on = paramd.cookd.on;
            }

            return cookd;
        },
    },
};
