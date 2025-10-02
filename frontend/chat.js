const urlParams = new URLSearchParams(window.location.search);
const SPACE_ID = urlParams.get('space') || '572075';
const inviteName = urlParams.get('invite');

let userName = localStorage.getItem('kaiten_chat_user_name');
if (inviteName) {
  userName = decodeURIComponent(inviteName);
  localStorage.setItem('kaiten_chat_user_name', userName);
}
if (!userName) {
  userName = prompt('Ваше имя и фамилия:');
  if (userName) {
    localStorage.setItem('kaiten_chat_user_name', userName);
  } else {
    alert('Требуется имя');
    throw new Error('No name');
  }
}

const API_BASE = window.location.origin;
let currentMode = 'space';

// === Переключение режима ===
document.querySelectorAll('input[name="mode"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    currentMode = e.target.value;
    document.getElementById('private-user').style.display = currentMode === 'private' ? 'inline-block' : 'none';
    loadMessages();
  });
});

// === Аватарка по имени ===
function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function getColor(name) {
  const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#d35400'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

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
  dropArea.addEventListener(eventName, () => dropArea.style.borderColor = '#3498db', false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, () => dropArea.style.borderColor = '#ccc', false);
});

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
        headers: { 'Content-Type': 'application/json'
