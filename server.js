const express = require('express');
const app = express();
const http = require("http").Server(app);
const port = process.env.PORT || 3000;
const msgpackParser = require('socket.io-msgpack-parser');
const io = require("socket.io")(http, {
  cors: {
    origin: [
      "http://localhost:3000",  
      "https://admin.socket.io",
      "https://snake-online-dan.herokuapp.com",
      "http://192.168.1.75",
      "http://snakeonline.ddns.net"
    ],
    methods: ["GET", "POST"],
    transports: ['websocket', 'polling'],
    credentials: true
  },
  allowEIO3: true,
  parser: msgpackParser
});

const  { instrument } = require("@socket.io/admin-ui");
instrument(io, {
  auth: false,
});

const { FPS } = require("./constants");
const { createGameState, createNewPlayer, changeDirection, gameLoop } = require("./game");

const multiplayerPlayers = {};
let multiplayerGame;
let multiplayerRoom = "multiplayer"
let deleteMultiTimeOut = false

const singlePlayerGames = []

app.set('trust proxy', true)

app.use(express.static(__dirname + "/public/"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + '/public/main/index.html');
  var ip = req.headers['x-real-ip'] || req.connection.remoteAddress;
  console.log(ip)
});

app.get("/multiplayer", (req, res) => {
  res.sendFile(__dirname + '/public/multiplayer/index.html');
});

app.get("/singleplayer", (req, res) => {
  res.sendFile(__dirname + '/public/singleplayer/index.html');
});

http.listen(port, () => {
  console.log("Listening on port: " + port);
});

io.on("connection", (socket) => {
  console.log("User connected with id: " + socket.id);
  socket.on("new-multiplayer", (userName) => {
    if (Object.values(multiplayerPlayers).includes(userName)) {
      socket.emit("username-taken")
    } else {
      if (multiplayerGame) {
        socket.join(multiplayerRoom)
        multiplayerPlayers[socket.id] = userName;
        console.log(userName + " has connected!");
        socket.emit("player-connected", userName);
        multiplayerGame.players[userName] = createNewPlayer(multiplayerGame);
      } else {
        multiplayerGame = createGameState();

        multiplayerGame.players[userName] = createNewPlayer(multiplayerGame);
        socket.join(multiplayerRoom)
        multiplayerPlayers[socket.id] = userName;
        socket.emit("player-connected", userName);

        gameInterval(multiplayerRoom, multiplayerGame);
        console.log(`New multiplayer game instance created because ${userName} joined!`)
      }
    }
  });

  socket.on("new-singleplayer", () => {
    console.log("New single player game instance created!")
    singlePlayerGames[socket.id] = createGameState()
    singlePlayerGames[socket.id].players["player"] = createNewPlayer(singlePlayerGames[socket.id])
    gameInterval(socket.id, singlePlayerGames[socket.id])
    socket.emit("player-connected")
  })

  socket.on("player-respawn", (userName, gameType) => {
    if (gameType == "multiplayer") {
      userName = multiplayerPlayers[socket.id];
      console.log(userName + " has respawned!");
      if (multiplayerGame) {
        multiplayerGame.players[userName] = createNewPlayer(multiplayerGame);
      }
    } else if (gameType == "singleplayer") {
      singlePlayerGames[socket.id].players["player"] = createNewPlayer(singlePlayerGames[socket.id]);
    }
  })

  socket.on("change-direction", (direction, gameType) => {
    if (gameType == "multiplayer") {
      const userName = multiplayerPlayers[socket.id];
      if (multiplayerGame.players) {
        let player = multiplayerGame.players[userName]; 
        player = changeDirection(direction, player);
      }
    } else if (gameType == "singleplayer") {
      let player = singlePlayerGames[socket.id].players["player"]
      player = changeDirection(direction, player);
    }
  });

  socket.on("disconnect", () => {
    console.log("Player " + socket.id + " disconnected")
    if (multiplayerGame) {
      const userName = multiplayerPlayers[socket.id]
      if (userName) {
        if (multiplayerGame.players[userName]) {
          multiplayerGame.colours.push(multiplayerGame.players[userName].snakeColour)
          delete multiplayerGame.players[userName];
        }
        delete multiplayerPlayers[socket.id];
        if (deleteMultiTimeOut == false && Object.keys(multiplayerGame.players).length <= 0) {
          deleteMultiTimeOut = true
          setTimeout(() => {
            if (Object.keys(multiplayerGame.players).length <= 0) {
              clearInterval(multiplayerGame.interval)
              multiplayerGame = undefined
              console.log("Multiplayer game and interval instance terminated!")
            } else {
              deleteMultiTimeOut = false
            }
          }, 10000)
        }
      }
    } else if (singlePlayerGames[socket.id]) {
      delete singlePlayerGames[socket.id]
      console.log("Single player game instance terminated!")
    }
  });

  // Kills player when they have died
  socket.on("player-death", (gameType) => {
    if (gameType == "multiplayer") {
      userName = multiplayerPlayers[socket.id]
      if (userName && multiplayerGame.players[userName]) {
        multiplayerGame.colours.push(multiplayerGame.players[userName].snakeColour)
        delete multiplayerGame.players[userName];
        socket.emit("player-died")
      }
    } else if (gameType == "singleplayer") {
      delete singlePlayerGames[socket.id].players["player"]
      socket.emit("player-died")
    }
  })

  // Speeds up player when they press space
  socket.on("speedIncrease", (gameType) => {
    if (gameType == "multiplayer") {
      userName = multiplayerPlayers[socket.id]
      if (multiplayerGame.players[userName]) {
        multiplayerGame.players[userName].speedIncrease += 5
      }
    } else {
      singlePlayerGames[socket.id].players["player"].speedIncrease += 5 
    }
  })

  socket.on("ping", (cb) => {
    cb()
  });

  socket.on("chat-message", (message) => {
    username = multiplayerPlayers[socket.id]
    
    if (message == "party") {
      if (multiplayerGame.party) {
        multiplayerGame.party = false
      } else {
        multiplayerGame.party = true
        console.log("PARTY")
      }
    } else if (message == "stop party") {
      multiplayerGame.party = false
    }

    io.emit("message-recieved", message, username, multiplayerGame.players[username].snakeColour);
  })

  socket.on("server-message", (message) => {
    io.emit("message-recieved", "Server: " + message);
  })
});

function reduceGamestate(newGamestate, oldGamestate) {
  // Checking game settings
  let refinedGamestate = {}
  if (newGamestate.gridSize != oldGamestate.gridSize) {
    refinedGamestate.gridSize = newGamestate.gridSize
  }
  if (newGamestate.fps != oldGamestate.fps) {
    refinedGamestate.fps = newGamestate.fps
  }
  if (newGamestate.party != oldGamestate.party) {
    refinedGamestate.party = newGamestate.party
  }

  // Checking food pos
  newGamestate.foodPos.forEach((newFoodPos) => {
    let isNew = false
    oldGamestate.foodPos.forEach((oldFoodPos) => {
      if (newFoodPos.x != oldFoodPos.x && newFoodPos.y != oldFoodPos.y) {
        isNew = true
      }
    })
    if (isNew) {
      if (!refinedGamestate.foodPos) {
        refinedGamestate.foodPos = []
      }
      refinedGamestate.foodPos.push(newFoodPos)
    }
  })

  // Checking players
  refinedGamestate.players = {}
  for (newPlayerName in newGamestate.players) {
    newPlayer = newGamestate.players[newPlayerName]
    refinedGamestate.players[newPlayerName] = {}
    refinedGamestate.players[newPlayerName].headPos = newPlayer.headPos
    refinedGamestate.players[newPlayerName].segments = newPlayer.segments
    refinedGamestate.players[newPlayerName].dead = newGamestate.players[newPlayerName].dead
    if (!oldGamestate.players[newPlayerName]) {
      refinedGamestate.players[newPlayerName].snakeColour = newGamestate.players[newPlayerName].snakeColour
    }
  }
  return refinedGamestate
}

function gameInterval(room, gamestate) {
  // Emit initial gamestate
  io.to(room).emit("new-gamestate", gamestate);
  // Game interval
  gamestate.interval = setInterval(() => {
    let newGamestate = gameLoop(gamestate);
    let reducedGamestate = reduceGamestate(newGamestate, gamestate);
    gamestate = newGamestate
    io.to(room).emit("new-gamestate", reducedGamestate);
    if (gamestate.party == true) {
      clearInterval(gamestate.interval)
      partyInterval(room, gamestate)
    }
  }, 1000 / FPS);
}

// Double speed when on party mode
function partyInterval(room, gamestate) {
  gamestate.interval = setInterval(() => {
    gamestate = gameLoop(gamestate);
    refinedGamestate = {...gamestate}
    delete refinedGamestate.colours
    io.to(room).emit("new-gamestate", refinedGamestate);
    if (gamestate.party == false) {
      clearInterval(gamestate.interval)
      gameInterval(room, gamestate)
    }
  }, 1000 / (FPS * 2));
}