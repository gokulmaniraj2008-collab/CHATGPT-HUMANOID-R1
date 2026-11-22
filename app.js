const cameraPreview = document.querySelector("#cameraPreview");
const cameraStatus = document.querySelector("#cameraStatus");
const startCamera = document.querySelector("#startCamera");
const stopCamera = document.querySelector("#stopCamera");
const heardText = document.querySelector("#heardText");
const listenStatus = document.querySelector("#listenStatus");
const startListening = document.querySelector("#startListening");
const stopListening = document.querySelector("#stopListening");
const speechSupport = document.querySelector("#speechSupport");
const voiceLanguage = document.querySelector("#voiceLanguage");
let cameraStream = null;
let recognition = null;

startCamera.addEventListener("click", async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraStatus.textContent = "Camera unavailable";
    return;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    cameraPreview.srcObject = cameraStream;
    cameraStatus.textContent = "Camera on";
    startCamera.disabled = true;
    stopCamera.disabled = false;
  } catch (error) {
    cameraStatus.textContent = error.name === "NotAllowedError" ? "Permission denied" : "Camera error";
  }
});

function stopCameraStream() {
  cameraStream?.getTracks().forEach(track => track.stop());
  cameraStream = null;
  cameraPreview.srcObject = null;
  cameraStatus.textContent = "Camera off";
  startCamera.disabled = false;
  stopCamera.disabled = true;
}
stopCamera.addEventListener("click", stopCameraStream);
window.addEventListener("pagehide", stopCameraStream);

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = voiceLanguage.value;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = event => {
    let finalText = "";
    let interimText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalText += transcript + " ";
      else interimText += transcript;
    }
    if (finalText) heardText.value = (heardText.value + " " + finalText).trim();
    heardText.dataset.interim = interimText;
  };
  recognition.onstart = () => {
    listenStatus.textContent = "Listening";
    startListening.disabled = true;
    stopListening.disabled = false;
  };
  recognition.onerror = event => {
    listenStatus.textContent = "Mic: " + event.error;
  };
  recognition.onend = () => {
    listenStatus.textContent = "Microphone off";
    startListening.disabled = false;
    stopListening.disabled = true;
  };
  speechSupport.textContent = "Speech recognition is available in this browser. Tap Start listening and allow microphone access.";
} else {
  startListening.disabled = true;
  stopListening.disabled = true;
  speechSupport.textContent = "Speech recognition is not supported in this browser. You can still type text and use Speak aloud.";
}

startListening.addEventListener("click", () => {
  if (!recognition) return;
  try { recognition.lang = voiceLanguage.value; recognition.start(); } catch (error) { listenStatus.textContent = "Already starting"; }
});
stopListening.addEventListener("click", () => recognition?.stop());

document.querySelector("#speak").addEventListener("click", () => {
  const text = document.querySelector("#replyText").value.trim();
  if (!text || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voiceLanguage.value;
  window.speechSynthesis.speak(utterance);
});
document.querySelector("#stopSpeaking").addEventListener("click", () => window.speechSynthesis?.cancel());


const askAIButton = document.querySelector("#askAI");
const accessCodeInput = document.querySelector("#accessCode");
const aiStatus = document.querySelector("#aiStatus");
const aiHint = document.querySelector("#aiHint");
const replyText = document.querySelector("#replyText");

askAIButton.addEventListener("click", async () => {
  const message = heardText.value.trim();
  const accessCode = accessCodeInput.value;
  if (!message) {
    aiHint.textContent = "First speak into the microphone or type a message in Recognized speech.";
    return;
  }
  if (!accessCode) {
    aiHint.textContent = "Enter your private access code first.";
    accessCodeInput.focus();
    return;
  }

  askAIButton.disabled = true;
  aiStatus.textContent = "Thinking…";
  aiHint.textContent = "Sending text securely to your Vercel backend…";
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-humanoid-access-code": accessCode
      },
      body: JSON.stringify({ message, language: voiceLanguage.value })
    });
    const data = await response.json();
    if (!response.ok) {
      const messages = {
        AI_SETUP_INCOMPLETE: "AI setup is still in progress. The project owner needs to complete the server configuration. Your camera, microphone, and speaker remain available.",
        INVALID_ACCESS_CODE: "Access code not recognised. Please check the code and try again.",
        TOO_MANY_REQUESTS: "Too many messages in a short time. Please wait one minute before trying again.",
        AI_USAGE_LIMIT: "The AI service has reached its usage limit. The project owner needs to check API billing and usage limits.",
        AI_PROVIDER_ERROR: "The AI service is temporarily unable to answer. Please try again shortly.",
        EMPTY_AI_RESPONSE: "The AI returned an empty answer. Please send your message again.",
        AI_CONNECTION_ERROR: "Unable to reach the AI service. Check your internet connection and try again."
      };
      throw new Error(messages[data.errorCode] || data.error || "Something went wrong while contacting the AI. Please try again.");
    }
    replyText.value = data.reply;
    aiStatus.textContent = "AI connected";
    aiHint.textContent = "AI replied. Tap Speak aloud below to hear the answer.";
  } catch (error) {
    aiStatus.textContent = "Not connected";
    aiHint.textContent = error.message || "Could not contact the AI backend.";
  } finally {
    askAIButton.disabled = false;
  }
});
