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

	handleSocket();

	if(fullscreen) refreshCanvasSize();
	onFrame();
}

function handleSocket() {
	socket.on("register", function(usr) {
		userid = usr.id;
		name = usr.name;
	});

	socket.on("pushBoard", function(board) {
		cells = board;
		console.log("Got board: ");
		console.log(board);
	});

	socket.on("cellChange", function(cell) {
		if(cells[cell.x] == null) cells[cell.x] = [];
		cells[cell.x][cell.y] = cell;
		console.log("Got new cell: ");
		console.log(cell);
	});

	socket.on("scoreChange", function(newScore) {
		score = newScore;
		console.log("Score is now " + score);
	});

	socket.on("placeChange", function(newPlace) {
		place = newPlace;
		console.log("You are now in " + place + " place");
	});

	socket.on("firstPlace", function(firstPlace) {
		console.log(firstPlace + " is now in the lead!");
	});
}

function draw() {
	for(var row of cells) {
		if(row == null) continue;
		for(var cell of row) {
			if(cell == null) continue;
			if(cell.value == -1) {
				if(cell.correct) {
					canvas.drawImage(flag, cell.x * CELL_SIZE - offsetX, cell.y * CELL_SIZE - offsetY, CELL_SIZE, CELL_SIZE);
				} else {
					canvas.fillStyle = "red";
					canvas.fillRect(cell.x * CELL_SIZE - offsetX, cell.y * CELL_SIZE - offsetY, CELL_SIZE, CELL_SIZE);
					canvas.drawImage(mine, cell.x * CELL_SIZE - offsetX, cell.y * CELL_SIZE - offsetY, CELL_SIZE, CELL_SIZE);
				}
			} else if (cell.value == 0) {
				canvas.fillStyle = "gray";
				canvas.fillRect(cell.x * CELL_SIZE - offsetX, cell.y * CELL_SIZE - offsetY, CELL_SIZE, CELL_SIZE);
			} else {
				canvas.fillStyle = "orange";
				canvas.fillRect(cell.x * CELL_SIZE - offsetX, cell.y * CELL_SIZE - offsetY, CELL_SIZE, CELL_SIZE);

				canvas.font = (CELL_SIZE * .9) + 'px Courier New';
				canvas.fillStyle = mine_colors[cell.value];
				canvas.fillText(cell.value, cell.x * CELL_SIZE + (CELL_SIZE - canvas.measureText(cell.value).width) / 2, cell.y * CELL_SIZE + CELL_SIZE * .68)

			}
		}
	}
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
	if(x == null) var x = Math.floor((mousePos.x - $("#" + canvas.canvas.id).offset().left) / CELL_SIZE);
	if(y == null) var y = Math.floor((mousePos.y - $("#" + canvas.canvas.id).offset().top) / CELL_SIZE);

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
}

function onRightClick(e) {
	e.preventDefault();
	onMineClick(false);
	return false;
}

function refreshCanvasSize() {
	canvas.canvas.width = window.innerWidth;
	canvas.canvas.height = window.innerHeight;
}