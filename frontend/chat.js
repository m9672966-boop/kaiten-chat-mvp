const urlParams = new URLSearchParams(window.location.search);
let SPACE_ID = urlParams.get('space') || '572075';
let userName = localStorage.getItem('kaiten_chat_user_name');
let currentMode = 'space';

// === Ввод имени ===
if (!userName) {
  const container = document.getElementById('messages').parentNode;
  const nameInput = document.createElement('div');
  nameInput.innerHTML = `
    <div style="padding: 10px; background: #fff; border: 1px solid #ddd; margin-bottom: 10px;">
      <input type="text" id="user-name-input" placeholder="Введите ваше имя и фамилию" style="width: 80%; padding: 8px; margin-right: 5px;">
      <button onclick="setUserName()" style="padding: 8px 12px; background: #3498db; color: white; border: none;">✅</button>
    </div>
  `;
  container.insertBefore(nameInput, document.getElementById('messages'));
}

function setUserName() {
  const input = document.getElementById('user-name-input');
  const name = input.value.trim();
  if (name) {
    userName = name;
    localStorage.setItem('kaiten_chat_user_name', name);
    input.parentNode.remove();
    loadMessages();
  } else {
    alert('Имя обязательно');
  }
}

// === Переключение режима ===
document.querySelectorAll('input[name="mode"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    currentMode = e.target.value;
    document.getElementById('private-user').style.display = currentMode === 'private' ? 'inline-block' : 'none';
    loadMessages();
  });
});

// === Аватарка ===
function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}
function getColor(name) {
  const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#d35400'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// === Emoji — делегирование ===
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('emoji')) {
    document.getElementById('msg-input').value += e.target.textContent;
    document.getElementById('msg-input').focus();
    document.getElementById('emoji-picker').style.display = 'none';
  }
});

// === Загрузка изображений (в Base64) ===
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');

document.getElementById('toggle-upload').addEventListener('click', () => {
  dropArea.style.display = dropArea.style.display === 'none' ? 'block' : 'none';
});

dropArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', uploadImage);

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); }, false);
});

['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, () => dropArea.style.borderColor = '#3498db', false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, () => dropArea.style.borderColor = '#ccc', false);
});

dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
  e.preventDefault();
  const files = e.dataTransfer.files;
  if (files.length) {
    fileInput.files = files;
    uploadImage();
  }
}

async function uploadImage() {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    const base64 = event.target.result;
    // Отправляем Base64
    const privateUser = document.getElementById('private-user').value.trim();
    let payload = { author: userName, imageUrl: base64 };

    if (currentMode === 'private' && privateUser) {
      payload.roomId = getRoomId(privateUser);
    } else {
      payload.spaceId = SPACE_ID;
    }

    try {
      await fetch(`${window.location.origin}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      loadMessages();
      fileInput.value = '';
      dropArea.style.display = 'none';
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      alert('Не удалось загрузить изображение');
    }
  };
  reader.readAsDataURL(file);
}

// === Вставка через Ctrl+V ===
document.getElementById('msg-input').addEventListener('paste', async (e) => {
  const items = e.clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const blob = item.getAsFile();
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result;
        const privateUser = document.getElementById('private-user').value.trim();
        let payload = { author: userName, imageUrl: base64 };

        if (currentMode === 'private' && privateUser) {
          payload.roomId = getRoomId(privateUser);
        } else {
          payload.spaceId = SPACE_ID;
        }

        try {
          await fetch(`${window.location.origin}/api/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          loadMessages();
        } catch (err) {
          console.error('Ошибка вставки:', err);
          alert('Не удалось вставить изображение');
        }
      };
      reader.readAsDataURL(blob);
    }
  }
});

// === Отображение сообщения ===
function createMessageElement(msg) {
  const el = document.createElement('div');
  el.className = 'msg' + (msg.isCommand ? ' cmd' : '');

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = getInitials(msg.author);
  avatar.style.backgroundColor = getColor(msg.author);

  const content = document.createElement('div');
  content.className = 'msg-content';
  const authorEl = document.createElement('div');
  authorEl.className = 'msg-author';
  authorEl.textContent = msg.author;
  const textEl = document.createElement('div');
  textEl.className = 'msg-text';
  textEl.textContent = msg.text || '';

  content.appendChild(authorEl);
  content.appendChild(textEl);

  if (msg.imageUrl) {
    const img = document.createElement('img');
    img.src = msg.imageUrl;
    img.alt = 'Изображение';
    img.onclick = () => {
      const a = document.createElement('a');
      a.href = msg.imageUrl;
      a.download = `chat-image-${Date.now()}.png`;
      a.click();
    };
    content.appendChild(img);
  }

  el.appendChild(avatar);
  el.appendChild(content);
  return el;
}

function getRoomId(otherName) {
  return [userName, otherName].sort().join('_');
}

// === Загрузка сообщений ===
async function loadMessages() {
  if (!userName) return;

  const privateUser = document.getElementById('private-user').value.trim();
  const container = document.getElementById('messages');
  container.innerHTML = '<div>Загрузка...</div>';

  try {
    let msgs = [];
    let title = '';

    if (currentMode === 'private' && privateUser) {
      const roomId = getRoomId(privateUser);
      const res = await fetch(`${window.location.origin}/api/messages/room/${roomId}`);
      msgs = await res.json();
      title = `Приватный чат с ${privateUser}`;
    } else {
      const res = await fetch(`${window.location.origin}/api/messages/space/${SPACE_ID}`);
      msgs = await res.json();
      title = `Общий чат (${SPACE_ID})`;
    }

    document.getElementById('chat-title').textContent = title;
    container.innerHTML = '';
    msgs.forEach(m => {
      container.appendChild(createMessageElement(m));
    });
    container.scrollTop = container.scrollHeight;
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div style="color:red;">Ошибка загрузки</div>';
  }
}

// === Отправка текста ===
async function sendMessage() {
  if (!userName) return alert('Сначала введите имя');

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
    await fetch(`${window.location.origin}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (text.startsWith('/task ')) {
      const title = text.substring(6);
      const cardRes = await fetch(`${window.location.origin}/api/proxy/card`, {
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
  if (!userName) return alert('Сначала введите имя');
  const name = prompt('Имя приглашённого:');
  if (name) {
    const link = `${window.location.origin}?space=${SPACE_ID}&invite=${encodeURIComponent(name)}`;
    prompt('Скопируйте ссылку:', link);
  }
}

// === Enter → отправка ===
document.getElementById('msg-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// === Автообновление ===
loadMessages();
setInterval(loadMessages, 5000);
