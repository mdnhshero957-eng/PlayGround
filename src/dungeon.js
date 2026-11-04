import * as THREE from 'three';
import {
  hellWallTexture, hellFloorTexture, ceilingTexture, doorTexture, metalTexture,
  bloodTexture, pentagramTexture, glowTexture, itemTexture, demonTexture,
  brickTexture, concreteTexture,
} from './textures.js';

const ROOM_NAMES = [
  'Foyer of False Hope', 'The Living Hell', 'Dining Room of Bones', 'Kitchen of Knives',
  'Master Bedchamber', 'Spa of Sorrows', 'The Rec Room', 'Laundry of Lost Souls',
  'Home Office of the Damned', 'Guest Room', 'The Walk-In Abyss', 'The Basement',
  'Sunroom of Screams', 'Hallway to Nowhere', 'Pantry of Pain', 'Nursery of Nightmares',
  'Mudroom of Regret', 'The Powder Room', 'Wine Cellar', 'Attic of Agony',
];

export const ENEMY_STATS = {
  zombie: { hp: 34, speed: 1.7, ranged: true, range: 17, cooldown: 2.15, dmg: 7, melee: false, sx: 1.35, sy: 1.75, y: 1.0, radius: 0.8, name: 'HOA VOLUNTEER' },
  imp: { hp: 46, speed: 1.95, ranged: true, range: 15, cooldown: 2.0, dmg: 13, melee: false, sx: 1.65, sy: 2.0, y: 1.15, radius: 0.85, name: 'IMP' },
  pinky: { hp: 92, speed: 2.95, ranged: false, range: 2.1, cooldown: 1.05, dmg: 16, melee: true, sx: 2.0, sy: 1.9, y: 1.05, radius: 0.95, name: 'PINKY' },
  boss: { hp: 720, speed: 1.45, ranged: true, range: 22, cooldown: 1.5, dmg: 19, melee: true, sx: 3.8, sy: 3.8, y: 1.9, radius: 1.85, name: 'THE HOA PRESIDENT' },
};

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class Dungeon {
  constructor(config) {
    this.config = config;
    this.W = 35; this.H = 35;
    this.cell = 2.2;
    this.wallH = 3.0;
    this.grid = [];
    this.rooms = [];
    this.doors = [];
    this.items = [];
    this.enemies = [];
    this.colliders = [];
    this.occupied = [];
    this.torches = [];
    this.projectiles = [];
    this.visited = [];
    this.exit = null;
    this.spawn = null;
    this.keyRoom = null;
    this.exitRoom = null;
    this.startTime = 0;
    this.totalEnemies = 0;
    this.generate();
  }

  /* ---------------- generation ---------------- */
  generate() {
    const { W, H } = this;
    this.grid = Array.from({ length: H }, () => new Array(W).fill(1));
    this.visited = Array.from({ length: H }, () => new Array(W).fill(false));
    const rnd = Math.random;
    const leaves = [];

    const split = (node, depth) => {
      const minLeaf = 7;
      const canH = node.h >= minLeaf * 2;
      const canW = node.w >= minLeaf * 2;
      if (depth <= 0 || (!canH && !canW)) { leaves.push(node); return; }
      let horiz;
      if (canH && canW) {
        const ratio = node.h / node.w;
        horiz = ratio > 1.2 ? true : ratio < 0.83 ? false : rnd() < 0.5;
      } else horiz = canH;
      if (horiz) {
        const cut = minLeaf + Math.floor(rnd() * (node.h - minLeaf * 2 + 1));
        split({ x: node.x, z: node.z, w: node.w, h: cut }, depth - 1);
        split({ x: node.x, z: node.z + cut, w: node.w, h: node.h - cut }, depth - 1);
      } else {
        const cut = minLeaf + Math.floor(rnd() * (node.w - minLeaf * 2 + 1));
        split({ x: node.x, z: node.z, w: cut, h: node.h }, depth - 1);
        split({ x: node.x + cut, z: node.z, w: node.w - cut, h: node.h }, depth - 1);
      }
    };
    split({ x: 1, z: 1, w: W - 2, h: H - 2 }, 4);

    const names = shuffle([...ROOM_NAMES]);
    for (const leaf of leaves) {
      const margin = 1;
      const x = leaf.x + margin;
      const z = leaf.z + margin;
      const w = leaf.w - margin * 2;
      const h = leaf.h - margin * 2;
      if (w < 4 || h < 4) continue;
      const room = {
        x, z, w, h, leaf,
        cx: x + w / 2, cz: z + h / 2,
        label: names.pop() || 'The Void',
        nameIndex: this.rooms.length,
      };
      for (let zz = z; zz < z + h; zz++) for (let xx = x; xx < x + w; xx++) this.grid[zz][xx] = 0;
      this.rooms.push(room);
    }

    // Connect BSP leaves by walking the split tree again.
    const connect = (node) => {
      if (!node.a) {
        const candidates = this.rooms.filter((r) => r.leaf === node);
        return candidates.length ? [candidates[0]] : [];
      }
      const left = connect(node.a);
      const right = connect(node.b);
      if (left.length && right.length) {
        const A = left[Math.floor(rnd() * left.length)];
        const B = right[Math.floor(rnd() * right.length)];
        this.carveCorridor(
          Math.floor(A.cx), Math.floor(A.cz),
          Math.floor(B.cx), Math.floor(B.cz)
        );
      }
      return left.concat(right);
    };

    // rebuild tree with references
    const buildTree = (node, depth) => {
      const minLeaf = 7;
      const canH = node.h >= minLeaf * 2;
      const canW = node.w >= minLeaf * 2;
      if (depth <= 0 || (!canH && !canW)) return node;
      let horiz;
      if (canH && canW) {
        const ratio = node.h / node.w;
        horiz = ratio > 1.2 ? true : ratio < 0.83 ? false : rnd() < 0.5;
      } else horiz = canH;
      if (horiz) {
        const cut = minLeaf + Math.floor(rnd() * (node.h - minLeaf * 2 + 1));
        node.a = buildTree({ x: node.x, z: node.z, w: node.w, h: cut }, depth - 1);
        node.b = buildTree({ x: node.x, z: node.z + cut, w: node.w, h: node.h - cut }, depth - 1);
      } else {
        const cut = minLeaf + Math.floor(rnd() * (node.w - minLeaf * 2 + 1));
        node.a = buildTree({ x: node.x, z: node.z, w: cut, h: node.h }, depth - 1);
        node.b = buildTree({ x: node.x + cut, z: node.z, w: node.w - cut, h: node.h }, depth - 1);
      }
      return node;
    };
    // The tree rebuilt above must match the carved leaves; use it only for connectivity.
    // Recompute by connecting every room in sequence to the nearest unconnected room instead,
    // which is simpler and guaranteed connected.
    const order = shuffle([...this.rooms]);
    const connected = [order[0]];
    const remaining = order.slice(1);
    while (remaining.length) {
      let bestI = 0, bestJ = 0, bestD = Infinity;
      for (let i = 0; i < connected.length; i++) {
        for (let j = 0; j < remaining.length; j++) {
          const d = Math.hypot(connected[i].cx - remaining[j].cx, connected[i].cz - remaining[j].cz);
          if (d < bestD) { bestD = d; bestI = i; bestJ = j; }
        }
      }
      const A = connected[bestI], B = remaining[bestJ];
      this.carveCorridor(Math.floor(A.cx), Math.floor(A.cz), Math.floor(B.cx), Math.floor(B.cz));
      connected.push(B); remaining.splice(bestJ, 1);
    }

    // spawn room = the one closest to the front (+z)
    this.rooms.sort((a, b) => b.cz - a.cz);
    const spawnRoom = this.rooms[0];
    this.spawnRoom = spawnRoom;
    this.spawn = this.cellCenter(Math.floor(spawnRoom.cx), Math.floor(spawnRoom.cz));

    // exit room = farthest from spawn; key room = next farthest
    const byDist = [...this.rooms].sort((a, b) =>
      Math.hypot(b.cx - spawnRoom.cx, b.cz - spawnRoom.cz) - Math.hypot(a.cx - spawnRoom.cx, a.cz - spawnRoom.cz));
    this.exitRoom = byDist[0] || spawnRoom;
    this.keyRoom = byDist[1] || spawnRoom;
    if (this.exitRoom === spawnRoom && this.rooms.length > 1) {
      this.exitRoom = this.rooms[this.rooms.length - 1];
      this.keyRoom = this.rooms[this.rooms.length - 2];
    }

    this.findDoors();

    // collect walkable cells for placement
    this.walkable = [];
    for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
      if (this.grid[z][x] === 0 && !this.doorAt(x, z)) this.walkable.push({ x, z });
    }

    // place exit portal
    const ex = this.cellCenter(Math.floor(this.exitRoom.cx), Math.floor(this.exitRoom.cz));
    this.exit = { x: ex.x, z: ex.z, unlocked: false, cell: { x: Math.floor(this.exitRoom.cx), z: Math.floor(this.exitRoom.cz) } };
    this.occupy(this.exit, 2.6);
    if (this.spawn) this.occupy(this.spawn, 2.6);

    // place key
    const kx = this.cellCenter(Math.floor(this.keyRoom.cx), Math.floor(this.keyRoom.cz));
    this.placeItem('key', kx.x + (Math.random() - 0.5) * 1.2, kx.z + (Math.random() - 0.5) * 1.2, true);

    // place useful stuff
    const roomPool = this.rooms.filter((r) => r !== spawnRoom);
    const pickRooms = shuffle([...roomPool]);
    const types = ['health', 'shells', 'armor', 'shells', 'health', 'chaingun', 'shells', 'health', 'armor'];
    types.forEach((type, i) => {
      const room = pickRooms[i % Math.max(1, pickRooms.length)] || this.rooms[0];
      const p = this.randomFloorInRoom(room);
      if (p) this.placeItem(type, p.x, p.z, type === 'chaingun');
    });

    // enemies
    this.placeEnemies(spawnRoom);
  }

  carveCorridor(x1, z1, x2, z2) {
    const carve = (x, z) => {
      if (x > 0 && x < this.W - 1 && z > 0 && z < this.H - 1) {
        this.grid[z][x] = 0;
      }
    };
    let x = x1, z = z1;
    const horizFirst = Math.random() < 0.5;
    if (horizFirst) {
      while (x !== x2) { carve(x, z); x += Math.sign(x2 - x); }
      while (z !== z2) { carve(x, z); z += Math.sign(z2 - z); }
    } else {
      while (z !== z2) { carve(x, z); z += Math.sign(z2 - z); }
      while (x !== x2) { carve(x, z); x += Math.sign(x2 - x); }
    }
    carve(x2, z2);
  }

  findDoors() {
    const candidates = [];
    for (const room of this.rooms) {
      if (room === this.spawnRoom) continue;
      const sides = [];
      for (let z = room.z; z < room.z + room.h; z++) {
        sides.push({ x: room.x - 1, z, axis: 'z' });
        sides.push({ x: room.x + room.w, z, axis: 'z' });
      }
      for (let x = room.x; x < room.x + room.w; x++) {
        sides.push({ x, z: room.z - 1, axis: 'x' });
        sides.push({ x, z: room.z + room.h, axis: 'x' });
      }
      for (const s of sides) {
        const outside = s.axis === 'z'
          ? (s.x < room.x ? s.x - 1 : s.x + 1)
          : (s.z < room.z ? s.z - 1 : s.z + 1);
        const ok = s.axis === 'z'
          ? this.inBounds(outside, s.z) && this.grid[s.z][outside] === 0
          : this.inBounds(s.x, outside) && this.grid[outside][s.x] === 0;
        if (ok && this.inBounds(s.x, s.z) && this.grid[s.z][s.x] === 0 && !this.doorAt(s.x, s.z)) {
          candidates.push({ ...s, room });
        }
      }
    }
    shuffle(candidates);
    const chosen = candidates.slice(0, Math.min(5, Math.max(2, Math.floor(this.rooms.length / 2))));
    for (const c of chosen) {
      this.doors.push({
        cx: c.x, cz: c.z, axis: c.axis, room: c.room,
        open: false, progress: 0, mesh: null, panel: null,
      });
    }
  }

  placeEnemies(spawnRoom) {
    const { config } = this;
    const stats = ENEMY_STATS;
    const pool = config.demonTypes.filter((t) => t !== 'boss');
    const diff = config.difficulty;
    const hpMul = 1 + (diff - 1) * 0.16;
    const total = config.enemies;
    const rooms = this.rooms.filter((r) => r !== spawnRoom);
    const roomWeights = rooms.map((r) => r.w * r.h);
    const sum = roomWeights.reduce((a, b) => a + b, 0);
    const occupancy = [];

    const canPlace = (p, min = 3.0) => occupancy.every((o) => Math.hypot(o.x - p.x, o.z - p.z) > min);

    let placed = 0;
    let guard = 0;
    while (placed < total && guard++ < 3000) {
      let r = Math.random() * sum, idx = 0;
      for (; idx < rooms.length; idx++) { r -= roomWeights[idx]; if (r <= 0) break; }
      const room = rooms[Math.min(idx, rooms.length - 1)];
      const p = this.randomFloorInRoom(room, 0.25);
      if (!p) continue;
      if (Math.hypot(p.x - this.spawn.x, p.z - this.spawn.z) < 9) continue;
      if (!canPlace(p, 2.6)) continue;
      if (this.exit && Math.hypot(p.x - this.exit.x, p.z - this.exit.z) < 3.2) continue;
      const type = pool[Math.floor(Math.random() * pool.length)] || 'zombie';
      const st = stats[type];
      const hp = Math.round(st.hp * hpMul);
      this.enemies.push(this.makeEnemyData(type, p.x, p.z, hp, st));
      occupancy.push(p);
      this.occupy(p, 1.5);
      placed++;
    }
    if (config.demonTypes.includes('boss')) {
      const p = this.cellCenter(Math.floor(this.exitRoom.cx), Math.floor(this.exitRoom.cz + 1.4));
      const st = stats.boss;
      this.enemies.push(this.makeEnemyData('boss', p.x, p.z, st.hp, st));
      occupancy.push(p);
      this.occupy(p, 2.4);
    }
    this.totalEnemies = this.enemies.length;
  }

  makeEnemyData(type, x, z, hp, st) {
    return {
      type, x, z, spawnX: x, spawnZ: z, hp, maxHp: hp,
      speed: st.speed, ranged: st.ranged, range: st.range, cooldown: st.cooldown,
      dmg: st.dmg, melee: st.melee, sx: st.sx, sy: st.sy, y: st.y, radius: st.radius,
      state: 'idle', aggro: false, cool: Math.random() * st.cooldown,
      deathT: -1, hitFlash: 0, bob: Math.random() * 6, dead: false,
      sprite: null, glow: null, lunge: 0, growlT: 1 + Math.random() * 4,
    };
  }

  randomFloorInRoom(room, inset = 1) {
    for (let tries = 0; tries < 30; tries++) {
      const x = room.x + inset + Math.random() * (room.w - inset * 2);
      const z = room.z + inset + Math.random() * (room.h - inset * 2);
      const gx = Math.floor(x), gz = Math.floor(z);
      if (this.grid[gz] && this.grid[gz][gx] === 0 && !this.doorAt(gx, gz)) {
        const w = this.cellCenter(gx, gz);
        return { x: w.x + (Math.random() - 0.5) * 0.9, z: w.z + (Math.random() - 0.5) * 0.9 };
      }
    }
    const w = this.cellCenter(Math.floor(room.cx), Math.floor(room.cz));
    return w;
  }

  /* ---------------- geometry helpers ---------------- */
  inBounds(x, z) { return x >= 0 && z >= 0 && x < this.W && z < this.H; }
  cellCenter(gx, gz) {
    return {
      x: (gx - this.W / 2 + 0.5) * this.cell,
      z: (gz - this.H / 2 + 0.5) * this.cell,
    };
  }
  worldToCell(x, z) {
    return { x: Math.floor(x / this.cell + this.W / 2), z: Math.floor(z / this.cell + this.H / 2) };
  }
  doorAt(gx, gz) {
    return this.doors.find((d) => d.cx === gx && d.cz === gz) || null;
  }
  isSolidCell(gx, gz) {
    if (!this.inBounds(gx, gz)) return true;
    if (this.grid[gz][gx] === 1) return true;
    const d = this.doorAt(gx, gz);
    if (d && !d.open) return true;
    return false;
  }
  isSolidWorld(x, z) {
    const c = this.worldToCell(x, z);
    return this.isSolidCell(c.x, c.z);
  }

  /* ---------------- build meshes ---------------- */
  build(scene) {
    const t = this.config.theme;
    const group = new THREE.Group();
    this.group = group;
    scene.add(group);

    const floorTex = hellFloorTexture(t).clone();
    floorTex.needsUpdate = true;
    floorTex.repeat.set(this.W * 0.5, this.H * 0.5);
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, color: 0xb9ac9c, roughness: 0.95 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(this.W * this.cell, this.H * this.cell), floorMat);
    floor.rotation.x = -Math.PI / 2;
    group.add(floor);

    const ceilTex = ceilingTexture(t).clone();
    ceilTex.needsUpdate = true;
    ceilTex.repeat.set(this.W * 0.4, this.H * 0.4);
    const ceilMat = new THREE.MeshStandardMaterial({ map: ceilTex, color: 0x8a8088, roughness: 1, side: THREE.DoubleSide });
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(this.W * this.cell, this.H * this.cell), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = this.wallH;
    group.add(ceil);

    // walls
    const wallTex = hellWallTexture(t).clone();
    wallTex.needsUpdate = true;
    wallTex.repeat.set(1, 1);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, color: 0xc9c0b2, roughness: 0.94 });
    const wallCells = [];
    for (let z = 0; z < this.H; z++) for (let x = 0; x < this.W; x++) {
      if (this.grid[z][x] === 1) wallCells.push([x, z]);
    }
    const wallGeo = new THREE.BoxGeometry(this.cell, this.wallH, this.cell);
    const walls = new THREE.InstancedMesh(wallGeo, wallMat, wallCells.length);
    const m = new THREE.Matrix4();
    const col = new THREE.Color();
    wallCells.forEach(([x, z], i) => {
      const p = this.cellCenter(x, z);
      m.makeTranslation(p.x, this.wallH / 2, p.z);
      walls.setMatrixAt(i, m);
      const v = 0.86 + Math.random() * 0.24;
      col.setRGB(v, v * 0.96, v * 0.94);
      walls.setColorAt(i, col);
    });
    walls.instanceMatrix.needsUpdate = true;
    if (walls.instanceColor) walls.instanceColor.needsUpdate = true;
    group.add(walls);

    // baseboard trim along wall/floor edge (thin dark boxes)
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x17120f, roughness: 0.9 });
    const trimCells = [];
    for (let z = 0; z < this.H; z++) for (let x = 0; x < this.W; x++) {
      if (this.grid[z][x] !== 0) continue;
      if (this.isSolidRaw(x - 1, z)) trimCells.push({ x, z, side: 'w' });
      if (this.isSolidRaw(x + 1, z)) trimCells.push({ x, z, side: 'e' });
      if (this.isSolidRaw(x, z - 1)) trimCells.push({ x, z, side: 'n' });
      if (this.isSolidRaw(x, z + 1)) trimCells.push({ x, z, side: 's' });
    }
    const trimGeo = new THREE.BoxGeometry(1, 1, 1);
    const trims = new THREE.InstancedMesh(trimGeo, trimMat, trimCells.length);
    trimCells.forEach((c, i) => {
      const p = this.cellCenter(c.x, c.z);
      const alongX = c.side === 'n' || c.side === 's';
      m.makeScale(alongX ? this.cell : 0.12, 0.24, alongX ? 0.12 : this.cell);
      m.setPosition(
        p.x + (c.side === 'w' ? -this.cell / 2 + 0.07 : c.side === 'e' ? this.cell / 2 - 0.07 : 0),
        0.12,
        p.z + (c.side === 'n' ? -this.cell / 2 + 0.07 : c.side === 's' ? this.cell / 2 - 0.07 : 0)
      );
      trims.setMatrixAt(i, m);
    });
    trims.instanceMatrix.needsUpdate = true;
    group.add(trims);

    this.buildDoors(group);
    this.buildProps(group);
    this.placeTorches();
    this.buildItems(group);
    this.buildEnemies(group);
    this.buildExit(group);
    this.buildLights(group);

    // blood + pentagrams
    for (let i = 0; i < 22; i++) {
      const cell = this.walkable[Math.floor(Math.random() * this.walkable.length)];
      if (!cell) continue;
      const p = this.cellCenter(cell.x, cell.z);
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.4 + Math.random() * 1.8, 1.4 + Math.random() * 1.8), new THREE.MeshBasicMaterial({
        map: bloodTexture(), transparent: true, opacity: 0.5 + Math.random() * 0.4, depthWrite: false,
      }));
      decal.rotation.x = -Math.PI / 2;
      decal.rotation.z = Math.random() * Math.PI * 2;
      decal.position.set(p.x, 0.012 + Math.random() * 0.006, p.z);
      group.add(decal);
    }
    const penta = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 4.5), new THREE.MeshBasicMaterial({
      map: pentagramTexture('#d33a2a'), transparent: true, opacity: 0.55, depthWrite: false,
    }));
    penta.rotation.x = -Math.PI / 2;
    const pc = this.cellCenter(Math.floor(this.exitRoom.cx), Math.floor(this.exitRoom.cz));
    penta.position.set(pc.x, 0.02, pc.z);
    group.add(penta);
    this.penta = penta;
    this.pentaSpin = 0;

    this.scene = scene;
    this.startTime = performance.now();
    return this;
  }

  isSolidRaw(x, z) {
    if (!this.inBounds(x, z)) return true;
    return this.grid[z][x] === 1;
  }

  buildDoors(group) {
    const tex = doorTexture(this.config.theme);
    const frameMat = new THREE.MeshStandardMaterial({ map: metalTexture('#3a3c40', '#17181b'), roughness: 0.55, metalness: 0.45 });
    const panelMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.25, color: 0xd8cdb8 });
    for (const d of this.doors) {
      const p = this.cellCenter(d.cx, d.cz);
      const g = new THREE.Group();
      g.position.set(p.x, 0, p.z);
      if (d.axis === 'x') g.rotation.y = 0; else g.rotation.y = Math.PI / 2;
      // frame
      const width = this.cell;
      for (const x of [-width / 2 + 0.1, width / 2 - 0.1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.7, 0.5), frameMat);
        post.position.set(x, 1.35, 0);
        g.add(post);
      }
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(width, 0.22, 0.5), frameMat);
      lintel.position.y = 2.7;
      g.add(lintel);
      // panel
      const panel = new THREE.Mesh(new THREE.BoxGeometry(width - 0.2, 2.5, 0.18), panelMat);
      panel.position.y = 1.25;
      g.add(panel);
      // warning light
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff5a3a }));
      lamp.position.set(0, 2.6, 0.28);
      g.add(lamp);
      d.mesh = g; d.panel = panel; d.lamp = lamp; d.group = g;
      group.add(g);
      d.panelY = 1.25;
    }
  }

  buildProps(group) {
    const barrelMat = new THREE.MeshStandardMaterial({ map: metalTexture('#5a3a24', '#24160e'), roughness: 0.8, metalness: 0.3 });
    const crateMat = new THREE.MeshStandardMaterial({ map: metalTexture('#6a5230', '#2a1e10'), roughness: 0.9 });
    const stoneMat = new THREE.MeshStandardMaterial({ map: concreteTexture('#6a6258'), color: 0x9a9084, roughness: 1 });
    const woodMat = new THREE.MeshStandardMaterial({ map: brickTexture('#5c3d26', '#42301f'), color: 0xb09a7a, roughness: 0.95 });

    for (const room of this.rooms) {
      const count = 2 + Math.floor(Math.random() * 3) + Math.floor((room.w * room.h) / 30);
      for (let i = 0; i < count; i++) {
        const p = this.randomFloorInRoom(room, 1.2);
        if (!p) continue;
        if (Math.hypot(p.x - this.exit.x, p.z - this.exit.z) < 3.5) continue;
        if (room === this.spawnRoom && Math.hypot(p.x - this.spawn.x, p.z - this.spawn.z) < 3.2) continue;
        if (!this.freeSpot(p.x, p.z, 1.0)) continue;
        const kind = Math.random();
        if (kind < 0.42) {
          const b = new THREE.Group();
          const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.95, 10), barrelMat);
          body.position.y = 0.48; b.add(body);
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.035, 4, 10), new THREE.MeshBasicMaterial({ color: 0x8a6a3a }));
          ring.rotation.x = Math.PI / 2; ring.position.y = 0.7; b.add(ring);
          b.position.set(p.x, 0, p.z);
          if (Math.random() < 0.25) b.rotation.z = 0.2;
          group.add(b);
          this.colliders.push({ kind: 'circle', x: p.x, z: p.z, r: 0.45 });
          this.occupy(p, 1.0);
        } else if (kind < 0.72) {
          const c = new THREE.Group();
          const box = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), crateMat);
          box.position.y = 0.43; c.add(box);
          if (Math.random() < 0.5) {
            const box2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), crateMat);
            box2.position.set(0.15, 1.1, -0.1); box2.rotation.y = 0.4; c.add(box2);
          }
          c.position.set(p.x, 0, p.z);
          c.rotation.y = Math.random() * 1.5;
          group.add(c);
          this.colliders.push({ kind: 'circle', x: p.x, z: p.z, r: 0.55 });
          this.occupy(p, 1.0);
        } else if (kind < 0.86) {
          const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, this.wallH, 8), stoneMat);
          pillar.position.set(p.x, this.wallH / 2, p.z);
          group.add(pillar);
          this.colliders.push({ kind: 'circle', x: p.x, z: p.z, r: 0.38 });
          this.occupy(p, 1.0);
        } else {
          // domestic furniture: tiny table
          const table = new THREE.Group();
          const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.7), woodMat);
          top.position.y = 0.72; table.add(top);
          for (const [x, z] of [[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]]) {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), woodMat);
            leg.position.set(x, 0.36, z); table.add(leg);
          }
          table.position.set(p.x, 0, p.z);
          table.rotation.y = Math.random() * 1.5;
          group.add(table);
          this.colliders.push({ kind: 'circle', x: p.x, z: p.z, r: 0.6 });
          this.occupy(p, 1.1);
        }
      }
    }
  }

  occupy(p, min) { this.occupied.push({ x: p.x, z: p.z, min }); }

  freeSpot(x, z, r) {
    return this.occupied.every((o) => Math.hypot(o.x - x, o.z - z) > Math.max(r, o.min || 1));
  }

  placeTorches() {
    const pool = shuffle(this.rooms.filter((r) => r !== this.spawnRoom)).slice(0, 9);
    const rooms = [this.spawnRoom, ...pool].filter(Boolean);
    const flameTex = glowTexture('#ffa842');
    for (const room of rooms) {
      const p = this.randomFloorInRoom(room, 1.1);
      if (!p) continue;
      if (Math.hypot(p.x - this.spawn.x, p.z - this.spawn.z) < 2.4) continue;
      if (!this.freeSpot(p.x, p.z, 0.8)) continue;
      this.occupy(p, 1.0);
      const g = new THREE.Group();
      g.position.set(p.x, 0, p.z);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.7, 7), new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.7, metalness: 0.4 }));
      base.position.y = 0.35; g.add(base);
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.2, 0.25, 8), new THREE.MeshStandardMaterial({ color: 0x4a3a28, roughness: 0.6, metalness: 0.5 }));
      bowl.position.y = 0.78; g.add(bowl);
      const flame = new THREE.Sprite(new THREE.SpriteMaterial({
        map: flameTex, color: 0xffad4a, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      flame.scale.set(1.25, 1.6, 1);
      flame.position.y = 1.25;
      g.add(flame);
      const light = new THREE.PointLight(0xff9a4a, 14, 9, 2);
      light.position.set(0, 1.5, 0);
      g.add(light);
      this.group.add(g);
      this.colliders.push({ kind: 'circle', x: p.x, z: p.z, r: 0.35 });
      this.torches.push({ group: g, flame, light, baseY: 1.25, phase: Math.random() * 9 });
    }
  }

  placeItem(type, x, z, big = false) {
    const item = { type, x, z, taken: false, sprite: null, glow: null, big, bob: Math.random() * 6 };
    this.items.push(item);
    this.occupy({ x, z }, big ? 1.8 : 1.0);
    return item;
  }

  buildItems(group) {
    for (const item of this.items) {
      const tex = itemTexture(item.type);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, depthWrite: false, color: 0xffffff,
      }));
      const s = item.big ? 1.1 : 0.72;
      sprite.scale.set(s, s, 1);
      sprite.position.set(item.x, 0.75, item.z);
      group.add(sprite);
      item.sprite = sprite;
      if (item.big || item.type === 'key') {
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({
          map: glowTexture(item.type === 'key' ? '#ffcf6a' : '#8fdcff'), color: item.type === 'key' ? 0xffcf6a : 0x8fdcff,
          transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        glow.scale.set(2.4, 2.4, 1);
        glow.position.set(item.x, 0.8, item.z);
        group.add(glow);
        item.glow = glow;
      }
    }
  }

  buildEnemies(group) {
    for (const e of this.enemies) {
      const tex = demonTexture(e.type, 0);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, depthWrite: false, color: 0xffffff,
      }));
      sprite.scale.set(e.sx, e.sy, 1);
      sprite.position.set(e.x, e.y, e.z);
      group.add(sprite);
      e.sprite = sprite;
      e.walkFrame = 0;
      e.walkT = 0;
      if (e.type === 'boss') {
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({
          map: glowTexture('#ff3a2a'), color: 0xff3a2a, transparent: true, opacity: 0.35,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        glow.scale.set(6, 6, 1); glow.position.copy(sprite.position);
        group.add(glow); e.glow = glow;
      }
    }
  }

  buildExit(group) {
    const g = new THREE.Group();
    g.position.set(this.exit.x, 0, this.exit.z);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1e, metalness: 0.6, roughness: 0.4, emissive: 0x1a0f08 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.16, 10, 32), frameMat);
    ring.position.y = 1.9;
    g.add(ring);
    for (const [x, z] of [[-1.3, 0.1], [1.3, 0.1]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.1, 6), frameMat);
      leg.position.set(x, 0.55, z); g.add(leg);
    }
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x5a1a16, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false,
    });
    const inner = new THREE.Mesh(new THREE.CircleGeometry(1.36, 32), innerMat);
    inner.position.y = 1.9;
    g.add(inner);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('#ff5a3a'), color: 0xff5a3a, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    glow.scale.set(5.5, 5.5, 1); glow.position.y = 1.9;
    g.add(glow);
    // floating rune particles
    const runes = [];
    for (let i = 0; i < 8; i++) {
      const r = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture('#ff6a3a'), color: 0xff6a3a, transparent: true, opacity: 0.7,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      r.scale.set(0.28, 0.28, 1);
      g.add(r); runes.push(r);
    }
    const light = new THREE.PointLight(0xff5a3a, 10, 9, 2);
    light.position.y = 1.9; g.add(light);
    group.add(g);
    this.exit.group = g; this.exit.inner = inner; this.exit.glow = glow; this.exit.runes = runes; this.exit.light = light;
  }

  buildLights(group) {
    this.ambient = new THREE.AmbientLight(0x6a5058, 0.85);
    group.add(this.ambient);
    this.hemi = new THREE.HemisphereLight(0x8a7480, 0x2a1818, 0.8);
    group.add(this.hemi);
    const dir = new THREE.DirectionalLight(0xffb080, 0.55);
    dir.position.set(10, 18, 6); group.add(dir);

    // Hanging fixtures guarantee the spawn / key / exit rooms read clearly.
    const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.6, metalness: 0.45 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffc27a });
    const rooms = [this.spawnRoom, this.keyRoom, this.exitRoom].filter(Boolean);
    const seen = new Set();
    for (const room of rooms) {
      if (seen.has(room)) continue;
      seen.add(room);
      const p = this.cellCenter(Math.floor(room.cx), Math.floor(room.cz));
      const g = new THREE.Group();
      g.position.set(p.x, 0, p.z);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 5), fixtureMat);
      chain.position.y = this.wallH - 0.27; g.add(chain);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.34, 10, 1, true), fixtureMat);
      shade.position.y = this.wallH - 0.62; g.add(shade);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), bulbMat);
      bulb.position.y = this.wallH - 0.76; g.add(bulb);
      const light = new THREE.PointLight(0xffb070, 16, 18, 2);
      light.position.y = this.wallH - 0.9;
      g.add(light);
      group.add(g);
      this.lamps = this.lamps || [];
      this.lamps.push({ light, bulb, base: 16, phase: Math.random() * 9 });
    }
  }

  /* ---------------- runtime queries ---------------- */
  lineOfSight(x1, z1, x2, z2) {
    const dx = x2 - x1, dz = z2 - z1;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.001) return true;
    const steps = Math.ceil(dist / (this.cell * 0.35));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.isSolidWorld(x1 + dx * t, z1 + dz * t)) return false;
    }
    return true;
  }

  rayWallDistance(ox, oz, dx, dz, maxDist) {
    // grid DDA
    const cell = this.cell;
    let gx = Math.floor(ox / cell + this.W / 2);
    let gz = Math.floor(oz / cell + this.H / 2);
    const stepX = dx > 0 ? 1 : -1;
    const stepZ = dz > 0 ? 1 : -1;
    const invDx = dx !== 0 ? 1 / Math.abs(dx) : Infinity;
    const invDz = dz !== 0 ? 1 / Math.abs(dz) : Infinity;
    const boundaryX = (gx - this.W / 2 + (dx > 0 ? 1 : 0)) * cell;
    const boundaryZ = (gz - this.H / 2 + (dz > 0 ? 1 : 0)) * cell;
    let tMaxX = dx !== 0 ? (boundaryX - ox) / dx : Infinity;
    let tMaxZ = dz !== 0 ? (boundaryZ - oz) / dz : Infinity;
    const tDeltaX = cell * invDx;
    const tDeltaZ = cell * invDz;
    let t = 0;
    for (let i = 0; i < 200; i++) {
      if (this.isSolidCell(gx, gz)) return Math.max(0, t);
      if (tMaxX < tMaxZ) { gx += stepX; t = tMaxX; tMaxX += tDeltaX; }
      else { gz += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; }
      if (t > maxDist) return maxDist;
    }
    return maxDist;
  }

  updateVisuals(dt, time) {
    for (const t of this.torches) {
      const f = 0.85 + Math.sin(time * 9 + t.phase) * 0.1 + Math.sin(time * 23 + t.phase * 2) * 0.05;
      t.flame.scale.set(1.15 * f, 1.55 * f, 1);
      t.flame.position.y = t.baseY + Math.sin(time * 4 + t.phase) * 0.04;
      t.light.intensity = 12 + Math.sin(time * 11 + t.phase) * 3.5;
    }
    for (const l of this.lamps || []) {
      const f = 0.92 + Math.sin(time * 5.5 + l.phase) * 0.06 + Math.sin(time * 13 + l.phase) * 0.03;
      l.light.intensity = l.base * f;
      l.bulb.material.color.setRGB(1, 0.72 * f, 0.42 * f);
    }
    for (const item of this.items) {
      if (!item.sprite || item.taken) continue;
      item.sprite.position.y = 0.72 + Math.sin(time * 2.2 + item.bob) * 0.12;
      item.sprite.material.rotation = Math.sin(time * 1.1 + item.bob) * 0.06;
      if (item.glow) item.glow.position.y = item.sprite.position.y;
    }
    for (const d of this.doors) {
      if (d.progress > 0 && d.progress < 1) {
        d.progress = Math.min(1, d.progress + dt * 1.8);
        const e = 1 - Math.pow(1 - d.progress, 3);
        d.panel.position.y = 1.25 + e * 2.5;
        d.lamp.material.color.setHex(0x6aff8a);
      } else if (d.open && d.progress < 1) {
        d.progress = Math.min(1, d.progress + dt * 1.8);
        d.panel.position.y = 1.25 + (1 - Math.pow(1 - d.progress, 3)) * 2.5;
      }
    }
    // exit portal animation
    if (this.exit) {
      const unlocked = this.exit.unlocked;
      const c = unlocked ? 0x6affc0 : 0xff5a3a;
      this.exit.inner.material.color.setHex(unlocked ? 0x2affc0 : 0x5a1a16);
      this.exit.inner.material.opacity = 0.5 + Math.sin(time * 3.5) * 0.14;
      this.exit.glow.material.color.setHex(c);
      this.exit.light.color.setHex(c);
      this.exit.light.intensity = 9 + Math.sin(time * 4) * 3;
      this.exit.inner.rotation.z += dt * 0.4;
      this.exit.group.rotation.y = Math.sin(time * 0.35) * 0.05;
      this.exit.runes.forEach((r, i) => {
        const a = time * 1.4 + (i / this.exit.runes.length) * Math.PI * 2;
        r.position.set(Math.cos(a) * 1.6, 1.9 + Math.sin(time * 2 + i) * 0.7, Math.sin(a) * 0.4);
        r.material.color.setHex(c);
      });
    }
    if (this.penta) this.penta.rotation.z += dt * 0.12;
  }

  dispose() {
    if (!this.group) return;
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (m.map && m.map !== hellWallTexture(this.config.theme)) { /* keep cached maps */ }
          m.dispose();
        }
      }
    });
    this.scene?.remove(this.group);
    this.group = null;
  }
}
