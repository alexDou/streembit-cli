﻿/*
 
This file is part of Streembit application. 
Streembit is an open source project to create a real time communication system for humans and machines. 

Streembit is a free software: you can redistribute it and/or modify it under the terms of the GNU General Public License 
as published by the Free Software Foundation, either version 3.0 of the License, or (at your option) any later version.

Streembit is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of 
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Streembit software.  
If not, see http://www.gnu.org/licenses/.
 
-------------------------------------------------------------------------------------------------------------------------
Author: Tibor Zsolt Pardi 
Copyright (C) 2017 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/


'use strict';


const constants = require("libs/constants");
const Device = require("libs/iot/device/device");
const events = require("libs/events");
const logger = require("libs/logger");
const iotdefinitions = require("libs/iot/definitions");

let m_address64;
let m_address16;
let m_endpoint;

class ZigbeeGateway extends Device {

    constructor(id, device, cmdbuilder, transport) {
        try {
            super(id, device, cmdbuilder, transport);
            m_endpoint = (this.details && this.details.endpoint) ? this.details.endpoint : 0;

            // joined device list, stores devices which issued a ZDO 0x0013 device announce
            this.joined_devices = [];

            logger.debug("Initialized ZigbeeGateway device id: " + id);            
        }
        catch (err) {
            throw new Error("ZigbeeGateway constructor error: " + err.message);
        }
    }

    static get address64() {
        return m_address64;
    }

    static get address16() {
        return m_address16;
    }

    static get endpoint() {
        return m_endpoint;
    }

    create_event_handlers() {
        super.create_event_handlers();      
    }

    on_data_received(payload) {
        try {
            if (payload.type == iotdefinitions.EVENT_DEVICE_ONLINE) {
                this.active = true;
                var properties = payload.devicedetails;
                if (properties && Array.isArray(properties) && properties.length) {
                    this.set_property_item(properties);
                    properties.forEach(
                        (item) => {
                            if (item.hasOwnProperty("name") && item.hasOwnProperty("value")) {
                                if (item.name == "address64") {
                                    m_address64 = item.value;
                                    logger.debug("ZigbeeGatewayDevice address64: " + m_address64)
                                }
                                else if (item.name == "address16") {
                                    m_address16 = item.value;
                                    logger.debug("ZigbeeGatewayDevice address16: " + m_address16)
                                }
                            }
                        }
                    );
                }
            }
            else if (payload.type == iotdefinitions.EVENT_DEVICE_ANNOUNCE) {
                var joined = false;
                this.joined_devices.forEach(
                    (device) => {
                        if (device.ieeeaddress == payload.ieeeaddress) {
                            joined = true;
                        }
                    }
                );

                if (!joined) {
                    var device = {
                        "type": constants.IOT_DEVICE_ENDDEVICE,
                        "ieeeaddress": payload.ieeeaddress,
                        "nwkaddress": payload.nwkaddress,
                        "mcu": payload.mcu,
                        "isjoinpermitted": false
                    }
                    this.joined_devices.push(device);
                    logger.debug("Device joined: " + device.ieeeaddress);
                }
            }
        }
        catch (err) {
            logger.error("ZigbeeGateway on_data_received() error: %j", err);
        }
    }

}

module.exports = ZigbeeGateway;