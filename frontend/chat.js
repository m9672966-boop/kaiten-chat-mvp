// === URL параметры ===
const urlParams = new URLSearchParams(window.location.search);
const SPACE_ID = urlParams.get('space') || '572075';
const inviteName = urlParams.get('invite');

// === Авторизация по имени ===
let userName = localStorage.getItem('kaiten_chat_user_name');
if (inviteName) {
  userName = decodeURIComponent(inviteName);
  localStorage.setItem('kaiten_chat_user_name', userName);
}
if (!userName) {
  userName = prompt('Введите ваше имя и фамилию:');
  if (userName) {
    localStorage.setItem('kaiten_chat_user_name', userName);
  } else {
    alert('Требуется имя');
    throw new Error('No name');
  }
}

// === Глобальные переменные ===
const API_BASE = window.location.origin;
let currentMode = 'space'; // 'space' или 'private'
let currentRoomId = null;

// === UI переключение ===
document.querySelectorAll('input[name="mode"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    currentMode = e.target.value;
    document.getElementById('private-user').style.display = currentMode === 'private' ? 'inline-block' : 'none';
    loadMessages();
  });
});

// === Генерация roomId для приватного чата ===
function getRoomId(otherName) {
  return [userName, otherName].sort().join('_');
}

// === Загрузка сообщений ===
async function loadMessages() {
  const privateUser = document.getElementById('private-user').value.trim();
  const container = document.getElementById('messages');
  container.innerHTML = '<div>Загрузка...</div>';

  try {
    let msgs = [];
    let title = '';

    if (currentMode === 'private' && privateUser) {
      const roomId = getRoomId(privateUser);
      currentRoomId = roomId;
      const res = await fetch(`${API_BASE}/api/messages/room/${roomId}`);
      msgs = await res.json();
      title = `Приватный чат с ${privateUser}`;
    } else {
      const res = await fetch(`${API_BASE}/api/messages/space/${SPACE_ID}`);
      msgs = await res.json();
      title = `Общий чат (пространство ${SPACE_ID})`;
      currentRoomId = null;
    }

    document.getElementById('chat-title').textContent = title;
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
    container.innerHTML = '<div style="color:red;">Ошибка загрузки</div>';
  }
}

// === Отправка сообщения ===
async function sendMessage() {
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  if (!text) return;

  const privateUser = document.getElementById('private-user').value.trim();
  let payload = { text, author: userName };

  if (currentMode === 'private' && privateUser) {
    payload.roomId = getRoomId(privateUser);
  } else {
    payload.spaceId = SPACE_ID;
  }

  try {
    await fetch(`${API_BASE}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // Обработка команд
    if (text.startsWith('/task ')) {
      const title = text.substring(6);
      const cardRes = await fetch(`${API_BASE}/api/proxy/card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceId: SPACE_ID, title })
      });

      if (!cardRes.ok) {
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

// === Приглашение ===
function inviteUser() {
  const name = prompt('Имя и фамилия приглашённого:');
  if (name) {
    const inviteLink = `${window.location.origin}?space=${SPACE_ID}&invite=${encodeURIComponent(name)}`;
    prompt('Отправьте эту ссылку:', inviteLink);
  }
}

// === Enter → отправка ===
document.getElementById('msg-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// === Автообновление ===
loadMessages();
setInterval(loadMessages, 5000);
