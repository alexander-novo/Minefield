var http = require("http");
var fs = require("fs");
var util = require("util");

var log_dir = process.env.OPENSHIFT_LOG_DIR || __dirname + "/logs";
checkLogFile();
var outStream = fs.createWriteStream(log_dir + "/out.log", {flags: 'a'});

console.log = function(d) { //Write all outputs to log file
  outStream.write(util.format(d) + '\n');
  process.stdout.write(util.format(d) + '\n');
};

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
	
	if(!file) {
		console.log("Could not find file/directory: " + url);
		response.writeHead(404);
		response.end();
		return;
	}

	response.writeHead(200, "OK");
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
	response.writeHead(100);

	request.on("data", function(chunk) {
		console.log("POST data: " + chunk.toString());
	});

	request.on('end', function() {
      console.log("POST end");
      response.writeHead(200, "OK", {
      	"content-type": "application/json"
      });
      response.end();
    });
}