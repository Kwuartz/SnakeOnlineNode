const { FPS } = require("./constants");
const { GRIDSIZE } = require("./constants");
const { COLOURS } = require("./constants");

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

  // Moves the players snakes and adds new segments
  for (playerName in players) {
    let player = players[playerName];
    let newSegment

    if (!player) {continue}
    if (player.dead == false) {
      let segments = player.segments;
      let headPos = player.headPos;
      movementDirection = player.movementDirection;

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
    }
    if (player.newSegments) {
      addSegment(player, newSegment);
    }
  }

  // Checks
  for (playerName in players) {
    let player = players[playerName];
    if (!player) {continue}

    if (player.dead == false) {
      // Checks if players hits into themselves
      let segments = player.segments;
      let headPos = player.headPos;
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
    }
  }

  // Speed increase and checks
  for (playerName in players) {
    let player = players[playerName];
    let segments = player.segments;
    let headPos = player.headPos;
    let movementDirection = player.movementDirection;
    // If player has used speed increase move them twice, take away three of their segments and run checks twice
    if (!player) {continue}
    if (!player.dead && player.speedIncrease) {
      // Checks if they have enough segments to speed up
      if (player.segments.length > 3) {
        // Deletes their last 3 segments
        segments.shift()
        // Moves player twice
        for (segmentIndex in segments) {
          segment = segments[parseInt(segmentIndex)];
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
        player.speedIncrease--

        // Checks if players hits into themselves
        segments.forEach((segment, segmentIndex) => {
          isHead = segmentIndex == segments.length - 1;
          if (
            isHead == false &&
            segment.x == headPos.x &&
            segment.y == headPos.y
          ) {
            player.dead = true;
          }
        });

        // Check if player hit into another snake
        oponents = Object.keys(players);
        for (oponentIndex in oponents) {
          oponentName = oponents[oponentIndex];
          isPlayer = oponentName == playerName;

          oponentSegments = game.players[oponentName].segments;
          if (isPlayer == false) {
            oponentSegments.forEach((oponentSegment, oponentSegmentIndex) => {
              if (oponentSegment) {
                oponentSegment = oponentSegments[oponentSegmentIndex];
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
        foodPos.forEach((food, foodIndex) => {
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
      } else {
        player.speedIncrease = 0
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

function generateFood(game, food) {
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

function getSpawn(player, players) {
  let spawnPos = {
    x: Math.round(Math.random() * (GRIDSIZE - 20)) + 10,
    y: Math.round(Math.random() * (GRIDSIZE - 20)) + 10,
  };

  // Checks if any other player in general area and makes sure that it only checks a certain number of times before giving up
  let empty = false;
  while (!empty) {
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
              console.log(spawnPos);
              empty = false;
              spawnPos = {
                x: Math.round(Math.random() * (GRIDSIZE - 20)) + 10,
                y: Math.round(Math.random() * (GRIDSIZE - 20)) + 10,
              };
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
