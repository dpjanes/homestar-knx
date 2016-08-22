# homestar-knx
[IOTDB](https://github.com/dpjanes/node-iotdb) bridge for KNX, the  OSI-based network communications protocol for intelligent buildings.

<img src="https://raw.githubusercontent.com/dpjanes/iotdb-homestar/master/docs/HomeStar.png" align="right" />

# About

See: 
* https://en.wikipedia.org/wiki/KNX\_(standard)
* http://www.knx.org/knx-en/index.php

# Installation and Configuration

* [Read this first](https://github.com/dpjanes/node-iotdb/blob/master/docs/install.md)
* [Read about installing Home☆Star](https://github.com/dpjanes/node-iotdb/blob/master/docs/homestar.md) 

    $ npm install -g homestar    ## may require sudo
    $ homestar setup
    $ npm install homestar-knx

This project is based on [KNX.js](https://www.npmjs.com/package/knx.js).
Apply these settings, substituting what is appropriate for your environment.

    homestar set "/bridges/KNXBridge/initd/host" '192.168.80.101'
    homestar set "/bridges/KNXBridge/initd/port" 3671
    homestar set "/bridges/KNXBridge/initd/tunnel" "udp://0.0.0.0:13671"

If you don't want to configure it your can pass in "host", "port" and "tunnel" when 
you initialize your Things.

# Models

See the **[samples](https://github.com/dpjanes/homestar-knx/tree/master/samples)** folder for examples on how to configure these 
with your GA.

## [KnxDimmer](https://github.com/dpjanes/homestar-knx/blob/master/models/KnxDimmer.iotql)

Light at 50% brightness

    {
        "on": true,
        "brightness": 50
    }

## [KnxLight](https://github.com/dpjanes/homestar-knx/blob/master/models/KnxLight.iotql)

Light is on

    {
        "on": true
    }

## [KnxShutter](https://github.com/dpjanes/homestar-knx/blob/master/models/KnxShutter.iotql)

Fully open shutter

    {
        "open": 100,
    }

Fully closed shutter

    {
        "open": 0
    }

## [KnxSwitch](https://github.com/dpjanes/homestar-knx/blob/master/models/KnxSwitch.iotql)

    {
        "on": true
    }

## [KnxValueBoolean](https://github.com/dpjanes/homestar-knx/blob/master/models/KnxValueBoolean.iotql)

    {
        "value": true
    }

## [KnxValueInteger](https://github.com/dpjanes/homestar-knx/blob/master/models/KnxValueInteger.iotql)

    {
        "value": 255
    }
