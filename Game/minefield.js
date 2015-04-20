var canvas;
var cells = []; //Two-dimensional array created later
var fullscreen = false;
var mousePos;
var offsetX = 0;
var offsetY = 0;

var CELL_SIZE = 20;
var DIFFICULTY = .2;

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

	registerUser();

	//TODO Preload images and/or sound
	if(fullscreen) refreshCanvasSize();
	onFrame();
}

function registerUser() {
	$.ajax({
		type: "POST",
		url: "/",
		data: JSON.stringify({ 
			json: {
				messageType: "register"
			}
		}),
		contentType: "application/json; charset=utf-8"
	}).done(function(data) {
		console.log("User id: " + data.json.data.id);
	}).fail(function(err) {
		console.log("Error receiving POST: " + err.toString())
	});
}

function draw() {
	for(var x = Math.floor(offsetX / CELL_SIZE); x < Math.ceil(canvas.canvas.width / CELL_SIZE) + Math.floor(offsetX / CELL_SIZE); x++) {
		if(cells[x] == null) cells[x] = [];
		for(var y = Math.floor(offsetY / CELL_SIZE); y < Math.ceil(canvas.canvas.height / CELL_SIZE) + Math.floor(offsetY / CELL_SIZE); y++) {
			if(cells[x][y] == null) cells[x][y] = new Cell(x, y);
			if(!(cells[x][y].status & STATUS_REVEALED)) canvas.fillStyle = "white";
			else if(cells[x][y].status & STATUS_CORRECT) canvas.fillStyle = "green";
			else if(cells[x][y].status & STATUS_MINE) canvas.fillStyle = "red";
			else if(!minesAround(x, y)) canvas.fillStyle = "gray";
			else {
				canvas.fillStyle = "orange";
				canvas.fillRect(x * CELL_SIZE - offsetX, y * CELL_SIZE - offsetY, CELL_SIZE, CELL_SIZE);

				var mines = minesAround(x, y);
				canvas.font = (CELL_SIZE * .9) + 'px Courier New';
				canvas.fillStyle = mine_colors[mines];
				canvas.fillText(mines, x * CELL_SIZE + (CELL_SIZE - canvas.measureText(mines).width) / 2, y * CELL_SIZE + CELL_SIZE * .68)
				continue;
			}
			canvas.fillRect(x * CELL_SIZE - offsetX, y * CELL_SIZE - offsetY, CELL_SIZE, CELL_SIZE);
		}
	}
}

function minesAround(x, y) {
	var mines = 0;
	for(var i = -1; i <= 1; i++) {
		for(var j = -1; j <= 1; j++) {
			if(cells[x + i] == null) cells[x + i] = [];
			if(cells[x + i][y + j] == null) cells[x + i][y + j] = new Cell(x + i, y + j);
			if(cells[x + i][y + j].status & STATUS_MINE) {
				mines++;
			}
		}
	}
	return mines;
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

	if(cells[x] == null || cells[x][y] == null) return;
	if(cells[x][y].status & STATUS_REVEALED) return;
	cells[x][y].status += STATUS_REVEALED;
	
	if(cells[x][y].status & STATUS_MINE) {
		if(!leftClick) cells[x][y].status += STATUS_CORRECT;
	} else if(leftClick) {
		if(!minesAround(x, y)) {
			for(var i = -1; i <= 1; i++) {
				for(var j = -1; j <= 1; j++) {
					onMineClick(true, x + i, y + j);
				}
			}
		}
	} else {
		//SCORE--
		cells[x][y].status -= STATUS_REVEALED;
	}
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




/*****************\
*CLASS DEFINITIONS*
\*****************/





//Status identifiers
var STATUS_MINE = 1;
var STATUS_REVEALED = 2;
var STATUS_CORRECT = 4;
function Cell(x, y, mine, revealed, correct) {
	if(x == null || y == null) throw "X and Y must be non-null";
	if(mine == null) mine = Math.random() < DIFFICULTY;
	if(revealed == null) revealed = false;

	this.x = x;
	this.y = y;
	this.status = 0;
	if(mine) this.status += 1;
	if(revealed) this.status += 2;
	if(correct) this.status += 4;
}