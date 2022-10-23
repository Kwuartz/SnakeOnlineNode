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

const players = [];
let multiplayerGame;
let multiplayerRoom = "multiplayer"

const singlePlayerGames = []

app.use(express.static(__dirname + "/public/"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + '/public/main/index.html');
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
    if (multiplayerGame) {} else {
      multiplayerGame = createGameState();
      gameInterval(multiplayerRoom, multiplayerGame);
      console.log("New game instance created!")
    }

    socket.join(multiplayerRoom)
    players[socket.id] = userName;
    console.log(userName + " has connected!");
    socket.emit("player-connected", userName);
    multiplayerGame.players[userName] = createNewPlayer();
  });

  socket.on("player-respawn", (userName, gameType, username) => {
    if (gameType == "multiplayer") {
      userName = players[socket.id];
      console.log(userName + " has respawned!");
      if (multiplayerGame.players) {
        multiplayerGame.players[userName] = createNewPlayer();
      }
    } else {
      singlePlayerGames[username].players[username] = createNewPlayer();
    }
  })

  socket.on("change-direction", (direction, gameType, username) => {
    if (gameType == "multiplayer") {
      const userName = players[socket.id];
      if (multiplayerGame.players) {
        let player = multiplayerGame.players[userName]; 
        player = changeDirection(direction, multiplayerGame, player);
      }
    } else {
      let player = singlePlayerGames[username].players[username]
      player = changeDirection(direction, singlePlayerGames[username], player);
    }
  });

  socket.on("disconnect", () => {
    console.log("Player " + socket.id + " disconnected")
    if (multiplayerGame) {
      const userName = players[socket.id]
      if (userName) {
        delete multiplayerGame.players[userName];
        delete players[socket.id];
        if (Object.keys(multiplayerGame.players).length == 0) {
          delete multiplayerGame
          console.log("Game instance terminated!")
        }
      }
    }
  });

  // Kills player when they have died
  socket.on("player-death", (gameType, username) => {
    if (gameType == "multiplayer") {
      userName = players[socket.id]
      if (userName && multiplayerGame.players[userName]) {
        delete multiplayerGame.players[userName];
        socket.emit("player-died")
      }
    } else {
      delete singlePlayerGames[username].players[username]
      socket.emit("player-died")
    }
  })

  socket.on("chat-message", (message) => {
    username = players[socket.id]
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

  socket.on("new-singleplayer", (userName) => {
    console.log("New single player game!")
    singlePlayerGames[userName] = createGameState()
    singlePlayerGames[userName].players[userName] = createNewPlayer()
    gameInterval(socket.id, singlePlayerGames[userName])
    socket.emit("player-connected", userName)
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
  }, 1000 / gamestate.fps);
}

function partyInterval(room, gamestate) {
  const interval = setInterval(() => {
    gamestate = gameLoop(gamestate);
    io.to(room).emit("new-gamestate", gamestate);
    if (gamestate.party == false) {
      clearInterval(interval)
      gameInterval(room)
    }
  }, 1000 / (gamestate.fps * 2));
}