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
    model: 'KNXDimmer',
    uuid: "F55F1885-367A-4281-A8C6-2CEFF2E60E03",
    knx: {
        "on": {
            "write": "7/0/0",
            "read": "7/0/1",
        },
        "brightness": {
            "write": "7/0/3",
            "read": "7/0/3",
        },
    },
});
things.on("state", function (thing) {
    console.log("+", "state", thing.thing_id(), "\n ", thing.state("istate"));
});
things.on("meta", function (thing) {
    console.log("+", "meta", thing.thing_id(), "\n ", thing.state("meta"));
});
things.on("thing", function (thing) {
    console.log("+", "discovered", thing.thing_id(), "\n ", thing.state("meta"));

    var count = 0;
    setInterval(function () {
        thing.set(':brightness', count % 100);
        count += 10;
    }, 1000);
});
