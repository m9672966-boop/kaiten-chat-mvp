const urlParams = new URLSearchParams(window.location.search);
const SPACE_ID = urlParams.get('space') || '572075';
const inviteName = urlParams.get('invite');

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

const API_BASE = window.location.origin;
let currentMode = 'space'; // 'space' or 'private'
let currentRoomId = null;

// === UI: кнопка "Скрыть" ===
document.getElementById('close-btn').addEventListener('click', () => {
  const container = document.getElementById('kaiten-chat-embed');
  if (container) {
    container.style.display = 'none';
  }
});

// === Переключение режима ===
document.querySelectorAll('input[name="mode"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    currentMode = e.target.value;
    document.getElementById('private-user').style.display = currentMode === 'private' ? 'inline-block' : 'none';
    loadMessages();
  });
});

// === Emoji ===
document.getElementById('toggle-emoji').addEventListener('click', () => {
  const picker = document.getElementById('emoji-picker');
  picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
});

document.querySelectorAll('.emoji').forEach(el => {
  el.addEventListener('click', () => {
    document.getElementById('msg-input').value += el.textContent;
    document.getElementById('msg-input').focus();
    document.getElementById('emoji-picker').style.display = 'none';
  });
});

// === Загрузка изображений ===
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');

document.getElementById('toggle-upload').addEventListener('click', () => {
  dropArea.style.display = dropArea.style.display === 'none' ? 'block' : 'none';
});

dropArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', uploadImage);

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, unhighlight, false);
});

function highlight() {
  dropArea.classList.add('dragover');
}

function unhighlight() {
  dropArea.classList.remove('dragover');
}

dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  if (files.length) {
    fileInput.files = files;
    uploadImage();
  }
}

async function uploadImage() {
  const file = fileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.url) {
      const privateUser = document.getElementById('private-user').value.trim();
      let payload = { author: userName, imageUrl: data.url };

      if (currentMode === 'private' && privateUser) {
        payload.roomId = getRoomId(privateUser);
      } else {
        payload.spaceId = SPACE_ID;
      }

      await fetch(`${API_BASE}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      loadMessages();
      fileInput.value = '';
      dropArea.style.display = 'none';
    }
  } catch (err) {
    console.error('Ошибка загрузки:', err);
    alert('Не удалось загрузить изображение');
  }
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
        // Создаём временный файл
        const filename = `pasted-${Date.now()}.${blob.type.split('/')[1]}`;
        const file = new File([base64], filename, { type: blob.type });

        const formData = new FormData();
        formData.append('image', file);

        try {
          const res = await fetch(`${API_BASE}/api/upload`, {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (data.url) {
            const privateUser = document.getElementById('private-user').value.trim();
            let payload = { author: userName, imageUrl: data.url };

            if (currentMode === 'private' && privateUser) {
              payload.roomId = getRoomId(privateUser);
            } else {
              payload.spaceId = SPACE_ID;
            }

            await fetch(`${API_BASE}/api/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            loadMessages();
          }
        } catch (err) {
          console.error('Ошибка вставки:', err);
          alert('Не удалось вставить изображение');
        }
      };
      reader.readAsDataURL(blob);
    }
  }
});

// === Отображение изображений + скачивание ===
function createMessageElement(msg) {
  const el = document.createElement('div');
  el.className = 'msg' + (msg.isCommand ? ' cmd' : '');

  const authorEl = document.createElement('strong');
  authorEl.textContent = msg.author + ': ';
  el.appendChild(authorEl);

  if (msg.text) {
    const textEl = document.createElement('span');
    textEl.textContent = msg.text;
    el.appendChild(textEl);
  }

  if (msg.imageUrl) {
    const img = document.createElement('img');
    img.src = msg.imageUrl;
    img.alt = 'Изображение';
    img.title = 'Щелкните, чтобы скачать';
    img.onclick = () => {
      const a = document.createElement('a');
      a.href = msg.imageUrl;
      a.download = msg.imageUrl.split('/').pop();
      a.click();
    };
    el.appendChild(img);
  }

  return el;
}

// === Вспомогательные функции ===
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
      const res = await fetch(`${API_BASE}/api/messages/room/${roomId}`);
      msgs = await res.json();
      title = `Приватный чат с ${privateUser}`;
    } else {
      const res = await fetch(`${API_BASE}/api/messages/space/${SPACE_ID}`);
      msgs = await res.json();
      title = `Общий чат (пространство ${SPACE_ID})`;
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

// === Отправка текстового сообщения ===
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
