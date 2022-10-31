const leaderboard = document.getElementById("leaderboard");
let lastUpdated = 0;

// If delay is done update leaderboard
socket.on("new-gamestate", (gamestate) => {
  if (lastUpdated < Date.now() - 100) {
    lastUpdated = Date.now();
    let players = gamestate.players;
    updateLeaderboard(players);
  }
});

function updateLeaderboard(players) {
  // Clears leaderboard
  let playerScores = [];
  let orderedScores = [];

  // Updates playerScores array
  for (player in players) {
    playerScores[player] = players[player].segments.length - 3;
  }

  // Sorts values of playerScores array
  let scores = Object.values(playerScores);
  scores.sort();
  scores.reverse();

  // Matches up players to their ordered scores and puts the scores in a new array
  for (score in scores) {
    for (player in playerScores) {
      if (playerScores[player] == scores[score]) {
        orderedScores[player] = scores[score];
        delete playerScores[player];
      }
    }
  }

  leaderboardElements = []
  // Creates leaderboard with the scores
  for (player in orderedScores) {
    let scoreElement = document.createElement("div");
    scoreElement.innerText = player + ": " + orderedScores[player];
    leaderboardElements.push(scoreElement);
  }
  leaderboard.replaceChildren(...leaderboardElements)
}
