const gameBoard = document.getElementById("game");

const foodColour = "red";
const foodLeafColour = "green";
const speedPowerColour = "blue";

let bg = "#79cf44";

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

let context, canvas;
let localGame = false;

let lastDirectionChange = 0;
let inputDelay;

let lastBgChange = 0;
let bgDelay = 700;

let eat = new Audio("../assets/sounds/eat.mp3");
let death = new Audio("../assets/sounds/death.mp3");

let userName;
let localPlayerDead = false

socket.on("player-connected", (playerName) => {
  socket.emit("server-message", playerName + " has connected!");
  userName = playerName;
  init();
});

function init() {
  canvas = document.getElementById("canvas");
  context = canvas.getContext("2d");
  canvas.width = canvas.height = 900;
  context.font = "1.2rem Monospace";
}

async function resetBoard(gridSize) {
  const size = canvas.width / gridSize;
  const gridArray = [...Array(gridSize).keys()];

  if (!bg) {
    bg = "#79cf44";
  }
  let darkBg = darkenColor(bg, -5);

  for (row in gridArray) {
    for (collumn in gridArray) {
      if (collumn % 2 == 0 && row % 2 == 0) {
        context.fillStyle = bg;
        context.fillRect(row * size, collumn * size, size, size);
      } else {
        context.fillStyle = darkBg;
        if (collumn % 2 == 1 && row % 2 == 1) {
          context.fillStyle = bg;
        }
        context.fillRect(row * size, collumn * size, size, size);
      }
    }
  }
  // context.fillRect(0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
}

function drawGame(game) {
  resetBoard(game.gridSize);

  const size = canvas.width / game.gridSize;
  const foodPos = game.foodPos;
  const powerupPos = game.powerupPos;

  powerupPos.forEach((powerUp) => {
    context.fillStyle = speedPowerColour;
    context.fillRect(powerUp.x * size, powerUp.y * size, size, size);
  })

  foodPos.forEach((food) => {
    context.fillStyle = foodColour;
    context.fillRect(food.x * size, food.y * size, size, size);
    context.fillStyle = foodLeafColour;
    context.fillRect(
      (food.x + 0.4) * size,
      (food.y - 0.1) * size,
      size / 5,
      size / 3
    );
  })

  for (username in game.players) {
    let snake = game.players[username];
    drawSnake(game.players[username], size);
    // Only draws score of local player
    if (username == userName) {
      context.textAlign = "left";
      context.fillText(
        "Score: " + (snake.segments.length - 3),
        0.9 * size,
        1.5 * size
      );
    }
  }
    

  if (game.party) {
    if (lastBgChange < Date.now() - bgDelay) {
      lastBgChange = Date.now();
      bg = partyColors[Math.round(Math.random() * partyColors.length - 1)];
    }
  } else {
    bg = "#79cf44";
  }
}

function drawSnake(snake, size) {
  if (!snake.dead) {
    snake.segments.forEach((segment, _) => {
      context.fillStyle = snake.snakeColour;
      context.fillRect((segment.x) * size, (segment.y) * size, size, size);
      // Eyes
      if (segment.x == snake.headPos.x && segment.y == snake.headPos.y) {
        context.fillStyle = "white";
        context.fillRect(
          (segment.x + 0.05) * size,
          (segment.y + 0.5) * size,
          size / 4,
          size / 4
        );
        context.fillRect(
          (segment.x + 0.65) * size,
          (segment.y + 0.5) * size,
          size / 4,
          size / 4
        );
        context.fillStyle = "black";
        context.fillRect(
          (segment.x + 0.2) * size,
          (segment.y + 0.5) * size,
          size / 8,
          size / 8
        );
        context.fillRect(
          (segment.x + 0.8) * size,
          (segment.y + 0.5) * size,
          size / 8,
          size / 8
        );
      }
    });
    context.textAlign = "center";
    context.fillStyle = "white";
    context.fillText(
      username,
      (snake.headPos.x + 0.5) * size,
      snake.headPos.y * size
    );
  }
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
    default:
      return false;
  }
}

window.addEventListener("keydown", (event) => {
  if (localGame) {
    movementDirection = getKeys(event.key);
    if (lastDirectionChange < Date.now() - inputDelay) {
      lastDirectionChange = Date.now();
      if (movementDirection) {
        socket.emit("change-direction", movementDirection, "multiplayer");
      }
    }
  }
});

function updateGamestate(currentState, newGamestate) {
  if (!newGamestate.players[userName]) {
    return currentState;
  }
  // Checking if local player has eaten
  if (newGamestate.players[userName].foodEaten) {
    eat.play()
  }

  // Updating game settings like party mode
  let updatedState = { ...currentState, ...newGamestate };
  // Updating foodPos
  if (newGamestate.foodPos) {
    updatedState.foodPos = currentState.foodPos;
    newGamestate.foodPos.forEach((foodPos, foodIndex) => {
      // Some will have placeholder undefined values so I can indentify index of foodPos to replace
      if (foodPos) {
        updatedState.foodPos[foodIndex] = foodPos;
      }
    });
  }

  if (newGamestate.powerupPos) {
    updatedState.powerupPos = currentState.powerupPos;
    newGamestate.powerupPos.forEach((powerupPos, powerupIndex) => {
      // Some will have placeholder undefined values so I can indentify index of powerupPos to replace
      if (powerupPos) {
        if (powerupPos == "used") {
          updatedState.powerupPos.splice(powerupIndex, 1)
        } else {
          updatedState.powerupPos[powerupIndex] = powerupPos;
        }
      }
    });
  }

  // Updating players whether the server has sent full player info or partial info
  if (typeof newGamestate.players[userName].segments == "object") {
    for (newPlayerName in newGamestate.players) {
      updatedState.players[newPlayerName] = {
        ...currentState.players[newPlayerName],
        ...newGamestate.players[newPlayerName],
      };
    }
    return updatedState;
  } else {
    // Checks if needs to play eat sound 
    if (newGamestate.players[userName]) {
      if (newGamestate.players[userName].newSegments) {
        eat.play()
      }
    }

    // Deletes players if they disconnect
    for (playerName in currentState.players) {
      if (!Object.keys(newGamestate.players).includes(playerName)) {
        delete currentState.players[playerName];
      }
    }
    updatedState.players = currentState.players;

    for (playerName in updatedState.players) {
      let player = updatedState.players[playerName];
      let segments = player.segments;

      // Checks if player is dead
      if (newGamestate.players[playerName]) {
        player.dead = newGamestate.players[playerName].dead;

        let headPos = player.headPos;
        let newSegment;
        let movementDirection =newGamestate.players[playerName].movementDirection;
        let gridSize = currentState.gridSize;
        let xDif = Math.abs(newGamestate.players[playerName].headPos.x - headPos.x);
        let yDif = Math.abs(newGamestate.players[playerName].headPos.y - headPos.y);

        // This stops the program from moving the player multiple times because they travelled through a wall and it checks if they had their speed increased while moving through that wall
        if (Math.max(xDif, yDif) > 2) {
          xDif = yDif = gridSize - Math.max(xDif, yDif);
        }

        // Uses difference in headpos to find out if player had speed increase
        for (_ in [...Array(Math.max(xDif, yDif)).keys()]) {
          // If the player is waiting to have new segments added make a copy of the last segment before it moves and then add it afterwards
          if (segments.length < newGamestate.players[playerName].segments) {
            newSegment = { ...segments[0] };
          }

          // Moves players
          segments.forEach((segment, segmentIndex) => {
            if (segmentIndex == segments.length - 1) {
              headPos.x += movementDirection.x;
              headPos.y += movementDirection.y;

              // Border checks
              if (headPos.x >= gridSize) {
                segment.x = 0;
              } else if (headPos.x < 0) {
                segment.x = gridSize - 1;
              } else if (headPos.y >= gridSize) {
                segment.y = 0;
              } else if (headPos.y < 0) {
                segment.y = gridSize - 1;
              } else {
                segment.x += movementDirection.x;
                segment.y += movementDirection.y;
              }

              // This checks if the player sped through the wall and went two blocks outside of the grid and if they did it moves them an extra time to compensate for that.
              if (
                headPos.x > gridSize ||
                headPos.y > gridSize ||
                headPos.x < -1 ||
                headPos.y < -1
              ) {
                segment.x += movementDirection.x;
                segment.y += movementDirection.y;
              }
            } else {
              nextSegment = segments[parseInt(segmentIndex) + 1];
              segment.x = nextSegment.x;
              segment.y = nextSegment.y;
            }
          });
          // Adds new segment
          if (newSegment) {
            player.segments.unshift(newSegment);
          }
        }

        headPos.x = newGamestate.players[playerName].headPos.x;
        headPos.y = newGamestate.players[playerName].headPos.y;

        // Removes unnecessary segments
        segments.splice(
          0,
          segments.length - newGamestate.players[playerName].segments
        );
      }
    }
    return updatedState;
  }
}

socket.on("party", (bool) => {
  localGame.party = bool;
})

socket.on("new-gamestate", (newGamestate) => {
  if (!localGame) {
    localGame = { ...newGamestate };
  } else {
    localGame = updateGamestate(localGame, newGamestate);
  }

  if (canvas && localGame.players[userName]) {
    if (!localGame.players[userName].dead) {
      window.requestAnimationFrame(() => {
        drawGame(localGame);
      });
    } else {
      if (!localPlayerDead) {
        death.play();
        socket.emit("player-death");
        socket.emit("server-message", userName + " has died!");
        localPlayerDead = true;
      }
    }

    inputDelay = 800 / localGame.fps;
  }
});

// Not mine - from stack overflow
function darkenColor(color, percent) {
  var R = parseInt(color.substring(1, 3), 16);
  var G = parseInt(color.substring(3, 5), 16);
  var B = parseInt(color.substring(5, 7), 16);

  R = parseInt((R * (100 + percent)) / 100);
  G = parseInt((G * (100 + percent)) / 100);
  B = parseInt((B * (100 + percent)) / 100);

  R = R < 255 ? R : 255;
  G = G < 255 ? G : 255;
  B = B < 255 ? B : 255;

  var RR = R.toString(16).length == 1 ? "0" + R.toString(16) : R.toString(16);
  var GG = G.toString(16).length == 1 ? "0" + G.toString(16) : G.toString(16);
  var BB = B.toString(16).length == 1 ? "0" + B.toString(16) : B.toString(16);

  return "#" + RR + GG + BB;
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}