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
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';


var program = require('commander');
var path = require('path');
var fs = require('fs');
var crypto = require('crypto');
var levelup = require('levelup');
var async = require('async');
var util = require('util');
var assert = require('assert');
var logger = require("./libs/logger");
var AppRunner = require("./modules");
var db = require("./libs/database");
var config = require('libs/config');
var utils = require("libs/utils");
var Account = require("libs/account");
var Tasks = require("libs/tasks");
var events = require("libs/events");

// initialize the logger
function initialize_logger(callback) {
    var wdir = process.cwd();
    var logspath = path.join(wdir, config.log.logs_dir || "logs");
    var loglevel = config.log && config.log.level ? config.log.level : "debug";
    logger.init(loglevel, logspath, null, callback);
}

module.exports = exports = function (port, ip, password) {
    try {
        async.waterfall(
            [
                function (callback) {
                    try {
                        config.init(port, ip, password, callback);
                    }
                    catch (e) {
                        callback(e);
                    }
                },
                function (callback) {
                    try {
                        console.log("config initialized port: " + config.port + ", host: " + config.host)
                        initialize_logger(callback);
                    }
                    catch (e) {
                        callback(e);
                    }
                },
                function (callback) {
                    try {
                        db.init_databases(__dirname, callback);
                    }
                    catch (e) {
                        callback(e);
                    }
                },
                function (callback) {
                    try {
                        var tasks = new Tasks();
                        tasks.run(callback);
                    }
                    catch (e) {
                        callback(e);
                    }
                },
                function (callback) {
                    try {
                        var apprunner = new AppRunner();
                        apprunner.run(callback);
                    }
                    catch (e) {
                        callback(e);
                    }
                }
            ],
            function (err) {
                if (err) {
                    return logger.error("application init error: %j", err);
                }

                logger.info("The application has been initialized.");

                // app init event
                events.appinit();
            }
        );
    }
    catch (e) {
        console.log("app error: " + e.message);
    }
};

module.exports.display_data = function () {

    async.waterfall(
        [
            function (callback) {
                config.init_password(callback);
            },
            function (callback) {
                if (!config.password) {
                    return callback("Invalid password");
                }

                db.init_databases(__dirname, callback);
            },
            function (callback) {
                var account = new Account();
                account.load(config.password, callback);
            }
        ],
        function (err, result) {
            if (err) {
                return console.log(err.message || err);
            }

            var account = new Account();
            //print the node ID
            console.log("node ID: %s", account.accountid);
            console.log("publickey hex: %s", account.public_key);
            console.log("publickey encoded hash: %s", account.public_key_hash);
            console.log("publickey bs58pk: %s", account.bs58pk);
        }
    ); 

}

module.exports.changepwd = function() {
    console.log("app change password");
}

module.exports.backup = function() {
    console.log("app backup account data");

    async.waterfall(
        [
            function (callback) {
                config.init_password(callback);
            },
            function (callback) {
                if (!config.password) {
                    return callback("Invalid password");
                }

                db.init_databases(__dirname, callback);
            },
            function (callback) {
                var account = new Account();
                account.load(config.password, function (err) {
                    if (err) {
                        return callback(err);
                    }

                    var data = {
                        nodeid: account.accountid,
                        pkhex: account.public_key,
                        encoded_pkhash: account.public_key_hash,
                        bs58pk: account.bs58pk,
                        private_key: account.private_key_hex
                    };

                    callback(null, data);
                });
            },
            function (data, callback) {
                try {
                    // write to file
                    data.timestamp = Date.now();
                    var str = JSON.stringify(data, null, 4);  
                    var wdir = process.cwd();
                    var datadir = path.join(wdir, 'data');
                    var backupfile = path.join(datadir, 'account.json');
                    fs.writeFile(backupfile, str, function (err) {
                        if (err) {
                            return callback(err);
                        }

                        callback();
                    });

                }
                catch (err) {
                    callback(err);
                }
            }
        ],
        function (err) {
            if (err) {
                return console.log("Error: %j", err.message || err);
            }

            console.log("Backup file account.json was created in the data directory",);
        }
    ); 
}
