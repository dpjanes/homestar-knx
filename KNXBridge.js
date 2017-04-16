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

const iotdb = require('iotdb');
const _ = iotdb._;

const url = require('url');
const knx_js = require('knx');
const DPTLib = require('knx/src/dptlib');
const logger = iotdb.logger({
    name: 'homestar-knx',
    module: 'KNXBridge',
});


const parseGA = function(GA){
    let valueObj = GA.split(";dpt=");
    
    if(!valueObj[1]){
      valueObj[1] = '1.001';
    }

    return {
      ga: valueObj[0],
      dpt: valueObj[1]
    }
}

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
const KNXBridge = function (initd, native) {
    const self = this;

    self.initd = _.defaults(initd,
        iotdb.keystore().get("bridges/KNXBridge/initd"), {
            host: null,
            port: 3671,
            tunnel: null,
            raw: false, // pass GAs unchanged (debugging mainly)
            uuid: null, // seed for the Thing-ID
            number: 0, // can be used to share a single UUID
            knx: {}, // trés important
        }
    );
    self.native = native; // the thing that does the work - keep this name

    if (self.initd.tunnel) {
        const turl = url.parse(self.initd.tunnel);
        self.initd.tunnel_host = turl.hostname;
        self.initd.tunnel_port = parseInt(turl.port);
    }

    if ((self.initd.tunnel_host === '') || (self.initd.tunnel_host === '0.0.0.0')) {
        self.initd.tunnel_host = _.net.ipv4();
    }

    if ((self.initd.host === '') || (self.initd.host === '0.0.0.0')) {
        self.initd.host = _.net.ipv4();
    }

    // preprocess knx (probably unnecessary for exemplars)
    self.knx_writed = {};
    self.knx_readd = {};

    if (!_.is.Empty(self.initd.knx)) {
        if (_.is.Dictionary(self.initd.knx)) {
            _.mapObject(self.initd.knx, function (coded, code) {
                coded = _.d.clone.deep(coded);
                coded.code = code;

                if (coded.write) {
                    self.knx_writed[code] = coded;
                }
                if (coded.read) {
                    self.knx_readd[parseGA(coded.read).ga] = coded;
                }
            });
        }
    }

    if (self.native) {
        self.queue = _.queue("KNXBridge");
        self.scratchd = {};

        if (!self.initd.uuid) {
            logger.error({
                method: "KNXBridge",
                initd: self.initd,
                cause: "caller should initialize with an 'uuid', used to uniquely identify things over sessions",
            }, "missing initd.uuid - problematic");
        }
    }
};

KNXBridge.prototype = new iotdb.Bridge();

/* --- lifecycle --- */

/**
 *  See {iotdb.bridge.Bridge#discover} for documentation.
 */
KNXBridge.prototype.discover = function () {
    const self = this;

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
    const self = this;
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
            post_in: function (paramd) {
                return paramd.cookd;
            },
            pre_out: function (paramd) {
                return paramd.cookd;
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
    const self = this;
    if (self.initd.raw) {
        paramd.cookd = _.d.clone.deep(paramd.rawd);
    } else {
        _.mapObject(paramd.rawd, function (value, knx_ga) {
            // it's OK - data can come that we don't know about
            const coded = self.knx_readd[knx_ga];
            if (!coded) {
                return;
            }

            paramd.cookd[coded.code] = value;
        });
    }
};

KNXBridge.prototype._data_out = function (paramd) {
    const self = this;

    if (self.initd.raw) {
        paramd.rawd = _.d.clone.deep(paramd.cookd);
    } else {
        _.mapObject(paramd.cookd, function (value, code) {
            const coded = self.knx_writed[code];
            if (!coded) {
                return;
            }

            paramd.rawd[coded.write] = value;
        });
    }
};



KNXBridge.prototype._setup_read = function () {
    const self = this;

    // knx_ga, data, datagram
    const _on_change = function (src, dest, value) {
        if (!self.knx_readd[dest]) {
            return;
        }

        value = DPTLib.fromBuffer(value, parseGA(self.knx_readd[dest].read).dpt);
        logger.info({
            method: "_setup_read/on(status)",
            knx_ga: dest,
            data: value
        }, "got 'status'/'event'");

        const rawd = {};
        rawd[dest] = value;

        const paramd = {
            rawd: rawd,
            cookd: {},
            scratchd: self.scratchd,
        };
        self.connectd.data_in(paramd);

        const cookd = self.connectd.post_in(paramd);
        if (cookd !== undefined) {
            paramd.cookd = cookd;
        }

        paramd.cookd['@__validate'] = true;
        self.pulled(paramd.cookd);
    };


    //if(!self.native.eventAttached){
      //self.native.eventAttached = true;
      self.native.on('event', function (evt, src, dest, value) {
        //console.log('ON EVENT', evt)
          _on_change(src, dest, value);
      });
    //}


    self.connectd.subscribes.map(function (knx_ga) {
        logger.info({
            method: "_setup_read",
            knx_ga: knx_ga,
        }, "subscribe to GA (connectd.subscribes)");
        self.native.read(knx_ga);
    });

    _.mapObject(self.knx_readd, function (coded, knx_ga) {
        logger.info({
            method: "_setup_read",
            knx_ga: knx_ga,
        }, "subscribe to GA (knx_readd)");
        self.native.read(knx_ga);
    });
};

KNXBridge.prototype._forget = function () {
    const self = this;
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
    const self = this;
    if (!self.native) {
        return;
    }

    self._forget();
};

/* --- data --- */

/**
 *  See {iotdb.bridge.Bridge#push} for documentation.
 */
KNXBridge.prototype.push = function (pushd, done) {
    const self = this;
    if (!self.native) {
        done(new Error("not connected"));
        return;
    }

    self._validate_push(pushd, done);

    logger.info({
        method: "push",
        pushd: pushd
    }, "push");

    const paramd = {
        rawd: {},
        cookd: pushd,
        scratchd: self.scratchd,
    };

    const cookd = self.connectd.pre_out(paramd);
    if (cookd !== undefined) {
        paramd.cookd = cookd;
    }

    self.connectd.data_out(paramd);

    _.mapObject(paramd.rawd, function (value, key) {
        self._send(key, value);
    });

    done(); // XXX - this needs to be counted per key
};

KNXBridge.prototype._send = function (key, value) {
    const self = this;
    if(typeof value == 'boolean'){
      value = value?1:0;
    }

    const knxItem = parseGA(key);

    const qitem = {
        run: () => {
            logger.info({
                method: "_send",
                key: key,
                value: value,
            }, "send");

            if (self.native) {
                self.native.write(knxItem.ga, value, knxItem.dpt);
            }
            self.queue.finished(qitem);
        },
        coda: () => {
        },
    };
    self.queue.add(qitem);
};

/**
 *  See {iotdb.bridge.Bridge#pull} for documentation.
 */
KNXBridge.prototype.pull = function () {
    const self = this;
    if (!self.native) {
        return;
    }
};

/* --- state --- */

/**
 *  See {iotdb.bridge.Bridge#meta} for documentation.
 */
KNXBridge.prototype.meta = function () {
    const self = this;
    if (!self.native) {
        return;
    }

    return {
        "iot:thing-id": _.id.thing_urn.unique("KNX", self.initd.uuid, self.initd.number),
        "iot:device-id": _.id.thing_urn.unique("KNX", self.initd.uuid),
        "schema:name": self.native.name || "KNX",

        // "iot:thing-number": self.initd.number,
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

/**
 *  See {iotdb.bridge.Bridge#reset} for documentation.
 */
KNXBridge.prototype.reset = function () {
    __knxd = {};
    __pendingsd = {};
};

/* -- internals -- */
let __knxd = {};
let __pendingsd = {};

/**
 *  This returns a connection object per ( host, port, tunnel_host, tunnel_port )
 *  tuple, ensuring the correct connection object exists and is connected.
 *  It calls back with the connection object
 *
 *  The code is complicated because we have to keep callbacks stored
 *  in '__pendingsd' until the connection is actually made
 */
KNXBridge.prototype._knx = function (callback) {
    const self = this;

    const key = [self.initd.host, "" + self.initd.port, self.initd.tunnel_host, "" + self.initd.tunnel_port].join("@@");

    let knx = __knxd[key];
    if (knx === undefined) {
        let connect = false;

        let pendings = __pendingsd[key];
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
            knx = new knx_js.Connection(
              {
                ipAddr: self.initd.host, // ip address of the KNX router or interface
                ipPort: self.initd.port, // the UDP port of the router or interface
                physAddr: '15.15.15', // the KNX physical address we want to use
                debug: false, // print lots of debug output to the console
                manualConnect: false, // do not automatically connect, but use connection.Connect() to establish connection
                minimumDelay: 10, // wait at least 10 millisec between each datagram
                handlers: {
                  // wait for connection establishment before doing anything
                  connected: function() {
                    logger.info({
                        method: "_knx",
                        npending: pendings.length,
                        host: self.initd.host,
                        port: self.initd.port,
                        tunnel_host: self.initd.tunnel_host,
                        tunnel_port: self.initd.tunnel_port,
                        connected: true
                    }, "connected to KNX! (?)");
                    __knxd[key] = knx;

                    pendings.map(function (pending) {
                        pending(null, knx);
                    });

                    delete __pendingsd[key];
                  },

                  // get notified on connection errors
                  error: function(connstatus) {
                    console.log("**** ERROR: %j", connstatus);
                  }
                }
              }
            )
        }
    } else {
        callback(null, knx);
    }
};

/*
 *  API
 */
exports.Bridge = KNXBridge;
