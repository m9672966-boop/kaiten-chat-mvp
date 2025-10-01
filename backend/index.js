const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// В памяти (в реальности — PostgreSQL, но для MVP хватит)
let messages = []; // { id, spaceId, text, isCommand, createdAt }

// Защита: требуем KAITEN_API_TOKEN в заголовке или query (для простоты — в query)
const KAITEN_API_TOKEN = process.env.KAITEN_API_TOKEN;
const KAITEN_DOMAIN = process.env.KAITEN_DOMAIN; // например: your-space.kaiten.ru

// Простой прокси к Kaiten API (чтобы не хранить токен на фронтенде)
app.post('/api/proxy/task', async (req, res) => {
  const { spaceId, title } = req.body;
  if (!KAITEN_API_TOKEN || !KAITEN_DOMAIN) {
    return res.status(500).json({ error: 'Kaiten credentials not configured' });
  }

  try {
    const kaitenRes = await fetch(`https://${KAITEN_DOMAIN}/api/latest/spaces/${spaceId}/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KAITEN_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
    });

    const data = await kaitenRes.json();
    if (!kaitenRes.ok) {
      return res.status(kaitenRes.status).json(data);
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kaiten API error' });
  }
});

// Сохранение сообщения
app.post('/api/messages', (req, res) => {
  const { spaceId, text, isCommand = false } = req.body;
  const msg = {
    id: uuidv4(),
    spaceId,
    text,
    isCommand,
    createdAt: new Date().toISOString()
  };
  messages.push(msg);
  res.json(msg);
});

// Получение сообщений по spaceId
app.get('/api/messages/:spaceId', (req, res) => {
  const { spaceId } = req.params;
  const spaceMessages = messages.filter(m => m.spaceId === spaceId);
  res.json(spaceMessages);
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
