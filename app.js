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
