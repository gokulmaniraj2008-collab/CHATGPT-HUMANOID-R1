const $ = selector => document.querySelector(selector);
const cameraPreview=$("#cameraPreview"), cameraStatus=$("#cameraStatus");
const startCamera=$("#startCamera"), stopCamera=$("#stopCamera");
const heardText=$("#heardText"), listenStatus=$("#listenStatus");
const startListening=$("#startListening"), stopListening=$("#stopListening");
const speechSupport=$("#speechSupport"), voiceLanguage=$("#voiceLanguage");
const askAIButton=$("#askAI"), pairingPanel=$("#devicePairing");
const pairingCodeInput=$("#pairingCode"), connectDeviceButton=$("#connectDevice");
const aiStatus=$("#aiStatus"), aiHint=$("#aiHint"), replyText=$("#replyText");
const conversation=$("#conversation"), chatMessages=$("#chatMessages");
const welcome=$("#welcome"), thinking=$("#thinking");
const sidebar=$("#sidebar"), backdrop=$("#mobileBackdrop");
const toolsDrawer=$("#toolsDrawer");
let cameraStream=null, recognition=null, deviceConnected=false, lastReply="";

function setDeviceConnected(connected){
  deviceConnected=connected;
  pairingPanel.hidden=connected;
  aiStatus.textContent=connected?"Device paired":"Device not paired";
  $("#deviceSummary").textContent=connected?"Secure session active":"Pair this device to use AI assistant";
  $("#deviceDot").classList.toggle("online",connected);
  aiHint.textContent=connected?"Connected securely. Your messages are ready to send.":"Pair this device once in Device settings to start chatting.";
}
async function checkDeviceSession(){
  try{const response=await fetch("/api/session",{credentials:"same-origin"});const data=await response.json();setDeviceConnected(response.ok&&data.authenticated===true);}
  catch{setDeviceConnected(false);aiHint.textContent="Could not check your secure session. Check your connection and reload.";}
}
function showDrawer(which){
  $("#chatSection").hidden=true;toolsDrawer.hidden=false;
  $("#cameraPanel").hidden=which!=="camera";
  $("#voicePanel").hidden=which!=="voice";
  $("#pairingPanel").hidden=which!=="pairing";
  $("#drawerTitle").textContent=which==="camera"?"Vision & camera":which==="voice"?"Voice studio":"Device settings";
  closeSidebar();
}
function showChat(){toolsDrawer.hidden=true;$("#chatSection").hidden=false;closeSidebar();}
function closeSidebar(){sidebar.classList.remove("open");backdrop.hidden=true;}
$("#menuToggle").addEventListener("click",()=>{sidebar.classList.add("open");backdrop.hidden=false;});
backdrop.addEventListener("click",closeSidebar);
$("#chatNav").addEventListener("click",showChat);
$("#visionNav").addEventListener("click",()=>showDrawer("camera"));
$("#voiceNav").addEventListener("click",()=>showDrawer("voice"));
$("#cameraTool").addEventListener("click",()=>showDrawer("camera"));
$("#voiceTool").addEventListener("click",()=>showDrawer("voice"));
$("#openPairing").addEventListener("click",()=>showDrawer("pairing"));
$("#settingsButton").addEventListener("click",()=>showDrawer("pairing"));
$("#closeDrawer").addEventListener("click",showChat);

function addMessage(role,text){
  welcome.hidden=true;
  const row=document.createElement("div");row.className="message "+role;
  if(role==="assistant"){const avatar=document.createElement("div");avatar.className="message-avatar";avatar.textContent="H";row.appendChild(avatar);}
  const bubble=document.createElement("div");bubble.className="message-content";bubble.textContent=text;row.appendChild(bubble);
  chatMessages.appendChild(row);conversation.scrollTop=conversation.scrollHeight;
}
function clearConversation(){chatMessages.replaceChildren();welcome.hidden=false;heardText.value="";replyText.value="";lastReply="";showChat();heardText.focus();}
$("#newChat").addEventListener("click",clearConversation);
document.querySelectorAll(".suggestion").forEach(button=>button.addEventListener("click",()=>{heardText.value=button.dataset.prompt||"";heardText.focus();}));
heardText.addEventListener("input",()=>{heardText.style.height="auto";heardText.style.height=Math.min(heardText.scrollHeight,160)+"px";});
heardText.addEventListener("keydown",event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();askAIButton.click();}});

async function sendMessage(){
  const message=heardText.value.trim();
  if(!message){aiHint.textContent="Type a message or use the microphone first.";heardText.focus();return;}
  if(!deviceConnected){aiHint.textContent="Pair this device once before sending messages.";showDrawer("pairing");return;}
  addMessage("user",message);heardText.value="";heardText.style.height="auto";
  askAIButton.disabled=true;thinking.hidden=false;aiStatus.textContent="Thinking…";aiHint.textContent="Sending your message securely to AI assistant…";conversation.scrollTop=conversation.scrollHeight;
  try{
    const response=await fetch("/api/chat",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({message,language:voiceLanguage.value})});
    const data=await response.json();
    if(!response.ok){
      const messages={
        AI_SETUP_INCOMPLETE:"AI setup is incomplete. Check the server environment settings.",
        DEVICE_NOT_PAIRED:"Your device session expired. Pair this device again.",
        TOO_MANY_REQUESTS:"Too many messages in a short time. Wait before trying again.",
        AI_USAGE_LIMIT:"AI assistant's free-tier usage limit has been reached. Wait and try again later.",
        AI_KEY_OR_ACCESS:"AI assistant could not authorise this request. The project owner should check the API configuration.",
        AI_PROVIDER_ERROR:"The AI service is temporarily unavailable. Please try again shortly.",
        EMPTY_AI_RESPONSE:"AI assistant returned an empty answer. Please try again.",
        AI_CONNECTION_ERROR:"Unable to reach the AI service. Check your internet connection."
      };
      if(data.errorCode==="DEVICE_NOT_PAIRED")setDeviceConnected(false);
      throw new Error(messages[data.errorCode]||data.error||"Something went wrong while contacting AI assistant.");
    }
    lastReply=data.reply||"";replyText.value=lastReply;addMessage("assistant",lastReply);
    aiStatus.textContent="AI assistant replied";aiHint.textContent="Reply received. Use Speak last reply to hear it.";
  }catch(error){addMessage("assistant","I couldn't complete that request. "+(error.message||"Please try again."));aiStatus.textContent=deviceConnected?"AI unavailable":"Device not paired";aiHint.textContent=error.message||"Could not contact the AI backend.";}
  finally{thinking.hidden=true;askAIButton.disabled=false;conversation.scrollTop=conversation.scrollHeight;}
}
askAIButton.addEventListener("click",sendMessage);

connectDeviceButton.addEventListener("click",async()=>{
  const code=pairingCodeInput.value;
  if(!code){aiHint.textContent="Enter your private pairing code on this device.";pairingCodeInput.focus();return;}
  connectDeviceButton.disabled=true;aiStatus.textContent="Pairing…";aiHint.textContent="Creating a secure device session…";
  try{
    const response=await fetch("/api/session",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({code})});
    const data=await response.json();
    if(!response.ok){const messages={INVALID_PAIRING_CODE:"Pairing code not recognised. Check it and try again.",PAIR_RATE_LIMIT:"Too many attempts. Wait one minute.",SESSION_SETUP_INCOMPLETE:"Secure pairing is not configured on the server."};throw new Error(messages[data.errorCode]||data.error||"Could not pair this device.");}
    pairingCodeInput.value="";setDeviceConnected(true);aiHint.textContent="Device paired successfully. You can return to chat.";showChat();
  }catch(error){setDeviceConnected(false);aiHint.textContent=error.message||"Could not connect this device.";}
  finally{connectDeviceButton.disabled=false;}
});

startCamera.addEventListener("click",async()=>{
  if(!navigator.mediaDevices?.getUserMedia){cameraStatus.textContent="Camera unavailable";return;}
  try{cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});cameraPreview.srcObject=cameraStream;cameraStatus.textContent="Camera on";startCamera.disabled=true;stopCamera.disabled=false;}
  catch(error){cameraStatus.textContent=error.name==="NotAllowedError"?"Permission denied":"Camera error";}
});
function stopCameraStream(){cameraStream?.getTracks().forEach(track=>track.stop());cameraStream=null;if(cameraPreview)cameraPreview.srcObject=null;if(cameraStatus)cameraStatus.textContent="Camera off";if(startCamera)startCamera.disabled=false;if(stopCamera)stopCamera.disabled=true;}
stopCamera.addEventListener("click",stopCameraStream);window.addEventListener("pagehide",stopCameraStream);

const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
if(SpeechRecognition){
  recognition=new SpeechRecognition();recognition.lang=voiceLanguage.value;recognition.continuous=true;recognition.interimResults=true;
  recognition.onresult=event=>{let finalText="";for(let i=event.resultIndex;i<event.results.length;i++){if(event.results[i].isFinal)finalText+=event.results[i][0].transcript+" ";}if(finalText){heardText.value=(heardText.value+" "+finalText).trim();heardText.dispatchEvent(new Event("input"));}};
  recognition.onstart=()=>{listenStatus.textContent="Listening";startListening.disabled=true;stopListening.disabled=false;};
  recognition.onerror=event=>{listenStatus.textContent="Mic: "+event.error;};
  recognition.onend=()=>{listenStatus.textContent="Microphone off";startListening.disabled=false;stopListening.disabled=true;};
  speechSupport.textContent="Speech recognition is available. Select a language and tap the microphone.";
}else{startListening.disabled=true;stopListening.disabled=true;speechSupport.textContent="Speech recognition is not supported in this browser. You can still type messages.";}
function startMic(){if(!recognition){showDrawer("voice");return;}try{recognition.lang=voiceLanguage.value;recognition.start();showChat();}catch{listenStatus.textContent="Already listening";}}
startListening.addEventListener("click",startMic);
$("#voiceTool").addEventListener("dblclick",startMic);
stopListening.addEventListener("click",()=>recognition?.stop());

$("#speak").addEventListener("click",()=>{
  const text=lastReply||replyText.value.trim();if(!text||!("speechSynthesis"in window))return;
  window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang=voiceLanguage.value;window.speechSynthesis.speak(utterance);
});
$("#stopSpeaking").addEventListener("click",()=>window.speechSynthesis?.cancel());
checkDeviceSession();