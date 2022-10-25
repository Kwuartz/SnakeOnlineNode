const leaderboard = document.getElementById("leaderboard")
let players
let lastUpdated = 0

// If delay is done update leaderboard
socket.on("new-gamestate", (gamestate) => {
  if (lastUpdated < Date.now() - 1000) {
    lastUpdated = Date.now()
    players = gamestate.players
    updateLeaderboard()
  }
})

function updateLeaderboard() {
  // Clears leaderboard
  while (leaderboard.firstChild) {
    leaderboard.removeChild(leaderboard.firstChild)
  }
  let playerScores = []
  let orderedScores = []

  // Updates playerScores array
  for (player in players) {
    playerScores[player] = players[player].segments.length - 3
  }

  // Sorts values of playerScores array
  let scores = Object.values(playerScores)
  scores.sort()
  scores.reverse()

  // Matches up players to their ordered scores and puts the scores in a new array
  for (score in scores) {
    for (player in playerScores) {
      if (playerScores[player] == scores[score]) {
        orderedScores[player] = scores[score]
        delete playerScores[player]
      }
    }
  }

  // Createsl eaderboard with the scores
  for (player in orderedScores) {
    let scoreElement = document.createElement("h5")
    scoreElement.innerText = player + ": " + orderedScores[player]
    leaderboard.appendChild(scoreElement)
  }
}