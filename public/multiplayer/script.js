const socket = io();

setInterval(() => {
  const start = Date.now();
  socket.volatile.emit("ping", () => {
    console.log(`Latency: ${Date.now()-start}ms`)
  });
}, 5000);

const gameBoard = document.getElementById("game");

const foodColour = "red";
const foodLeafColour = "green";
const foodImage = new Image();
foodImage.src = "../assets/images/apple.png"

let bg = "#79cf44"

const partyColors = [
  "#f02f22", // Tomato
  "#F8931F", // Orange
  "#24e327", // Green
  "#0563fa", // Light blue
  "#4a1bf5", // Purple
  "#f54278", // Peach
  "#9B26B6", // Violet
  "#fab505", // Gold
];

let context, canvas, game;

let lastDirectionChange = 0;
let inputDelay

let lastBgChange = 0;
let bgDelay = 700

let eat = new Audio("../assets/sounds/eat.mp3")
let death = new Audio("../assets/sounds/death.mp3")

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
    } else if (username.length > 30) {
      Swal.showValidationMessage("Your username is too long!")
    } else if (!/^[A-Za-z0-9_ ]*$/.test(username)) {
      Swal.showValidationMessage("You cannot inclue  special characters in your username!")
    }
    return {username:username};
  }
}).then((result) => {
  socket.emit("new-multiplayer", result.value.username);
})

// Not mine
function darkenColor(color, percent) {

  var R = parseInt(color.substring(1,3),16);
  var G = parseInt(color.substring(3,5),16);
  var B = parseInt(color.substring(5,7),16);

  R = parseInt(R * (100 + percent) / 100);
  G = parseInt(G * (100 + percent) / 100);
  B = parseInt(B * (100 + percent) / 100);

  R = (R<255)?R:255;  
  G = (G<255)?G:255;  
  B = (B<255)?B:255;  

  var RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
  var GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
  var BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));

  return "#"+RR+GG+BB;
}

function sleep(milliseconds){
  return new Promise(resolve => {
      setTimeout(resolve, milliseconds);
  });
}

function resetBoard(gridSize) {
  const size = (canvas.width / gridSize);
  const gridArray = [...Array(gridSize).keys()]
  let darkBg = darkenColor(bg, -5)
  for (row in gridArray) {
    for (collumn in gridArray) {
      if (collumn % 2 == 0 && row % 2 == 0) {
        context.fillStyle = bg
        context.fillRect(row * size, collumn * size, size, size);
      } else {
        context.fillStyle = darkBg
        if (collumn % 2 == 1 && row % 2 == 1) {
          context.fillStyle = bg
        }
        context.fillRect(row * size, collumn * size, size, size);
      }
    }
  }
  // context.fillRect(0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
}

function init() {
  canvas = document.getElementById("canvas");
  context = canvas.getContext("2d");
  canvas.width = canvas.height = 900;
  context.font = "1.2rem Monospace"
}

function drawGame(game) {
  resetBoard(game.gridSize);

  const size = canvas.width / game.gridSize;
  const foodPos = game.foodPos;

  for (foodIndex in foodPos) {
    food = game.foodPos[foodIndex];
    context.fillStyle = foodColour;
    context.fillRect(food.x * size, food.y * size, size, size);
    context.fillStyle = foodLeafColour;
    context.fillRect((food.x + 0.4) * size, (food.y - 0.1) * size, size/5, size/3);
    // context.drawImage(foodImage, food.x * size, food.y * size, size, size)
  }

  for (username in game.players) {
    let snake = game.players[username]
    context.textAlign = "center"
    drawSnake(game.players[username], size);
    context.fillStyle = "white";
    context.fillText(username, (snake.headPos.x + 0.5) * size, snake.headPos.y * size);
    if (username == userName) {
      context.textAlign = "left"
      context.fillText("Score: " + (snake.segments.length - 3), 0.9 * size, 1.5 * size)
    }
  }

  if (game.party) {
    if (lastBgChange < Date.now() - bgDelay) {
      lastBgChange = Date.now();
      bg = partyColors[Math.round(Math.random() * partyColors.length - 1)]
    }
  }
  else {
    bg = "#79cf44"
  }
}

function drawSnake(snake, size) {
  snake.segments.forEach((segment, _) => {
    context.fillStyle = snake.snakeColour;
    context.fillRect(segment.x * size, segment.y * size, size, size);
    // Eyes
    if (segment.x == snake.headPos.x && segment.y == snake.headPos. y) {
      context.fillStyle = "white"
      context.fillRect((segment.x + 0.05) * size, (segment.y + 0.5) * size, size/4, size/4)
      context.fillRect((segment.x + 0.65) * size, (segment.y + 0.5) * size, size/4, size/4)
      context.fillStyle = "black"
      context.fillRect((segment.x + 0.2) * size, (segment.y + 0.5) * size, size/8, size/8)
      context.fillRect((segment.x + 0.8) * size, (segment.y + 0.5) * size, size/8, size/8)
    }
  });
}

function getKeys(key) {
  switch (key.toLowerCase()) {
    case "arrowup":
      return (movementDirection = { x: 0, y: -1 });
    case "w":
      return (movementDirection = { x: 0, y: -1 });
    case "arrowdown":
      return (movementDirection = { x: 0, y: 1 });
      case "s":
        return (movementDirection = { x: 0, y: 1 });
    case "arrowright":
      return (movementDirection = { x: 1, y: 0 });
    case "d":
      return (movementDirection = { x: 1, y: 0 });
    case "arrowleft":
      return (movementDirection = { x: -1, y: 0 });
    case "a":
      return (movementDirection = { x: -1, y: 0 });
    case (" "):
      return "speed"
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
        if (movementDirection == "speed") {
          socket.emit("speedIncrease", "multiplayer")
        } else {
          socket.emit("change-direction", movementDirection, "multiplayer");
        }
      }
    }
  }
});

socket.on("player-connected", (playerName) => {
  console.log(playerName + " has connected!");
  socket.emit("server-message", playerName + " has connected!");
  userName = playerName;
  init();
});

socket.on("username-taken", () => {
  Swal.fire({
    titleText: "This username is taken!",
    inputPlaceholder: "Enter another username!",
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
    socket.emit("new-multiplayer", result.value.username);
  })
})

socket.on("new-gamestate", (gamestate, ping) => {
  ping()
  game = gamestate;
  if (canvas && game.players[userName]) {
    if (game.players[userName].dead == false) { 
      requestAnimationFrame(() => drawGame(game));
    } else {
      death.play()
      socket.emit("player-death", "multiplayer")
      socket.emit("server-message", userName + " has died!");
    }
    if (game.players[userName].newSegments == 7) {
      eat.play()
    }

    inputDelay = 800 / game.fps
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
    socket.emit("player-respawn", userName, "multiplayer")
  })
}) 