var http = require("http");
var io = require("socket.io");
var fs = require("fs");
var util = require("util");

var log_dir = process.env.OPENSHIFT_LOG_DIR || __dirname + "/logs";
checkLogFile();
var outStream = fs.createWriteStream(log_dir + "/out.log", {flags: 'a'});

console.log = function(d) { //Write all outputs to log file
	var date = new Date();
	outStream.write(getFormattedDate(date) + " > ")
	outStream.write(util.format(d) + '\n');
	process.stdout.write(getFormattedDate(date) + " > ")
	process.stdout.write(util.format(d) + '\n');
};

function getFormattedDate(date) {
	var hours = date.getHours() < 9 ? "0" + (date.getHours() + 1) : (date.getHours() + 1);
	var minutes = date.getMinutes() < 9 ? "0" + (date.getMinutes() + 1) : (date.getMinutes() + 1);
	var seconds = date.getSeconds() < 9 ? "0" + (date.getSeconds() + 1) : (date.getSeconds() + 1);
	var month = date.getMonth() < 9 ? "0" + (date.getMonth() + 1) : (date.getMonth() + 1);
	var day = date.getDate() < 9 ? "0" + (date.getDate() + 1) : (date.getDate() + 1);
	return month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;
}

function checkLogFile() {
	try {
		if(!fs.statSync(log_dir).isDirectory()) {
			fs.mkdir(log_dir);
		}
	} catch(err) {
		fs.mkdir(log_dir);
	}

	try {
		fs.statSync(log_dir + "/out.log");
	} catch(err) {
		fs.writeFileSync(log_dir + "/out.log");
	}
}



var port = process.env.OPENSHIFT_NODEJS_PORT || 80;
var ip = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';

var httpServer = http.createServer(function(request, response) {
	switch(request.method) {
		case "GET":
			get(request, response);
			break;
		case "POST":
			break;
	}
}).listen(port, ip, function() {
	console.log("HTTP Listening on " + ip + ":" + port);
});

var sockServ = io(httpServer);
sockServ.on("connection", function(sock) {
	var newUser = new User();
	users.push(newUser);
	newUser.randomName(function() {
		console.log(newUser.name + " has connected.");

		sock.emit("register", {
			id: newUser.id,
			name: newUser.name
		});

		sock.emit("pushBoard", board);
	});

	sock.on("disconnect", function() {
		console.log(newUser.name + " has disconnected.");
		users.splice(users.indexOf(newUser), 1);
	});

	sock.on("pullBoard", sock.emit("pushBoard", board));
});

function get(request, response) {
	var url = __dirname + request.url;
	var file = getSendableFileFrom(url);

	if(!file) {
		console.log("Could not find file/directory: " + url);
		response.writeHead(404);
		response.end();
		return;
	}

	var contentType = file.indexOf(".html", file.length - ".html".length) === -1 ? "text/plain" : "text/html";
	response.writeHead(200, "OK", {
		"content-type": contentType
	});
	fs.createReadStream(file).pipe(response);
}

function getSendableFileFrom(url) {
	var stats;
	try {
		stats = fs.statSync(url);
	} catch(err) {
		return false;
	}

	if(stats.isDirectory()) {
		return getSendableFileFrom(url + "Index.html");
	} else {
		return url;
	}
}

var users = [];

function User(id, name) {
	if(id === undefined) id = users.length;
	if(name === undefined) name = "user" + (id + 1);

	this.id = id;
	this.score = 0;
	this.ttl = 20 * 60 * 1000; // 20 minutes session inactive time limit
	this.name = name;
}

User.prototype.randomName = function(callback) {
	var self = this;

	var options = {
		hostname: "api.randomuser.me",
		path: "/"
	}

	var nameReq = http.request(options, function(res) {
		res.setEncoding("utf8");
		res.on("data", function(chunk) {
			self.name = JSON.parse(chunk).results[0].user.username;
			callback();
		});
	});

	nameReq.on("err", function(err) {
		console.log(err.message);
	});

	nameReq.end();
}

process.on('uncaughtException', function (err) {
	console.log('Caught exception: ' + err);
	console.log(err.stack);
});