const { COLOURS, GRIDSIZE, FPS, POWERUPCHANCE } = require("./constants");

module.exports = {
  createGameState,
  createNewPlayer,
  changeDirection,
  gameLoop,
};

function createGameState() {
  return {
    players: {},
    // Generates food positions
    foodPos: [...Array(5)].map(() => {
      return {
        x: Math.round(Math.random() * (GRIDSIZE - 2)) + 1,
        y: Math.round(Math.random() * (GRIDSIZE - 2)) + 1,
      }
    }),
    powerupPos: [],
    gridSize: GRIDSIZE,
    fps: FPS,
    party: false,
    colours: COLOURS
  };
}

function createNewPlayer(gamestate) {
  let player = getSpawn({
    headPos: {},
    movementDirection: {
      x: 1,
      y: 0,
    },
    segments: [],
    dead: false,
    newSegments: 2,
    snakeColour: getColour(gamestate.colours),
    speedIncrease: 0
  }, gamestate.players)
  return player
}

function gameLoop(game) {
  let players = game.players;
  let foodPos = game.foodPos;

  // Random chance to spawn powerup
  if (Math.round(Math.random() * POWERUPCHANCE) == 50) {
    spawnPowerup()
  }

  // Moves the players snakes and adds new segments
  for (playerName in players) {
    let player = players[playerName]
    player = movePlayer(player)
  }

  // Checks
  for (playerName in players) {
    let player = players[playerName];
    player = playerChecks(player, game)
  }

  // Speed increase
  for (playerName in players) {
    let player = players[playerName];
    let segments = player.segments
    if (player.speedIncrease) {
      if (player.segments.length > 3 && player.speedIncrease) {
        segments.shift()
        player = movePlayer(player)
        player.speedIncrease--

        player = playerChecks(player, game) 
      }
    }
  }
  return game;
}

function changeDirection(direction, player) {
  if (!player) {return}
  let currentDirection = player.movementDirection;
  if (
    currentDirection.x - 2 == direction.x ||
    currentDirection.y - 2 == direction.y ||
    currentDirection.x + 2 == direction.x ||
    currentDirection.y + 2 == direction.y
  ) {
  } else {
    currentDirection.x = direction.x;
    currentDirection.y = direction.y;
  }
  return player;
}

function addSegment(player, segment) {
  player.newSegments--;
  player.segments.unshift(segment);
  return player;
}

async function generateFood(game, food) {
  let newFoodPos = {
    x: Math.round(Math.random() * (GRIDSIZE - 2)) + 1,
    y: Math.round(Math.random() * (GRIDSIZE - 2)) + 1,
  };
  if (newFoodPos.x == food.x && newFoodPos.y == food.y) {
    newFoodPos = {
      x: Math.round(Math.random() * (GRIDSIZE - 1)),
      y: Math.round(Math.random() * (GRIDSIZE - 1)) + 1,
    };
  }
  game.foodPos[game.foodPos.indexOf(food)] = newFoodPos;
  return game;
}

function getColour(colours) {
  let colour = colours[Math.floor(Math.random() * colours.length)];
  colours.splice(colours.indexOf(colour), 1)
  return colour;
}

function playerChecks(player, game) {
  // Checks if players hits into themselves
  let segments = player.segments;
  let headPos = player.headPos;
  let players = game.players;
  let foodPos = game.foodPos;
  segments.forEach((segment, segmentIndex) => {
    let isHead = segmentIndex == segments.length - 1;
    if (
      isHead == false &&
      segment.x == headPos.x &&
      segment.y == headPos.y
    ) {
      player.dead = true;
    }
  });

  // Check if player hit into another snake
  let oponents = Object.keys(players);
  for (oponentIndex in oponents) {
    let oponentName = oponents[oponentIndex];
    let isPlayer = oponentName == playerName;

    oponentSegments =game.players[oponentName].segments;
    if (isPlayer == false) {
      oponentSegments.forEach((oponentSegment, oponentSegmentIndex) => {
        if (oponentSegment) {
          let oponentSegment = oponentSegments[oponentSegmentIndex];
          if (
            headPos &&
            headPos.x == oponentSegment.x &&
            headPos.y == oponentSegment.y
          ) {
            player.dead = true;
          }
        }
      });
    }
  }

  // Checks if player hits into wall and sends them to other side
  if (headPos.x >= GRIDSIZE) {
    headPos.x = -1
  }
  else if (headPos.x < 0) {
    headPos.x = GRIDSIZE
  }

  if (headPos.y >= GRIDSIZE) {
    headPos.y = -1
  }
  else if (headPos.y < 0) {
    headPos.y = GRIDSIZE
  }

  // Check if player is on food
  foodPos.forEach((food) => {
    if (headPos.x == food.x && headPos.y == food.y) {
      player.newSegments += 7;
      game = generateFood(game, food);
    }
  });

  // Kills player
  if (player.dead == true) {
    player.segments = [];
    console.log(playerName + " has died");
  }

  return player
}

function movePlayer(player) {
  if (player && player.dead == false) {
    let segments = player.segments;
    let headPos = player.headPos;
    let movementDirection = player.movementDirection;
    let newSegment
  
    // If the player is waiting to have new segments added make a copy of the last segment before it moves and then add it afterwards
    if (player.newSegments) {
      newSegment = { ...segments[0] };
    }
  
    // Moves players
    for (segmentIndex in segments) {
      let segment = segments[parseInt(segmentIndex)];
      if (segmentIndex == segments.length - 1) {
        headPos.x += movementDirection.x;
        headPos.y += movementDirection.y;
        segment.x = headPos.x;
        segment.y = headPos.y;
      } else {
        nextSegment = segments[parseInt(segmentIndex) + 1];
        segment.x = nextSegment.x;
        segment.y = nextSegment.y;
      }
    }

    if (player.newSegments) {
      addSegment(player, newSegment);
    }
  }   
  return player
}

function getSpawn(player, players) {
  let spawnPos = {
    x: Math.round(Math.random() * (GRIDSIZE - 10)) + 5,
    y: Math.round(Math.random() * (GRIDSIZE - 10)) + 5,
  };

  // Checks if any other player in general area and makes sure that it only checks a certain number of times before giving up
  let empty = false;
  let timesRun = 0
  while (!empty && timesRun < 10) {
    empty = true;
    for (otherPlayer in players) {
      if (!empty) {
        break;
      }
      players[otherPlayer].segments.forEach((segment) => {
        for (xPos in [...Array(6).keys()]) {
          xPos = parseInt(xPos);
          for (yPos in [...Array(6).keys()]) {
            yPos = parseInt(yPos);
            if (
              (spawnPos.x + xPos == segment.x && spawnPos.y + yPos == segment.y) ||
              (spawnPos.x - xPos == segment.x && spawnPos.y + yPos == segment.y) ||
              (spawnPos.x - xPos == segment.x && spawnPos.y - yPos == segment.y) ||
              (spawnPos.x + xPos == segment.x && spawnPos.y - yPos == segment.y)
            ) {
              empty = false;
              spawnPos = {
                x: Math.round(Math.random() * (GRIDSIZE - 20)) + 5,
                y: Math.round(Math.random() * (GRIDSIZE - 20)) + 5,
              };
              timesRun++
            }
          }
        }
      });
    }
  }
  player.headPos = spawnPos;
  player.segments.push(spawnPos);
  return player;
}

function spawnPowerup() {
  console.log("Power up spawned")
}