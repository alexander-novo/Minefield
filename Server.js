var http = require("http");
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

console.log("test");

function getFormattedDate(date) {
	var hours = date.getHours() < 9 ? "0" + (date.getHours() + 1) : (date.getHours() + 1);
	var minutes = date.getMinutes() < 9 ? "0" + (date.getMinutes() + 1) : (date.getMinutes() + 1);
	var seconds = date.getSeconds() < 9 ? "0" + (date.getSeconds() + 1) : (date.getSeconds() + 1);
	var month = date.getMonth() < 9 ? "0" + (date.getMonth() + 1) : (date.getMonth() + 1);
	var day = date.getDate() < 9 ? "0" + (date.getDate() + 1) : (date.getDate() + 1);
	return month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;
}

var server = http.createServer(function(request, response) {
	console.log(request.method + ": " + request.url);
	switch(request.method) {
		case "GET":
			get(request, response);
			break;
		case "POST":
			post(request, response);
			break;
	}
});

var port = process.env.OPENSHIFT_NODEJS_PORT || 80;
var ip = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';

server.listen(port, ip, function() {
	console.log("Listening on " + ip + ":" + port);
});

process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err);
  console.log(err.stack);
});

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

function get(request, response) {
	var url = __dirname + request.url;
	var file = getSendableFileFrom(url);

	console.log(request.headers);
	console.log("");
	
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

function post(request, response) {
	var data = [];

	request.on("data", function(chunk) {
		console.log("POST data: " + chunk.toString());
		data.push(JSON.parse(chunk.toString()))
	});

	request.on('end', function() {
      console.log("POST end");
      response.writeHead(200, "OK", {
      	"content-type": "application/json"
      });
      for(var json of data) {
      	switch(json.json.messageType) {
      		case "register":
      			users.push(new User(users.length));
      			response.write(JSON.stringify({
      				json: {
      					messageType: "register",
      					data: {
      						id: (users.length - 1)
      					}
      				}
      			}));
      			break;
      	}
      }
      response.end();
    });
}

var users = [];

function User(id) {
	this.id = id;
	this.score = 0;
}