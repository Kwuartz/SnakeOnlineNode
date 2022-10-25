const express = require('express');
const app = express();
const http = require("http").Server(app);
const port = process.env.PORT || 3000;
const { instrument } = require("@socket.io/admin-ui");
const io = require("socket.io")(http, {
  cors: {
    origin: [
      "http://localhost:3000",  
      "http://127.0.0.1:5500",
      "https://admin.socket.io",
      "https://snake-online-dan.herokuapp.com",
      "https://snakeonlinevercel.vercel.app"
    ],
    methods: ["GET", "POST"],
    transports: ['websocket', 'polling'],
    credentials: true
  },
  allowEIO3: true
});

instrument(io, {
  auth: false,
});

const { FPS } = require("./constants");
const { createGameState } = require("./game");
const { createNewPlayer } = require("./game");
const { changeDirection } = require("./game");
const { gameLoop } = require("./game");

const multiplayerPlayers = {};
let multiplayerGame;
let multiplayerRoom = "multiplayer"

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
      console.log("username-taken")
    } else {
      if (multiplayerGame) {} else {
        multiplayerGame = createGameState();
        gameInterval(multiplayerRoom, multiplayerGame);
        console.log("New multiplayer game instance created!")
      }

      socket.join(multiplayerRoom)
      multiplayerPlayers[socket.id] = userName;
      console.log(userName + " has connected!");
      socket.emit("player-connected", userName);
      multiplayerGame.players[userName] = createNewPlayer();
    }
  });

  socket.on("new-singleplayer", () => {
    console.log("New single player game instance created!")
    singlePlayerGames[socket.id] = createGameState()
    singlePlayerGames[socket.id].players["player"] = createNewPlayer()
    gameInterval(socket.id, singlePlayerGames[socket.id])
    socket.emit("player-connected")
  })

  socket.on("player-respawn", (userName, gameType) => {
    if (gameType == "multiplayer") {
      userName = multiplayerPlayers[socket.id];
      console.log(userName + " has respawned!");
      if (multiplayerGame) {
        multiplayerGame.players[userName] = createNewPlayer();
      }
    } else if (gameType == "singleplayer") {
      singlePlayerGames[socket.id].players["player"] = createNewPlayer();
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
        delete multiplayerGame.players[userName];
        delete multiplayerPlayers[socket.id];
        if (Object.keys(multiplayerGame.players).length == 0) {
          delete multiplayerGame
          console.log("Multiplayer game instance terminated!")
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
        multiplayerGame.players[userName].speedIncrease += 10
      }
    } else {
      singlePlayerGames[socket.id].players["player"].speedIncrease += 10 
    }
  })

  socket.on("chat-message", (message) => {
    username = multiplayerPlayers[socket.id]
    if (message == "party") {
      if (multiplayerGame.party) {
        multiplayerGame.party = false
      } else {
        multiplayerGame.party = true
      }
    } else if (message == "stop party") {
      multiplayerGame.party = false
    }

    io.emit("message-recieved", message, username);
  })

  socket.on("server-message", (message) => {
    io.emit("message-recieved", message);
  })
});

function gameInterval(room, gamestate) {
  const interval = setInterval(() => {
    gamestate = gameLoop(gamestate);
    io.to(room).emit("new-gamestate", gamestate);
    if (gamestate.party == true) {
      clearInterval(interval)
      partyInterval(room)
    }
  }, 1000 / FPS);
}

function partyInterval(room, gamestate) {
  const interval = setInterval(() => {
    gamestate = gameLoop(gamestate);
    io.to(room).emit("new-gamestate", gamestate);
    if (gamestate.party == false) {
      clearInterval(interval)
      gameInterval(room)
    }
  }, 1000 / (FPS * 2));
}