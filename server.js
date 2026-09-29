const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const MAP_W = 2000;
const MAP_H = 1400;

const MAPS = {
  desert: {
    name: 'Город в пустыне',
    floor: 'sand',
    w: MAP_W, h: MAP_H,
    walls: [
      [200, 200, 300, 40, 'sand'], [200, 200, 40, 300, 'sand'],
      [1500, 200, 300, 40, 'sand'], [1760, 200, 40, 300, 'sand'],
      [200, 1000, 300, 40, 'sand'], [200, 660, 40, 340, 'sand'],
      [1500, 1000, 300, 40, 'sand'], [1760, 660, 40, 340, 'sand'],
      [800, 500, 400, 40, 'sand'], [800, 860, 400, 40, 'sand'],
      [800, 500, 40, 200, 'sand'], [1160, 700, 40, 200, 'sand'],
      [500, 700, 200, 40, 'sand'], [1300, 700, 200, 40, 'sand'],
      [950, 200, 100, 100, 'sand'], [950, 1100, 100, 100, 'sand'],
      [400, 400, 150, 40, 'sand'], [1450, 400, 150, 40, 'sand'],
      [400, 960, 150, 40, 'sand'], [1450, 960, 150, 40, 'sand'],
    ],
    decor: [
      [350, 350, 'barrel'], [420, 380, 'barrel'], [1550, 350, 'crate'],
      [1620, 380, 'crate'], [350, 1020, 'tire'], [1600, 1020, 'barrel'],
      [1000, 620, 'crate'], [700, 800, 'bush'], [1300, 800, 'bush'],
      [600, 300, 'bush'], [1400, 300, 'bush'], [1000, 1150, 'barrel'],
      [200, 700, 'car'], [1800, 700, 'car'], [1000, 150, 'crate'],
      [1000, 1250, 'crate'], [500, 500, 'tire'], [1500, 500, 'tire'],
      [500, 900, 'barrel'], [1500, 900, 'barrel'], [700, 200, 'bush'],
      [1300, 200, 'bush'], [700, 1200, 'bush'], [1300, 1200, 'bush'],
    ],
    spawns: [
      [300, 300], [1700, 300], [300, 1100], [1700, 1100],
      [1000, 300], [1000, 1100], [300, 700], [1700, 700],
      [600, 600], [1400, 600], [600, 800], [1400, 800],
      [1000, 450], [1000, 950], [200, 200], [1800, 200],
      [200, 1200], [1800, 1200], [1000, 150], [1000, 1250]
    ]
  },
  streets: {
    name: 'Улицы',
    floor: 'asphalt',
    w: MAP_W, h: MAP_H,
    walls: [
      [300, 150, 40, 500, 'brick'], [300, 900, 40, 400, 'brick'],
      [800, 250, 40, 400, 'concrete'], [800, 900, 40, 350, 'concrete'],
      [1300, 150, 40, 500, 'brick'], [1300, 900, 40, 400, 'brick'],
      [1700, 350, 40, 700, 'concrete'],
      [400, 750, 350, 40, 'concrete'], [1150, 750, 350, 40, 'concrete'],
      [600, 400, 150, 40, 'brick'], [1250, 400, 150, 40, 'brick'],
      [600, 1000, 150, 40, 'brick'], [1250, 1000, 150, 40, 'brick'],
      [950, 550, 100, 40, 'concrete'], [950, 850, 100, 40, 'concrete'],
      [200, 300, 40, 200, 'brick'], [1800, 300, 40, 200, 'brick'],
      [200, 900, 40, 200, 'brick'], [1800, 900, 40, 200, 'brick'],
    ],
    decor: [
      [150, 150, 'car'], [1850, 150, 'car'], [150, 1250, 'car'], [1850, 1250, 'car'],
      [500, 300, 'barrel'], [1100, 300, 'barrel'], [500, 1100, 'crate'],
      [1100, 1100, 'crate'], [1500, 600, 'bush'], [1500, 1000, 'bush'],
      [600, 600, 'tire'], [1000, 600, 'tire'], [1000, 900, 'barrel'],
      [400, 500, 'crate'], [1400, 500, 'crate'], [400, 900, 'bush'],
      [1400, 900, 'bush'], [700, 150, 'barrel'], [1300, 150, 'barrel'],
      [700, 1250, 'barrel'], [1300, 1250, 'barrel'],
    ],
    spawns: [
      [150, 150], [1850, 150], [150, 1250], [1850, 1250],
      [1000, 150], [1000, 1250], [150, 700], [1850, 700],
      [600, 200], [1400, 200], [600, 1200], [1400, 1200],
      [400, 600], [1600, 600], [400, 800], [1600, 800],
      [1000, 400], [1000, 1000], [250, 250], [1750, 250]
    ]
  },
  metro: {
    name: 'Метро',
    floor: 'tile',
    w: MAP_W, h: MAP_H,
    walls: [
      [160, 160, 1680, 60, 'metal'], [160, 1180, 1680, 60, 'metal'],
      [160, 160, 60, 1080, 'metal'], [1780, 160, 60, 1080, 'metal'],
      [500, 500, 60, 60, 'concrete'], [900, 500, 60, 60, 'concrete'], [1300, 500, 60, 60, 'concrete'],
      [500, 840, 60, 60, 'concrete'], [900, 840, 60, 60, 'concrete'], [1300, 840, 60, 60, 'concrete'],
      [700, 300, 40, 350, 'metal'], [1260, 300, 40, 350, 'metal'],
      [700, 750, 40, 350, 'metal'], [1260, 750, 40, 350, 'metal'],
      [950, 400, 100, 60, 'concrete'], [950, 940, 100, 60, 'concrete'],
      [300, 400, 60, 200, 'metal'], [1640, 400, 60, 200, 'metal'],
      [300, 800, 60, 200, 'metal'], [1640, 800, 60, 200, 'metal'],
    ],
    decor: [
      [350, 350, 'column'], [1650, 350, 'column'], [350, 1050, 'column'], [1650, 1050, 'column'],
      [1000, 600, 'barrel'], [1000, 800, 'barrel'], [800, 600, 'crate'], [1200, 800, 'crate'],
      [600, 1000, 'tire'], [1400, 400, 'tire'], [1100, 350, 'barrel'], [900, 1050, 'barrel'],
      [400, 600, 'crate'], [1600, 600, 'crate'], [400, 800, 'bush'], [1600, 800, 'bush'],
    ],
    spawns: [
      [350, 350], [1650, 350], [350, 1050], [1650, 1050],
      [1000, 600], [1000, 800], [500, 250], [1500, 250],
      [500, 1150], [1500, 1150], [250, 700], [1750, 700],
      [700, 250], [1300, 250], [700, 1150], [1300, 1150],
      [1000, 250], [1000, 1150], [250, 400], [1750, 1000]
    ]
  }
};

const WEAPONS = {
  pistol:       { name: 'Пистолет',  damage: 20,  fireRate: 350,  range: 600,  spread: 0.05, ammo: 12,  reload: 1200, bulletSpeed: 14, type: 'bullet' },
  shotgun:      { name: 'Дробовик',  damage: 12,  fireRate: 900,  range: 350,  spread: 0.25, ammo: 6,   reload: 1800, bulletSpeed: 12, type: 'bullet', pellets: 6 },
  grenade:      { name: 'Граната',   damage: 80,  fireRate: 1500, range: 500,  spread: 0,    ammo: 1,   reload: 0,    bulletSpeed: 8,  type: 'grenade', fuse: 1500, radius: 120 },
  rpg:          { name: 'РПГ',       damage: 120, fireRate: 2500, range: 800,  spread: 0.02, ammo: 1,   reload: 3000, bulletSpeed: 10, type: 'rocket', radius: 150 },
  flamethrower: { name: 'Огнемёт',   damage: 8,   fireRate: 80,   range: 200,  spread: 0.15, ammo: 100, reload: 3000, bulletSpeed: 6,  type: 'flame' },
  machinegun:   { name: 'Пулемёт',   damage: 15,  fireRate: 100,  range: 700,  spread: 0.12, ammo: 50,  reload: 3000, bulletSpeed: 16, type: 'bullet' },
  awm:          { name: 'AWM',       damage: 100, fireRate: 1500, range: 1200, spread: 0.01, ammo: 5,   reload: 2500, bulletSpeed: 25, type: 'bullet' }
};

const VEHICLES = {
  jeep: {
    name: 'Джип', hp: 250, maxSpeed: 14, type: 'ground',
    size: 30, color: '#3a5a8a', seats: 2, weapon: null
  },
  tank: {
    name: 'Танк', hp: 600, maxSpeed: 7, type: 'ground',
    size: 40, color: '#4a5a3a', seats: 1, weapon: 'cannon',
    weaponDamage: 120, weaponFireRate: 1800, weaponRange: 1000, weaponSpeed: 16, weaponRadius: 150
  },
  helicopter: {
    name: 'Вертолёт', hp: 350, maxSpeed: 11, type: 'air',
    size: 35, color: '#5a3a3a', seats: 1, weapon: 'bomb',
    weaponDamage: 200, weaponFireRate: 1500, weaponRange: 100, weaponRadius: 200
  }
};

const STARTER_KIT = ['pistol', 'shotgun', 'grenade'];
const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#e84393'];

function collidesWithWall(mapKey, x, y, r) {
  const walls = MAPS[mapKey].walls;
  for (const w of walls) {
    const [wx, wy, ww, wh] = w;
    const nx = Math.max(wx, Math.min(x, wx + ww));
    const ny = Math.max(wy, Math.min(y, wy + wh));
    const dx = x - nx, dy = y - ny;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

function inMapBounds(mapKey, x, y, r) {
  const m = MAPS[mapKey];
  return x > r && x < m.w - r && y > r && y < m.h - r;
}

function findFreeSpawn(mapKey) {
  const spawns = MAPS[mapKey].spawns;
  for (let i = 0; i < 80; i++) {
    const c = spawns[Math.floor(Math.random() * spawns.length)];
    if (!collidesWithWall(mapKey, c[0], c[1], 22)) return c;
  }
  for (let x = 100; x < MAP_W - 100; x += 50) {
    for (let y = 100; y < MAP_H - 100; y += 50) {
      if (!collidesWithWall(mapKey, x, y, 22)) return [x, y];
    }
  }
  return [500, 300];
}

function findFreeVehicleSpawn(mapKey) {
  for (let i = 0; i < 100; i++) {
    const x = 150 + Math.random() * (MAP_W - 300);
    const y = 150 + Math.random() * (MAP_H - 300);
    if (!collidesWithWall(mapKey, x, y, 50)) return [x, y];
  }
  return [800, 600];
}

const lobbies = {};
let lobbyCounter = 1;
let vehicleCounter = 1;

function getFreeColor(lobby) {
  const used = Object.values(lobby.players).map(p => p.color);
  return COLORS.find(c => !used.includes(c)) || '#ffffff';
}

function createPlayer(socketId, nick, mapKey) {
  const sp = findFreeSpawn(mapKey);
  return {
    id: socketId,
    nick: nick || 'Игрок',
    x: sp[0], y: sp[1],
    angle: 0,
    hp: 100, maxHp: 100,
    armor: 0, maxArmor: 100,
    stamina: 100, maxStamina: 100,
    shield: 3000,
    kills: 0, deaths: 0,
    inventory: [...STARTER_KIT],
    currentWeapon: 'pistol',
    ammo: { pistol: WEAPONS.pistol.ammo, shotgun: WEAPONS.shotgun.ammo, grenade: WEAPONS.grenade.ammo },
    lastShot: 0,
    reloading: false,
    color: null,
    alive: true,
    vehicleId: null
  };
}

function createVehicle(type, mapKey, id) {
  const sp = findFreeVehicleSpawn(mapKey);
  const v = VEHICLES[type];
  return {
    id, type,
    x: sp[0], y: sp[1],
    angle: 0,
    hp: v.hp, maxHp: v.hp,
    driverId: null,
    lastShot: 0
  };
}

io.on('connection', (socket) => {
  console.log('Подключился:', socket.id);

  socket.on('getLobbies', () => {
    const list = Object.values(lobbies).map(l => ({
      id: l.id,
      name: l.name,
      playersCount: Object.keys(l.players).length,
      maxPlayers: l.maxPlayers,
      hasPassword: l.password.length > 0,
      map: MAPS[l.map].name
    }));
    socket.emit('lobbiesList', list);
  });

  socket.on('createLobby', ({ name, password, maxPlayers, map }) => {
    const id = 'lobby_' + (lobbyCounter++);
    if (!MAPS[map]) map = 'desert';
    lobbies[id] = {
      id, name: name || 'Лобби',
      password: password || '',
      maxPlayers: Math.min(6, Math.max(2, maxPlayers || 6)),
      map,
      players: {}, bullets: [], airdrops: [], vehicles: [], chat: [],
      nextDropTime: Date.now() + 30000,
      nextVehicleTime: Date.now() + 15000,
      ownerId: socket.id
    };
    socket.emit('lobbyCreated', { id });
    console.log(`Создано лобби: ${name} (${id})`);
  });

  socket.on('joinLobby', ({ lobbyId, nick, password }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) { socket.emit('errorMsg', 'Лобби не найдено'); return; }
    if (Object.keys(lobby.players).length >= lobby.maxPlayers) { socket.emit('errorMsg', 'Лобби заполнено'); return; }
    if (lobby.password && password !== lobby.password) { socket.emit('errorMsg', 'Неверный пароль'); return; }

    socket.join(lobbyId);
    socket.lobbyId = lobbyId;

    const player = createPlayer(socket.id, nick, lobby.map);
    player.color = getFreeColor(lobby);
    lobby.players[socket.id] = player;

    socket.emit('joinedLobby', {
      lobbyId, playerId: socket.id, map: lobby.map,
      mapData: MAPS[lobby.map], weapons: WEAPONS, vehicles: VEHICLES
    });

    io.to(lobbyId).emit('playersUpdate', lobby.players);
    io.to(lobbyId).emit('chatMsg', { nick: 'Система', text: `${player.nick} зашёл в игру`, color: '#f1c40f' });
    console.log(`${nick} зашёл в ${lobby.name}`);
  });

  socket.on('move', ({ x, y, angle }) => {
    const lobby = lobbies[socket.lobbyId];
    if (!lobby) return;
    const p = lobby.players[socket.id];
    if (!p || !p.alive) return;
    if (p.vehicleId) return;

    if (!inMapBounds(lobby.map, x, y, 18)) return;
    if (!collidesWithWall(lobby.map, x, y, 18)) {
      p.x = x; p.y = y;
    } else {
      if (!collidesWithWall(lobby.map, x, p.y, 18)) p.x = x;
      else if (!collidesWithWall(lobby.map, p.x, y, 18)) p.y = y;
    }
    if (typeof angle === 'number') p.angle = angle;
  });

  socket.on('switchWeapon', (weaponKey) => {
    const lobby = lobbies[socket.lobbyId];
    if (!lobby) return;
    const p = lobby.players[socket.id];
    if (!p || !p.alive) return;
    if (p.inventory.includes(weaponKey)) p.currentWeapon = weaponKey;
  });

  socket.on('reload', () => {
    const lobby = lobbies[socket.lobbyId];
    if (!lobby) return;
    const p = lobby.players[socket.id];
    if (!p || !p.alive || p.reloading) return;
    const w = WEAPONS[p.currentWeapon];
    if (!w || w.reload <= 0) return;
    p.reloading = true;
    setTimeout(() => {
      if (p.alive) {
        p.ammo[p.currentWeapon] = w.ammo;
        p.reloading = false;
      }
    }, w.reload);
  });

  socket.on('shoot', ({ x, y, angle }) => {
    const lobby = lobbies[socket.lobbyId];
    if (!lobby) return;
    const p = lobby.players[socket.id];
    if (!p || !p.alive || p.reloading) return;
    if (p.vehicleId) return;

    const w = WEAPONS[p.currentWeapon];
    if (!w) return;
    const now = Date.now();
    if (now - p.lastShot < w.fireRate) return;
    if ((p.ammo[p.currentWeapon] || 0) <= 0) return;

    p.lastShot = now;
    p.ammo[p.currentWeapon]--;

    io.to(lobby.id).emit('shot', { x, y, type: w.type, weapon: p.currentWeapon });

    const pellets = w.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const spread = (Math.random() - 0.5) * 2 * w.spread;
      const a = angle + spread;
      lobby.bullets.push({
        x, y,
        vx: Math.cos(a) * w.bulletSpeed,
        vy: Math.sin(a) * w.bulletSpeed,
        owner: socket.id, damage: w.damage, type: w.type,
        range: w.range, traveled: 0,
        fuse: w.fuse || 0, radius: w.radius || 0, born: now
      });
    }
  });

  socket.on('chat', (text) => {
    const lobby = lobbies[socket.lobbyId];
    if (!lobby) return;
    const p = lobby.players[socket.id];
    if (!p) return;
    const clean = String(text).slice(0, 100).trim();
    if (!clean) return;
    const msg = { nick: p.nick, text: clean, color: p.color, time: Date.now() };
    lobby.chat.push(msg);
    if (lobby.chat.length > 50) lobby.chat.shift();
    io.to(lobby.id).emit('chatMsg', msg);
  });

  socket.on('enterVehicle', (vehicleId) => {
    const lobby = lobbies[socket.lobbyId];
    if (!lobby) return;
    const p = lobby.players[socket.id];
    if (!p || !p.alive) return;

    if (p.vehicleId) {
      const oldV = lobby.vehicles.find(ve => ve.id === p.vehicleId);
      if (oldV) oldV.driverId = null;
      p.vehicleId = null;
    }

    const v = lobby.vehicles.find(ve => ve.id === vehicleId);
    if (!v) return;
    if (v.driverId) return;

    const d = Math.hypot(v.x - p.x, v.y - p.y);
    if (d > 70) return;

    v.driverId = socket.id;
    p.vehicleId = vehicleId;
    p.x = v.x;
    p.y = v.y;
    io.to(lobby.id).emit('vehicleEntered', { vehicleId, nick: p.nick });
  });

  socket.on('exitVehicle', () => {
    const lobby = lobbies[socket.lobbyId];
    if (!lobby) return;
    const p = lobby.players[socket.id];
    if (!p) return;
    if (!p.vehicleId) return;

    const v = lobby.vehicles.find(ve => ve.id === p.vehicleId);
    if (v) {
      v.driverId = null;
      let nx = v.x + 50, ny = v.y + 50;
      if (collidesWithWall(lobby.map, nx, ny, 18)) { nx = v.x - 50; ny = v.y - 50; }
      if (collidesWithWall(lobby.map, nx, ny, 18)) { nx = v.x; ny = v.y + 60; }
      p.x = nx; p.y = ny;
    }
    p.vehicleId = null;
    io.to(lobby.id).emit('vehicleExited', { nick: p.nick });
  });

  socket.on('vehicleMove', ({ x, y, angle }) => {
    const lobby = lobbies[socket.lobbyId];
    if (!lobby) return;
    const p = lobby.players[socket.id];
    if (!p || !p.vehicleId) return;
    const v = lobby.vehicles.find(ve => ve.id === p.vehicleId);
    if (!v || v.driverId !== socket.id) return;
    const vd = VEHICLES[v.type];

    if (vd.type === 'air') {
      if (!inMapBounds(lobby.map, x, y, vd.size)) return;
      v.x = x; v.y = y; v.angle = angle;
      p.x = x; p.y = y; p.angle = angle;
    } else {
      if (!inMapBounds(lobby.map, x, y, vd.size)) return;
      if (!collidesWithWall(lobby.map, x, y, vd.size)) {
        v.x = x; v.y = y;
      } else {
        if (!collidesWithWall(lobby.map, x, v.y, vd.size)) v.x = x;
        else if (!collidesWithWall(lobby.map, v.x, y, vd.size)) v.y = y;
      }
      v.angle = angle;
      p.x = v.x; p.y = v.y; p.angle = angle;
    }
  });

  socket.on('vehicleShoot', ({ angle }) => {
    const lobby = lobbies[socket.lobbyId];
    if (!lobby) return;
    const p = lobby.players[socket.id];
    if (!p || !p.vehicleId) return;
    const v = lobby.vehicles.find(ve => ve.id === p.vehicleId);
    if (!v || v.driverId !== socket.id) return;
    const vd = VEHICLES[v.type];
    if (!vd.weapon) return;

    const now = Date.now();
    if (now - v.lastShot < vd.weaponFireRate) return;
    v.lastShot = now;

    if (vd.weapon === 'cannon') {
      lobby.bullets.push({
        x: v.x + Math.cos(angle) * 40,
        y: v.y + Math.sin(angle) * 40,
        vx: Math.cos(angle) * vd.weaponSpeed,
        vy: Math.sin(angle) * vd.weaponSpeed,
        owner: socket.id,
        damage: vd.weaponDamage,
        type: 'rocket',
        range: vd.weaponRange,
        traveled: 0,
        radius: vd.weaponRadius,
        born: now
      });
      io.to(lobby.id).emit('shot', { x: v.x, y: v.y, type: 'rocket' });
    } else if (vd.weapon === 'bomb') {
      const bx = v.x;
      const by = v.y;
      io.to(lobby.id).emit('explosion', { x: bx, y: by, radius: vd.weaponRadius });
      io.to(lobby.id).emit('shot', { x: bx, y: by, type: 'explosion' });

      for (const pid in lobby.players) {
        const target = lobby.players[pid];
        if (!target.alive) continue;
        if (pid === socket.id) continue;
        const d = Math.hypot(target.x - bx, target.y - by);
        if (d < vd.weaponRadius) {
          const dmg = Math.round(vd.weaponDamage * (1 - d / vd.weaponRadius));
          if (dmg > 0) damagePlayer(lobby, target, dmg, socket.id);
        }
      }

      for (const tv of lobby.vehicles) {
        if (tv.id === v.id) continue;
        const d = Math.hypot(tv.x - bx, tv.y - by);
        if (d < vd.weaponRadius) {
          tv.hp -= vd.weaponDamage;
          if (tv.hp <= 0 && tv.driverId && lobby.players[tv.driverId]) {
            lobby.players[tv.driverId].vehicleId = null;
          }
        }
      }
      lobby.vehicles = lobby.vehicles.filter(ve => ve.hp > 0);
    }
  });

  socket.on('leaveLobby', () => handleLeave(socket));
  socket.on('disconnect', () => handleLeave(socket));
});

function handleLeave(socket) {
  const lobbyId = socket.lobbyId;
  if (!lobbyId) return;
  const lobby = lobbies[lobbyId];
  if (!lobby) return;

  if (lobby.players[socket.id]) {
    const p = lobby.players[socket.id];
    console.log(`${p.nick} вышел из ${lobby.name}`);
    if (p.vehicleId) {
      const v = lobby.vehicles.find(ve => ve.id === p.vehicleId);
      if (v) v.driverId = null;
    }
    io.to(lobbyId).emit('chatMsg', { nick: 'Система', text: `${p.nick} вышел`, color: '#f1c40f' });
    delete lobby.players[socket.id];
  }
  socket.leave(lobbyId);
  socket.lobbyId = null;

  if (Object.keys(lobby.players).length === 0) {
    delete lobbies[lobbyId];
  } else {
    io.to(lobbyId).emit('playersUpdate', lobby.players);
    if (lobby.ownerId === socket.id) lobby.ownerId = Object.keys(lobby.players)[0];
  }
}

setInterval(() => {
  const now = Date.now();

  for (const lobbyId in lobbies) {
    const lobby = lobbies[lobbyId];

    for (const pid in lobby.players) {
      const p = lobby.players[pid];
      if (p.stamina < p.maxStamina) p.stamina = Math.min(p.maxStamina, p.stamina + 0.7);
      if (p.shield > 0) p.shield = Math.max(0, p.shield - 50);
    }

    const bulletsToRemove = [];
    for (let i = 0; i < lobby.bullets.length; i++) {
      const b = lobby.bullets[i];

      if (b.type === 'grenade' && now - b.born > (b.fuse || 1500)) {
        explode(lobby, b, b.radius, b.owner);
        bulletsToRemove.push(i);
        continue;
      }

      b.x += b.vx;
      b.y += b.vy;
      b.traveled += Math.hypot(b.vx, b.vy);

      if (!inMapBounds(lobby.map, b.x, b.y, 4) || collidesWithWall(lobby.map, b.x, b.y, 4)) {
        if (b.type === 'rocket' || b.type === 'grenade') explode(lobby, b, b.radius, b.owner);
        bulletsToRemove.push(i);
        continue;
      }

      if (b.traveled > b.range) {
        if (b.type === 'rocket') explode(lobby, b, b.radius, b.owner);
        bulletsToRemove.push(i);
        continue;
      }

      let hit = false;
      for (const pid in lobby.players) {
        if (pid === b.owner) continue;
        const target = lobby.players[pid];
        if (!target.alive) continue;
        const d = Math.hypot(target.x - b.x, target.y - b.y);
        if (d < 20) {
          if (b.type === 'rocket' || b.type === 'grenade') {
            explode(lobby, b, b.radius, b.owner);
          } else {
            damagePlayer(lobby, target, b.damage, b.owner);
          }
          hit = true;
          break;
        }
      }
      if (!hit) {
        for (const v of lobby.vehicles) {
          if (v.driverId === b.owner) continue;
          const d = Math.hypot(v.x - b.x, v.y - b.y);
          if (d < VEHICLES[v.type].size) {
            v.hp -= b.damage;
            if (v.hp <= 0) {
              if (v.driverId && lobby.players[v.driverId]) {
                lobby.players[v.driverId].vehicleId = null;
              }
              lobby.vehicles = lobby.vehicles.filter(ve => ve.id !== v.id);
            }
            hit = true;
            break;
          }
        }
      }
      if (hit) { bulletsToRemove.push(i); continue; }
    }

    for (let i = bulletsToRemove.length - 1; i >= 0; i--) {
      lobby.bullets.splice(bulletsToRemove[i], 1);
    }

    if (now > lobby.nextDropTime && Object.keys(lobby.players).length > 0) {
      lobby.nextDropTime = now + 30000;
      const dropWeapons = ['rpg', 'flamethrower', 'machinegun', 'awm'];
      const weapon = dropWeapons[Math.floor(Math.random() * dropWeapons.length)];
      let dx, dy, tries = 0;
      do {
        dx = 100 + Math.random() * (MAP_W - 200);
        dy = 100 + Math.random() * (MAP_H - 200);
        tries++;
      } while ((collidesWithWall(lobby.map, dx, dy, 30) || !inMapBounds(lobby.map, dx, dy, 30)) && tries < 50);
      lobby.airdrops.push({ x: dx, y: dy, weapon, born: now });
      io.to(lobbyId).emit('airdrop', { x: dx, y: dy });
    }

    for (let i = lobby.airdrops.length - 1; i >= 0; i--) {
      const drop = lobby.airdrops[i];
      for (const pid in lobby.players) {
        const p = lobby.players[pid];
        if (!p.alive) continue;
        if (Math.hypot(p.x - drop.x, p.y - drop.y) < 30) {
          if (!p.inventory.includes(drop.weapon)) {
            p.inventory.push(drop.weapon);
            p.ammo[drop.weapon] = WEAPONS[drop.weapon].ammo;
            p.currentWeapon = drop.weapon;
            io.to(lobbyId).emit('pickup', { nick: p.nick, weapon: WEAPONS[drop.weapon].name });
            io.to(lobbyId).emit('chatMsg', { nick: 'Система', text: `${p.nick} подобрал ${WEAPONS[drop.weapon].name}`, color: '#2ecc71' });
          }
          lobby.airdrops.splice(i, 1);
          break;
        }
      }
    }

    if (now > lobby.nextVehicleTime && Object.keys(lobby.players).length > 0 && lobby.vehicles.length < 6) {
      lobby.nextVehicleTime = now + 45000;
      const types = ['jeep', 'jeep', 'tank', 'helicopter'];
      const type = types[Math.floor(Math.random() * types.length)];
      const v = createVehicle(type, lobby.map, 'v' + (vehicleCounter++));
      lobby.vehicles.push(v);
      io.to(lobbyId).emit('chatMsg', { nick: 'Система', text: `🚗 Появилась техника: ${VEHICLES[type].name}`, color: '#f39c12' });
    }

    io.to(lobbyId).emit('state', {
      players: lobby.players,
      bullets: lobby.bullets,
      airdrops: lobby.airdrops,
      vehicles: lobby.vehicles,
      chat: lobby.chat.slice(-10)
    });
  }
}, 50);

function damagePlayer(lobby, target, dmg, attackerId) {
  if (target.shield > 0) return;
  if (target.armor > 0) {
    const absorbed = Math.min(target.armor, dmg * 0.5);
    target.armor -= absorbed;
    dmg -= absorbed;
  }
  target.hp -= dmg;
  io.to(lobby.id).emit('hit', { x: target.x, y: target.y });
  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
    target.deaths++;
    if (lobby.players[attackerId]) lobby.players[attackerId].kills++;
    io.to(lobby.id).emit('death', { who: target.id, killer: attackerId, x: target.x, y: target.y });
    io.to(lobby.id).emit('chatMsg', { nick: 'Система', text: `${target.nick} убит`, color: '#e74c3c' });
    if (target.vehicleId) {
      const v = lobby.vehicles.find(ve => ve.id === target.vehicleId);
      if (v) v.driverId = null;
      target.vehicleId = null;
    }
    setTimeout(() => {
      if (!lobby.players[target.id]) return;
      const sp = findFreeSpawn(lobby.map);
      target.x = sp[0];
      target.y = sp[1];
      target.hp = 100;
      target.armor = 0;
      target.stamina = 100;
      target.alive = true;
      target.shield = 3000;
      target.inventory = [...STARTER_KIT];
      target.currentWeapon = 'pistol';
      target.ammo = { pistol: WEAPONS.pistol.ammo, shotgun: WEAPONS.shotgun.ammo, grenade: WEAPONS.grenade.ammo };
      target.reloading = false;
      target.vehicleId = null;
    }, 3000);
  }
}

function explode(lobby, b, radius, owner) {
  io.to(lobby.id).emit('explosion', { x: b.x, y: b.y, radius });
  for (const pid in lobby.players) {
    const p = lobby.players[pid];
    if (!p.alive) continue;
    const d = Math.hypot(p.x - b.x, p.y - b.y);
    if (d < radius) {
      const dmg = Math.round(b.damage * (1 - d / radius));
      if (dmg > 0) damagePlayer(lobby, p, dmg, owner || b.owner);
    }
  }
  for (const v of lobby.vehicles) {
    const d = Math.hypot(v.x - b.x, v.y - b.y);
    if (d < radius + 20) {
      v.hp -= b.damage;
      if (v.hp <= 0 && v.driverId && lobby.players[v.driverId]) {
        lobby.players[v.driverId].vehicleId = null;
      }
    }
  }
  lobby.vehicles = lobby.vehicles.filter(v => v.hp > 0);
}

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
  console.log(`Для других устройств: http://<твой IP>:${PORT}`);
});