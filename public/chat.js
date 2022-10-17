const chatInput = document.getElementById("chat-input")
const chatForm = document.getElementById("chat-form")

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  let message = chatInput.value
  if (message) {
    socket.emit("chat-message", message)
    message = ""
  }
});

socket.on("message-recieved", (message) => {
  console.log(message);
})
