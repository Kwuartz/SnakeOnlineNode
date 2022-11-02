const express = require("express");
const app = express();
const http = require("http").Server(app);
const port = process.env.PORT || 3000;
const msgpackParser = require("socket.io-msgpack-parser");
const io = require("socket.io")(http, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://admin.socket.io",
      "https://snake-online-dan.herokuapp.com",
      "http://192.168.1.75",
      "http://snakeonline.ddns.net",
    ],
    methods: ["GET", "POST"],
    transports: ["websocket", "polling"],
    credentials: true,
  },
  allowEIO3: true,
  parser: msgpackParser,
});

const { instrument } = require("@socket.io/admin-ui");
instrument(io, {
  auth: false,
});

const { FPS } = require("./constants");
const {
  createGameState,
  createNewPlayer,
  changeDirection,
  gameLoop,
} = require("./gamelogic");

const multiplayerPlayers = {};
let multiplayerGames = {}
let deleteMultiTimeOut = false;

app.set("trust proxy", true);

app.use(express.static(__dirname + "/public/"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/main/index.html");
  var ip = req.headers["x-real-ip"] || req.connection.remoteAddress;
  console.log(ip);
});

app.get("/multiplayer", (req, res) => {
  res.sendFile(__dirname + "/public/multiplayer/index.html");
});

http.listen(port, () => {
  console.log("Listening on port: " + port);
});

io.on("connection", (socket) => {
  console.log("User connected with id: " + socket.id);
  socket.on("new-multiplayer", (userName) => {
    if (Object.values(multiplayerPlayers).includes(userName)) {
      socket.emit("username-taken");
    } else {
      let room
      if (Object.keys(multiplayerGames).length == 0) {
        room = "multi1"
        multiplayerGames[room] = createGameState();
        gameInterval(room, multiplayerGames[room]);
        console.log(`New multiplayer game instance created: ${room}!`);
        console.log("AAAAAA")
      } else {
        // Checking if games are full
        for (gameRoom in multiplayerGames) {
          if (Object.keys(multiplayerGames[gameRoom].players).length < 5) {
            room = gameRoom
            console.log(`${userName} has joined room ${room}!`)
          }
        }
        if (!room) {
          console.log(parseInt(Object.keys(multiplayerGames).length) + 1)
          room = `multi${Object.keys(multiplayerGames).length + 1}`
          multiplayerGames[room] = createGameState();
          gameInterval(room, multiplayerGames[room]);
          console.log(`New multiplayer game instance created: ${room}!`);
        }
      }

      socket.join(room);
      multiplayerPlayers[socket.id] = {}
      multiplayerPlayers[socket.id].userName = userName;
      multiplayerPlayers[socket.id].room = room
      console.log(userName + " has connected!");
      socket.emit("player-connected", userName);
      multiplayerGames[room].players[userName] = createNewPlayer(multiplayerGames[room]);

      // Sending the room the gamestate again each time a new player joins
      let initialGamestate = { ...multiplayerGames[room] };
      delete initialGamestate.interval;
      delete initialGamestate.colours;
      io.to(room).emit("new-gamestate", initialGamestate);
    }
  });


  socket.on("player-respawn", (gameType) => {
    if (gameType == "multiplayer") {
      const userName = multiplayerPlayers[socket.id].userName;
      const room = multiplayerPlayers[socket.id].room
      console.log(userName + " has respawned!");
      if (multiplayerGames[room]) {
        multiplayerGames[room].players[userName] = createNewPlayer(multiplayerGames[room]);

        let initialGamestate = { ...multiplayerGames[room] };
        delete initialGamestate.interval;
        delete initialGamestate.colours;
        io.to(room).emit("new-gamestate", initialGamestate);
      }
    }
  });

  socket.on("change-direction", (direction, gameType) => {
    if (gameType == "multiplayer") {
      const userName = multiplayerPlayers[socket.id].userName;
      const room = multiplayerPlayers[socket.id].room
      if (multiplayerGames[room].players) {
        let player = multiplayerGames[room].players[userName];
        player = changeDirection(direction, player);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("Player " + socket.id + " disconnected");
    if (multiplayerPlayers[socket.id]) {
      const room = multiplayerPlayers[socket.id].room
      if (multiplayerGames[room]) {
        const userName = multiplayerPlayers[socket.id].userName;
        if (userName) {
          if (multiplayerGames[room].players[userName]) {
            multiplayerGames[room].colours.push(
              multiplayerGames[room].players[userName].snakeColour
            );
            delete multiplayerGames[room].players[userName];
          }
          delete multiplayerPlayers[socket.id];
          if (
            deleteMultiTimeOut == false &&
            Object.keys(multiplayerGames[room].players).length <= 0
          ) {
            deleteMultiTimeOut = true;
            setTimeout(() => {
              if (Object.keys(multiplayerGames[room].players).length <= 0) {
                clearInterval(multiplayerGames[room].interval);
                delete multiplayerGames[room];
                console.log("Multiplayer game and interval instance terminated!");
              } else {
                deleteMultiTimeOut = false;
              }
            }, 10000);
          }
        }
      }
    }
  });

  // Kills player when they have died
  socket.on(("player-death"), () => {
    const room = multiplayerPlayers[socket.id].room
    const userName = multiplayerPlayers[socket.id].userName;
    if (userName && multiplayerGames[room].players[userName]) {
      multiplayerGames[room].colours.push(
        multiplayerGames[room].players[userName].snakeColour
      );
      delete multiplayerGames[room].players[userName];
      socket.emit("player-died");
    }
  });

  socket.on("chat-message", (message) => {
    const username = multiplayerPlayers[socket.id];
    const room = multiplayerPlayers[socket.id].room
    if (message == "party") {
      if (multiplayerGames[room].party) {
        multiplayerGames[room].party = false;
        io.to(room).emit("party", false)
      } else {
        multiplayerGames[room].party = true;
        io.to(room).emit("party", true)
      }
    }

    io.emit(
      "message-recieved",
      message,
      username,
      multiplayerGames[room].players[username].snakeColour
    );
  });

  socket.on("server-message", (message) => {
    io.emit("message-recieved", "Server: " + message);
  });
});

function reduceGamestate(oldGamestate, newGamestate, sendSegments) {
  // Checking game settings
  let reducedGamestate = {};

  // Checking food pos
  newGamestate.foodPos.forEach((newFoodPos) => {
    let isNew = true;
    oldGamestate.foodPos.forEach((oldFoodPos) => {
      if (newFoodPos.x === oldFoodPos.x && newFoodPos.y === oldFoodPos.y) {
        isNew = false;
      }
    });

    if (isNew) {
      if (!reducedGamestate.foodPos) {
        reducedGamestate.foodPos = [];
      }
      reducedGamestate.foodPos[newGamestate.foodPos.indexOf(newFoodPos)] =
        newFoodPos;
    }
  });

  // Checking power up pos
  newGamestate.powerupPos.forEach((newPowerupPos) => {
    let isNew = true;
    oldGamestate.powerupPos.forEach((oldPowerupPos) => {
      if (newPowerupPos.x === oldPowerupPos.x && newPowerupPos.y === oldPowerupPos.y) {
        isNew = false;
      }
    });

    if (isNew) {
      if (!reducedGamestate.powerupPos) {
        reducedGamestate.powerupPos = [];
      }
      reducedGamestate.powerupPos[newGamestate.powerupPos.indexOf(newPowerupPos)] =
      newPowerupPos;
    }
  });

  // Checks if any power ups were consumed
  oldGamestate.powerupPos.forEach((oldPowerupPos, oldPowerupIndex) => {
    if (newGamestate.powerupPos.every((newPowerupPos) => {
      return newPowerupPos.x != oldPowerupPos.x || newPowerupPos.y != oldPowerupPos.y
    })) {
      if (!reducedGamestate.powerupPos) {
        reducedGamestate.powerupPos = [];
      }
      console.log("Eaten")
      reducedGamestate.powerupPos[oldPowerupIndex] = "used"
    }
  });

  // Checking players
  reducedGamestate.players = {};
  for (newPlayerName in newGamestate.players) {
    newPlayer = newGamestate.players[newPlayerName];
    reducedGamestate.players[newPlayerName] = {
      headPos: newPlayer.headPos,
      segments: [],
      movementDirection: newPlayer.movementDirection,
    };
    if (sendSegments) {
      reducedGamestate.players[newPlayerName].segments = newPlayer.segments;
    } else {
      reducedGamestate.players[newPlayerName].segments =
        newPlayer.segments.length;
    }
    if (newPlayer.dead) {reducedGamestate.players[newPlayerName].dead = true;}
    if (newPlayer.newSegments - 5 == oldGamestate.players[newPlayerName].newSegments) {reducedGamestate.players[newPlayerName].foodEaten = true}
  }
  return reducedGamestate;
}

function gameInterval(room, gamestate) {
  let lastFullState = 0;
  // Game interval
  gamestate.interval = setInterval(() => {
    let oldGamestate = JSON.parse(JSON.stringify(gamestate));
    let reducedGamestate;
    gamestate = gameLoop(gamestate);
    if (lastFullState) {
      reducedGamestate = reduceGamestate(oldGamestate, gamestate, false);
      lastFullState--;
    } else {
      reducedGamestate = reduceGamestate(oldGamestate, gamestate, true);
      lastFullState = gamestate.fps * 10;
    }

    io.to(room).emit("new-gamestate", reducedGamestate);

    if (gamestate.party == true) {
      clearInterval(gamestate.interval);
      partyInterval(room, gamestate);
    }
  }, 1000 / FPS);
}

// Double speed when on party mode
function partyInterval(room, gamestate) {
  let lastFullState = 0;
  gamestate.interval = setInterval(() => {
    let oldGamestate = JSON.parse(JSON.stringify(gamestate));
    let reducedGamestate;
    gamestate = gameLoop(gamestate);
    if (lastFullState) {
      reducedGamestate = reduceGamestate(oldGamestate, gamestate, false);
      lastFullState--;
    } else {
      reducedGamestate = reduceGamestate(oldGamestate, gamestate, true);
      lastFullState = gamestate.fps * 10;
    }

    io.to(room).emit("new-gamestate", reducedGamestate);
    if (gamestate.party == false) {
      clearInterval(gamestate.interval);
      gameInterval(room, gamestate);
    }
  }, 1000 / (FPS * 2));
}
