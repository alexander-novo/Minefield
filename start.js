//File exists only due to cartridge requirements
//Cartridge always starts with start.js, doesn't read package.json
var spawn = require('child_process').spawn,
	server = spawn('nohup', ['node', 'Server.js']);

server.on("close", function(code) {
	process.exit(code);
});

process.on("exit", function(code) {
	server.kill();
});