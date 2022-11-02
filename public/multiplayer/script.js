Swal.fire({
  titleText: "Submit your username!",
  inputPlaceholder: "Enter your username",
  html: `<input type="text" id="username" class="swal2-input" placeholder="Enter your username!">`,
  inputAttributes: {
    autocapitalize: "off",
    autocorrect: "off",
    maxLength: 20,
  },
  confirmButtonText: 'Play',
  showLoaderOnConfirm: true,
  allowEscapeKey: false,
  allowOutsideClick: false,
  preConfirm: () => {
    const username = Swal.getPopup().querySelector('#username').value
    if (!username) {
      Swal.showValidationMessage("Your username cannot be blank!")
    } else if (username.length > 30) {
      Swal.showValidationMessage("Your username is too long!")
    } else if (!/^[A-Za-z0-9_ ]*$/.test(username)) {
      Swal.showValidationMessage("You cannot inclue  special characters in your username!")
    }
    return {username:username};
  }
}).then((result) => {
  socket.emit("new-multiplayer", result.value.username);
})

socket.on("username-taken", () => {
  Swal.fire({
    titleText: "This username is taken!",
    inputPlaceholder: "Enter another username!",
    html: `<input type="text" id="username" class="swal2-input" placeholder="Enter your username!">`,
    inputAttributes: {
      autocapitalize: "off",
      autocorrect: "off",
      maxLength: 20,
    },
    confirmButtonText: 'Play',
    showLoaderOnConfirm: true,
    allowEscapeKey: false,
    allowOutsideClick: false,
    preConfirm: () => {
      const username = Swal.getPopup().querySelector('#username').value
      if (!username) {
        Swal.showValidationMessage("Your username cannot be blank!")
      } else if (username.length > 30) {
        Swal.showValidationMessage("Your username is too long!")
      } else if (!/^[A-Za-z0-9_ ]*$/.test(username)) {
        Swal.showValidationMessage("You cannot inclue  special characters in your username!")
      }
      return {username:username};
    }
  }).then((result) => {
    socket.emit("new-multiplayer", result.value.username);
  })
})

socket.on("player-died", () => {
  Swal.fire({
    titleText: "Respawning...",
    html: 'You will respawn in <timer></timer> seconds.',
    timer: 3500,
    timerProgressBar: true,
    allowEscapeKey: false,
    allowOutsideClick: false,
    width: "25vw",
    didOpen: () => {
      Swal.showLoading()
      const respawnTimer = Swal.getHtmlContainer().querySelector('timer')
      timerInterval = setInterval(() => {
        respawnTimer.textContent = Math.round(Swal.getTimerLeft()/1000)
      }, 100)
    },
    willClose: () => {
      clearInterval(timerInterval)
    }
  }).then(() => {
    console.log
    socket.emit("player-respawn", "multiplayer")
    localPlayerDead = false
  })
})

regex = /^[A-Z a-z0-9_ ]/