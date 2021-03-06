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
    model_id: 'KNXShutter',
    uuid: "66790855-2AB7-4EB6-99C7-9DD2094F2F40",
    knx: {
        "up-down": {
            write: '1/2/0',
            read: '1/2/3'
        }, // 0/1
        "stop": {
            write: '1/2/1',
            read: '1/2/1'
        }, // 0/1
        "position": {
            write: '1/2/8',
            read: '1/2/4'
        }, // 0-255
        "fully-down": {
            write: null,
            read: '1/2/7'
        }, // 0/1
        "fully-up": {
            write: null,
            read: '1/2/6'
        }, // 0/1
        "direction": {
            write: null,
            read: '1/2/3'
        }, // 0/1
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

    thing.set(":open.true", null);
    thing.set(":open.false", null);
    thing.set(":open", 50);
});
