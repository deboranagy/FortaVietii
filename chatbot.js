const chatbotButton = document.getElementById("chatbot-button");
const chatbotWindow = document.getElementById("chatbot-window");
const chatbotClose = document.getElementById("chatbot-close");
const chatbotInput = document.getElementById("chatbot-input");
const chatbotSend = document.getElementById("chatbot-send");
const chatbotMessages = document.getElementById("chatbot-messages");

let chatHistory = [];

chatbotButton.addEventListener("click", () => {
  chatbotWindow.classList.remove("hidden");
});

chatbotClose.addEventListener("click", () => {
  chatbotWindow.classList.add("hidden");
  chatHistory = [];
  resetChatMessages();
});

chatbotSend.addEventListener("click", sendMessage);

chatbotInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    sendMessage();
  }
});

async function sendMessage() {
  const message = chatbotInput.value.trim();

  if (!message) return;

  addMessage(message, "user-message");
  chatbotInput.value = "";

  chatHistory.push({
    role: "user",
    content: message,
  });

  addMessage(
    "Se generează răspunsul...",
    "bot-message",
    "loading-message"
  );

  try {
    const response = await fetch(
      "https://forta-vietii-chatbot.onrender.com/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          history: chatHistory.slice(-10),
        }),
      }
    );

    const data = await response.json();

    removeLoadingMessage();

    if (data.reply) {
      addMessage(data.reply, "bot-message");

      chatHistory.push({
        role: "assistant",
        content: data.reply,
      });
    } else {
      addMessage(
        "Nu am putut genera un răspuns momentan.",
        "bot-message"
      );
    }
  } catch (error) {
    removeLoadingMessage();

    addMessage(
      "Eroare de conectare la serverul chatbot.",
      "bot-message"
    );

    console.error(error);
  }
}

function addMessage(text, className, extraClass = "") {
  const messageDiv = document.createElement("div");

  messageDiv.className = `${className} ${extraClass}`;
  messageDiv.textContent = text;

  chatbotMessages.appendChild(messageDiv);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function removeLoadingMessage() {
  const loadingMessage = document.querySelector(".loading-message");

  if (loadingMessage) {
    loadingMessage.remove();
  }
}

function resetChatMessages() {
  chatbotMessages.innerHTML = "";

  const botMessage = document.createElement("div");

  botMessage.className = "bot-message";

  botMessage.innerHTML =
    "Bună! Sunt asistentul virtual al Asociației Forța Vieții.<br>Cu ce te pot ajuta?";

  chatbotMessages.appendChild(botMessage);
}
