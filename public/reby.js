console.log('reby.js loaded');
const socket = io();

// ------------------- ELEMENTS -------------------
const nameInput = document.getElementById('nameInput');
const joinBtn = document.getElementById('joinBtn');
const app = document.getElementById('app');
const heading = document.getElementById('heading');
const messagesDiv = document.querySelector('.messages');
const messageInput = document.getElementById('messageInput');
const typingIndicator = document.querySelector('.typingIndicator');
const membersList = document.getElementById('membersList');
const menuDots = document.getElementById('menuDots');
const menuPopup = document.getElementById('menuPopup');
const createRoomBtn = document.getElementById('createRoom');
const joinRoomBtn = document.getElementById('joinRoom');
const leaveRoomBtn = document.getElementById('leaveRoom');
const toggleMusicBtn = document.getElementById('toggleMusic');
const actionBtn = document.getElementById("actionBtn");

let mediaRecorder;
let audioChunks = [];
let recording = false;

// ------------------- MUSIC -------------------
const playlist = ["https://files.catbox.moe/6ywqzp.mp4","https://files.catbox.moe/hjv93p.mp4"];
let currentTrack = 0;
let musicEnabled = true;
const audioPlayer = new Audio();
audioPlayer.volume = 1.0;
audioPlayer.preload = "auto";
audioPlayer.addEventListener("ended", () => {
  currentTrack = (currentTrack + 1) % playlist.length;
  audioPlayer.src = playlist[currentTrack];
  if (musicEnabled) audioPlayer.play().catch(() => {});
});
function startMusic() { if (!musicEnabled) return; audioPlayer.src = playlist[currentTrack]; audioPlayer.play().catch(() => {}); }
function stopMusic() { audioPlayer.pause(); audioPlayer.currentTime = 0; }

if (toggleMusicBtn) {
  toggleMusicBtn.textContent = musicEnabled ? "🎵 Music: ON" : "🎵 Music: OFF";
  toggleMusicBtn.addEventListener("click", () => {
    musicEnabled = !musicEnabled;
    toggleMusicBtn.textContent = musicEnabled ? "🎵 Music: ON" : "🎵 Music: OFF";
    if (musicEnabled && currentRoom !== 'global') startMusic(); else stopMusic();
  });
}

// ------------------- SLIDESHOW -------------------
const privateImages = [
  "https://files.catbox.moe/o0pz80.jpg",
  "https://files.catbox.moe/4qh6us.jpg",
  "https://files.catbox.moe/kgw098.jpg",
  "https://files.catbox.moe/fsu3vn.jpg",
  "https://files.catbox.moe/zfxeiw.jpg",
  "https://files.catbox.moe/8no4gd.jpg",
  "https://files.catbox.moe/8ejol5.jpg",
];
let slideIndex = 0, slideInterval = null, showingA = true;
const slideA = document.getElementById("slide1");
const slideB = document.getElementById("slide2");

function startSlideshow() {
  stopSlideshow();
  slideA.style.backgroundImage = `url('${privateImages[0]}')`;
  slideB.style.backgroundImage = `url('${privateImages[1]}')`;
  slideIndex = 1;
  slideA.classList.add("top");
  slideB.classList.remove("top");
  showingA = true;

  slideInterval = setInterval(() => {
    const next = privateImages[(slideIndex + 1) % privateImages.length];
    if (showingA) {
      slideB.style.backgroundImage = `url('${next}')`;
      slideB.classList.add("top");
      slideA.classList.remove("top");
    } else {
      slideA.style.backgroundImage = `url('${next}')`;
      slideA.classList.add("top");
      slideB.classList.remove("top");
    }
    showingA = !showingA;
    slideIndex = (slideIndex + 1) % privateImages.length;
  }, 30000);
}

function stopSlideshow() {
  clearInterval(slideInterval);
  slideInterval = null;
  slideA.classList.add("top");
  slideB.classList.remove("top");
}

// ------------------- CHAT -------------------
let username = '';
let currentRoom = 'global';
let typingTimer = null;

function showApp() {
  document.querySelector('.overlay')?.classList.add('hidden');
  app.classList.remove('hidden');
}

// Append standard message
function appendMessage(type, payload) {
  const el = document.createElement('div');
  if (type === 'system') {
    el.className = 'system wobble';
    el.textContent = payload;
  } else {
    const me = payload.name === username;
    el.className = me ? 'message msg-right' : 'message msg-left';
    if (payload.audio) {
      appendVoiceMessage(payload.name, payload.audio, me);
      return;
    } else {
      el.innerHTML = `<div class="meta">${payload.name}</div><div class="body">${payload.text}</div>`;
    }
  }
  messagesDiv.appendChild(el);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Append voice message with waves
function appendVoiceMessage(name, audioSrc, isMe) {
  const el = document.createElement('div');
  el.className = isMe ? 'message msg-right' : 'message msg-left';
  el.innerHTML = `
    <div class="meta">${name}</div>
    <div class="voice-container">
      <button class="play-btn">▶️</button>
      <div class="voice-wave">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
    </div>
  `;
  messagesDiv.appendChild(el);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  const audio = new Audio(audioSrc);
  audio.preload = 'auto';
  const playBtn = el.querySelector('.play-btn');
  const waveEl = el.querySelector('.voice-wave');

  playBtn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play();
      waveEl.classList.add('playing');
      playBtn.textContent = '⏸️';
    } else {
      audio.pause();
      waveEl.classList.remove('playing');
      playBtn.textContent = '▶️';
    }
  });

  audio.addEventListener('ended', () => {
    waveEl.classList.remove('playing');
    playBtn.textContent = '▶️';
  });
}

// ------------------- JOIN -------------------
joinBtn.addEventListener('click', () => {
  const v = nameInput.value.trim();
  if (!v) return alert('Enter your name');
  username = v;
  localStorage.setItem('chat_name', username);
  showApp();
  heading.textContent = 'CHAT FOR FUN NOT FOR GUN🌛❤️';
  socket.emit('joinGlobal', username);
});

nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') joinBtn.click();
});

// ------------------- SEND MESSAGE -------------------
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;
  socket.emit('chatMessage', { room: currentRoom, name: username, msg: text });
  messageInput.value = '';
  actionBtn.classList.remove("send");
  actionBtn.classList.add("mic");
  actionBtn.textContent = "🎤";
  socket.emit('stopTyping', { name: username, room: currentRoom });
}

messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (messageInput.value.trim()) sendMessage();
  }
});

// ------------------- ACTION BUTTON -------------------
messageInput.addEventListener("input", () => {
  if (messageInput.value.trim()) {
    actionBtn.classList.add("send");
    actionBtn.classList.remove("mic");
    actionBtn.textContent = "➤";
  } else {
    actionBtn.classList.remove("send");
    actionBtn.classList.add("mic");
    actionBtn.textContent = "🎤";
  }
});

actionBtn.addEventListener("click", () => {
  if (actionBtn.classList.contains("send")) sendMessage();
});

// ------------------- PRESS-AND-HOLD VOICE -------------------
let holdRecording = false;

async function startRecording() {
  if (!username || !actionBtn.classList.contains("mic")) return;
  holdRecording = true;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];

  mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
  mediaRecorder.start();
  actionBtn.classList.add("recording");
}

function stopRecording() {
  if (!holdRecording) return;
  holdRecording = false;
  if (!mediaRecorder) return;

  mediaRecorder.stop();
  actionBtn.classList.remove("recording");

  mediaRecorder.onstop = () => {
    const blob = new Blob(audioChunks, { type: "audio/webm" });
    const reader = new FileReader();
    reader.onloadend = () => {
      socket.emit("voiceMessage", {
        room: currentRoom,
        name: username,
        audio: reader.result
      });
    };
    reader.readAsDataURL(blob);
  };
}

function cancelRecording() {
  holdRecording = false;
  if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
  actionBtn.classList.remove("recording");
}

actionBtn.addEventListener("mousedown", startRecording);
actionBtn.addEventListener("touchstart", startRecording);
actionBtn.addEventListener("mouseup", stopRecording);
actionBtn.addEventListener("mouseleave", cancelRecording);
actionBtn.addEventListener("touchend", stopRecording);

// ------------------- MENU DOTS -------------------
menuDots?.addEventListener('click', (e) => { e.stopPropagation(); menuPopup?.classList.toggle('hidden'); });
window.addEventListener('click', (e) => { if (!menuPopup?.contains(e.target) && !menuDots?.contains(e.target)) menuPopup?.classList.add('hidden'); });

// ------------------- ROOM HANDLING (FROM OLD WORKING CODE) -------------------
createRoomBtn?.addEventListener('click', () => {
  if (!username) return alert('Join first');
  socket.emit('createRoom', username);
});
joinRoomBtn?.addEventListener('click', () => {
  if (!username) return alert('Join first');
  const pin = prompt('Enter 4-digit PIN to join:');
  if (pin) socket.emit('joinRoom', { name: username, code: pin.trim() });
});
leaveRoomBtn?.addEventListener('click', () => {
  if (!username) return;

  // Inform server
  socket.emit('leaveRoom', { name: username, room: currentRoom });

  // Reset room
  currentRoom = 'global';

  // Restore global chat heading
  heading.textContent = 'CHAT FOR FUN NOT FOR GUN🌛❤️';

  // Stop slideshow and reset slides
  stopSlideshow();
  if (slideA) { slideA.style.backgroundImage = "url('https://files.catbox.moe/3jvej7.jpg')"; slideA.classList.add("top"); }
  if (slideB) { slideB.style.backgroundImage = ""; slideB.classList.remove("top"); }

  // Reset music
  musicEnabled = false;
  stopMusic();

  // Hide leave button in global chat
  leaveRoomBtn.classList.add('hidden');

  // Ask server for global data
  socket.emit('requestActive', 'global');
  socket.emit('clearChat');
});



// ------------------- SOCKET EVENTS -------------------
socket.on('connect', () => { console.log('[client] connected', socket.id); });
socket.on('message', (data) => {
  if (!data) return;
  if (data.type === 'system') appendMessage('system', data.msg);
  else if (data.type === 'chat') appendMessage('chat', { name: data.name, text: data.msg, audio: data.audio });
});
socket.on('updateMembers', (members) => {
  membersList.innerHTML = '';
  members.forEach(m => { const li = document.createElement('li'); li.innerHTML = `<span class="dot"></span> ${m}`; membersList.appendChild(li); });
});
socket.on('displayTyping', (name) => { typingIndicator.textContent = `${name} is typing...`; typingIndicator.classList.add('show'); });
socket.on('hideTyping', () => { typingIndicator.classList.remove('show'); typingIndicator.textContent = ''; });

socket.on('roomCreated', (code) => {
  alert('Your Room Code: ' + code + ' ✨');
  currentRoom = code;
  musicEnabled = true;
  if (toggleMusicBtn) toggleMusicBtn.textContent = "🎵 Music: ON";
  startMusic();
  startSlideshow();
  heading.textContent = 'FREECHAT';
  leaveRoomBtn.classList.remove('hidden');
  socket.emit('requestActive', code);
  socket.emit('clearChat');
});

socket.on('roomJoined', (code) => {
  currentRoom = code;
  musicEnabled = true;
  if (toggleMusicBtn) toggleMusicBtn.textContent = "🎵 Music: ON";
  startMusic();
  startSlideshow();
  heading.textContent = 'FREECHAT';
  leaveRoomBtn.classList.remove('hidden');
  socket.emit('requestActive', code);
  socket.emit('clearChat');
});

socket.on('clearChat', () => { messagesDiv.innerHTML = ''; });
socket.on('debug', (m) => console.log('[debug]', m));
socket.on('connect_error', (err) => console.error('connect_error', err));