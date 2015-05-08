var canvas;
var cells = []; //Two-dimensional array created later
var fullscreen = false;
var mousePos;
var offsetX = 0;
var offsetY = 0;

var CELL_SIZE = 20;

var userid;
var name;
var score;
var place;

var mine = new Image();
mine.src = "/Game/Minesweeper_Icon.png";
var flag = new Image();
flag.src = "/Game/Flag.png";

var socket = io();

var mine_colors = {
	1: "#00FF00",
	2: "#00C000",
	3: "#008100",
	4: "#004200",
	5: "#000300",
	6: "#3C0000",
	7: "#7B0000",
	8: "#BA0000",
	9: "#FF0000"
};

function initMinefield(can, fscreen) {
	canvas = can.getContext("2d");
	fullscreen = fscreen;

	if(fullscreen) {
		document.documentElement.style.overflow = 'hidden';
		document.body.scroll = "no";
	}

	document.onmousemove = onMouseMove;
	canvas.canvas.addEventListener("click", onLeftClick);
	canvas.canvas.addEventListener("contextmenu", onRightClick);
	window.addEventListener("keydown", onKeyDownHandler, true);

	handleSocket();

	if(fullscreen) refreshCanvasSize();
	onFrame();
}

function handleSocket() {
	socket.on("register", function(usr) {
		userid = usr.id;
		name = usr.name;
		cells = [];
	});

	socket.on("cellChange", function(cell) {
		if(cells[cell.x] == null) cells[cell.x] = [];
		cells[cell.x][cell.y] = cell;
	});

	socket.on("scoreChange", function(newScore) {
		score = newScore;
	});

	socket.on("placeChange", function(newPlace) {
		place = newPlace;
	});

	socket.on("firstPlace", function(firstPlace) {
		var msg;
		if(firstPlace == name) {
			msg = new SpeechSynthesisUtterance("You are now in the lead!");
		} else {
			msg = new SpeechSynthesisUtterance(firstPlace + " is now in the lead!");
		}
		window.speechSynthesis.speak(msg);
		console.log(firstPlace + " is now in the lead!");
	});
}

var BORDER_THICKNESS = 1;
var SCORE_WIDTH = 300;
var SCORE_HEIGHT = 40;

function draw() {
	for(var x = -CELL_SIZE + offsetX % CELL_SIZE; x < canvas.canvas.width; x += CELL_SIZE) {
		for(var y = -CELL_SIZE + offsetY % CELL_SIZE; y < canvas.canvas.height; y += CELL_SIZE) {
			var cellX = Math.floor((x + offsetX) / CELL_SIZE);
			var cellY = Math.floor((y + offsetY) / CELL_SIZE);


			if(!(cells[cellX] == null || cells[cellX][cellY] == null)) {
				var cell = cells[cellX][cellY];

				switch(cell.value) {
					case -1:
					if(cell.correct) canvas.drawImage(flag, x, y, CELL_SIZE, CELL_SIZE);
					else {
						canvas.fillStyle = "red";
						canvas.fillRect(x, y, CELL_SIZE, CELL_SIZE);
						canvas.drawImage(mine, x, y, CELL_SIZE, CELL_SIZE);
					}
					break;
					case 0:
					canvas.fillStyle = "gray";
					canvas.fillRect(x, y, CELL_SIZE, CELL_SIZE);
					break;
					default:
					canvas.fillStyle = "orange";
					canvas.fillRect(x, y, CELL_SIZE, CELL_SIZE);

					canvas.font = (CELL_SIZE * .9) + 'px Courier New';
					canvas.fillStyle = mine_colors[cell.value];
					canvas.fillText(cell.value, x + (CELL_SIZE - canvas.measureText(cell.value).width) / 2, y + CELL_SIZE * .68);
					break;
				}
			}
			
			canvas.fillStyle = "black";
			canvas.fillRect(x, y, CELL_SIZE, BORDER_THICKNESS);
			canvas.fillRect(x, y, BORDER_THICKNESS, CELL_SIZE);
			canvas.fillRect(x + CELL_SIZE, y, BORDER_THICKNESS, CELL_SIZE);
			canvas.fillRect(x, y + CELL_SIZE, CELL_SIZE, BORDER_THICKNESS);
		}
	}

	canvas.clearRect(canvas.canvas.width - SCORE_WIDTH, 0, SCORE_WIDTH, SCORE_HEIGHT);

	canvas.fillStyle = "black";
	canvas.font = '20px Trebuchet MS';
	canvas.fillText(name, canvas.canvas.width - SCORE_WIDTH + 2, SCORE_HEIGHT/2);

	if(score != undefined) {
		canvas.font = '15px Trebuchet MS';
		canvas.fillText("Score: ", canvas.canvas.width - SCORE_WIDTH + 2, SCORE_HEIGHT - 2);

		canvas.fillStyle = score > 0 ? "green" : "red";
		canvas.fillText(score, canvas.canvas.width - SCORE_WIDTH + 2 + canvas.measureText("Score: ").width, SCORE_HEIGHT - 2);
	}

	if(place != undefined) {
		canvas.fillStyle = "black";
		canvas.fillText("Place: " + place + getPlaceSuffix(place), canvas.canvas.width - SCORE_WIDTH + 2 + canvas.measureText("Score: ").width + 50, SCORE_HEIGHT - 2);
	}

	canvas.fillStyle = "#0000FF";
	canvas.font = '26px Trebuchet MS';

	var aboutStart = canvas.canvas.width - canvas.measureText("About").width - 4;

	canvas.fillText("About", aboutStart, 30);

	canvas.beginPath();
	canvas.strokeStyle = "#0000FF";
	canvas.lineWidth = 1;
	canvas.moveTo(aboutStart, 32);
	canvas.lineTo(aboutStart + canvas.measureText("About").width, 32);
	canvas.stroke();
}

function onFrame() {
	if(fullscreen) refreshCanvasSize();
	draw();
	window.requestAnimationFrame(onFrame);
}

function onLeftClick(e) {
	onMineClick(true);
}

function onMineClick(leftClick, x , y) {
	if(x == null || y == null) {
		if(mousePos.x > canvas.canvas.width - SCORE_WIDTH && mousePos.y < SCORE_HEIGHT) {
			if(mousePos.x > canvas.canvas.width - canvas.measureText("about").width - 4) {
				window.open("https://vwebtech.tmcc.edu/courses/cit-128-1001/alexander_novo/Final/", "_blank");
			}
			return;
		}
		x = Math.floor((mousePos.x - $("#" + canvas.canvas.id).offset().left + offsetX) / CELL_SIZE);
		y = Math.floor((mousePos.y - $("#" + canvas.canvas.id).offset().top + offsetY) / CELL_SIZE);
	}


	socket.emit("mineClick", {
		click: leftClick,
		x: x,
		y: y,
	});
}

function onMouseMove(e) {
	mousePos = {
		x: e.pageX,
		y: e.pageY
	};
	if(mousePos.x - $("#" + canvas.canvas.id).offset().left > canvas.canvas.width - SCORE_WIDTH && mousePos.y - $("#" + canvas.canvas.id).offset().top < SCORE_HEIGHT) {
		canvas.canvas.style.cursor = "pointer";
	} else {
		canvas.canvas.style.cursor = "auto";
	}
}

function onRightClick(e) {
	e.preventDefault();
	onMineClick(false);
	return false;
}


var offsetChange = 10;
function onKeyDownHandler(e) {
	switch(String.fromCharCode(e.keyCode || e.charCode)) {
		case "W":
			offsetY -= offsetChange;
			break;
		case "A":
			offsetX -= offsetChange;
			break;
		case "S":
			offsetY += offsetChange;
			break;
		case "D":
			offsetX += offsetChange;
			break;
	}
}

function refreshCanvasSize() {
	canvas.canvas.width = window.innerWidth;
	canvas.canvas.height = window.innerHeight;
}

function getPlaceSuffix(place) {
	if(place > 10 && place < 20) return "th";
	switch(place % 10) {
		case 1:
			return "st";
		case 2:
			return "nd";
		case 3:
			return "rd";
		default:
			return "th";
	}
}