﻿'use strict';

const Device = require("./device");
const events = require("libs/events");

class SwitchDevice extends Device {

    constructor(id, device) {
        super(id, device);      

        this.last_switch_time = 0;
        this.last_switch_type = 0;

        console.log("creating a switch device");
    }

    on_device_active() {
        super.on_device_active();
        events.emit(events.TYPES.ONIOTCMD, "toggle", { remote64: this.id });
    }

}

module.exports = SwitchDevice;