const chatInput = document.getElementById("chat-input");
const chatForm = document.getElementById("chat-form");
const messageContainer = document.getElementById("message-container");

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  let message = chatInput.value;
  if (message) {
    socket.emit("chat-message", message);
    chatInput.value = "";
    message = "";
  }
});

socket.on("message-recieved", (message, username, color) => {
  let messageElement = document.createElement("div");
  if (username) {
    messageElement.innerText = username + ": " + message;
    messageElement.style.backgroundColor = color;
  } else {
    messageElement.innerText = message;
  }

  messageContainer.appendChild(messageElement);
  messageContainer.scrollTop = messageContainer.scrollHeight;
});
