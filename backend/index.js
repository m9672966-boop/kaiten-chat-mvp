const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// === Конфигурация досок и колонок ===
const BOARD_CONFIG = {
  // Формат: 'spaceId': { board_id, column_id }
  '231326': { board_id: 664999,  column_id: 111111 }, // ← замени на реальные column_id
  '572075': { board_id: 1358802, column_id: 222222 },
  '229225': { board_id: 541086,  column_id: 333333 }
};

// === Kaiten API ===
const KAITEN_API_TOKEN = process.env.KAITEN_API_TOKEN;
const KAITEN_DOMAIN = process.env.KAITEN_DOMAIN || 'panna.kaiten.ru';

// === Хранилище сообщений (в памяти) ===
let messages = [];

// === Создание карточки ===
app.post('/api/proxy/card', async (req, res) => {
  const { spaceId, title } = req.body;

  if (!KAITEN_API_TOKEN) {
    return res.status(500).json({ error: 'KAITEN_API_TOKEN не задан' });
  }

  const config = BOARD_CONFIG[spaceId];
  if (!config) {
    return res.status(400).json({ error: `Не настроена доска для spaceId=${spaceId}` });
  }

  try {
    const kaitenRes = await fetch(`https://${KAITEN_DOMAIN}/api/latest/cards`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KAITEN_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        board_id: config.board_id,
        column_id: config.column_id,
        asap: false,
        due_date: null
      })
    });

    const data = await kaitenRes.json();
    res.status(kaitenRes.status).json(data);
  } catch (err) {
    console.error('Kaiten API error:', err);
    res.status(500).json({ error: 'Ошибка Kaiten API' });
  }
});

// === Отправка сообщения (общее или приватное) ===
app.post('/api/messages', (req, res) => {
  const { spaceId, roomId, text, author } = req.body;

  if (!text || !author) {
    return res.status(400).json({ error: 'text и author обязательны' });
  }
  if (!spaceId && !roomId) {
    return res.status(400).json({ error: 'Нужен spaceId или roomId' });
  }

  const msg = {
    id: uuidv4(),
    spaceId: spaceId || null,
    roomId: roomId || null,
    author,
    text,
    isCommand: text.startsWith('/'),
    createdAt: new Date().toISOString()
  };

  messages.push(msg);
  res.json(msg);
});

// === Получить общий чат ===
app.get('/api/messages/space/:spaceId', (req, res) => {
  const { spaceId } = req.params;
  const spaceMessages = messages.filter(m => m.spaceId === spaceId);
  res.json(spaceMessages);
});

// === Получить приватный чат ===
app.get('/api/messages/room/:roomId', (req, res) => {
  const { roomId } = req.params;
  const roomMessages = messages.filter(m => m.roomId === roomId);
  res.json(roomMessages);
});

// === Раздача фронтенда ===
app.use(express.static('../frontend'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/../frontend/index.html');
});

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  console.log(`🌐 Kaiten Domain: ${KAITEN_DOMAIN}`);
});
