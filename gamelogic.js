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
      };
    }),
    powerupPos: [],
    gridSize: GRIDSIZE,
    fps: FPS,
    party: false,
    colours: COLOURS,
  };
}

function createNewPlayer(gamestate) {
  let player = getSpawn(
    {
      headPos: {},
      movementDirection: {
        x: 1,
        y: 0,
      },
      segments: [],
      dead: false,
      newSegments: 2,
      snakeColour: getColour(gamestate.colours),
      speedIncrease: 0,
    },
    gamestate.players
  );
  return player;
}

function gameLoop(game) {
  let players = game.players;

  // Random chance to spawn powerup
  if ((Math.random() * POWERUPCHANCE) < 5) {
    let powerUp = generatePowerup(game)
    if (powerUp) {
      game.powerupPos.push(powerUp)
    }
  }

  // Moves the players snakes and adds new segments
  for (playerName in players) {
    let player = players[playerName];
    player = movePlayer(player);
  }

  // Checks
  for (playerName in players) {
    let player = players[playerName];
    player = playerChecks(player, game);
  }

  // Speed increase
  for (playerName in players) {
    let player = players[playerName];
    if (player.speedIncrease) {
      if (player.speedIncrease) {
        player = movePlayer(player);
        player.speedIncrease--;

        player = playerChecks(player, game);
      }
    }
  }
  return game;
}

function changeDirection(direction, player) {
  if (!player) {
    return;
  }
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

function generateFood(game) {
  let newFoodPos = {
    x: Math.round(Math.random() * (GRIDSIZE - 2)) + 1,
    y: Math.round(Math.random() * (GRIDSIZE - 2)) + 1,
  };

  let items = [...game.powerupPos, ...game.foodPos]
  let players = game.players

  let empty = false;
  while (!empty) {
    empty = true;
    items.forEach((item) => {
      if (empty) {
        [...Array(8).keys()].forEach((x) => {
          [...Array(8).keys()].forEach((y) => {
            if (
              (item.x + x == newFoodPos.x && item.y + y == newFoodPos.y) ||
              (item.x + x == newFoodPos.x && item.y - y == newFoodPos.y) ||
              (item.x - x == newFoodPos.x && item.y + y == newFoodPos.y) ||
              (item.x - x == newFoodPos.x && item.y - y == newFoodPos.y)
            ) {
              empty = false;
              newFoodPos = {
                x: Math.round(Math.random() * (GRIDSIZE - 2)) + 1,
                y: Math.round(Math.random() * (GRIDSIZE - 2)) + 1,
              };
            }
          });
        });
      }
    });

    if (empty) {
      for (playerName in players) {
        players[playerName].segments.forEach((segment) => {
          [...Array(4).keys()].forEach((x) => {
            [...Array(4).keys()].forEach((y) => {
              if (
                (segment.x + x == newFoodPos.x &&
                  segment.y + y == newFoodPos.y) ||
                (segment.x + x == newFoodPos.x &&
                  segment.y - y == newFoodPos.y) ||
                (segment.x - x == newFoodPos.x &&
                  segment.y + y == newFoodPos.y) ||
                (segment.x - x == newFoodPos.x && segment.y - y == newFoodPos.y)
              ) {
                empty = false;
                newFoodPos = {
                  x: Math.round(Math.random() * (GRIDSIZE - 2)) + 1,
                  y: Math.round(Math.random() * (GRIDSIZE - 2)) + 1,
                };
              }
            });
          });
        });
      }
    }
  }

  return newFoodPos;
}

function playerChecks(player, game) {
  // Checks if players hits into themselves
  let segments = player.segments;
  let headPos = player.headPos;
  let players = game.players;
  let foodPos = game.foodPos;
  let powerupPos = game.powerupPos;

  
  // Checks if player hits into wall and sends them to other side
  if (headPos.x >= GRIDSIZE) {
    headPos.x = 0;
  } else if (headPos.x < 0) {
    headPos.x = GRIDSIZE - 1;
  }

  if (headPos.y >= GRIDSIZE) {
    headPos.y = 0;
  } else if (headPos.y < 0) {
    headPos.y = GRIDSIZE - 1;
  }

  // Check if player is on food
  foodPos.forEach((food) => {
    if (headPos.x == food.x && headPos.y == food.y) {
      player.newSegments += 5;
      foodPos[foodPos.indexOf(food)] = generateFood(game);
    }
  });

  segments.forEach((segment, segmentIndex) => {
    let isHead = segmentIndex == segments.length - 1;
    if (isHead == false && segment.x == headPos.x && segment.y == headPos.y) {
      player.dead = true;
    }
  });

  // Check if player hit into another snake
  let oponents = Object.keys(players);
  for (oponentIndex in oponents) {
    let oponentName = oponents[oponentIndex];
    let isPlayer = oponentName == playerName;

    oponentSegments = game.players[oponentName].segments;
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

  // Check if player is on power
  powerupPos.forEach((powerup) => {
    if (headPos.x == powerup.x && headPos.y == powerup.y) {
      player.speedIncrease += 20;
      powerupPos.splice(powerupPos.indexOf(powerup), 1)
    }
  });

  return player;
}

function movePlayer(player) {
  if (player && player.dead == false) {
    let segments = player.segments;
    let headPos = player.headPos;
    let movementDirection = player.movementDirection;
    let newSegment;

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
  return player;
}

function getSpawn(player, players) {
  let spawnPos = {
    x: Math.round(Math.random() * (GRIDSIZE - 10)) + 5,
    y: Math.round(Math.random() * (GRIDSIZE - 10)) + 5,
  };

  // Checks if any other player in general area and makes sure that it only checks a certain number of times before giving up
  let empty = false;
  let timesRun = 0;
  while (!empty && timesRun < 10) {
    empty = true;
    for (otherPlayer in players) {
      if (!empty) {
        break;
      }
      players[otherPlayer].segments.forEach((segment) => {
        [...Array(6).keys()].forEach((x) => {
          [...Array(6).keys()].forEach((y) => {
            if (
              (spawnPos.x + x == segment.x && spawnPos.y + y == segment.y) ||
              (spawnPos.x - x == segment.x && spawnPos.y + y == segment.y) ||
              (spawnPos.x - x == segment.x && spawnPos.y - y == segment.y) ||
              (spawnPos.x + x == segment.x && spawnPos.y - y == segment.y)
            ) {
              empty = false;
              spawnPos = {
                x: Math.round(Math.random() * (GRIDSIZE - 20)) + 5,
                y: Math.round(Math.random() * (GRIDSIZE - 20)) + 5,
              };
              timesRun++;
            }
          });
        });
      });
    }
  }

  player.headPos = spawnPos;
  player.segments.push(spawnPos);
  return player;
}

function generatePowerup(game) {
  let items = [...game.powerupPos, ...game.foodPos]

  if (game.powerupPos.length < 2) {
    let newPowerupPos = {
      x: Math.round(Math.random() * (GRIDSIZE - 2)) + 1,
      y: Math.round(Math.random() * (GRIDSIZE - 2)) + 1,
    };

    let empty = false;
    while (!empty) {
      empty = true;
      items.forEach((item) => {
        if (empty) {
          [...Array(5).keys()].forEach((x) => {
            [...Array(5).keys()].forEach((y) => {
              if (
                (item.x + x == newPowerupPos.x && item.y + y == newPowerupPos.y) ||
                (item.x + x == newPowerupPos.x && item.y - y == newPowerupPos.y) ||
                (item.x - x == newPowerupPos.x && item.y + y == newPowerupPos.y) ||
                (item.x - x == newPowerupPos.x && item.y - y == newPowerupPos.y)
              ) {
                empty = false;
                newPowerupPos = {
                  x: Math.round(Math.random() * (GRIDSIZE - 2)) + 1,
                  y: Math.round(Math.random() * (GRIDSIZE - 2)) + 1,
                };
              }
            });
          });
        }
      });
    }
    return newPowerupPos
  }
  return
}

function getColour(colours) {
  let colour = colours[Math.floor(Math.random() * colours.length)];
  colours.splice(colours.indexOf(colour), 1);
  return colour;
}
