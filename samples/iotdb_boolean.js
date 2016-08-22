/*
 *  How to use this module in IOTDB / HomeStar
 *  This is the best way to do this
 *  Note: 
 *  - to work, this package must have been installed by 'homestar install' 
 *  - use 'uuidgen' to create unique IDs for your things
 */

"use strict";

var iotdb = require('iotdb');

var things = iotdb.connect({
    model_id: 'KNXValueBoolean',
    uuid: "207BE1C3-B55B-40FE-8DA3-843E4311D67C",
    knx: {
        "value": {
            "write": "3/0/0",
            "read": "3/0/1",
        },
    },
});
things.on("istate", function (thing) {
    console.log("+", "istate", thing.thing_id(), "\n ", thing.state("istate"));
});
things.on("meta", function (thing) {
    console.log("+", "meta", thing.thing_id(), "\n ", thing.state("meta"));
});
things.on("thing", function (thing) {
    console.log("+", "discovered", thing.thing_id(), "\n ", thing.state("meta"));

    var count = 0;
    setInterval(function () {
        thing.set(':value', count++ % 2);
    }, 2500);
});
