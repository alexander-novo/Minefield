//File exists only due to cartridge requirements
//Cartridge always starts with start.js, doesn't read package.json
var spawn = require('child_process').spawn;
spawn('nohup', ['node', 'Server.js']);