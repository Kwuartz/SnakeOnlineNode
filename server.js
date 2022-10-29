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
      "http://snakeonline.ddns.net",
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
const { createGameState, createNewPlayer, changeDirection, gameLoop } = require("./gamelogic");

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
      if (!multiplayerGame) {
        multiplayerGame = createGameState();
        gameInterval(multiplayerRoom, multiplayerGame);
        console.log(`New multiplayer game instance created!`)
      }
      
      socket.join(multiplayerRoom)
      multiplayerPlayers[socket.id] = userName;
      console.log(userName + " has connected!");
      socket.emit("player-connected", userName);
      multiplayerGame.players[userName] = createNewPlayer(multiplayerGame);

      // Sending the room the gamestate again each time a new player joins
      let initialGamestate = {...multiplayerGame}
      delete initialGamestate.interval
      delete initialGamestate.colours
      io.to(multiplayerRoom).emit("new-gamestate", initialGamestate)
    }
  });

  socket.on("new-singleplayer", () => {
    console.log("New single player game instance created!")
    singlePlayerGames[socket.id] = createGameState()
    singlePlayerGames[socket.id].players["player"] = createNewPlayer(singlePlayerGames[socket.id])
    gameInterval(socket.id, singlePlayerGames[socket.id])
    socket.emit("player-connected")

    // Sending initial game state
    let initialGamestate = {...singlePlayerGames[socket.id]}
    delete initialGamestate.interval
    delete initialGamestate.colours
    socket.emit("new-gamestate", initialGamestate)
  })

  socket.on("player-respawn", (gameType) => {
    if (gameType == "multiplayer") {
      userName = multiplayerPlayers[socket.id];
      console.log(userName + " has respawned!");
      if (multiplayerGame) {
        multiplayerGame.players[userName] = createNewPlayer(multiplayerGame);

        let initialGamestate = {...multiplayerGame}
        delete initialGamestate.interval
        delete initialGamestate.colours
        io.to(multiplayerRoom).emit("new-gamestate", initialGamestate)
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
      if (multiplayerGame.players[userName] && !multiplayerGame.players[userName].speedIncrease) {
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

function reduceGamestate(oldGamestate, newGamestate, sendSegments) {
  // Checking game settings
  let reducedGamestate = {}
  reducedGamestate.party = newGamestate.party

  // Checking food pos
  newGamestate.foodPos.forEach((newFoodPos) => {
    let isNew = true
    oldGamestate.foodPos.forEach((oldFoodPos) => {
      if (newFoodPos.x === oldFoodPos.x && newFoodPos.y === oldFoodPos.y) {
        isNew = false
      }
    })

    if (isNew) {
      if (!reducedGamestate.foodPos) {
        reducedGamestate.foodPos = []
      }
      reducedGamestate.foodPos[newGamestate.foodPos.indexOf(newFoodPos)] = newFoodPos
    }
  })

  // Checking players
  reducedGamestate.players = {}
  for (newPlayerName in newGamestate.players) {
    newPlayer = newGamestate.players[newPlayerName]
    reducedGamestate.players[newPlayerName] = {
      headPos: newPlayer.headPos,
      segments: [],
      movementDirection: newPlayer.movementDirection
    }
    if (sendSegments) {
      reducedGamestate.players[newPlayerName].segments = newPlayer.segments
    } else {
      reducedGamestate.players[newPlayerName].segments = newPlayer.segments.length
    }
    if (newPlayer.dead) {
      reducedGamestate.players[newPlayerName].dead = true
    }
  }
  return reducedGamestate
}

function gameInterval(room, gamestate) {
  let lastFullState = 0
  // Game interval
  gamestate.interval = setInterval(() => {
    let oldGamestate = JSON.parse(JSON.stringify(gamestate))
    let reducedGamestate
    gamestate = gameLoop(gamestate);
    if (lastFullState) {
      reducedGamestate = reduceGamestate(oldGamestate, gamestate, false);
      lastFullState--
    } else {
      reducedGamestate = reduceGamestate(oldGamestate, gamestate, true);
      lastFullState = gamestate.fps * 2
    }
    io.to(room).emit("new-gamestate", reducedGamestate);

    if (gamestate.party == true) {
      clearInterval(gamestate.interval)
      partyInterval(room, gamestate)
    }
  }, 1000 / FPS);
}

// Double speed when on party mode
function partyInterval(room, gamestate) {
  let lastFullState = 0
  gamestate.interval = setInterval(() => {
    let oldGamestate = JSON.parse(JSON.stringify(gamestate))
    let reducedGamestate
    gamestate = gameLoop(gamestate);
    if (lastFullState) {
      reducedGamestate = reduceGamestate(oldGamestate, gamestate, false);
      lastFullState--
    } else {
      reducedGamestate = reduceGamestate(oldGamestate, gamestate, false);
      lastFullState = gamestate.fps * 10
    }
    io.to(room).emit("new-gamestate", reducedGamestate);
    if (gamestate.party == false) {
      clearInterval(gamestate.interval)
      gameInterval(room, gamestate)
    }
  }, 1000 / (FPS * 2));
}