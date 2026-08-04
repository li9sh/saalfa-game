const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// تقديم الملفات الثابتة (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, './')));

// تخزين بيانات الغرف النشطة
const rooms = {};

// بنك الكلمات لتشغيل لعبة خارج السالفة من السيرفر
const wordBank = {
  food: ["كبسة", "شاورما", "برجر", "بيتزا", "سليق", "فلافل", "شوربة"],
  cities: ["الرياض", "جدة", "مكة", "المدينة", "أبها", "الدمام", "العلا"],
  cars: ["كامري", "باترول", "لكزس", "تاهو", "كرولا", "مرسيدس", "روزرايز"]
};

io.on('connection', (socket) => {
  console.log('لاعب جديد متصل:', socket.id);

  // 1. إنشاء غرفة جديدة (للمضيف)
  socket.on('createRoom', ({ roomCode, gameType }) => {
    rooms[roomCode] = {
      host: socket.id,
      gameType: gameType,
      players: [],
      secretWord: '',
      liarId: null,
      status: 'waiting' // waiting, playing
    };
    socket.join(roomCode);
    socket.emit('roomCreated', { roomCode });
    console.log(`تم إنشاء الغرفة ${roomCode} للعبة ${gameType}`);
  });

  // 2. انضمام لاعب من جواله
  socket.on('joinRoom', ({ roomCode, playerName }) => {
    const room = rooms[roomCode];

    if (!room) {
      socket.emit('errorMsg', 'الغرفة غير موجودة!');
      return;
    }

    if (room.status === 'playing') {
      socket.emit('errorMsg', 'اللعبة بدأت بالفعل!');
      return;
    }

    const player = { id: socket.id, name: playerName };
    room.players.push(player);
    socket.join(roomCode);

    // إرسال تأكيد للاعب
    socket.emit('joinedSuccessfully', { roomCode, playerName });

    // تحديث قائمة اللاعبين عند المضيف وبقية اللاعبين
    io.to(roomCode).emit('updatePlayersList', room.players);
  });

  // 3. بدء اللعبة وتوزيع الدور أو الكلمة السرية
  socket.on('startGame', ({ roomCode, category }) => {
    const room = rooms[roomCode];
    if (!room) return;

    if (room.players.length < 3) {
      socket.emit('errorMsg', 'يحتاج 3 لاعبين على الأقل للبدء!');
      return;
    }

    room.status = 'playing';

    // اختيار الكلمة والكذاب عشوائياً
    const wordsList = wordBank[category] || wordBank.food;
    room.secretWord = wordsList[Math.floor(Math.random() * wordsList.length)];
    const liarIndex = Math.floor(Math.random() * room.players.length);
    room.liarId = room.players[liarIndex].id;

    // إرسال الأدوار لكل لاعب بشكل سري ومباشر للجوال
    room.players.forEach(p => {
      if (p.id === room.liarId) {
        io.to(p.id).emit('gameStarted', { isLiar: true, role: 'أنت الكذاب (خارج السالفة) 🕵️‍♂️' });
      } else {
        io.to(p.id).emit('gameStarted', { isLiar: false, secretWord: room.secretWord });
      }
    });

    // إعلام المضيف بشاشة التحكم أن اللعبة بدأت
    io.to(room.host).emit('hostGameStarted', {
      playersCount: room.players.length
    });
  });

  // 4. كشف النتيجة النهائية
  socket.on('revealResult', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const liarPlayer = room.players.find(p => p.id === room.liarId);
    io.to(roomCode).emit('showResult', {
      liarName: liarPlayer ? liarPlayer.name : 'غير معروف',
      secretWord: room.secretWord
    });
  });

  // الانقطاع عن الاتصال
  socket.on('disconnect', () => {
    console.log('لاعب غادر:', socket.id);
  });
});

// تشغيل السيرفر على المنفذ 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 السيرفر شغال تمام على الرابط: http://localhost:${PORT}`);
});