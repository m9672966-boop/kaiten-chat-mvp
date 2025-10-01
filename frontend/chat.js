// Получаем spaceId из URL
const urlParams = new URLSearchParams(window.location.search);
const SPACE_ID = urlParams.get('space');
if (!SPACE_ID) {
  alert('Укажите ?space=ID в URL');
  throw new Error('No space ID');
}
document.getElementById('space-id').textContent = SPACE_ID;

const API_BASE = 'https://kaiten-chat.onrender.com'; // ← замени на свой URL после деплоя

// Загрузка сообщений
async function loadMessages() {
  const res = await fetch(`${API_BASE}/api/messages/${SPACE_ID}`);
  const msgs = await res.json();
  const container = document.getElementById('messages');
  container.innerHTML = '';
  msgs.forEach(m => {
    const el = document.createElement('div');
    el.className = 'msg' + (m.isCommand ? ' cmd' : '');
    el.textContent = m.text;
    container.appendChild(el);
  });
  container.scrollTop = container.scrollHeight;
}

// Отправка
async function sendMessage() {
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  if (!text) return;

  // Сохраняем сообщение
  await fetch(`${API_BASE}/api/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spaceId: SPACE_ID, text, isCommand: text.startsWith('/') })
  });

  if (text.startsWith('/task ')) {
    const title = text.substring(6);
    const taskRes = await fetch(`${API_BASE}/api/proxy/task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spaceId: SPACE_ID, title })
    });
    if (taskRes.ok) {
      alert('✅ Задача создана!');
    } else {
      const err = await taskRes.json();
      alert('❌ Ошибка: ' + JSON.stringify(err));
    }
  }

  input.value = '';
  loadMessages();
}

// Enter → отправка
document.getElementById('msg-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// Загружаем при старте
loadMessages();
