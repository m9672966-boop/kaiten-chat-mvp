const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Папка для загрузки изображений
const UPLOADS_DIR = 'uploads';
const upload = multer({ dest: UPLOADS_DIR });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR)); // раздаём изображения

// === Конфигурация досок ===
const BOARD_CONFIG = {
  '231326': { board_id: 664999,  column_id: 2394368 },
  '572075': { board_id: 1358802, column_id: 4718618 },
  '229225': { board_id: 541086,  column_id: 1935037 }
};

// === Kaiten API ===
const KAITEN_API_TOKEN = process.env.KAITEN_API_TOKEN;
const KAITEN_DOMAIN = process.env.KAITEN_DOMAIN || 'panna.kaiten.ru';

// === Хранилище сообщений ===
let messages = [];

// === Создание карточки ===
app.post('/api/proxy/card', async (req, res) => {
  const { spaceId, title } = req.body;
  const config = BOARD_CONFIG[spaceId];
  if (!config) {
    return res.status(400).json({ error: `Не настроена доска для spaceId=${spaceId}` });
  }

  if (!KAITEN_API_TOKEN) {
    return res.status(500).json({ error: 'KAITEN_API_TOKEN не задан' });
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

// === Загрузка изображения ===
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не загружен' });
  }

  // Генерируем URL
  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url: imageUrl });
});

// === Отправка сообщения ===
app.post('/api/messages', (req, res) => {
  const { spaceId, roomId, text, author, imageUrl } = req.body;

  if (!author) return res.status(400).json({ error: 'author обязателен' });
  if (!spaceId && !roomId) return res.status(400).json({ error: 'Нужен spaceId или roomId' });

  const msg = {
    id: uuidv4(),
    spaceId: spaceId || null,
    roomId: roomId || null,
    author,
    text: text || '',
    imageUrl: imageUrl || null,
    isCommand: text?.startsWith('/'),
    createdAt: new Date().toISOString()
  };

  messages.push(msg);
  res.json(msg);
});

// === Получение сообщений ===
app.get('/api/messages/space/:spaceId', (req, res) => {
  const { spaceId } = req.params;
  res.json(messages.filter(m => m.spaceId === spaceId));
});

app.get('/api/messages/room/:roomId', (req, res) => {
  const { roomId } = req.params;
  res.json(messages.filter(m => m.roomId === roomId));
});

// === Фронтенд ===
app.use(express.static('../frontend'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/../frontend/index.html');
});

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  console.log(`🌐 Kaiten Domain: ${KAITEN_DOMAIN}`);
});
