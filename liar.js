const socket = io('https://saalfa-game.onrender.com');

let currentRoomCode = '';
let isHost = false;

// العناصر الرئيسية
const modeSelectStep = document.getElementById('modeSelectStep');
const hostSetupStep = document.getElementById('hostSetupStep');
const joinSetupStep = document.getElementById('joinSetupStep');
const playerWaitingStep = document.getElementById('playerWaitingStep');
const playerRoleStep = document.getElementById('playerRoleStep');
const resultStep = document.getElementById('resultStep');

const connectedPlayersList = document.getElementById('connectedPlayersList');
const generatedCodeText = document.getElementById('generatedCodeText');
const playerRoleText = document.getElementById('playerRoleText');

// اختيار طور المضيف
function showHostSetup() {
  isHost = true;
  modeSelectStep.classList.add('hidden');
  hostSetupStep.classList.remove('hidden');

  // توليد كود غرفة عشوائي من 4 أرقام
  currentRoomCode = Math.floor(1000 + Math.random() * 9000).toString();
  generatedCodeText.innerText = currentRoomCode;

  // إعلام السيرفر بإنشاء الغرفة
  socket.emit('createRoom', { roomCode: currentRoomCode, gameType: 'liar' });
}

// اختيار طور الانضمام (من الجوال)
function showJoinSetup() {
  isHost = false;
  modeSelectStep.classList.add('hidden');
  joinSetupStep.classList.remove('hidden');
}

// زر انضمام اللاعب
function joinRoomAction() {
  const roomCode = document.getElementById('joinRoomCodeInput').value.trim();
  const playerName = document.getElementById('joinPlayerNameInput').value.trim();

  if (!roomCode || !playerName) {
    alert("يرجى كتابة كود الغرفة واسمك!");
    return;
  }

  socket.emit('joinRoom', { roomCode, playerName });
}

// بدء اللعبة من المضيف
function startOnlineGame() {
  const category = document.getElementById('categorySelect').value;
  socket.emit('startGame', { roomCode: currentRoomCode, category });
}

// ==================== استقبال أحداث السيرفر ====================

// عند انضمام لاعب وتحديث القائمة لدى المضيف
socket.on('updatePlayersList', (players) => {
  if (isHost) {
    connectedPlayersList.innerHTML = '';
    players.forEach(p => {
      const li = document.createElement('li');
      li.innerText = `👤 ${p.name}`;
      connectedPlayersList.appendChild(li);
    });
  }
});

// تأكيد انضمام اللاعب من الجوال
socket.on('joinedSuccessfully', () => {
  joinSetupStep.classList.add('hidden');
  playerWaitingStep.classList.remove('hidden');
});

// بدء اللعبة واستلام الكلمة/الدور على الجوال
socket.on('gameStarted', (data) => {
  playerWaitingStep.classList.add('hidden');
  playerRoleStep.classList.remove('hidden');

  if (data.isLiar) {
    playerRoleText.innerText = "🕵️‍♂️ أنت الكذاب! (خارج السالفة)";
    playerRoleText.style.color = "#ef4444";
  } else {
    playerRoleText.innerText = `الكلمة السرية هي: [ ${data.secretWord} ]`;
    playerRoleText.style.color = "#4ade80";
  }
});

// بدء اللعبة في شاشة المضيف
socket.on('hostGameStarted', () => {
  hostSetupStep.classList.add('hidden');
  
  // إنشاء زر لكشف النتيجة لدى المضيف
  const div = document.createElement('div');
  div.id = "hostControlArea";
  div.innerHTML = `
    <h2 style="color: #facc15; margin-bottom: 15px;">🔥 بدأت السالفة أونلاين!</h2>
    <p style="color: #cbd5e1; margin-bottom: 20px;">الكلمات أُرْسِلَت لجوالات اللاعبين مباشرة، ابدأوا التحقيق!</p>
    <button onclick="revealOnlineResult()" style="background: linear-gradient(135deg, #ef4444, #dc2626); width: 100%;">كشف الكذاب والنتيجة 🔍</button>
  `;
  document.querySelector('.main-container').appendChild(div);
});

function revealOnlineResult() {
  socket.emit('revealResult', { roomCode: currentRoomCode });
}

// استقبال النتيجة النهائية عند الجميع
socket.on('showResult', (data) => {
  const hostControlArea = document.getElementById('hostControlArea');
  if (hostControlArea) hostControlArea.remove();

  playerRoleStep.classList.add('hidden');
  resultStep.classList.remove('hidden');

  document.getElementById('liarNameText').innerText = data.liarName;
  document.getElementById('secretWordText').innerText = data.secretWord;
});

// تنبيهات الخطأ
socket.on('errorMsg', (msg) => {
  alert(msg);
});