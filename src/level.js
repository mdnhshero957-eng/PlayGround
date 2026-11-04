import * as THREE from 'three';
import { resolveColliders } from './world.js';
import { demonTexture, glowTexture, itemTexture } from './textures.js';
import { ENEMY_STATS } from './dungeon.js';

const WEAPONS = {
  shotgun: { name: 'SHOTGUN', ammo: 'shells', pellets: 8, damage: 12, spread: 0.062, cooldown: 0.95, range: 30, kick: 1.0 },
  pistol: { name: 'PISTOL', ammo: 'bullets', pellets: 1, damage: 14, spread: 0.008, cooldown: 0.2, range: 42, kick: 0.35 },
  chaingun: { name: 'CHAINGUN', ammo: 'bullets', pellets: 1, damage: 9, spread: 0.028, cooldown: 0.085, range: 42, kick: 0.28 },
};

const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();

function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) {
  const ocx = cx - ox, ocy = cy - oy, ocz = cz - oz;
  const tca = ocx * dx + ocy * dy + ocz * dz;
  if (tca < 0) return -1;
  const d2 = ocx * ocx + ocy * ocy + ocz * ocz - tca * tca;
  const r2 = r * r;
  if (d2 > r2) return -1;
  return tca - Math.sqrt(r2 - d2);
}

export class LevelRun {
  constructor({ scene, camera, dungeon, config, audio, input, messages, onDeath, onComplete }) {
    this.scene = scene;
    this.camera = camera;
    this.dungeon = dungeon;
    this.config = config;
    this.audio = audio;
    this.input = input;
    this.messages = messages;
    this.onDeath = onDeath;
    this.onComplete = onComplete;

    this.pos = new THREE.Vector3(dungeon.spawn.x, 0, dungeon.spawn.z);
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.eye = 1.62;
    this.radius = 0.42;
    this.chooseSpawnFacing();

    this.hp = 100;
    this.armor = 0;
    this.shells = 26;
    this.bullets = 120;
    this.inventory = { shotgun: true, pistol: true, chaingun: false };
    this.current = 'shotgun';
    this.keys = 0;
    this.kills = 0;
    this.totalKills = dungeon.totalEnemies;
    this.shots = 0;
    this.hits = 0;
    this.dead = false;
    this.completed = false;

    this.cooldown = 0;
    this.flash = 0;
    this.kick = 0;
    this.hitMarker = 0;
    this.damageFlash = 0;
    this.shake = 0;
    this.bob = 0;
    this.lockMsgCooldown = 0;
    this.startTime = performance.now();
    this.elapsed = 0;
    this.flowT = 0;
    this.flow = new Int16Array(dungeon.W * dungeon.H).fill(-1);
    this.flowCell = { x: -999, z: -999 };
    this.visitedT = 0;
    this.hurtSound = 0;
    this.growlT = 2;
    this.stepT = 0;
    this.lastPos = this.pos.clone();
    this.particles = [];
    this.projectiles = [];
    this.particleGeo = new THREE.BoxGeometry(0.09, 0.09, 0.09);
    this.bloodMat = new THREE.MeshBasicMaterial({ color: 0x8a1610 });
    this.goreMat = new THREE.MeshBasicMaterial({ color: 0x4a0908 });

    this.setupCamera();
    this.markVisited(true);
    this.updateFlow();
    this.input.fire = false;
  }

  chooseSpawnFacing() {
    const d = this.dungeon;
    let best = Infinity;
    let bestYaw = 0;
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const dx = -Math.sin(a), dz = -Math.cos(a);
      const dist = d.rayWallDistance(this.pos.x, this.pos.z, dx, dz, 40);
      // Prefer a readable room view rather than the longest empty sightline.
      let score = Math.abs(dist - 7.5);
      const end = d.worldToCell(this.pos.x + dx * Math.max(0.1, dist - 0.3), this.pos.z + dz * Math.max(0.1, dist - 0.3));
      if (d.doorAt(end.x, end.z)) score += 3.5;
      if (score < best) { best = score; bestYaw = a; }
    }
    this.yaw = bestYaw;
    this.spawnView = d.rayWallDistance(this.pos.x, this.pos.z, -Math.sin(bestYaw), -Math.cos(bestYaw), 40);
  }

  setupCamera() {    const c = this.camera;
    c.rotation.order = 'YXZ';
    c.position.set(this.pos.x, this.eye, this.pos.z);
    c.rotation.set(0, this.yaw, 0);

    this.spot = new THREE.SpotLight(0xffe3bc, 26, 25, 0.72, 0.55, 1.25);
    this.spot.position.set(0, 0.1, 0);
    this.spotTarget = new THREE.Object3D();
    this.spotTarget.position.set(0, -0.15, -3);
    c.add(this.spot); c.add(this.spotTarget);
    this.spot.target = this.spotTarget;

    this.nearLight = new THREE.PointLight(0xffcaa0, 2.2, 7, 2);
    this.nearLight.position.set(0, 0, 0.2);
    c.add(this.nearLight);

    this.scene.add(c);
    this.dungeon.updateVisuals(0, 0);

    this.audio.startAmbient('level');
  }

  /* ---------------- input ---------------- */
  applyLook(dx, dy) {
    if (this.dead || this.completed) return;
    const sens = 0.0022;
    this.yaw -= dx * sens;
    this.pitch -= dy * sens;
    this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch));
  }

  onWeapon(slot) {
    const list = ['shotgun', 'pistol', 'chaingun'];
    const id = list[slot - 1];
    if (id && this.inventory[id]) {
      this.current = id;
      this.kick = 0.5;
      this.audio.reload();
      this.updateWeaponHud();
    }
  }

  onSwap() {
    const order = ['shotgun', 'pistol', 'chaingun'].filter((w) => this.inventory[w]);
    if (order.length < 2) return;
    const i = order.indexOf(this.current);
    this.current = order[(i + 1) % order.length];
    this.kick = 0.5;
    this.audio.reload();
    this.updateWeaponHud();
  }

  onUse() {
    if (this.dead || this.completed) return;
    const ex = this.dungeon.exit;
    const dist = Math.hypot(this.pos.x - ex.x, this.pos.z - ex.z);
    if (dist < 4 && !ex.unlocked) {
      this.audio.locked();
      this.messages?.message('THE PORTAL IS SEALED. FIND THE SIGIL KEY.', 'bad');
    } else {
      const o = this.getObjective();
      this.messages?.message(`OBJECTIVE: ${o.line.toUpperCase()}`, 'good');
    }
  }

  updateWeaponHud() {
    if (this.messages?.weapon) this.messages.weapon(this.getAmmo());
  }

  getAmmo() {
    if (this.current === 'pistol') return { label: 'BULLETS', value: '∞' };
    if (this.current === 'chaingun') return { label: 'BULLETS', value: String(this.bullets) };
    return { label: 'SHELLS', value: String(this.shells) };
  }

  get weapon() { return WEAPONS[this.current]; }

  /* ---------------- movement & collision ---------------- */
  collide(pos) {
    const d = this.dungeon;
    const cell = d.cell, r = this.radius;
    for (let iter = 0; iter < 2; iter++) {
      const cx = Math.floor(pos.x / cell + d.W / 2);
      const cz = Math.floor(pos.z / cell + d.H / 2);
      for (let z = cz - 1; z <= cz + 1; z++) {
        for (let x = cx - 1; x <= cx + 1; x++) {
          if (!d.isSolidCell(x, z)) continue;
          const minX = (x - d.W / 2) * cell, maxX = minX + cell;
          const minZ = (z - d.H / 2) * cell, maxZ = minZ + cell;
          const nx = Math.max(minX, Math.min(maxX, pos.x));
          const nz = Math.max(minZ, Math.min(maxZ, pos.z));
          let dx = pos.x - nx, dz = pos.z - nz;
          const dist = Math.hypot(dx, dz);
          if (dist < r) {
            if (dist > 0.0001) {
              const push = r - dist;
              pos.x += (dx / dist) * push;
              pos.z += (dz / dist) * push;
            } else {
              const left = Math.abs(pos.x - minX), right = Math.abs(maxX - pos.x);
              const back = Math.abs(pos.z - minZ), front = Math.abs(maxZ - pos.z);
              const m = Math.min(left, right, back, front);
              if (m === left) pos.x = minX - r;
              else if (m === right) pos.x = maxX + r;
              else if (m === back) pos.z = minZ - r;
              else pos.z = maxZ + r;
            }
          }
        }
      }
      resolveColliders(pos, r, d.colliders);
    }
    // keep inside level bounds
    const half = d.W * d.cell / 2 - r;
    pos.x = Math.max(-half, Math.min(half, pos.x));
    pos.z = Math.max(-half, Math.min(half, pos.z));
  }

  updateMovement(dt) {
    const input = this.input;
    let fwd = (input.forward || 0);
    let right = (input.right || 0);
    const len = Math.hypot(fwd, right);
    if (len > 1) { fwd /= len; right /= len; }
    const sprint = input.sprint ? 1.52 : 1;
    const speed = 4.15 * sprint;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const wishX = (-sy * fwd + cy * right) * speed;
    const wishZ = (-cy * fwd - sy * right) * speed;
    const accel = 1 - Math.exp(-dt * 11);
    this.vel.x += (wishX - this.vel.x) * accel;
    this.vel.z += (wishZ - this.vel.z) * accel;
    const beforeX = this.pos.x, beforeZ = this.pos.z;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.collide(this.pos);
    // footsteps
    const moved = Math.hypot(this.pos.x - beforeX, this.pos.z - beforeZ);
    if (moved > 0.001) {
      this.stepT += moved;
      const stride = input.sprint ? 2.4 : 1.9;
      if (this.stepT > stride) {
        this.stepT = 0;
        this.audio.noise({ dur: 0.07, vol: 0.05, type: 'lowpass', freq: 320 });
      }
    }
    this.bob += moved * 2.6;
  }

  /* ---------------- pathing ---------------- */
  updateFlow() {
    const d = this.dungeon;
    const pc = d.worldToCell(this.pos.x, this.pos.z);
    this.flow.fill(-1);
    if (!d.inBounds(pc.x, pc.z)) return;
    const idx = (x, z) => z * d.W + x;
    const q = [idx(pc.x, pc.z)];
    this.flow[idx(pc.x, pc.z)] = 0;
    let head = 0;
    while (head < q.length) {
      const cur = q[head++];
      const x = cur % d.W, z = Math.floor(cur / d.W);
      const dist = this.flow[cur];
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz;
        if (!d.inBounds(nx, nz)) continue;
        if (d.isSolidCell(nx, nz)) continue;
        const ni = idx(nx, nz);
        if (this.flow[ni] !== -1) continue;
        this.flow[ni] = dist + 1;
        q.push(ni);
      }
    }
    this.flowCell = pc;
  }

  flowDir(x, z) {
    const d = this.dungeon;
    const c = d.worldToCell(x, z);
    const cur = this.flow[c.z * d.W + c.x];
    if (cur === undefined || cur < 0) return null;
    let best = cur, bx = c.x, bz = c.z;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = c.x + dx, nz = c.z + dz;
      if (!d.inBounds(nx, nz)) continue;
      const v = this.flow[nz * d.W + nx];
      if (v >= 0 && v < best) { best = v; bx = nx; bz = nz; }
    }
    if (bx === c.x && bz === c.z) return null;
    const target = d.cellCenter(bx, bz);
    return { x: target.x, z: target.z, dist: best };
  }

  markVisited(force = false) {
    const d = this.dungeon;
    const c = d.worldToCell(this.pos.x, this.pos.z);
    for (let z = c.z - 4; z <= c.z + 4; z++) {
      for (let x = c.x - 4; x <= c.x + 4; x++) {
        if (!d.inBounds(x, z)) continue;
        if (x === c.x || z === c.z || Math.hypot(x - c.x, z - c.z) < 4.6) d.visited[z][x] = true;
      }
    }
    this.visitedT = 0;
  }

  /* ---------------- combat ---------------- */
  fire() {
    if (this.dead || this.completed) return;
    const w = this.weapon;
    if (this.cooldown > 0) return;
    if (w.ammo === 'shells' && this.shells <= 0) {
      this.cooldown = 0.35;
      this.audio.empty();
      this.messages?.message('OUT OF SHELLS — PRESS 2 FOR PISTOL', 'bad');
      return;
    }
    if (w.ammo === 'bullets' && this.current === 'chaingun' && this.bullets <= 0) {
      this.cooldown = 0.35;
      this.audio.empty();
      this.messages?.message('CHAINGUN EMPTY — PRESS 1 FOR SHOTGUN', 'bad');
      return;
    }
    this.cooldown = w.cooldown;
    this.flash = 0.075;
    this.kick = 1;
    this.shake = Math.max(this.shake, w.kick * 0.5);
    this.audio.shoot(this.current === 'pistol' ? 'pistol' : this.current === 'chaingun' ? 'chaingun' : 'shotgun');
    if (w.ammo === 'shells') this.shells -= 1;
    else if (this.current === 'chaingun') this.bullets -= 1;

    const origin = tmpV.set(this.pos.x, this.eye + this.bobOffset(), this.pos.z);
    const baseDir = tmpV2.set(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    );
    const d = this.dungeon;
    let anyHit = false;
    for (let p = 0; p < w.pellets; p++) {
      const sy = this.yaw + (Math.random() - 0.5) * w.spread * 2;
      const sp = this.pitch + (Math.random() - 0.5) * w.spread * 2;
      const dir = new THREE.Vector3(
        -Math.sin(sy) * Math.cos(sp),
        Math.sin(sp),
        -Math.cos(sy) * Math.cos(sp)
      );
      this.shots++;
      const wallDist = d.rayWallDistance(origin.x, origin.z, dir.x, dir.z, w.range);
      const wallPoint = origin.clone().addScaledVector(dir, wallDist);
      // vertical wall hit approximation: if ray goes above wall height or below floor
      let nearest = null, nearestT = wallDist;
      for (const e of d.enemies) {
        if (e.dead || e.deathT >= 0) continue;
        const t = raySphere(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, e.x, e.y + Math.sin(e.bob) * 0.05, e.z, e.radius * 1.05);
        if (t > 0 && t < nearestT) { nearestT = t; nearest = e; }
      }
      if (nearest) {
        const point = origin.clone().addScaledVector(dir, nearestT);
        this.damageEnemy(nearest, w.damage, point);
        anyHit = true;
      } else if (wallPoint.y < 3.2 && wallPoint.y > 0) {
        this.spawnParticles(wallPoint.x, Math.max(0.2, wallPoint.y), wallPoint.z, 2, 0x2a2018);
      }
    }
    if (anyHit) {
      this.hits++;
      this.hitMarker = 0.16;
    }
  }

  bobOffset() {
    return Math.sin(this.bob) * 0.035;
  }

  damageEnemy(e, dmg, point) {
    if (e.dead) return;
    e.hp -= dmg;
    e.hitFlash = 0.1;
    e.aggro = true;
    const pan = this.panFor(e.x, e.z);
    if (e.hp <= 0) {
      e.dead = true;
      e.deathT = 0;
      this.kills++;
      this.audio.enemyDie(pan);
      this.spawnParticles(e.x, e.y + 0.2, e.z, 10, 0x6a0d0a, 2.3);
      if (Math.random() < 0.28) this.dropItem(e.x, e.z, Math.random() < 0.55 ? 'shells' : 'health');
      else if (Math.random() < 0.04) this.dropItem(e.x, e.z, 'armor');
      if (e.glow) e.glow.visible = false;
    } else {
      this.audio.enemyHurt(pan);
      this.spawnParticles(point?.x ?? e.x, point?.y ?? e.y, point?.z ?? e.z, 5, 0x8a1610);
    }
  }

  panFor(x, z) {
    const dx = x - this.pos.x, dz = z - this.pos.z;
    const dist = Math.hypot(dx, dz) || 1;
    const rightX = Math.cos(this.yaw), rightZ = -Math.sin(this.yaw);
    return Math.max(-1, Math.min(1, (dx / dist) * rightX + (dz / dist) * rightZ)) * 0.8;
  }

  dropItem(x, z, type) {
    const d = this.dungeon;
    const item = { type, x, z, taken: false, sprite: null, glow: null, bob: Math.random() * 6, dropped: true };
    d.items.push(item);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: itemTexture(type), transparent: true, depthWrite: false,
    }));
    sprite.scale.set(0.62, 0.62, 1);
    sprite.position.set(x, 0.6, z);
    d.group.add(sprite);
    item.sprite = sprite;
  }

  spawnParticles(x, y, z, count, color, power = 1) {
    const mat = color === 0x6a0d0a ? this.goreMat : this.bloodMat;
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(this.particleGeo, color === 0x2a2018 ? new THREE.MeshBasicMaterial({ color }) : mat);
      m.position.set(x, y, z);
      d3Set(m);
      this.dungeon.group.add(m);
      this.particles.push({
        mesh: m,
        vx: (Math.random() - 0.5) * 3.4 * power,
        vy: (Math.random() * 2.2 + 0.8) * power,
        vz: (Math.random() - 0.5) * 3.4 * power,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
      });
    }
  }

  /* ---------------- enemy AI ---------------- */
  updateEnemies(dt, time) {
    const d = this.dungeon;
    const flowStale = d.worldToCell(this.pos.x, this.pos.z);
    if (time - this.flowT > 0.32) {
      this.updateFlow();
      this.flowT = time;
    }
    const enemies = d.enemies;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.deathT >= 0) {
        e.deathT += dt;
        const t = Math.min(1, e.deathT / 0.7);
        e.sprite.scale.set(e.sx * (1 + t * 0.55), e.sy * (1 - t * 0.92), 1);
        e.sprite.material.opacity = 1 - t;
        e.sprite.position.y = e.y * (1 - t * 0.55) + 0.05;
        if (t >= 1) {
          d.group.remove(e.sprite);
          e.sprite.material.dispose();
          e.sprite = null;
          e.deathT = -2;
        }
        continue;
      }
      if (e.dead) continue;
      e.cool -= dt;
      e.growlT -= dt;
      e.bob += dt * (e.state === 'idle' ? 1.2 : 6);
      if (e.hitFlash > 0) {
        e.hitFlash -= dt;
        e.sprite.material.color.setHex(e.hitFlash > 0 ? 0xffe0d0 : 0xffffff);
      }
      const dx = this.pos.x - e.x, dz = this.pos.z - e.z;
      const dist = Math.hypot(dx, dz);
      const los = dist < 24 && d.lineOfSight(e.x, e.z, this.pos.x, this.pos.z);
      if (!e.aggro && ((los && dist < 19) || dist < 4.5)) {
        e.aggro = true;
        e.state = 'hunt';
        this.audio.growl(this.panFor(e.x, e.z));
      }
      if (!e.aggro) {
        // idle sway
        e.sprite.position.y = e.y + Math.sin(e.bob) * 0.035;
        if (e.glow) e.glow.position.copy(e.sprite.position);
        continue;
      }
      if (e.growlT <= 0 && dist < 16) {
        e.growlT = 3 + Math.random() * 5;
        this.audio.growl(this.panFor(e.x, e.z));
      }

      // attacking
      const canSee = los;
      if (e.ranged && canSee && dist < e.range && e.cool <= 0) {
        e.cool = e.cooldown * (0.85 + Math.random() * 0.35);
        this.enemyShoot(e, dist);
      } else if (e.melee && dist < e.range + 0.4 && e.cool <= 0) {
        e.cool = e.cooldown;
        e.lunge = 0.22;
        this.hurtPlayer(e.dmg, e.type);
        this.audio.growl(this.panFor(e.x, e.z));
      }

      // movement
      let enemyMoving = false;
      let tx = null, tz = null;
      if (canSee && dist < 10) {
        tx = this.pos.x; tz = this.pos.z;
      } else {
        const f = this.flowDir(e.x, e.z);
        if (f) { tx = f.x; tz = f.z; }
      }
      if (tx !== null) {
        const mdx = tx - e.x, mdz = tz - e.z;
        const md = Math.hypot(mdx, mdz);
        if (md > 0.08) {
          let speed = e.speed;
          if (e.state === 'idle') e.state = 'hunt';
          e.state = 'hunt';
          // keep slight distance for ranged enemies
          const stop = e.melee ? 1.0 : (e.type === 'boss' ? 4.5 : 3.2);
          if (dist > stop) {
            enemyMoving = true;
            let vx = (mdx / md) * speed, vz = (mdz / md) * speed;
            // separation
            for (const o of enemies) {
              if (o === e || o.dead || o.deathT >= 0) continue;
              const sx = e.x - o.x, sz = e.z - o.z;
              const sd = Math.hypot(sx, sz);
              if (sd < 1.0 && sd > 0.001) {
                vx += (sx / sd) * 1.6;
                vz += (sz / sd) * 1.6;
              }
            }
            e.x += vx * dt; e.z += vz * dt;
          }
        }
      }
      // lunge recovery
      if (e.lunge > 0) e.lunge = Math.max(0, e.lunge - dt);

    // collide with walls + props
    const ep = { x: e.x, z: e.z };
    this.collideEnemy(ep, e.radius * 0.55);
    e.x = ep.x; e.z = ep.z;

      // keep out of player
      const pdx = e.x - this.pos.x, pdz = e.z - this.pos.z;
      const pd = Math.hypot(pdx, pdz);
      const minD = 0.55 + e.radius * 0.35;
      if (pd < minD && pd > 0.001) {
        e.x = this.pos.x + (pdx / pd) * minD;
        e.z = this.pos.z + (pdz / pd) * minD;
      }

      // animation
      e.walkT += dt;
      const frame = enemyMoving ? Math.floor(e.walkT * 5) % 2 : 0;
      if (frame !== e.walkFrame || e.state === 'idle') {
        e.walkFrame = frame;
        const tex = demonTexture(e.type, frame);
        if (e.sprite.material.map !== tex) {
          e.sprite.material.map = tex;
          e.sprite.material.needsUpdate = true;
        }
      }
      const bobY = Math.sin(e.bob) * (enemyMoving ? 0.09 : 0.035);
      e.sprite.position.set(e.x, e.y + bobY + (e.lunge > 0 ? 0.12 : 0), e.z);
      e.sprite.material.rotation = enemyMoving ? Math.sin(e.bob) * 0.03 : 0;
      if (e.glow) e.glow.position.set(e.x, e.y + bobY, e.z);
    }
  }

  collideEnemy(pos, r) {
    const d = this.dungeon;
    const cell = d.cell;
    const cx = Math.floor(pos.x / cell + d.W / 2);
    const cz = Math.floor(pos.z / cell + d.H / 2);
    for (let z = cz - 1; z <= cz + 1; z++) {
      for (let x = cx - 1; x <= cx + 1; x++) {
        if (!d.isSolidCell(x, z)) continue;
        const minX = (x - d.W / 2) * cell, maxX = minX + cell;
        const minZ = (z - d.H / 2) * cell, maxZ = minZ + cell;
        const nx = Math.max(minX, Math.min(maxX, pos.x));
        const nz = Math.max(minZ, Math.min(maxZ, pos.z));
        const ddx = pos.x - nx, ddz = pos.z - nz;
        const dist = Math.hypot(ddx, ddz);
        if (dist < r && dist > 0.0001) {
          const push = r - dist;
          pos.x += (ddx / dist) * push;
          pos.z += (ddz / dist) * push;
        }
      }
    }
    resolveColliders(pos, r, d.colliders);
  }

  enemyShoot(e, dist) {
    const sx = e.x, sz = e.z;
    const tx = this.pos.x, tz = this.pos.z;
    const baseA = Math.atan2(tx - sx, tz - sz);
    const count = e.type === 'boss' ? 3 : 1;
    for (let i = 0; i < count; i++) {
      const a = baseA + (i - (count - 1) / 2) * 0.13 + (Math.random() - 0.5) * 0.05;
      const speed = e.type === 'boss' ? 8.5 : 7.2;
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(e.type === 'boss' ? 0.3 : 0.2, 8, 6), new THREE.MeshBasicMaterial({ color: e.type === 'boss' ? 0xff3a20 : 0xff8a3a }));
      mesh.position.set(sx, e.y + 0.1, sz);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture('#ff7a3a'), color: 0xff7a3a, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      glow.scale.set(0.9, 0.9, 1); mesh.add(glow);
      this.dungeon.group.add(mesh);
      this.projectiles.push({
        mesh, x: sx, z: sz, y: e.y + 0.1,
        vx: Math.sin(a) * speed, vz: Math.cos(a) * speed,
        life: 4, dmg: e.dmg, radius: 0.2,
      });
    }
    this.audio.tone({ freq: 300, freq2: 90, type: 'sawtooth', dur: 0.22, vol: 0.09, pan: this.panFor(e.x, e.z) });
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.x += p.vx * dt; p.z += p.vz * dt;
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.rotation.x += dt * 7;
      let remove = false;
      if (p.life <= 0) remove = true;
      if (this.dungeon.isSolidWorld(p.x, p.z)) {
        remove = true;
        this.spawnParticles(p.x, p.y, p.z, 5, 0x2a2018, 0.8);
      }
      const ddx = p.x - this.pos.x, ddz = p.z - this.pos.z;
      if (Math.hypot(ddx, ddz) < 0.62) {
        remove = true;
        this.hurtPlayer(p.dmg, 'fireball');
        this.spawnParticles(p.x, p.y, p.z, 6, 0x8a1610, 0.8);
      }
      if (remove) {
        this.dungeon.group.remove(p.mesh);
        p.mesh.geometry.dispose(); p.mesh.material.dispose();
        this.projectiles.splice(i, 1);
      }
    }
  }

  hurtPlayer(amount, source) {
    if (this.dead || this.completed) return;
    let dmg = amount;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, dmg * 0.6);
      this.armor -= absorbed;
      dmg -= absorbed;
    }
    this.hp -= dmg;
    this.damageFlash = Math.min(1, this.damageFlash + 0.55);
    this.shake = Math.max(this.shake, 0.75);
    if (this.hurtSound <= 0) {
      this.audio.playerHurt();
      this.hurtSound = 0.22;
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.audio.stopAmbient();
      this.audio.death();
      this.onDeath?.({ kills: this.kills, keys: this.keys });
    }
  }

  /* ---------------- items & doors ---------------- */
  updateItems(time) {
    const d = this.dungeon;
    for (const item of d.items) {
      if (item.taken) continue;
      const dx = item.x - this.pos.x, dz = item.z - this.pos.z;
      if (Math.hypot(dx, dz) < 1.15) {
        this.pickup(item);
        continue;
      }
      if (item.sprite) {
        item.sprite.position.y = 0.72 + Math.sin(time * 2.2 + item.bob) * 0.12;
        if (item.glow) item.glow.position.y = item.sprite.position.y;
      }
    }
  }

  pickup(item) {
    const d = this.dungeon;
    item.taken = true;
    if (item.sprite) { d.group.remove(item.sprite); item.sprite.material.dispose(); item.sprite = null; }
    if (item.glow) { d.group.remove(item.glow); item.glow.material.dispose(); item.glow = null; }
    if (item.type === 'key') {
      this.keys = 1;
      d.exit.unlocked = true;
      this.audio.key();
      this.messages?.message('SIGIL KEY ACQUIRED — THE PORTAL IS OPEN', 'good');
    } else if (item.type === 'health') {
      const before = this.hp;
      this.hp = Math.min(100, this.hp + 25);
      this.audio.pickup();
      this.messages?.message(`+${Math.round(this.hp - before)} HEALTH`);
    } else if (item.type === 'armor') {
      const before = this.armor;
      this.armor = Math.min(100, this.armor + 30);
      this.audio.pickup();
      this.messages?.message(`+${Math.round(this.armor - before)} ARMOR`);
    } else if (item.type === 'shells') {
      this.shells += 8;
      this.audio.pickup();
      this.messages?.message('+8 SHELLS');
    } else if (item.type === 'chaingun') {
      this.inventory.chaingun = true;
      this.bullets += 120;
      this.current = 'chaingun';
      this.audio.pickup();
      this.messages?.message('CHAINGUN ACQUIRED — HOLD FIRE', 'good');
      this.updateWeaponHud();
    }
  }

  updateDoors(dt) {
    const d = this.dungeon;
    for (const door of d.doors) {
      if (door.open) continue;
      const p = d.cellCenter(door.cx, door.cz);
      let near = Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < 3.4;
      if (!near) {
        for (const e of d.enemies) {
          if (e.dead || e.deathT >= 0) continue;
          if (Math.hypot(p.x - e.x, p.z - e.z) < 2.0) { near = true; break; }
        }
      }
      if (near) {
        door.open = true;
        door.progress = 0.001;
        this.audio.door();
      }
    }
  }

  /* ---------------- frame ---------------- */
  update(dt, time) {
    if (this.dead || this.completed) {
      this.updateParticles(dt);
      this.updateCamera(dt, time);
      return;
    }
    this.elapsed = (performance.now() - this.startTime) / 1000;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.kick = Math.max(0, this.kick - dt * 6);
    this.hitMarker = Math.max(0, this.hitMarker - dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt * 2.3);
    this.shake = Math.max(0, this.shake - dt * 2.2);
    this.hurtSound = Math.max(0, this.hurtSound - dt);
    this.lockMsgCooldown = Math.max(0, this.lockMsgCooldown - dt);

    const input = this.input;
    this.updateMovement(dt);
    if (input.fire) this.fire();

    this.updateEnemies(dt, time);
    this.updateProjectiles(dt);
    this.updateItems(time);
    this.updateDoors(dt);
    this.updateParticles(dt);
    this.dungeon.updateVisuals(dt, time);

    this.visitedT += dt;
    if (this.visitedT > 0.2) this.markVisited();

    // portal
    const ex = this.dungeon.exit;
    const dd = Math.hypot(this.pos.x - ex.x, this.pos.z - ex.z);
    if (dd < 1.65) {
      if (!ex.unlocked) {
        if (this.lockMsgCooldown <= 0) {
          this.lockMsgCooldown = 2.8;
          this.audio.locked();
          this.messages?.message('SEALED. THE SIGIL KEY IS STILL HIDDEN IN THIS HOUSE.', 'bad');
        }
      } else if (!this.completed) {
        this.completed = true;
        this.audio.portal();
        this.audio.stopAmbient();
        setTimeout(() => this.audio.clear(), 250);
        this.onComplete?.({
          kills: this.kills, total: this.totalKills,
          accuracy: this.shots ? Math.round((this.hits / this.shots) * 100) : 0,
          time: this.elapsed, keys: this.keys,
        });
      }
    }

    this.updateCamera(dt, time);
  }

  updateCamera(dt, time) {
    const c = this.camera;
    const bobY = Math.sin(this.bob) * 0.028;
    const shakeX = (Math.random() - 0.5) * this.shake * 0.09;
    const shakeY = (Math.random() - 0.5) * this.shake * 0.09;
    c.position.set(this.pos.x + shakeX, this.eye + bobY + shakeY, this.pos.z);
    const kickPitch = this.kick * 0.035;
    c.rotation.set(this.pitch + kickPitch, this.yaw, Math.sin(time * 37) * this.shake * 0.012);
    // muzzle light
    if (this.spot) {
      this.spot.intensity = 25 + this.flash * 500;
      this.spot.color.setHex(this.flash > 0 ? 0xfff0d0 : 0xffe3bc);
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.vy -= 9.5 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      if (p.mesh.position.y < 0.03) { p.mesh.position.y = 0.03; p.vy *= -0.25; p.vx *= 0.6; p.vz *= 0.6; }
      p.mesh.rotation.x += dt * 8; p.mesh.rotation.y += dt * 6;
      if (p.life <= 0) {
        this.dungeon.group.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  getObjective() {
    if (this.keys) return { line: 'Reach the exit portal', sub: 'THE SIGIL IS YOURS — STEP INTO THE LIGHT' };
    return { line: 'Find the sigil key', sub: 'FIND THE KEY, THEN REACH THE PORTAL' };
  }

  dispose() {
    this.audio.stopAmbient();
    this.camera.remove(this.spot, this.spotTarget, this.nearLight);
    this.scene.remove(this.camera);
    for (const p of this.projectiles) {
      this.dungeon.group?.remove(p.mesh);
      p.mesh.geometry.dispose(); p.mesh.material.dispose();
    }
    for (const p of this.particles) this.dungeon.group?.remove(p.mesh);
    this.projectiles = []; this.particles = [];
    this.dungeon.dispose();
  }
}

// Helper used only for a tiny blood mesh; kept outside the class to avoid allocations in hot loops.
function d3Set(m) { m.scale.setScalar(0.7 + Math.random() * 0.9); }
