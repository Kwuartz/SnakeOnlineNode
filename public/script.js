const socket = io();
const gameBoard = document.getElementById("game");
const bgColour = "#008ab8";
const foodColour = "#FF0000";

const FPS = 6;
const GRIDSIZE = 40;

let context, canvas, game;

let lastDirectionChange = 0;
let delay = 500 / FPS;

let userName;

socket.emit("new-player", prompt("Please enter your username!", "YourName")); // Temporary

function sleep(milliseconds){
  return new Promise(resolve => {
      setTimeout(resolve, milliseconds);
  });
}

function resetBoard() {
  context.fillStyle = bgColour;
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function init() {
  canvas = document.getElementById("canvas");
  context = canvas.getContext("2d");
  canvas.width = canvas.height = 1000;
}

function drawGame(game) {
  resetBoard();

  const size = canvas.width / GRIDSIZE;
  const foodPos = game.foodPos;

  context.fillStyle = foodColour;
  for (foodIndex in foodPos) {
    food = game.foodPos[foodIndex];
    context.fillRect(food.x * size, food.y * size, size, size);
  }

  for (snake in game.players) {
    drawSnake(game.players[snake], size);
    context.fillStyle = "white";
    context.fillText(snake, (game.players[snake].headPos.x - 1) * size, (game.players[snake].headPos.y) * size);
  }
}

function drawSnake(snake, size) {
  snake.segments.forEach((segment, _) => {
    context.fillStyle = snake.snakeColour;
    context.fillRect(segment.x * size, segment.y * size, size, size);
  });
}

function getKeys(key) {
  switch (key.toLowerCase()) {
    case "arrowup":
      return (movementDirection = { x: 0, y: -1 });
    case "arrowdown":
      return (movementDirection = { x: 0, y: 1 });
    case "arrowright":
      return (movementDirection = { x: 1, y: 0 });
    case "arrowleft":
      return (movementDirection = { x: -1, y: 0 });
    default:
      return false;
  }
}

window.addEventListener("keydown", (event) => {
  movementDirection = getKeys(event.key);
  if (lastDirectionChange < Date.now() - delay) {
    lastDirectionChange = Date.now();
    if (movementDirection) {
      socket.emit("change-direction", movementDirection);
      console.log("Movement key pressed!");
    }
  }
});

socket.on("player-connected", (playerName) => {
  console.log("Player connected!");
  userName = playerName;
  init();
});

socket.on("username-taken"),
  () => {
    console.log("Player username taken!");
    socket.emit(
      "new-player",
      prompt("User name is already taken!", "YourName")
    );
  };

socket.on("new-gamestate", (gamestate) => {
  game = gamestate;
  if (canvas && game.players[userName]) {
    if (game.players[userName].dead == false) {
      requestAnimationFrame(() => drawGame(game));
    } else {
      socket.emit("player-death", userName)
    }
  }
});

socket.on("player-died", () => {
  alert("You died!")
  sleep(1000)
  alert("Respawning in 3 seconds!")
  sleep(3000)
  socket.emit("new-player", userName)
}) 