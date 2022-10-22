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
    foodPos: [
      { x: 10, y: 10 },
      { x: 30, y: 30 },
      { x: 40, y: 40 },
      { x: 0, y: 0 },
    ],
    gridSize: GRIDSIZE,
  };
}

function createNewPlayer() {
  return {
    headPos: {
      x: 7,
      y: 10,
    },
    movementDirection: {
      x: 1,
      y: 0,
    },
    segments: [
      { x: 5, y: 10 },
      { x: 6, y: 10 },
      { x: 7, y: 10 },
    ],
    dead: false,
    newSegments: 0,
    snakeColour: randomColour(),
  };
}

function gameLoop(game) {
  let segment,
    segments,
    headPos,
    player,
    players,
    isHead,
    foodPos,
    newSegment;
  players = game.players;
  foodPos = game.foodPos;
  // Moves the players snakes and adds new segments
  for (playerName in players) {
    player = players[playerName];
    if (player.dead == false) {
      segments = player.segments;
      headPos = player.headPos;
      movementDirection = player.movementDirection;

      // If the player is waiting to have new segments added make a copy of the last segment before it moves and then add it afterwards
      if (player.newSegments) {
        newSegment = { ...segments[0] };
      }

      // Moves players
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
    }
    if (player.newSegments) {
      addSegment(player, newSegment);
    }
  }

  for (playerName in players) {
    player = players[playerName];
    if (player.dead == false) {
      // Checks if players hits into themselves
      segments = player.segments;
      headPos = player.headPos;
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
            oponentSegment = oponentSegments[oponentSegmentIndex];
            if (
              headPos &&
              headPos.x == oponentSegment.x &&
              headPos.y == oponentSegment.y
            ) {
              player.dead = true;
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
          player.newSegments += 3;
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
  return game;
}

function changeDirection(direction, game, player) {
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

function randomColour() {
  let colour = COLOURS[Math.floor(Math.random() * COLOURS.length)];
  return colour;
}
