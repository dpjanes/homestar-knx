/*
 *  KNXBridge.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-11-29
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
            port: 3671,
            tunnel: null,
            raw: false,     // pass GAs unchanged (debugging mainly)
            knx: {},        // trés important
        }
    );
    self.native = native; // the thing that does the work - keep this name

    if (self.initd.tunnel) {
        var turl = url.parse(self.initd.tunnel);
        self.initd.tunnel_host = turl.hostname;
        self.initd.tunnel_port = parseInt(turl.port);
    }

    if ((self.initd.tunnel_host === '') || (self.initd.tunnel_host === '0.0.0.0')) {
        self.initd.tunnel_host = _.ipv4();
    }

    if ((self.initd.host === '') || (self.initd.host === '0.0.0.0')) {
        self.initd.host = _.ipv4();
    }

    // preprocess knx (probably unnecessary for exemplars)
    self.knx_writed = {};
    self.knx_readd = {};

    if (!_.is.Empty(self.initd.knx)) {
        if (_.is.Dictionary(self.initd.knx)) {
            _.mapObject(self.initd.knx, function(coded, code) {
                coded = _.deepCopy(coded);
                coded.code = code;

                if (coded.write) {
                    self.knx_writed[coded.write] = coded;
                }
                if (coded.read) {
                    self.knx_readd[coded.read] = coded;
                }
            });
        }
    }

    if (self.native) {
        self.queue = _.queue("KNXBridge");
        self.scratchd = {};
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

    if (self.initd.host) {
        self._knx(function (error, native) {
            if (error) {
                logger.error({
                    method: "discover",
                    initd: self.initd,
                    error: _.error.message(error),
                }, "no way to connect to KNX");

                return;
            }

            self.discovered(new KNXBridge(self.initd, native));
        });
    } else {
        logger.error({
            method: "discover",
            initd: self.initd,
            cause: "host and port expected",
        }, "no way to connect to KNX");
    }
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
            data_in: function (paramd) {
                self._data_in(paramd);
            },
            data_out: function (paramd) {
                self._data_out(paramd);
            },
        }, self.connectd
    );

    self._setup_read();
    self.pull();
};

KNXBridge.prototype._data_in = function (paramd) {
    var self = this;

    if (self.initd.raw) {
        console.log("HERE:0");
        paramd.cookd = _.deepCopy(paramd.rawd);
    } else {
        console.log("HERE:A", paramd.rawd);
        _.mapObject(paramd.rawd, function(value, ga) {
            var coded = self.knx_readd[ga];
            console.log("HERE:B", value, ga, coded);
            if (!coded) {
                logger.debug({
                    method: "_data_read",
                    ga: ga,
                    value: value,
                    cause: "KNXBridge error maybe, or KNX itself has gone off the rails",
                }, "unknown GA received - somewhat ignorable error");
                return;
            }

            paramd.cookd[coded.code] = value;
        });
    }

    console.log("HERE:C", paramd.cookd);
};

KNXBridge.prototype._data_out = function (paramd) {
    var self = this;

    if (self.initd.raw) {
        paramd.rawd = _.deepCopy(paramd.cookd);
        return;
    }
};

KNXBridge.prototype._setup_read = function () {
    var self = this;

    var _on_change = function (address, data, datagram) {
        logger.debug({
            method: "_setup_read/on(status)",
            address: address,
            data: data,
            datagram: datagram,
        }, "got 'status'/'event'");

        var rawd = {};
        rawd[address] = data;
        var paramd = {
            rawd: rawd,
            cookd: {},
            scratchd: self.scratchd,
        };
        self.connectd.data_in(paramd);
        self.pulled(paramd.cookd);
    };

    self.native.on('status', function (address, data, datagram) {
        _on_change(address, data, datagram);
    });
    self.native.on('event', function (address, data, datagram) {
        _on_change(address, data, datagram);
    });

    self.connectd.subscribes.map(function (knx_address) {
        self.native.RequestStatus(knx_address);
    });

    _.mapObject(self.knx_readd, function(coded, ga) {
        self.native.RequestStatus(ga);
    });
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

    var paramd = {
        rawd: {},
        cookd: pushd,
        scratchd: self.scratchd,
    };
    self.connectd.data_out(paramd);

    _.mapObject(paramd.rawd, function (value, key) {
        self._send(key, value);
    });

    done(); // XXX - this needs to be counted per key
};

KNXBridge.prototype._send = function (key, value) {
    var self = this;

    var qitem = {
        run: function () {
            logger.info({
                method: "_send",
                key: key,
                value: value,
            }, "send");

            if (self.native) {
                self.native.Action(key, value);
            }
            self.queue.finished(qitem);
        },
        coda: function () {
            // done();
        },
    };
    self.queue.add(qitem);
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
 *  This returns a connection object per ( host, port, tunnel_host, tunnel_port )
 *  tuple, ensuring the correct connection object exists and is connected.
 *  It calls back with the connection object
 *
 *  The code is complicated because we have to keep callbacks stored 
 *  in '__pendingsd' until the connection is actually made
 */
KNXBridge.prototype._knx = function (callback) {
    var self = this;

    var key = [self.initd.host, "" + self.initd.port, self.initd.tunnel_host, "" + self.initd.tunnel_port].join("@@");


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
            logger.info({
                method: "_knx",
                npending: pendings.length,
                host: self.initd.host,
                port: self.initd.port,
                tunnel_host: self.initd.tunnel_host,
                tunnel_port: self.initd.tunnel_port
            }, "connecting to KNX");

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
            knx.Connect(function () {
                logger.info({
                    method: "_knx",
                    npending: pendings.length,
                    host: self.initd.host,
                    port: self.initd.port,
                    tunnel_host: self.initd.tunnel_host,
                    tunnel_port: self.initd.tunnel_port,
                    connected: knx.connected
                }, "connected to KNX! (?)");

                if (knx.connected) {
                    __knxd[key] = knx;

                    pendings.map(function (pending) {
                        pending(null, knx);
                    });
                } else {
                    var error = new Error("could not establish a connection");
                    pendings.map(function (pending) {
                        pending(error, null);
                    });
                }

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
