const socket = io();
const gameBoard = document.getElementById("game");
const bgColour = "#008ab8";
const foodColour = "#FF0000";

const FPS = 6;

let context, canvas, game;

let lastDirectionChange = 0;
let delay = 899 / FPS;

let eat = new Audio("sounds/eat.mp3")
let death = new Audio("sounds/death.mp3")

let userName;

Swal.fire({
  titleText: "Submit your username!",
  inputPlaceholder: "Enter your username",
  html: `<input type="text" id="username" class="swal2-input" placeholder="Enter your username!">`,
  inputAttributes: {
    autocapitalize: "off",
    autocorrect: "off",
    maxLength: 20,
  },
  confirmButtonText: 'Play',
  showLoaderOnConfirm: true,
  allowEscapeKey: false,
  allowOutsideClick: false,
  preConfirm: () => {
    const username = Swal.getPopup().querySelector('#username').value
    if (!username) {
      Swal.showValidationMessage("Your username cannot be blank!")
    }
    return {username:username};
  }
}).then((result) => {
  socket.emit("new-player", result.value.username);
})

function sleep(milliseconds){
  return new Promise(resolve => {
      setTimeout(resolve, milliseconds);
  });
}

function resetBoard() {
  context.fillStyle = bgColour;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
}

function init() {
  canvas = document.getElementById("canvas");
  context = canvas.getContext("2d");
  canvas.width = canvas.height = 600;
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

  for (username in game.players) {
    let snake = game.players[username]
    drawSnake(game.players[username], size);
    context.fillStyle = "white";
    context.fillText(username, (snake.headPos.x + 0.5) * size, snake.headPos.y * size);
    context.textAlign = "left"
    context.fillText("Score: " + (snake.segments.length - 3), size, size)
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

function playSound(sound) {

}

window.addEventListener("keydown", (event) => {
  movementDirection = getKeys(event.key);
  if (lastDirectionChange < Date.now() - delay) {
    lastDirectionChange = Date.now();
    if (movementDirection) {
      socket.emit("change-direction", movementDirection);
    }
  }
});

socket.on("player-connected", (playerName) => {
  console.log(playerName + " has connected!");
  socket.emit("server-message", playerName + " has connected!");
  userName = playerName;
  init();
});

socket.on("player-respawned", () => {
  socket.emit("server-message", userName + " has respawned!");
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
      death.play()
      socket.emit("player-death", userName)
      socket.emit("server-message", userName + " has died!");
    }
    if (game.players[userName].newSegments == 3) {
      eat.play()
    }
  }
});

socket.on("player-died", () => {
  Swal.fire({
    titleText: "Respawning...",
    html: 'You will respawn in <timer></timer> seconds.',
    timer: 3500,
    timerProgressBar: true,
    allowEscapeKey: false,
    allowOutsideClick: false,
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
    socket.emit("player-respawn", userName)
  })
}) 