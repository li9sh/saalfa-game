// إنشاء سياق الصوت المدمج في المتصفح
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// صوت التكتكة عند المرور بين أقسام العجلة
function playTickSound() {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(600, audioCtx.currentTime); // تردد التكتكة
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.04);

  gain.gain.setValueAtTime(0.15, audioCtx.currentTime); // رفع/خفض مستوى الصوت
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.04);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.04);
}

// صوت احتفالي متصاعد عند النتيجة والإعلان عن الفائز
function playWinSound() {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const notes = [261.63, 329.63, 392.00, 523.25]; // نغمات موسيقية مبهجة (C-E-G-C)
  notes.forEach((freq, index) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + index * 0.1);

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime + index * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + index * 0.1 + 0.3);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(audioCtx.currentTime + index * 0.1);
    osc.stop(audioCtx.currentTime + index * 0.1 + 0.3);
  });
}

const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spinBtn');
const resultBox = document.getElementById('resultBox');
const resultText = document.getElementById('resultText');
const optionInput = document.getElementById('optionInput');
const optionsList = document.getElementById('optionsList');

// قائمة الخيارات الإبتدائية
let options = ["علي", "سارة", "خالد", "نورة"];
const colors = ['#f43f5e', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#84cc16'];

let currentAngle = 0;
let isSpinning = false;
let lastSegmentIndex = -1; // لتتبع القسم الحالي ومنع تكرار التكتكة في نفس القطاع

// رسم العجلة بشكل ديناميكي
function drawWheel() {
  const numOptions = options.length;
  const radius = canvas.width / 2;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (numOptions === 0) {
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("أضف خيارات للبدء", radius, radius);
    return;
  }

  const arcSize = (2 * Math.PI) / numOptions;

  for (let i = 0; i < numOptions; i++) {
    const angle = currentAngle + i * arcSize;
    ctx.beginPath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.moveTo(radius, radius);
    ctx.arc(radius, radius, radius, angle, angle + arcSize);
    ctx.fill();

    // كتابة النص
    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(angle + arcSize / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Arial";
    ctx.fillText(options[i], radius - 20, 5);
    ctx.restore();
  }
}

// تحديث قائمة الأسماء الظاهرة للمستخدم
function updateOptionsList() {
  optionsList.innerHTML = "";
  options.forEach((opt, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${opt}</span>
      <button class="delete-btn" onclick="removeOption(${index})">❌</button>
    `;
    optionsList.appendChild(li);
  });
}

// إضافة خيار جديد
function addOption() {
  const text = optionInput.value.trim();
  if (text !== "") {
    options.push(text);
    optionInput.value = "";
    updateOptionsList();
    drawWheel();
  }
}

// إضافة بالضغط على Enter
function handleKeyPress(e) {
  if (e.key === 'Enter') addOption();
}

// حذف خيار
function removeOption(index) {
  if (options.length <= 1) {
    alert("يجب أن يحتوي الموقع على خيار واحد على الأقل!");
    return;
  }
  options.splice(index, 1);
  updateOptionsList();
  drawWheel();
}

// تشغيل حركة الدوران مع التكتكة
function spinWheel() {
  if (isSpinning || options.length === 0) return;

  // تفعيل سياق الصوت فوراً عند تفاعل المستخدم
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  isSpinning = true;
  spinBtn.disabled = true;
  resultBox.classList.add('hidden');

  const spinAngle = Math.floor(Math.random() * 360) + 1800; 
  let start = null;
  const duration = 4000;

  function animate(timestamp) {
    if (!start) start = timestamp;
    const progress = (timestamp - start) / duration;

    if (progress < 1) {
      const easeOut = 1 - Math.pow(1 - progress, 3);
      currentAngle = (spinAngle * (Math.PI / 180) * easeOut);

      // تشغيل صوت التكتكة عند الانتقال بين قطاعات العجلة
      const numOptions = options.length;
      const arcSize = (2 * Math.PI) / numOptions;
      const currentSegment = Math.floor((currentAngle % (2 * Math.PI)) / arcSize);
      
      if (currentSegment !== lastSegmentIndex) {
        playTickSound();
        lastSegmentIndex = currentSegment;
      }

      drawWheel();
      requestAnimationFrame(animate);
    } else {
      isSpinning = false;
      spinBtn.disabled = false;
      calculateResult();
    }
  }

  requestAnimationFrame(animate);
}

// حساب الخيار الفائز وتشغيل صوت النتيجة
function calculateResult() {
  const numOptions = options.length;
  const arcSize = (2 * Math.PI) / numOptions;
  const normalizedAngle = (currentAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  const pointerAngle = (1.5 * Math.PI - normalizedAngle + 2 * Math.PI) % (2 * Math.PI);
  const winningIndex = Math.floor(pointerAngle / arcSize) % numOptions;

  resultText.innerText = options[winningIndex];
  resultBox.classList.remove('hidden');

  // تشغيل صوت الفوز 🎵
  playWinSound();
}

// التشغيل الأولي
updateOptionsList();
drawWheel();