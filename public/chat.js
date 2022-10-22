const chatInput = document.getElementById("chat-input")
const chatForm = document.getElementById("chat-form")
const chatContainer = document.getElementById("chat-container")

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  let message = chatInput.value
  if (message) {
    socket.emit("chat-message", message)
    chatInput.value = ""
    message = ""
  }
});

socket.on("message-recieved", (message, username) => {
  messageElement = document.createElement("div");
  messageElement.setAttribute("id", "chat-message")
  if (username) {
    messageElement.innerText = username + ": " + message;
  } else {
    messageElement.innerText = message;
  }
  chatContainer.appendChild(messageElement);
})
