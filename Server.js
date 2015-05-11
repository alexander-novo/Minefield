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

var DIFFICULTY = .2;



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

var mineDone = false;

var sockServ = io(httpServer);
sockServ.on("connection", function(sock) {
	var newUser = new User(sock);
	newUser.randomName(function() {
		console.log(newUser.name + " has connected.");

		sock.emit("register", {
			id: newUser.id,
			name: newUser.name
		});

		sock.emit("scoreChange", newUser.score);

		pushBoard(sock)
	});

	sock.on("mineClick", function(data) {
		if(cells[data.x] == null) cells[data.x] = [];
		if(cells[data.x][data.y] == null) cells[data.x][data.y] = new Cell(data.x, data.y);
		if(cells[data.x][data.y].revealed) sock.emit("cellChange", cells[data.x][data.y].getSendable());

		if(!mineDone) {
			for(var x = -1; x <= 1; x++) {
				for(var y = -1; y <= 1; y++) {
					if(cells[data.x + x] == null) cells[data.x + x] = [];
					cells[data.x + x][data.y + y] = new Cell(data.x + x, data.y + y, false);
				}
			}
			mineDone = true;
		}

		if(cells[data.x][data.y].mine) {
			cells[data.x][data.y].revealed = true;
			cells[data.x][data.y].correct = !data.click;
			sockServ.emit("cellChange", cells[data.x][data.y].getSendable());
			newUser.changeScore(data.click ? -50 : 10);
		} else {
			cells[data.x][data.y].revealed = data.click;
			cells[data.x][data.y].correct = data.click;
			newUser.changeScore(data.click ? 5 : -25);
			if(data.click) {
				sockServ.emit("cellChange", cells[data.x][data.y].getSendable());
				doMineSurroundCheck(cells[data.x][data.y]);
			}
		}
	});

	sock.on("disconnect", function() {
		console.log(newUser.name + " has disconnected.");
		users.splice(users.indexOf(newUser), 1);
	});

	sock.on("pullBoard", function(){pushBoard(sock)});
});

var cells = [];

function pushBoard(sock) {
	for(var row in cells) {
		for(var cell in cells[row]) {
			if(cells[row][cell].revealed) {
				sock.emit("cellChange", cells[row][cell].getSendable());
			}
		}
	}
}

function doMineSurroundCheck(cell) {
	if(!cell.mine) cell.revealed = true;
	sockServ.emit("cellChange", cell.getSendable());
	if(cell.minesAround() == 0) {
		for(var x = -1; x <= 1; x++) {
			for(var y = -1; y <= 1; y++) {
				if(cells[cell.x + x][cell.y + y].revealed) continue;
				doMineSurroundCheck(cells[cell.x + x][cell.y + y]);
			}
		}
	}
}

function updatePlaces() {
	var places = users.slice(0);
	places.sort(function(a, b) {
		return b.score - a.score;
	});
	for(var i = 0; i < places.length; i++) {
		places[i].place = i + 1;
		places[i].sendPlace();
	}
	if(places[0] != firstPlace) {
		firstPlace = places[0];
		sockServ.emit("firstPlace", firstPlace.name);
		console.log(firstPlace.name + " is now in the lead!");
	}
}

var contentTypes = {
	".html": "text/html",
	".css": "text/css",
	".js": "application/javascript"
};

function get(request, response) {
	var url = __dirname + request.url;
	var file = getSendableFileFrom(url);

	if(!file) {
		console.log("Could not find file/directory: " + url);
		response.writeHead(404);
		response.end();
		return;
	}

	var contentType = "text/plain";
	for(var type in contentTypes) {
		if(file.indexOf(type, file.length - type.length) !== -1) {
			contentType = contentTypes[type];
			break;
		}
	}

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

function Cell(x, y, mine, revealed, correct) {
	if(x == null || y == null) throw "X and Y must be non-null";
	if(mine == null) mine = Math.random() < DIFFICULTY;
	if(revealed == null) revealed = false;

	this.x = x;
	this.y = y;
	this.mine = mine;
	this.revealed = revealed;
	this.correct = correct;
}

Cell.prototype.getSendable = function() {
	return {
		value: this.minesAround(),
		correct: this.correct,
		x: this.x,
		y: this.y
	};
}

Cell.prototype.minesAround = function() {
	if(this.mine) return -1;

	var x = this.x;
	var y = this.y;

	var mines = 0;
	for(var i = -1; i <= 1; i++) {
		for(var j = -1; j <= 1; j++) {
			if(cells[x + i] == null) cells[x + i] = [];
			if(cells[x + i][y + j] == null) cells[x + i][y + j] = new Cell(x + i, y + j);
			if(cells[x + i][y + j].mine) mines++;
		}
	}
	return mines;
}

var users = [];
var firstPlace;

function User(socket, id, name) {
	this.sock = socket;
	this.id = id === undefined ? users.length : id;
	this.name = name === undefined ? "user" + (this.id + 1) : id;
	this.score = 0;

	users.push(this);
	updatePlaces();
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

User.prototype.changeScore = function(score) {
	this.score += score;
	this.sock.emit("scoreChange", this.score);
	updatePlaces();
}

User.prototype.sendPlace = function() {
	this.sock.emit("placeChange", this.place);
}

process.on('uncaughtException', function (err) {
	console.log('Caught exception: ' + err);
	console.log(err.stack);
});