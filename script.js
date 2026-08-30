// 1. إعدادات السيرفر والمفاتيح الخاصة بـ Supabase
const SUPABASE_URL = 'https://uhwlxlejpzkyomimuepy.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_1yTJSFyNBoNUrBQ5pCApGA_gWkB5ugD';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. خيارات العجلة والبيانات الأساسية
let options = ['خيارات 1', 'خيارات 2', 'خيارات 3', 'خيارات 4'];
const colors = ['#ec4899', '#8b5cf6', '#38bdf8', '#10b981', '#f59e0b', '#ef4444'];

let startAngle = 0;
let isSpinning = false;

// 3. التحقق من حالة التسجيل عند تحميل الصفحة
window.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  updateUI(session);

  // الاستماع للتغيرات في حالة التوثيق
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    updateUI(session);
  });

  // رسم العجلة وتنسيق الخيارات عند فتح الصفحة
  renderOptionsList();
  drawWheel();
});

// 4. تحديث الواجهة بناءً على حالة تسجيل الدخول
function updateUI(session) {
  const loginBtn = document.getElementById('login-btn');
  const profileView = document.getElementById('profile-view');
  const playerName = document.getElementById('player-name');

  if (session) {
    const username = session.user.user_metadata?.username || session.user.email.split('@')[0];
    if (playerName) playerName.innerText = `🎮 ${username}`;
    if (loginBtn) loginBtn.classList.add('hidden');
    if (profileView) profileView.classList.remove('hidden');
  } else {
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (profileView) profileView.classList.add('hidden');
  }
}

// 5. دالة تسجيل الخروج
async function logout() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    alert('حدث خطأ أثناء الخروج: ' + error.message);
  } else {
    window.location.reload();
  }
}

// 6. رسم العجلة على Canvas
function drawWheel() {
  const canvas = document.getElementById('wheelCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const outsideRadius = canvas.width / 2 - 10;
  const textRadius = outsideRadius - 50;
  const insideRadius = 30;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (options.length === 0) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, outsideRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px Tajawal';
    ctx.textAlign = 'center';
    ctx.fillText('أضف خيارات للبدء', centerX, centerY);
    return;
  }

  const arc = Math.PI * 2 / options.length;

  for (let i = 0; i < options.length; i++) {
    const angle = startAngle + i * arc;
    ctx.fillStyle = colors[i % colors.length];

    ctx.beginPath();
    ctx.arc(centerX, centerY, outsideRadius, angle, angle + arc, false);
    ctx.arc(centerX, centerY, insideRadius, angle + arc, angle, true);
    ctx.fill();

    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.translate(
      centerX + Math.cos(angle + arc / 2) * textRadius,
      centerY + Math.sin(angle + arc / 2) * textRadius
    );
    ctx.rotate(angle + arc / 2 + Math.PI / 2);
    ctx.font = 'bold 14px Tajawal';
    ctx.textAlign = 'center';
    ctx.fillText(options[i], 0, 0);
    ctx.restore();
  }
}

// 7. دالة تدوير العجلة
function spinWheel() {
  if (isSpinning || options.length < 2) {
    if (options.length < 2) alert('يرجى إضافة خيارين على الأقل للتدوير!');
    return;
  }

  isSpinning = true;
  document.getElementById('spinBtn').disabled = true;
  document.getElementById('resultBox').classList.add('hidden');

  const spinAngleStart = Math.random() * 10 + 10;
  let spinTime = 0;
  const spinTimeTotal = Math.random() * 3000 + 4000;

  function rotate() {
    spinTime += 30;
    if (spinTime >= spinTimeTotal) {
      stopRotateWheel();
      return;
    }
    const spinAngle = spinAngleStart - easeOut(spinTime, 0, spinAngleStart, spinTimeTotal);
    startAngle += (spinAngle * Math.PI / 180);
    drawWheel();
    requestAnimationFrame(rotate);
  }
  rotate();
}

function stopRotateWheel() {
  isSpinning = false;
  document.getElementById('spinBtn').disabled = false;

  const canvas = document.getElementById('wheelCanvas');
  const degrees = startAngle * 180 / Math.PI + 90;
  const arclen = 360 / options.length;
  const index = Math.floor((360 - (degrees % 360)) / arclen) % options.length;

  const winner = options[index];
  document.getElementById('resultText').innerText = winner;
  document.getElementById('resultBox').classList.remove('hidden');
}

function easeOut(t, b, c, d) {
  const ts = (t /= d) * t;
  const tc = ts * t;
  return b + c * (tc + -3 * ts + 3 * t);
}

// 8. إدارة الخيارات (إضافة/حذف)
function addOption() {
  const input = document.getElementById('optionInput');
  const text = input.value.trim();
  if (text) {
    options.push(text);
    input.value = '';
    renderOptionsList();
    drawWheel();
  }
}

function handleKeyPress(e) {
  if (e.key === 'Enter') addOption();
}

function deleteOption(index) {
  options.splice(index, 1);
  renderOptionsList();
  drawWheel();
}

function renderOptionsList() {
  const list = document.getElementById('optionsList');
  if (!list) return;
  list.innerHTML = '';
  options.forEach((opt, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${opt}</span>
      <button class="delete-btn" onclick="deleteOption(${index})">❌</button>
    `;
    list.appendChild(li);
  });
}
