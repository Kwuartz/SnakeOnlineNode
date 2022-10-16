const express = require('express');
const app = express();
const http = require("http").Server(app);
const path = require("path");
const port = process.env.PORT || 3000;
const { instrument } = require("@socket.io/admin-ui");
const io = require("socket.io")(http, {
  cors: {
    origin: [
      "http://localhost:5500",
      "http://localhost:3000",  
      "http://127.0.0.1:5500",
      "https://admin.socket.io",
      "https://snake-online-dan.herokuapp.com"
    ],
    credentials: true,
  },
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
let game;

app.use(express.static(__dirname + "/public/"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get("/test", (req, res) => {
  res.sendFile(__dirname + '/public/test.html');
});

http.listen(port, () => {
  console.log("Listening on port: " + port);
});

io.on("connection", (socket) => {
  console.log("User connected with id: " + socket.id);
  socket.on("new-player", (userName) => {
    if (game) {
    } else {
      game = createGameState();
      startGameInterval(game);
    }
    players[socket.id] = userName;
    console.log(userName + " has connected!");
    socket.emit("player-connected", userName);
    game.players[userName] = createNewPlayer();
  });

  socket.on("change-direction", (direction) => {
    const userName = players[socket.id];
    let player = game.players[userName];
    player = changeDirection(direction, game, player);
  });

  socket.on("disconnect", () => {
    if (game) {
      const userName = players[socket.id]
      delete game.players[userName];
      delete players[socket.id];
    }
    console.log("Player " + socket.id + " disconnected")
  });

  // Kills player when they have died
  socket.on("player-death", () => {
    userName = players[socket.id]
    delete game.players[userName];
    socket.emit("player-died")
  })
});

function noop() {}

function startGameInterval() {
  startGameInterval = noop;
  const interval = setInterval(() => {
    game = gameLoop(game, io);
    io.emit("new-gamestate", game);
  }, 1000 / FPS);
}
