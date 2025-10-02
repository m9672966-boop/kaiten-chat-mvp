// Получаем spaceId и invite из URL
const urlParams = new URLSearchParams(window.location.search);
const SPACE_ID = urlParams.get('space') || '572075';
const inviteName = urlParams.get('invite');

// Авторизация по имени
let userName = localStorage.getItem('kaiten_chat_user_name');
if (inviteName) {
  userName = decodeURIComponent(inviteName);
  localStorage.setItem('kaiten_chat_user_name', userName);
}
if (!userName) {
  userName = prompt('Введите ваше имя и фамилию (например, Елизавета Манцурова):');
  if (userName) {
    localStorage.setItem('kaiten_chat_user_name', userName);
  } else {
    alert('Требуется имя');
    throw new Error('No name');
  }
}

document.getElementById('space-id').textContent = SPACE_ID;

// API_BASE — текущий origin (для Render)
const API_BASE = window.location.origin;

// Загрузка сообщений
async function loadMessages() {
  try {
    const res = await fetch(`${API_BASE}/api/messages/${SPACE_ID}`);
    if (!res.ok) throw new Error('Не удалось загрузить сообщения');
    const msgs = await res.json();
    const container = document.getElementById('messages');
    container.innerHTML = '';
    msgs.forEach(m => {
      const el = document.createElement('div');
      el.className = 'msg' + (m.isCommand ? ' cmd' : '');
      el.innerHTML = `<strong>${m.author}:</strong> ${m.text}`;
      container.appendChild(el);
    });
    container.scrollTop = container.scrollHeight;
  } catch (err) {
    console.error(err);
  }
}

// Отправка сообщения
async function sendMessage() {
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  if (!text) return;

  try {
    // Сохраняем в чат
    await fetch(`${API_BASE}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spaceId: SPACE_ID, text, author: userName })
    });

    // Обработка команд
    if (text.startsWith('/task ')) {
      const title = text.substring(6);
      const cardRes = await fetch(`${API_BASE}/api/proxy/card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId: SPACE_ID,
          title,
          boardId: 1,     // ← замени на реальный boardId
          columnId: 1     // ← первая колонка
        })
      });

      if (cardRes.ok) {
        alert('✅ Карточка создана в Kaiten!');
      } else {
        const err = await cardRes.json();
        alert('❌ Ошибка: ' + (err.detail || JSON.stringify(err)).substring(0, 100));
      }
    }

    input.value = '';
    loadMessages();
  } catch (err) {
    console.error(err);
    alert('Ошибка отправки');
  }
}

// Приглашение
function inviteUser() {
  const name = prompt('Имя и фамилия приглашённого:');
  if (name) {
    const inviteLink = `${window.location.origin}?space=${SPACE_ID}&invite=${encodeURIComponent(name)}`;
    prompt('Отправьте эту ссылку:', inviteLink);
  }
}

// Enter → отправка
document.getElementById('msg-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// Загружаем при старте
loadMessages();
setInterval(loadMessages, 5000); // автообновление
