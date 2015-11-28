/*
 *  KNXBridge.js
 *
 *  David Janes
 *  IOTDB.org
 *  YYYY-MM-DD
 *
 *  Copyright [2013-2015] [David P. Janes]
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

"use strict";

var iotdb = require('iotdb');
var _ = iotdb._;
var bunyan = iotdb.bunyan;

var url = require('url');
var knx_js = require('knx.js');

var logger = bunyan.createLogger({
    name: 'homestar-knx',
    module: 'KNXBridge',
});

/*
    localIpAddress, 13671);
  var KnxConnectionTunneling = require('knx.js').KnxConnectionTunneling;
  var connection = new KnxConnectionTunneling('192.168.80.101', 3671, localIpAddress, 13671);
  */

/**
 *  See {iotdb.bridge.Bridge#Bridge} for documentation.
 *  <p>
 *  @param {object|undefined} native
 *  only used for instances, should be 
 */
var KNXBridge = function (initd, native) {
    var self = this;

    self.initd = _.defaults(initd,
        iotdb.keystore().get("bridges/KNXBridge/initd"), {
            host: null,
            ip: 3671,
            tunnel: null,
            poll: 30
        }
    );
    self.native = native;   // the thing that does the work - keep this name

    if (self.initd.tunnel) {
        var turl = url.parse(self.initd.tunnel);
        initd.tunnel_host = turl.hostname;
        initd.tunnel_port = parseInt(turl.port);
    }

    if ((initd.tunnel_host === '') || (initd.tunnel_host === '0.0.0.0')) {
        initd.tunnel_host = _.ipv4();
    }

    if ((initd.host === '') || (initd.host === '0.0.0.0')) {
        initd.host = _.ipv4();
    }

    console.log("HERE:!!!", self.initd);
    process.exit(0);

    if (self.native) {
        self.queue = _.queue("KNXBridge");
    }
};

KNXBridge.prototype = new iotdb.Bridge();

KNXBridge.prototype.name = function () {
    return "KNXBridge";
};

/* --- lifecycle --- */

/**
 *  See {iotdb.bridge.Bridge#discover} for documentation.
 */
KNXBridge.prototype.discover = function () {
    var self = this;

    logger.info({
        method: "discover"
    }, "called");

    /*
     *  This is the core bit of discovery. As you find new
     *  thimgs, make a new KNXBridge and call 'discovered'.
     *  The first argument should be self.initd, the second
     *  the thing that you do work with
     */
    var s = self._knx();
    s.on('something', function (native) {
        self.discovered(new KNXBridge(self.initd, native));
    });
};

/**
 *  See {iotdb.bridge.Bridge#connect} for documentation.
 */
KNXBridge.prototype.connect = function (connectd) {
    var self = this;
    if (!self.native) {
        return;
    }

    self._validate_connect(connectd);

    self.connectd = _.defaults(
        connectd, {
            subscribes: [],
        }, self.connectd
    );
    

    self._setup_polling();
    self.pull();
};

KNXBridge.prototype._setup_polling = function () {
    var self = this;
    if (!self.initd.poll) {
        return;
    }

    var timer = setInterval(function () {
        if (!self.native) {
            clearInterval(timer);
            return;
        }

        self.pull();
    }, self.initd.poll * 1000);
};

KNXBridge.prototype._forget = function () {
    var self = this;
    if (!self.native) {
        return;
    }

    logger.info({
        method: "_forget"
    }, "called");

    self.native = null;
    self.pulled();
};

/**
 *  See {iotdb.bridge.Bridge#disconnect} for documentation.
 */
KNXBridge.prototype.disconnect = function () {
    var self = this;
    if (!self.native || !self.native) {
        return;
    }

    self._forget();
};

/* --- data --- */

/**
 *  See {iotdb.bridge.Bridge#push} for documentation.
 */
KNXBridge.prototype.push = function (pushd, done) {
    var self = this;
    if (!self.native) {
        done(new Error("not connected"));
        return;
    }

    self._validate_push(pushd);

    logger.info({
        method: "push",
        pushd: pushd
    }, "push");

    var qitem = {
        // if you set "id", new pushes will unqueue old pushes with the same id
        // id: self.number, 
        run: function () {
            self._pushd(pushd);
            self.queue.finished(qitem);
        },
        code: function() {
            done();
        },
    };
    self.queue.add(qitem);
};

/**
 *  Do the work of pushing. If you don't need queueing
 *  consider just moving this up into push
 */
KNXBridge.prototype._push = function (pushd) {
    if (pushd.on !== undefined) {
    }
};

/**
 *  See {iotdb.bridge.Bridge#pull} for documentation.
 */
KNXBridge.prototype.pull = function () {
    var self = this;
    if (!self.native) {
        return;
    }
};

/* --- state --- */

/**
 *  See {iotdb.bridge.Bridge#meta} for documentation.
 */
KNXBridge.prototype.meta = function () {
    var self = this;
    if (!self.native) {
        return;
    }

    return {
        "iot:thing-id": _.id.thing_urn.unique("KNX", self.native.uuid, self.initd.number),
        "schema:name": self.native.name || "KNX",

        // "iot:thing-number": self.initd.number,
        // "iot:device-id": _.id.thing_urn.unique("KNX", self.native.uuid),
        // "schema:manufacturer": "",
        // "schema:model": "",
    };
};

/**
 *  See {iotdb.bridge.Bridge#reachable} for documentation.
 */
KNXBridge.prototype.reachable = function () {
    return this.native !== null;
};

/**
 *  See {iotdb.bridge.Bridge#configure} for documentation.
 */
KNXBridge.prototype.configure = function (app) {};

/* -- internals -- */
var __knxd = {};
var __pendingsd = {};

/**
 *  This returns a connection object per ( host, ip, tunnel_host, tunnel_port )
 *  tuple, ensuring the correct connection object exists and is connected.
 *  It calls back with the connection object
 *
 *  The code is complicated because we have to keep callbacks stored 
 *  in '__pendingsd' until the connection is actually made
 */
KNXBridge.prototype._knx = function (callback) {
    var self = this;

    var key = [ self.initd.host, "" + self.initd.port, self.initd.tunnel_host, "" + self.initd.tunnel_port ].join("@@");

    var knx = __knxd[key];
    if (knx === undefined) {
        var connect = false;

        var pendings = __pendingsd[key];
        if (pendings === undefined) {
            pendings = [];
            __pendingsd[key] = pendings;
            connect = true;
        }

        pendings.push(callback);

        if (connect) {
            if (self.initd.tunnel_host) {
                knx = new knx_js.KnxConnectionTunneling(
                    self.initd.host, self.initd.port, 
                    self.initd.tunnel_host, self.initd.tunnel_port
                );
            } else {
                knx = new knx_js.KnxConnection(
                    self.initd.host, self.initd.port
                );
            }

            // probably should be error checking here
            knx.Connect(function() {
                pendings.map(function(pending) {
                    pending(null, knx);
                });

                delete __pendingsd[key];
            });
        }
    } else {
        callback(null, knx);
    }
};

/*
 *  API
 */
exports.Bridge = KNXBridge;
