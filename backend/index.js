const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Хранилище сообщений
let messages = [];

// Настройки Kaiten
const KAITEN_API_TOKEN = process.env.KAITEN_API_TOKEN;
const KAITEN_DOMAIN = process.env.KAITEN_DOMAIN; // например: panna.kaiten.ru

// === API: создание карточки (task) в Kaiten ===
app.post('/api/proxy/card', async (req, res) => {
  const { spaceId, title, boardId, columnId } = req.body;

  if (!KAITEN_API_TOKEN || !KAITEN_DOMAIN) {
    return res.status(500).json({ error: 'KAITEN_API_TOKEN или KAITEN_DOMAIN не заданы' });
  }

  // По умолчанию — берем boardId и columnId из URL или используем дефолтные
  const board_id = boardId || 1; // ← замени на реальный boardId из твоей доски
  const column_id = columnId || 1; // ← первая колонка

  try {
    const kaitenRes = await fetch(`https://${KAITEN_DOMAIN}/api/latest/cards`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KAITEN_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        board_id,
        column_id,
        asap: false, // можно сделать опциональным
        due_date: null
      })
    });

    const data = await kaitenRes.json();
    res.status(kaitenRes.status).json(data);
  } catch (err) {
    console.error('Kaiten API error:', err);
    res.status(500).json({ error: 'Ошибка при обращении к Kaiten API' });
  }
});

// === Чат API ===
app.post('/api/messages', (req, res) => {
  const { spaceId, text } = req.body;
  if (!spaceId || !text) {
    return res.status(400).json({ error: 'spaceId и text обязательны' });
  }

  const msg = {
    id: uuidv4(),
    spaceId,
    text,
    isCommand: text.startsWith('/'),
    createdAt: new Date().toISOString()
  };
  messages.push(msg);
  res.json(msg);
});

app.get('/api/messages/:spaceId', (req, res) => {
  const { spaceId } = req.params;
  const spaceMessages = messages.filter(m => m.spaceId === spaceId);
  res.json(spaceMessages);
});

// Раздаём фронтенд
app.use(express.static('../frontend'));

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/../frontend/index.html');
});

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  console.log(`🌐 Kaiten Domain: ${KAITEN_DOMAIN || 'не задан'}`);
});
