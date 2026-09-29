// ==================== НАСТРОЙКИ ====================
const settings = {
  runKey: 'shift',
  sound: true,
  showHp: true,
  showNicks: true,
  minimap: true,
  mobileMode: 'auto'
};

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('killzoneSettings') || '{}');
    Object.assign(settings, s);
  } catch(e) {}
}
function saveSettings() {
  localStorage.setItem('killzoneSettings', JSON.stringify(settings));
}
loadSettings();

// ==================== ЗВУК ====================
let audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
}
function playSound(type, dist = 0) {
  if (!settings.sound || !audioCtx) return;
  const now = audioCtx.currentTime;
  const vol = Math.max(0.03, 1 - dist / 800);
  if (vol < 0.03) return;
  try {
    if (type === 'pistol' || type === 'bullet' || type === 'machinegun') {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(700, now);
      o.frequency.exponentialRampToValueAtTime(150, now + 0.06);
      g.gain.setValueAtTime(0.12 * vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(now); o.stop(now + 0.1);
    } else if (type === 'shotgun' || type === 'explosion') {
      const bufferSize = audioCtx.sampleRate * 0.25;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
      const src = audioCtx.createBufferSource();
      src.buffer = buffer;
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0.35 * vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(type === 'explosion' ? 400 : 1500, now);
      src.connect(filter); filter.connect(g); g.connect(audioCtx.destination);
      src.start(now);
    } else if (type === 'awm' || type === 'rocket') {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(400, now);
      o.frequency.exponentialRampToValueAtTime(60, now + 0.25);
      g.gain.setValueAtTime(0.25 * vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(now); o.stop(now + 0.35);
    } else if (type === 'hit') {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(220, now);
      g.gain.setValueAtTime(0.1 * vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(now); o.stop(now + 0.12);
    } else if (type === 'pickup') {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(400, now);
      o.frequency.linearRampToValueAtTime(900, now + 0.15);
      g.gain.setValueAtTime(0.15 * vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(now); o.stop(now + 0.22);
    } else if (type === 'death') {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(300, now);
      o.frequency.exponentialRampToValueAtTime(50, now + 0.5);
      g.gain.setValueAtTime(0.2 * vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(now); o.stop(now + 0.65);
    }
  } catch(e) {}
}

// ==================== СОКЕТ ====================
const socket = io();

const state = {
  myId: null, myNick: '', lobbyId: null,
  mapKey: 'desert', mapData: null, weapons: {}, vehicleDefs: {},
  players: {}, bullets: [], airdrops: [], explosions: [], bloodMarks: [],
  vehicles: [], chat: [],
  selectedMap: 'desert', pendingLobbyId: null,
  paused: false, showPlayers: false,
  mouseX: 0, mouseY: 0, mobileAngle: 0,
  camera: { x: 0, y: 0 },
  inVehicle: null,
  // Локальное предсказание движения
  localX: 0, localY: 0,
  serverX: 0, serverY: 0
};

// ==================== ЭКРАНЫ ====================
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}
function goPlay() { show('playScreen'); }
function backToMenu() { show('menuScreen'); }
function backToPlay() { show('playScreen'); }
function showCreate() { show('createScreen'); }
function showJoinList() { show('joinScreen'); refreshLobbies(); }
function showSettings() { show('settingsScreen'); updateSettingsUI(); }

function updateSettingsUI() {
  const rs = document.getElementById('setRunShift');
  const ra = document.getElementById('setRunAlt');
  if (rs) rs.classList.toggle('active', settings.runKey === 'shift');
  if (ra) ra.classList.toggle('active', settings.runKey === 'alt');
  const sb = document.getElementById('setSound');
  if (sb) { sb.textContent = settings.sound ? 'ВКЛ' : 'ВЫКЛ'; sb.classList.toggle('active', settings.sound); }
  const hb = document.getElementById('setShowHp');
  if (hb) { hb.textContent = settings.showHp ? 'ВКЛ' : 'ВЫКЛ'; hb.classList.toggle('active', settings.showHp); }
  const nb = document.getElementById('setShowNicks');
  if (nb) { nb.textContent = settings.showNicks ? 'ВКЛ' : 'ВЫКЛ'; nb.classList.toggle('active', settings.showNicks); }
  const mb = document.getElementById('setMinimap');
  if (mb) { mb.textContent = settings.minimap ? 'ВКЛ' : 'ВЫКЛ'; mb.classList.toggle('active', settings.minimap); }
  const ma = document.getElementById('setMobileAuto');
  const mo = document.getElementById('setMobileOn');
  const mf = document.getElementById('setMobileOff');
  if (ma) ma.classList.toggle('active', settings.mobileMode === 'auto');
  if (mo) mo.classList.toggle('active', settings.mobileMode === 'on');
  if (mf) mf.classList.toggle('active', settings.mobileMode === 'off');
}

function setRunKey(k) { settings.runKey = k; saveSettings(); updateSettingsUI(); }
function toggleSound() { settings.sound = !settings.sound; saveSettings(); updateSettingsUI(); if (settings.sound) initAudio(); }
function toggleShowHp() { settings.showHp = !settings.showHp; saveSettings(); updateSettingsUI(); }
function toggleShowNicks() { settings.showNicks = !settings.showNicks; saveSettings(); updateSettingsUI(); }
function toggleMinimap() { settings.minimap = !settings.minimap; saveSettings(); updateSettingsUI(); applyMinimapVisibility(); }
function setMobileMode(m) { settings.mobileMode = m; saveSettings(); updateSettingsUI(); applyMobileMode(); }

function applyMinimapVisibility() {
  const mm = document.getElementById('minimapBox');
  if (mm) mm.style.display = settings.minimap ? 'block' : 'none';
}

// ==================== КАРТА ====================
function selectMap(el) {
  document.querySelectorAll('.mapBtn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  state.selectedMap = el.dataset.map;
}

// ==================== ЛОББИ ====================
function createLobby() {
  const nick = document.getElementById('createNick').value.trim();
  const name = document.getElementById('createName').value.trim() || 'Лобби';
  const pass = document.getElementById('createPass').value;
  const max = parseInt(document.getElementById('createMax').value);
  if (!nick || nick.length < 2) { document.getElementById('createError').textContent = 'Ник мин. 2 символа'; return; }
  state.myNick = nick;
  socket.emit('createLobby', { name, password: pass, maxPlayers: max, map: state.selectedMap });
}

socket.on('lobbyCreated', ({ id }) => {
  state.pendingLobbyId = id;
  socket.emit('joinLobby', { lobbyId: id, nick: state.myNick, password: document.getElementById('createPass').value });
});

function refreshLobbies() { socket.emit('getLobbies'); }

socket.on('lobbiesList', (list) => {
  const box = document.getElementById('lobbyList');
  if (!box) return;
  if (!list.length) { box.innerHTML = '<div style="text-align:center;color:#888;padding:30px;">Пока нет лобби.</div>'; return; }
  box.innerHTML = list.map(l => `
    <div class="lobbyCard">
      <div class="info">
        <div class="name">${esc(l.name)} ${l.hasPassword ? '🔒' : ''}</div>
        <div class="meta">${esc(l.map)} | Игроков: ${l.playersCount}/${l.maxPlayers}</div>
      </div>
      <button onclick="tryJoin('${l.id}', ${l.hasPassword})">ЗАЙТИ</button>
    </div>
  `).join('');
});

function tryJoin(lobbyId, hasPass) {
  state.pendingLobbyId = lobbyId;
  if (hasPass) { document.getElementById('modalPass').classList.remove('hidden'); document.getElementById('modalPass').value = ''; }
  else { document.getElementById('modalPass').classList.add('hidden'); }
  document.getElementById('modalNick').value = state.myNick || '';
  document.getElementById('modalError').textContent = '';
  document.getElementById('modal').classList.remove('hidden');
}
function closeModal() { document.getElementById('modal').classList.add('hidden'); state.pendingLobbyId = null; }
function confirmJoin() {
  const nick = document.getElementById('modalNick').value.trim();
  const pass = document.getElementById('modalPass').value;
  if (!nick || nick.length < 2) { document.getElementById('modalError').textContent = 'Ник мин. 2 символа'; return; }
  state.myNick = nick;
  socket.emit('joinLobby', { lobbyId: state.pendingLobbyId, nick, password: pass });
}

socket.on('joinedLobby', (data) => {
  state.myId = data.playerId;
  state.lobbyId = data.lobbyId;
  state.mapKey = data.map;
  state.mapData = data.mapData;
  state.weapons = data.weapons;
  state.vehicleDefs = data.vehicles || {};
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('createError').textContent = '';
  initAudio();
  applyMinimapVisibility();
  applyMobileMode();
  show('gameScreen');
  startGame();
});

socket.on('errorMsg', (msg) => {
  const ce = document.getElementById('createError');
  const me = document.getElementById('modalError');
  if (ce) ce.textContent = msg;
  if (me) me.textContent = msg;
  notify(msg);
});

// ==================== СОСТОЯНИЕ ====================
socket.on('state', (data) => {
  state.players = data.players;
  state.bullets = data.bullets;
  state.airdrops = data.airdrops;
  state.vehicles = data.vehicles || [];
  state.chat = data.chat || [];

  // Синхронизация локальной позиции с сервером (мягко)
  const me = state.players[state.myId];
  if (me) {
    state.serverX = me.x;
    state.serverY = me.y;
  }

  renderChat();
});

socket.on('shot', ({ x, y, type }) => {
  const me = state.players[state.myId];
  if (!me) return;
  playSound(type, Math.hypot(me.x - x, me.y - y));
});

socket.on('hit', ({ x, y }) => {
  state.bloodMarks.push({ x, y, born: Date.now(), size: 8 + Math.random() * 8 });
  if (state.bloodMarks.length > 80) state.bloodMarks.shift();
  const me = state.players[state.myId];
  if (me) playSound('hit', Math.hypot(me.x - x, me.y - y));
});

socket.on('explosion', ({ x, y, radius }) => {
  state.explosions.push({ x, y, radius, born: Date.now() });
  const me = state.players[state.myId];
  if (me) playSound('explosion', Math.hypot(me.x - x, me.y - y));
});

socket.on('airdrop', () => notify('📦 Аирдроп!'));
socket.on('pickup', ({ nick, weapon }) => { notify(`${nick} подобрал ${weapon}`); playSound('pickup'); });
socket.on('vehicleEntered', ({ nick }) => notify(`${nick} сел в технику`));
socket.on('vehicleExited', ({ nick }) => notify(`${nick} вышел из техники`));
socket.on('death', ({ who }) => {
  if (who === state.myId) { notify('Ты погиб! Респавн 3 сек...'); playSound('death'); }
});

// ==================== ИГРА ====================
let canvas, ctx, minimapCanvas, mmCtx;
let lastTime = 0;
let running = false;
const keys = {};
let mouseHeld = false;

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function applyMobileMode() {
  const mc = document.getElementById('mobileControls');
  const hints = document.getElementById('pcHints');
  if (!mc) return;
  let showMobile = false;
  if (settings.mobileMode === 'on') showMobile = true;
  else if (settings.mobileMode === 'off') showMobile = false;
  else showMobile = isTouchDevice() || window.innerWidth < 900;
  mc.classList.toggle('active', showMobile);
  if (hints) hints.style.display = showMobile ? 'none' : 'block';
}

function startGame() {
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');
  minimapCanvas = document.getElementById('minimap');
  mmCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;
  resizeCanvas();
  window.addEventListener('resize', () => { resizeCanvas(); applyMobileMode(); });
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', () => { mouseHeld = true; });
  window.addEventListener('mouseup', () => { mouseHeld = false; });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const me = state.players[state.myId];
    if (!me || !me.alive) return;
    const inv = me.inventory || [];
    if (!inv.length) return;
    const idx = inv.indexOf(me.currentWeapon);
    let next;
    if (e.deltaY > 0) next = inv[(idx + 1) % inv.length];
    else next = inv[(idx - 1 + inv.length) % inv.length];
    socket.emit('switchWeapon', next);
  }, { passive: false });

  setupChatInput();
  if (isTouchDevice()) setupMobileControls();

  if (!running) {
    running = true;
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }
}

function resizeCanvas() {
  if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
}

function onKeyDown(e) {
  const k = e.key.toLowerCase();
  const ci = document.getElementById('chatInput');
  if (ci && ci.classList.contains('active')) return;

  keys[k] = true;
  if (k === 'tab') { e.preventDefault(); togglePlayerList(true); }
  if (k === 'escape') {
    if (state.showPlayers) { togglePlayerList(false); return; }
    togglePause();
  }
  if (k === 'r') socket.emit('reload');
  if (k === 'g') { socket.emit('switchWeapon', 'grenade'); setTimeout(shoot, 50); }
  if (k === '1') socket.emit('switchWeapon', 'pistol');
  if (k === '2') socket.emit('switchWeapon', 'shotgun');
  if (k === '3') socket.emit('switchWeapon', 'grenade');
  if (k === 'q') notify('Выброс в разработке');
  if (k === 'e') interact();
  if (k === 't') { e.preventDefault(); openChat(); }
}

function onKeyUp(e) {
  const k = e.key.toLowerCase();
  keys[k] = false;
  if (k === 'tab') togglePlayerList(false);
}

function onMouseMove(e) { state.mouseX = e.clientX; state.mouseY = e.clientY; }

function interact() {
  const me = state.players[state.myId];
  if (!me) return;
  if (me.vehicleId) { socket.emit('exitVehicle'); return; }
  for (const v of state.vehicles) {
    if (v.driverId) continue;
    if (Math.hypot(v.x - me.x, v.y - me.y) < 70) {
      socket.emit('enterVehicle', v.id);
      return;
    }
  }
}

function shoot() {
  if (!state.myId || !state.players[state.myId] || state.paused) return;
  const me = state.players[state.myId];
  if (!me.alive) return;

  if (me.vehicleId) {
    socket.emit('vehicleShoot', { angle: me.angle });
    return;
  }

  let ax = state.mouseX + state.camera.x, ay = state.mouseY + state.camera.y;
  if (isTouchDevice() && document.getElementById('mobileControls').classList.contains('active')) {
    ax = me.x + Math.cos(state.mobileAngle) * 500;
    ay = me.y + Math.sin(state.mobileAngle) * 500;
  }
  const angle = Math.atan2(ay - me.y, ax - me.x);
  socket.emit('shoot', { x: me.x, y: me.y, angle });
}

let shootTimer = 0;
let lastSentMove = 0;

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(50, now - lastTime);
  lastTime = now;
  if (state.paused) return;
  if (!state.myId || !state.players[state.myId]) return;

  const me = state.players[state.myId];

  const targetCamX = me.x - canvas.width / 2;
  const targetCamY = me.y - canvas.height / 2;
  state.camera.x += (targetCamX - state.camera.x) * 0.2;
  state.camera.y += (targetCamY - state.camera.y) * 0.2;

  if (me.alive) {
    let dx = 0, dy = 0;
    if (keys['w'] || keys['ц']) dy -= 1;
    if (keys['s'] || keys['ы']) dy += 1;
    if (keys['a'] || keys['ф']) dx -= 1;
    if (keys['d'] || keys['в']) dx += 1;

    let runKey = false;
    if (settings.runKey === 'shift') runKey = keys['shift'];
    else runKey = keys['alt'];

    const baseSpeed = runKey ? 7.5 : 4.5;

    if (me.vehicleId) {
      const vDef = state.vehicleDefs[me.currentVehicleType] || {};
      const v = state.vehicles.find(ve => ve.id === me.vehicleId);
      const speed = v ? (state.vehicleDefs[v.type]?.maxSpeed || 8) : 8;
      if (dx || dy) {
        const len = Math.hypot(dx, dy);
        const nx = me.x + (dx / len) * speed;
        const ny = me.y + (dy / len) * speed;
        const angle = Math.atan2(dy, dx);
        if (now - lastSentMove > 40) {
          socket.emit('vehicleMove', { x: nx, y: ny, angle });
          lastSentMove = now;
        }
      }
    } else if (dx || dy) {
      const len = Math.hypot(dx, dy);
      const nx = me.x + (dx / len) * baseSpeed;
      const ny = me.y + (dy / len) * baseSpeed;
      const angle = Math.atan2(state.mouseY + state.camera.y - me.y, state.mouseX + state.camera.x - me.x);
      if (now - lastSentMove > 30) {
        socket.emit('move', { x: nx, y: ny, angle });
        lastSentMove = now;
      }
    }
  }

  if (mouseHeld && now - shootTimer > 80) {
    shootTimer = now;
    shoot();
  }

  draw();
  drawMinimap();
  updateHUD();
}

// ==================== ОТРИСОВКА ====================
function drawFloor(w, h, type) {
  const cam = state.camera;
  const viewL = cam.x, viewT = cam.y, viewR = cam.x + w, viewB = cam.y + h;

  if (type === 'sand') {
    ctx.fillStyle = '#c9a86a';
    ctx.fillRect(0, 0, w, h);
    const step = 80;
    const startX = Math.floor(viewL / step) * step;
    const startY = Math.floor(viewT / step) * step;
    for (let x = startX; x < viewR; x += step) {
      for (let y = startY; y < viewB; y += step) {
        const hash = ((x * 73856093) ^ (y * 19349663)) % 100;
        ctx.fillStyle = `rgba(160,130,70,${0.08 + (hash % 5) * 0.03})`;
        ctx.fillRect(x - cam.x + (hash % 30), y - cam.y + (hash % 40), 3, 3);
      }
    }
  } else if (type === 'asphalt') {
    ctx.fillStyle = '#2a2a35';
    ctx.fillRect(0, 0, w, h);
    const step = 120;
    const startX = Math.floor(viewL / step) * step;
    const startY = Math.floor(viewT / step) * step;
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    for (let x = startX; x < viewR; x += step) {
      for (let y = startY; y < viewB; y += step) {
        const hash = ((x * 73856093) ^ (y * 19349663)) % 100;
        if (hash < 40) {
          ctx.beginPath();
          ctx.moveTo(x - cam.x, y - cam.y);
          ctx.lineTo(x - cam.x + 40 + (hash % 30), y - cam.y + 20);
          ctx.lineTo(x - cam.x + 70, y - cam.y - 15);
          ctx.stroke();
        }
      }
    }
  } else if (type === 'tile') {
    ctx.fillStyle = '#1e1e2a';
    ctx.fillRect(0, 0, w, h);
    const tileSize = 60;
    const startX = Math.floor(viewL / tileSize) * tileSize;
    const startY = Math.floor(viewT / tileSize) * tileSize;
    for (let x = startX; x < viewR; x += tileSize) {
      for (let y = startY; y < viewB; y += tileSize) {
        const alt = ((Math.floor(x / tileSize)) + (Math.floor(y / tileSize))) % 2 === 0;
        ctx.fillStyle = alt ? '#1e1e2a' : '#252535';
        ctx.fillRect(x - cam.x, y - cam.y, tileSize, tileSize);
        ctx.strokeStyle = '#151520';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - cam.x, y - cam.y, tileSize, tileSize);
      }
    }
  }
}

function drawWall(x, y, w, h, type) {
  const cam = state.camera;
  const sx = x - cam.x, sy = y - cam.y;

  if (type === 'brick') {
    ctx.fillStyle = '#7a3a2a';
    ctx.fillRect(sx, sy, w, h);
    ctx.strokeStyle = '#5a2a1a';
    ctx.lineWidth = 2;
    const bw = 30, bh = 15;
    for (let by = 0; by < h; by += bh) {
      const offset = (Math.floor(by / bh) % 2) * (bw / 2);
      for (let bx = -bw; bx < w + bw; bx += bw) {
        ctx.strokeRect(sx + bx + offset, sy + by, bw, bh);
      }
    }
    ctx.strokeStyle = '#3a1a0a';
    ctx.lineWidth = 3;
    ctx.strokeRect(sx, sy, w, h);
  } else if (type === 'concrete') {
    ctx.fillStyle = '#5a5a65';
    ctx.fillRect(sx, sy, w, h);
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.05 + (i % 3) * 0.03})`;
      ctx.fillRect(sx + (i * 37) % w, sy + (i * 53) % h, 4, 4);
    }
    ctx.strokeStyle = '#3a3a45';
    ctx.lineWidth = 3;
    ctx.strokeRect(sx, sy, w, h);
  } else if (type === 'metal') {
    ctx.fillStyle = '#3a3a4a';
    ctx.fillRect(sx, sy, w, h);
    ctx.fillStyle = '#6a6a7a';
    const step = 25;
    for (let bx = step; bx < w - 5; bx += step) {
      ctx.beginPath(); ctx.arc(sx + bx, sy + 8, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + bx, sy + h - 8, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    for (let by = step; by < h - 5; by += step) {
      ctx.beginPath(); ctx.arc(sx + 8, sy + by, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + w - 8, sy + by, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#1a1a25';
    ctx.lineWidth = 3;
    ctx.strokeRect(sx, sy, w, h);
  } else if (type === 'sand') {
    ctx.fillStyle = '#a88850';
    ctx.fillRect(sx, sy, w, h);
    ctx.strokeStyle = '#7a5a2a';
    ctx.lineWidth = 2;
    for (let by = 0; by < h; by += 10) {
      ctx.beginPath(); ctx.moveTo(sx, sy + by); ctx.lineTo(sx + w, sy + by); ctx.stroke();
    }
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 3;
    ctx.strokeRect(sx, sy, w, h);
  }
}

function drawDecor(x, y, type) {
  const cam = state.camera;
  const sx = x - cam.x, sy = y - cam.y;

  if (type === 'barrel') {
    ctx.fillStyle = '#8a2a2a';
    ctx.beginPath(); ctx.arc(sx, sy, 16, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4a0a0a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sx, sy, 16, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#6a1a1a';
    ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'crate') {
    ctx.fillStyle = '#a87840';
    ctx.fillRect(sx - 18, sy - 18, 36, 36);
    ctx.strokeStyle = '#6a4810';
    ctx.lineWidth = 3;
    ctx.strokeRect(sx - 18, sy - 18, 36, 36);
    ctx.beginPath();
    ctx.moveTo(sx - 18, sy - 18); ctx.lineTo(sx + 18, sy + 18);
    ctx.moveTo(sx + 18, sy - 18); ctx.lineTo(sx - 18, sy + 18);
    ctx.stroke();
  } else if (type === 'car') {
    ctx.fillStyle = '#3a5a8a';
    ctx.fillRect(sx - 35, sy - 20, 70, 40);
    ctx.fillStyle = '#2a3a5a';
    ctx.fillRect(sx - 25, sy - 14, 50, 12);
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(sx - 20, sy + 18, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + 20, sy + 18, 7, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'column') {
    ctx.fillStyle = '#6a6a75';
    ctx.beginPath(); ctx.arc(sx, sy, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3a3a45';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sx, sy, 14, 0, Math.PI * 2); ctx.stroke();
  } else if (type === 'bush') {
    ctx.fillStyle = '#2a5a2a';
    ctx.beginPath(); ctx.arc(sx - 8, sy, 12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + 8, sy, 12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx, sy - 8, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a7a3a';
    ctx.beginPath(); ctx.arc(sx, sy, 8, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'tire') {
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(sx, sy, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(sx, sy, 14, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawVehicle(v) {
  const cam = state.camera;
  const sx = v.x - cam.x, sy = v.y - cam.y;
  const def = state.vehicleDefs[v.type] || { size: 30 };

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(v.angle || 0);

  if (v.type === 'jeep') {
    ctx.fillStyle = '#3a5a8a';
    ctx.fillRect(-32, -20, 64, 40);
    ctx.fillStyle = '#2a3a5a';
    ctx.fillRect(-18, -14, 36, 12);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-24, -22, 12, 6);
    ctx.fillRect(-24, 16, 12, 6);
    ctx.fillRect(14, -22, 12, 6);
    ctx.fillRect(14, 16, 12, 6);
    ctx.strokeStyle = '#1a2a4a';
    ctx.lineWidth = 2;
    ctx.strokeRect(-32, -20, 64, 40);
  } else if (v.type === 'tank') {
    ctx.fillStyle = '#4a5a3a';
    ctx.fillRect(-40, -26, 80, 52);
    ctx.fillStyle = '#3a4a2a';
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a3a1a';
    ctx.fillRect(15, -4, 40, 8);
    ctx.strokeStyle = '#1a2a0a';
    ctx.lineWidth = 3;
    ctx.strokeRect(-40, -26, 80, 52);
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.stroke();
  } else if (v.type === 'helicopter') {
    // Тень на землю (показывает, что летит)
    ctx.save();
    ctx.rotate(-v.angle || 0);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(30, 30, 30, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#5a3a3a';
    ctx.beginPath(); ctx.ellipse(0, 0, 28, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2a1a1a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#4a2a2a';
    ctx.fillRect(-45, -4, 20, 8);

    ctx.save();
    ctx.rotate(Date.now() / 30);
    ctx.strokeStyle = 'rgba(200,200,200,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-40, -35); ctx.lineTo(-40, 35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-60, -20); ctx.lineTo(-20, 20); ctx.stroke();
    ctx.restore();
  }

  ctx.restore();

  if (v.hp < v.maxHp) {
    ctx.fillStyle = '#000';
    ctx.fillRect(sx - 30, sy - def.size - 15, 60, 5);
    ctx.fillStyle = '#3498db';
    ctx.fillRect(sx - 30, sy - def.size - 15, 60 * (v.hp / v.maxHp), 5);
  }
}

function draw() {
  if (!ctx || !canvas) return;
  const w = canvas.width, h = canvas.height;
  const map = state.mapData;
  if (!map) return;
  const cam = state.camera;

  drawFloor(w, h, map.floor);

  state.bloodMarks = state.bloodMarks.filter(b => Date.now() - b.born < 30000);
  for (const b of state.bloodMarks) {
    const sx = b.x - cam.x, sy = b.y - cam.y;
    if (sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) continue;
    ctx.fillStyle = `rgba(150,0,0,${0.5 * (1 - (Date.now() - b.born) / 30000)})`;
    ctx.beginPath(); ctx.arc(sx, sy, b.size, 0, Math.PI * 2); ctx.fill();
  }

  for (const wall of map.walls) {
    const [wx, wy, ww, wh] = wall;
    if (wx + ww < cam.x - 100 || wx > cam.x + w + 100) continue;
    if (wy + wh < cam.y - 100 || wy > cam.y + h + 100) continue;
    drawWall(wx, wy, ww, wh, wall[4] || 'concrete');
  }

  if (map.decor) {
    for (const d of map.decor) {
      const sx = d[0] - cam.x, sy = d[1] - cam.y;
      if (sx < -60 || sx > w + 60 || sy < -60 || sy > h + 60) continue;
      drawDecor(d[0], d[1], d[2]);
    }
  }

  for (const d of state.airdrops) {
    const sx = d.x - cam.x, sy = d.y - cam.y;
    if (sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) continue;
    const pulse = 1 + Math.sin(Date.now() / 200) * 0.15;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📦', 0, 0);
    ctx.restore();
  }

  for (const v of state.vehicles) {
    const sx = v.x - cam.x, sy = v.y - cam.y;
    if (sx < -80 || sx > w + 80 || sy < -80 || sy > h + 80) continue;
    drawVehicle(v);
  }

  for (const b of state.bullets) {
    const sx = b.x - cam.x, sy = b.y - cam.y;
    if (sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) continue;
    const speed = Math.hypot(b.vx, b.vy) || 1;
    const tailX = sx - (b.vx / speed) * 15;
    const tailY = sy - (b.vy / speed) * 15;

    if (b.type === 'grenade') {
      ctx.fillStyle = '#2ecc71';
      ctx.beginPath(); ctx.arc(sx, sy, 8, 0, Math.PI * 2); ctx.fill();
    } else if (b.type === 'rocket') {
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,150,0,0.6)';
      ctx.beginPath(); ctx.arc(tailX, tailY, 5, 0, Math.PI * 2); ctx.fill();
    } else if (b.type === 'flame') {
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 12);
      grad.addColorStop(0, 'rgba(255,200,0,0.9)');
      grad.addColorStop(1, 'rgba(255,80,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(sx, sy, 12, 0, Math.PI * 2); ctx.fill();
    } else {
      const grad = ctx.createLinearGradient(tailX, tailY, sx, sy);
      grad.addColorStop(0, 'rgba(255,255,200,0)');
      grad.addColorStop(1, 'rgba(255,255,200,0.9)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(sx, sy); ctx.stroke();
    }
  }

  state.explosions = state.explosions.filter(ex => Date.now() - ex.born < 500);
  for (const ex of state.explosions) {
    const sx = ex.x - cam.x, sy = ex.y - cam.y;
    const t = (Date.now() - ex.born) / 500;
    const r = ex.radius * (0.3 + t * 0.7);
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    grad.addColorStop(0, `rgba(255,255,200,${1 - t})`);
    grad.addColorStop(0.4, `rgba(255,150,0,${0.8 * (1 - t)})`);
    grad.addColorStop(1, `rgba(255,50,0,0)`);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
  }

  for (const id in state.players) {
    const p = state.players[id];
    if (!p.alive) continue;

    const sx = p.x - cam.x, sy = p.y - cam.y;
    if (sx < -60 || sx > w + 60 || sy < -60 || sy > h + 60) continue;

    // Если игрок в технике — не рисуем тело
    if (p.vehicleId && id !== state.myId) continue;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 20, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    if (p.shield > 0) {
      const pulse = 0.4 + Math.sin(Date.now() / 100) * 0.2;
      ctx.strokeStyle = `rgba(100,200,255,${pulse})`;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(sx, sy, 26, 0, Math.PI * 2); ctx.stroke();
    }

    const grad = ctx.createRadialGradient(sx - 5, sy - 5, 2, sx, sy, 20);
    grad.addColorStop(0, lighten(p.color, 30));
    grad.addColorStop(1, p.color);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(sx, sy, 18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = id === state.myId ? '#fff' : '#000';
    ctx.lineWidth = id === state.myId ? 3 : 2;
    ctx.beginPath(); ctx.arc(sx, sy, 18, 0, Math.PI * 2); ctx.stroke();

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(p.angle || 0);
    ctx.fillStyle = '#222';
    ctx.fillRect(12, -3, 22, 6);
    ctx.fillStyle = '#444';
    ctx.fillRect(30, -2, 6, 4);
    ctx.restore();

    if (settings.showNicks) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(p.nick, sx, sy - 32);
      ctx.fillText(p.nick, sx, sy - 32);
    }

    if (settings.showHp) {
      const hpW = 44;
      ctx.fillStyle = '#000';
      ctx.fillRect(sx - hpW/2, sy - 26, hpW, 5);
      ctx.fillStyle = p.hp > 50 ? '#2ecc71' : p.hp > 25 ? '#f1c40f' : '#e74c3c';
      ctx.fillRect(sx - hpW/2, sy - 26, hpW * (p.hp / 100), 5);
    }
  }

  if (!isTouchDevice() || settings.mobileMode === 'off') {
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 2;
    const mx = state.mouseX, my = state.mouseY;
    ctx.beginPath();
    ctx.moveTo(mx - 14, my); ctx.lineTo(mx - 4, my);
    ctx.moveTo(mx + 4, my); ctx.lineTo(mx + 14, my);
    ctx.moveTo(mx, my - 14); ctx.lineTo(mx, my - 4);
    ctx.moveTo(mx, my + 4); ctx.lineTo(mx, my + 14);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(mx, my, 8, 0, Math.PI * 2); ctx.stroke();
  }
}

function lighten(hex, amt) {
  const c = hex.replace('#', '');
  const r = Math.min(255, parseInt(c.substr(0,2),16) + amt);
  const g = Math.min(255, parseInt(c.substr(2,2),16) + amt);
  const b = Math.min(255, parseInt(c.substr(4,2),16) + amt);
  return `rgb(${r},${g},${b})`;
}

// ==================== МИНИ-КАРТА ====================
function drawMinimap() {
  if (!mmCtx || !state.mapData || !settings.minimap) return;
  const map = state.mapData;
  const w = minimapCanvas.width, h = minimapCanvas.height;
  const scaleX = w / map.w;
  const scaleY = h / map.h;

  mmCtx.fillStyle = map.bg || '#1a1a2e';
  mmCtx.fillRect(0, 0, w, h);

  mmCtx.fillStyle = 'rgba(100,100,120,0.6)';
  for (const wall of map.walls) {
    mmCtx.fillRect(wall[0]*scaleX, wall[1]*scaleY, wall[2]*scaleX, wall[3]*scaleY);
  }

  for (const v of state.vehicles) {
    mmCtx.fillStyle = '#f1c40f';
    mmCtx.fillRect(v.x*scaleX - 2, v.y*scaleY - 2, 4, 4);
  }

  for (const d of state.airdrops) {
    mmCtx.fillStyle = '#f39c12';
    mmCtx.fillRect(d.x*scaleX - 2, d.y*scaleY - 2, 4, 4);
  }

  for (const id in state.players) {
    const p = state.players[id];
    if (!p.alive) continue;
    mmCtx.fillStyle = id === state.myId ? '#fff' : p.color;
    mmCtx.beginPath();
    mmCtx.arc(p.x*scaleX, p.y*scaleY, id === state.myId ? 3 : 2.5, 0, Math.PI * 2);
    mmCtx.fill();
    if (id === state.myId) {
      mmCtx.strokeStyle = '#e94560';
      mmCtx.lineWidth = 1.5;
      mmCtx.stroke();
    }
  }
}

// ==================== HUD ====================
function updateHUD() {
  const me = state.players[state.myId];
  if (!me) return;

  setText('onlineCount', Object.keys(state.players).length);
  setText('killCount', me.kills || 0);
  setText('deathCount', me.deaths || 0);

  const hp = Math.max(0, Math.round(me.hp));
  const armor = Math.max(0, Math.round(me.armor || 0));
  const stamina = Math.max(0, Math.round(me.stamina || 100));

  const hf = document.getElementById('hpFill');
  const af = document.getElementById('armorFill');
  const sf = document.getElementById('staminaFill');
  if (hf) hf.style.width = hp + '%';
  if (af) af.style.width = armor + '%';
  if (sf) sf.style.width = stamina + '%';

  setText('hpText', hp);
  setText('armorText', armor);
  setText('staminaText', stamina);

  const w = state.weapons[me.currentWeapon];
  if (w) {
    setText('weaponName', w.name);
    setText('ammoCount', me.ammo[me.currentWeapon] || 0);
  }

  updateInventoryUI(me);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function updateInventoryUI(me) {
  const inv = document.getElementById('inventory');
  if (!inv) return;
  const items = me.inventory || [];
  const html = items.map((w, i) => {
    const def = state.weapons[w] || { name: w };
    const active = w === me.currentWeapon ? 'active' : '';
    const shortName = def.name.slice(0, 6);
    return `<div class="invSlot ${active}"><span class="key">${i+1}</span><span class="name">${shortName}</span></div>`;
  }).join('');
  if (inv.innerHTML !== html) inv.innerHTML = html;
}

// ==================== ЧАТ ====================
function setupChatInput() {
  const ci = document.getElementById('chatInput');
  if (!ci) return;
  ci.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const text = ci.value.trim();
      if (text) socket.emit('chat', text);
      ci.value = '';
      ci.classList.remove('active');
      ci.blur();
    } else if (e.key === 'Escape') {
      ci.value = '';
      ci.classList.remove('active');
      ci.blur();
    }
    e.stopPropagation();
  });
}

function openChat() {
  const ci = document.getElementById('chatInput');
  if (!ci) return;
  ci.classList.add('active');
  ci.focus();
}

function renderChat() {
  const box = document.getElementById('chatBox');
  if (!box) return;
  const msgs = state.chat.slice(-8);
  box.innerHTML = msgs.map(m => `
    <div class="msg"><span class="nick" style="color:${m.color || '#fff'}">${esc(m.nick)}:</span>${esc(m.text)}</div>
  `).join('');
  box.scrollTop = box.scrollHeight;
}

// ==================== ИГРОКИ (TAB) ====================
function togglePlayerList(show) {
  state.showPlayers = show;
  const list = document.getElementById('playerList');
  if (!list) return;
  if (!show) { list.classList.add('hidden'); return; }
  list.classList.remove('hidden');
  const content = document.getElementById('playerListContent');
  if (!content) return;
  const arr = Object.values(state.players);
  content.innerHTML = arr.map(p => `
    <div class="p">
      <span style="color:${p.color}">${esc(p.nick)}${p.id === state.myId ? ' (ты)' : ''}</span>
      <span>❤️ ${Math.round(p.hp)} | 🔫 ${p.kills || 0}</span>
    </div>
  `).join('');
}

// ==================== ПАУЗА ====================
function togglePause() {
  state.paused = !state.paused;
  const pm = document.getElementById('pauseMenu');
  if (pm) pm.classList.toggle('hidden', !state.paused);
}
function resumeGame() {
  state.paused = false;
  const pm = document.getElementById('pauseMenu');
  if (pm) pm.classList.add('hidden');
}
function exitGame() {
  socket.emit('leaveLobby');
  state.myId = null;
  state.lobbyId = null;
  state.players = {};
  state.paused = false;
  const pm = document.getElementById('pauseMenu');
  if (pm) pm.classList.add('hidden');
  const mc = document.getElementById('mobileControls');
  if (mc) mc.classList.remove('active');
  show('menuScreen');
}

// ==================== МОБИЛЬНОЕ УПРАВЛЕНИЕ ====================
let joyActive = false;
let joyVec = { x: 0, y: 0 };
let mobileRun = false;

function setupMobileControls() {
  const joystick = document.getElementById('joystick');
  const stick = document.getElementById('stick');
  if (!joystick || !stick) return;
  const maxDist = 45;

  function setStick(dx, dy) { stick.style.transform = `translate(${dx}px, ${dy}px)`; }

  function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0] || e.changedTouches[0];
    const rect = joystick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = touch.clientX - cx;
    let dy = touch.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxDist) { dx = (dx / dist) * maxDist; dy = (dy / dist) * maxDist; }
    joyVec.x = dx / maxDist;
    joyVec.y = dy / maxDist;
    setStick(dx, dy);
    if (Math.hypot(dx, dy) > 10) {
      state.mobileAngle = Math.atan2(joyVec.y, joyVec.x);
    }
  }

  joystick.addEventListener('touchstart', (e) => { joyActive = true; handleTouch(e); });
  joystick.addEventListener('touchmove', (e) => { if (joyActive) handleTouch(e); });
  joystick.addEventListener('touchend', (e) => {
    joyActive = false; joyVec.x = 0; joyVec.y = 0;
    setStick(0, 0);
  });

  setInterval(() => {
    if (!joyActive || !state.myId || !state.players[state.myId]) return;
    const me = state.players[state.myId];
    if (!me.alive) return;

    if (me.vehicleId) {
      const v = state.vehicles.find(ve => ve.id === me.vehicleId);
      const speed = v ? (state.vehicleDefs[v.type]?.maxSpeed || 8) : 8;
      const nx = me.x + joyVec.x * speed;
      const ny = me.y + joyVec.y * speed;
      const angle = Math.atan2(joyVec.y, joyVec.x);
      socket.emit('vehicleMove', { x: nx, y: ny, angle });
    } else {
      const speed = mobileRun ? 7.5 : 4.5;
      const nx = me.x + joyVec.x * speed;
      const ny = me.y + joyVec.y * speed;
      socket.emit('move', { x: nx, y: ny, angle: state.mobileAngle });
    }
  }, 50);

  let shootInterval = null;
  const btnShoot = document.getElementById('btnShoot');
  if (btnShoot) {
    btnShoot.addEventListener('touchstart', (e) => {
      e.preventDefault();
      shootMobile();
      shootInterval = setInterval(shootMobile, 120);
    });
    btnShoot.addEventListener('touchend', (e) => { e.preventDefault(); clearInterval(shootInterval); });
  }

  if (canvas) {
    canvas.addEventListener('touchstart', (e) => {
      if (e.target !== canvas) return;
      e.preventDefault();
      const t = e.touches[0];
      const me = state.players[state.myId];
      if (!me) return;
      const ax = t.clientX + state.camera.x;
      const ay = t.clientY + state.camera.y;
      state.mobileAngle = Math.atan2(ay - me.y, ax - me.x);
      shootMobile();
    });
  }

  bindTouch('btnReload', () => socket.emit('reload'));
  bindTouch('btnGrenade', () => {
    socket.emit('switchWeapon', 'grenade');
    setTimeout(shootMobile, 50);
    setTimeout(() => socket.emit('switchWeapon', 'pistol'), 250);
  });
  bindTouch('btnWeapon', () => {
    const me = state.players[state.myId];
    if (!me) return;
    const inv = me.inventory || [];
    const idx = inv.indexOf(me.currentWeapon);
    const next = inv[(idx + 1) % inv.length];
    socket.emit('switchWeapon', next);
  });
  bindTouch('btnDrop', () => notify('Выброс в разработке'));
  bindTouch('btnPlayers', () => togglePlayerList(!state.showPlayers));
  bindTouch('btnChat', () => openChat());
  bindTouch('btnVehicle', () => interact());

  const btnRun = document.getElementById('btnRun');
  if (btnRun) {
    btnRun.addEventListener('touchstart', (e) => {
      e.preventDefault();
      mobileRun = true;
      btnRun.style.background = 'rgba(46,204,113,0.95)';
    });
    btnRun.addEventListener('touchend', (e) => {
      e.preventDefault();
      mobileRun = false;
      btnRun.style.background = 'rgba(46,204,113,0.7)';
    });
  }
}

function bindTouch(id, fn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('touchstart', (e) => { e.preventDefault(); fn(); });
}

function shootMobile() {
  if (!state.myId || !state.players[state.myId]) return;
  const me = state.players[state.myId];
  if (!me.alive) return;
  if (me.vehicleId) {
    socket.emit('vehicleShoot', { angle: state.mobileAngle });
    return;
  }
  socket.emit('shoot', { x: me.x, y: me.y, angle: state.mobileAngle });
}

// ==================== УТИЛИТЫ ====================
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

let notifTimer = null;
function notify(text) {
  const n = document.getElementById('notif');
  if (!n) return;
  n.textContent = text;
  n.style.display = 'block';
  clearTimeout(notifTimer);
  notifTimer = setTimeout(() => n.style.display = 'none', 2500);
}

document.addEventListener('click', () => { if (settings.sound) initAudio(); }, { once: true });
document.addEventListener('touchstart', () => { if (settings.sound) initAudio(); }, { once: true });