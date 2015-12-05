# homestar-knx
IOTDB / HomeStar Controller for KNX

<img src="https://github.com/dpjanes/iotdb-homestar/blob/master/docs/HomeStar.png" align="right" />

# Installation

Install Home☆Star first. 
See: https://github.com/dpjanes/iotdb-homestar#installation

    $ homestar install homestar-knx

It should be configured. 
This project is based on [KNX.js](https://www.npmjs.com/package/knx.js), 
so these settings will make more sense in that context

    homestar set "/bridges/KNXBridge/initd/host" '192.168.80.101'
    homestar set "/bridges/KNXBridge/initd/port" 3671
    homestar set "/bridges/KNXBridge/initd/tunnel" "udp://0.0.0.0:13671"

If you don't want to configure it your can pass in "host", "port" and "tunnel" when 
you initialize your Things.

# Models

See the **[samples](https://github.com/dpjanes/homestar-knx/tree/master/samples)** folder for examples on how to configure these 
with your GA.

## KnxDimmer

Light at 50% brightness

    {
        "on": true,
        "brightness": 50
    }

## KnxLight

Light is on

    {
        "on": true
    }

## KnxShutter

Fully open shutter

    {
        "open": 100,
    }

Fully closed shutter

    {
        "open": 0
    }

## KnxSwitch

    {
        "on": true
    }

## KnxValueBoolean

    {
        "value": true
    }

## KnxValueInteger

    {
        "value": 255
    }
