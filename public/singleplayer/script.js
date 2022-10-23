const socket = io();
const gameBoard = document.getElementById("game");
const foodColour = "red";
let bg = "#008ab8"

let context, canvas, game;

let lastDirectionChange = 0;
let inputDelay

let lastBgChange = 0;
let bgDelay = 700

let eat = new Audio("../assets/sounds/eat.mp3")
let death = new Audio("../assets/sounds/death.mp3")

let userName = "player";

socket.emit("new-singleplayer");

function sleep(milliseconds){
  return new Promise(resolve => {
      setTimeout(resolve, milliseconds);
  });
}

function resetBoard() {
  context.fillStyle = bg;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
}

function init() {
  canvas = document.getElementById("canvas");
  context = canvas.getContext("2d");
  canvas.width = canvas.height = 800;
}

function drawGame(game) {
  resetBoard();

  const size = canvas.width / game.gridSize;
  const foodPos = game.foodPos;

  context.fillStyle = foodColour;
  for (foodIndex in foodPos) {
    food = game.foodPos[foodIndex];
    context.fillRect(food.x * size, food.y * size, size, size);
  }

  let snake = game.players[userName]
  drawSnake(game.players[userName], size);
  context.fillStyle = "white"
  context.textAlign = "left"
  context.fillText("Score: " + (snake.segments.length - 3), size, size)
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
  if (game) {
    movementDirection = getKeys(event.key);
    if (lastDirectionChange < Date.now() - inputDelay) {
      lastDirectionChange = Date.now();
      if (movementDirection) {
        socket.emit("change-direction", movementDirection, "singleplayer");
      }
    }
  }
});

socket.on("player-connected", () => {
  console.log("Player has connected!");
  init();
});

socket.on("new-gamestate", (gamestate) => {
  game = gamestate;
  if (canvas && game.players[userName]) {
    if (game.players[userName].dead == false) {
      requestAnimationFrame(() => drawGame(game));
    } else {
      death.play()
      socket.emit("player-death", "singleplayer")
    }
    if (game.players[userName].newSegments == 7) {
      eat.play()
    }

    inputDelay = 500 / game.fps
  }
});

socket.on("player-died", () => {
  Swal.fire({
    titleText: "Respawning...",
    html: 'You will respawn in <timer></timer> seconds.',
    timer: 3500,
    timerProgressBar: true,
    width: "25vw",
    didOpen: () => {
      Swal.showLoading()
      const respawnTimer = Swal.getHtmlContainer().querySelector('timer')
      timerInterval = setInterval(() => {
        respawnTimer.textContent = Math.round(Swal.getTimerLeft()/1000)
      }, 100)
    },
    willClose: () => {
      clearInterval(timerInterval)
    }
  }).then((result) => {
    socket.emit("player-respawn", "singleplayer")
  })
}) 