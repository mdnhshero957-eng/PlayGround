import * as THREE from 'three';
import { Neighborhood, HOUSE_LIST, createSim, resolveColliders } from './world.js';
import { Dungeon } from './dungeon.js';
import { LevelRun } from './level.js';
import { GameAudio } from './audio.js';
import { simPortrait } from './textures.js';

const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'whispering-pines-save-v1';
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || innerWidth < 820;
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

/* ---------------- save ---------------- */
function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return {
      cleared: Array.isArray(raw.cleared) ? raw.cleared.filter((x) => typeof x === 'string') : [],
      bestTimes: raw.bestTimes || {},
      stats: { kills: Number(raw.stats?.kills) || 0, time: Number(raw.stats?.time) || 0 },
      muted: !!raw.muted,
    };
  } catch {
    return { cleared: [], bestTimes: {}, stats: { kills: 0, time: 0 }, muted: false };
  }
}
const save = loadSave();
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch {}
}

/* ---------------- renderer ---------------- */
const canvas = $('world');
const fx = $('fx');
const fxCtx = fx.getContext('2d');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const DPR = Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(DPR);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = false;

const sceneN = new THREE.Scene();
const camN = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 400);
camN.position.set(0, 19, 36);

const neighborhood = new Neighborhood(sceneN);
const sim = createSim({ shirt: '#3f8f83', pants: '#2a3040', skin: '#e0b894', hair: '#2a1d16' });
sceneN.add(sim.group);

const audio = new GameAudio();
audio.setMuted(save.muted);

const player = {
  pos: neighborhood.getSpawn(),
  y: 0.3,
  angle: 0,
};
sim.group.position.set(player.pos.x, player.y, player.pos.z);

let camYaw = 0;
let camPitch = 0.64;
let camDist = 15.5;
const camTarget = new THREE.Vector3();

const G = {
  state: 'title',
  activeHouse: null,
  tracked: null,
  near: null,
  mapOpen: false,
  dialogue: { open: false, lines: [], index: 0 },
  pendingEnding: false,
  transition: false,
  hadLock: false,
  level: null,
  sceneL: null,
  camL: null,
  hud: {},
  faceT: 0,
  miniT: 0,
  messageTimer: [],
  lastPrompt: '',
};

/* ---------------- DOM ---------------- */
const ui = {
  title: $('title-screen'), start: $('start-btn'), mute: $('mute-btn'), reset: $('reset-btn'),
  nhHud: $('hud-neighborhood'), lvlHud: $('hud-level'), touch: $('touch'),
  markers: $('markers'), curse: $('curse-row'), nhStatus: $('nh-status'),
  needRest: $('need-rest'), needSanity: $('need-sanity'), needValue: $('need-value'),
  prompt: $('interact-prompt'), promptText: $('prompt-text'), touchEnter: $('touch-enter'),
  compass: $('compass'), compassArrow: $('compass-arrow'), compassLabel: $('compass-label'),
  intro: $('level-intro'), introBtn: $('intro-btn'), introBack: $('intro-back'),
  introAddress: $('intro-address'), introName: $('intro-name'), introTagline: $('intro-tagline'),
  introDiff: $('intro-difficulty'), introDemons: $('intro-demons'), introStatus: $('intro-status'),
  introFlavor: $('intro-flavor'),
  pause: $('pause-menu'), resume: $('resume-btn'), restart: $('restart-btn'), flee: $('flee-btn'),
  results: $('results'), resultsBtn: $('results-btn'), resAddress: $('res-address'),
  resName: $('res-name'), resKills: $('res-kills'), resAcc: $('res-acc'), resTime: $('res-time'),
  resValue: $('res-value'), resFlavor: $('res-flavor'),
  death: $('death'), deathKills: $('death-kills'), deathKeys: $('death-keys'),
  retry: $('retry-btn'), deathFlee: $('death-flee-btn'),
  ending: $('ending'), endingBtn: $('ending-btn'), endKills: $('end-kills'), endTime: $('end-time'),
  map: $('map-modal'), mapClose: $('map-close'), mapList: $('map-list'), mapDraw: $('map-draw'),
  fade: $('fade'), toast: $('toast'), dialogue: $('dialogue'), dlgName: $('dlg-name'),
  dlgText: $('dlg-text'), dlgHint: document.querySelector('.dlg-hint'),
  lhAddress: $('lh-address'), lhName: $('lh-name'), lhObjective: $('lh-objective'), lhSub: $('lh-sub'),
  lhFloor: $('lh-floor'), hudAmmo: $('hud-ammo'), hudAmmoLabel: $('hud-ammo-label'),
  hudHealth: $('hud-health'), hudArmor: $('hud-armor'), hudKills: $('hud-kills'),
  hudKey: $('hud-key'), hudMood: $('hud-mood'), face: $('face'),
  weaponName: $('weapon-name'), weaponHint: $('weapon-hint'), lockHint: $('lock-hint'),
  minimap: $('minimap'), messages: $('messages'), touchEnter: $('touch-enter'),
  pauseBtn: $('pause-btn'),
  stick: $('stick'), stickKnob: $('stick-knob'),
  fire: $('btn-fire'), use: $('btn-use'), swap: $('btn-swap'), mapBtn: $('btn-map'),
  mapHintBtn: $('map-btn'),
};
const faceCtx = ui.face.getContext('2d');
const miniCtx = ui.minimap.getContext('2d');
const mapCtx = ui.mapDraw.getContext('2d');

/* ---------------- input ---------------- */
const input = { forward: 0, right: 0, fire: false, sprint: false };
const keys = new Set();
const touchMove = { f: 0, r: 0 };
let stickPointer = null;
let stickStart = { x: 0, y: 0 };
let lookPointer = null;
let lookLast = { x: 0, y: 0 };
let dragLook = null;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function syncInput() {
  const kf = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const kr = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  input.forward = clamp(kf + touchMove.f, -1, 1);
  input.right = clamp(kr + touchMove.r, -1, 1);
  input.sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
}

window.addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && G.state !== 'title') e.preventDefault();
  const first = !keys.has(e.code);
  keys.add(e.code);
  if (!first) return;
  if (e.code === 'KeyM') {
    if (G.state === 'neighborhood') toggleMap();
    return;
  }
  if (e.code === 'Escape') {
    if (G.mapOpen) { toggleMap(false); return; }
    if (G.state === 'level') { pauseLevel(); return; }
    if (G.state === 'paused') { resumeLevel(); return; }
    if (G.state === 'intro') { closeIntro(); return; }
    return;
  }
  if (e.code === 'KeyE') {
    if (G.state === 'neighborhood') interact();
    else if (G.state === 'level') levelUse();
    else if (G.state === 'intro') enterLevel();
    else if (G.state === 'results') continueFromResults();
    return;
  }
  if (e.code === 'Enter' || e.code === 'Space') {
    if (G.state === 'title') startGame();
    else if (G.state === 'intro') enterLevel();
    else if (G.state === 'results') continueFromResults();
    else if (G.state === 'ending') closeEnding();
    else if (G.state === 'death') retryLevel();
    else if (G.state === 'neighborhood' && G.dialogue.open) advanceDialogue();
    return;
  }
  if (G.state === 'level' && G.level) {
    if (e.code === 'Digit1') { G.level.onWeapon(1); syncWeaponHud(); }
    else if (e.code === 'Digit2') { G.level.onWeapon(2); syncWeaponHud(); }
    else if (e.code === 'Digit3') { G.level.onWeapon(3); syncWeaponHud(); }
    else if (e.code === 'KeyQ') { G.level.onSwap(); syncWeaponHud(); }
    else if (e.code === 'KeyR') G.level.onUse();
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); input.fire = false; });

/* pointer lock */
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) {
    G.hadLock = true;
  } else if (G.state === 'level' && G.hadLock) {
    pauseLevel();
  }
});

canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  if (G.state === 'level') {
    if (document.pointerLockElement === canvas) input.fire = true;
    else if (!isTouch) canvas.requestPointerLock?.();
  } else if (G.state === 'neighborhood' && !isTouch) {
    dragLook = { x: e.clientX, y: e.clientY };
  }
});
window.addEventListener('mousemove', (e) => {
  if (G.state === 'level' && document.pointerLockElement === canvas && G.level) {
    G.level.applyLook(e.movementX || 0, e.movementY || 0);
  } else if (dragLook) {
    const dx = e.clientX - dragLook.x, dy = e.clientY - dragLook.y;
    dragLook = { x: e.clientX, y: e.clientY };
    camYaw -= dx * 0.0048;
    camPitch = clamp(camPitch + dy * 0.0032, 0.2, 1.15);
  }
});
window.addEventListener('mouseup', () => { input.fire = false; dragLook = null; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('wheel', (e) => {
  if (G.state !== 'neighborhood') return;
  e.preventDefault();
  camDist = clamp(camDist + e.deltaY * 0.012, 9, 30);
}, { passive: false });

/* touch look / stick */
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch') return;
  if (G.state === 'title' || G.state === 'intro' || G.state === 'paused' || G.mapOpen || G.dialogue.open) return;
  audio.unlock();
  const x = e.clientX, y = e.clientY;
  if (x < innerWidth * 0.46 && y > innerHeight * 0.32) {
    stickPointer = e.pointerId;
    stickStart = { x, y };
    touchMove.f = 0; touchMove.r = 0;
    ui.stick.classList.add('active');
    const half = (ui.stick.offsetWidth || 118) / 2;
    ui.stick.style.left = `${x - half}px`;
    ui.stick.style.top = `${y - half}px`;
    ui.stick.style.bottom = 'auto';
    ui.stickKnob.style.transform = 'translate(0px, 0px)';
    canvas.setPointerCapture?.(e.pointerId);
  } else {
    lookPointer = e.pointerId;
    lookLast = { x, y };
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId === stickPointer) {
    const dx = e.clientX - stickStart.x, dy = e.clientY - stickStart.y;
    const max = 52;
    const len = Math.hypot(dx, dy);
    const k = len > max ? max / len : 1;
    const nx = dx * k, ny = dy * k;
    touchMove.r = nx / max;
    touchMove.f = -ny / max;
    ui.stickKnob.style.transform = `translate(${nx}px, ${ny}px)`;
  } else if (e.pointerId === lookPointer && G.level) {
    if (G.state === 'level') {
      const dx = e.clientX - lookLast.x, dy = e.clientY - lookLast.y;
      lookLast = { x: e.clientX, y: e.clientY };
      G.level.applyLook(dx * 1.25, dy * 1.25);
    }
  } else if (e.pointerId === lookPointer && G.state === 'neighborhood') {
    const dx = e.clientX - lookLast.x, dy = e.clientY - lookLast.y;
    lookLast = { x: e.clientX, y: e.clientY };
    camYaw -= dx * 0.006;
    camPitch = clamp(camPitch + dy * 0.003, 0.2, 1.15);
  }
});
function endTouch(e) {
  if (e.pointerId === stickPointer) {
    stickPointer = null;
    touchMove.f = 0; touchMove.r = 0;
    ui.stick.classList.remove('active');
    ui.stickKnob.style.transform = 'translate(0px, 0px)';
  }
  if (e.pointerId === lookPointer) lookPointer = null;
}
canvas.addEventListener('pointerup', endTouch);
canvas.addEventListener('pointercancel', endTouch);

/* buttons */
function bindTouchButton(node, down, up) {
  node.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation(); audio.unlock();
    down?.();
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) {
    node.addEventListener(ev, (e) => { e.preventDefault(); up?.(); });
  }
}
bindTouchButton(ui.fire, () => { if (G.state === 'level') { input.fire = true; G.level?.fire(); } }, () => { input.fire = false; });
bindTouchButton(ui.use, () => { if (G.state === 'level') levelUse(); else interact(); });
bindTouchButton(ui.swap, () => { if (G.state === 'level' && G.level) { G.level.onSwap(); syncWeaponHud(); } });
bindTouchButton(ui.mapBtn, () => toggleMap());
bindTouchButton(ui.touchEnter, () => interact());
ui.prompt.addEventListener('click', () => interact());

/* ---------------- helpers ---------------- */
function showToast(text, ms = 2800) {
  ui.toast.textContent = text;
  ui.toast.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => ui.toast.classList.add('hidden'), ms);
}

function formatTime(sec) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function fade(cb) {
  return new Promise((resolve) => {
    ui.fade.classList.add('on');
    setTimeout(async () => {
      try { await cb?.(); } catch (err) { console.error(err); }
      setTimeout(() => { ui.fade.classList.remove('on'); resolve(); }, 120);
    }, 340);
  });
}

function levelMessage(text, type = '') {
  const div = document.createElement('div');
  div.className = 'msg ' + type;
  div.textContent = text;
  ui.messages.appendChild(div);
  while (ui.messages.children.length > 4) ui.messages.removeChild(ui.messages.firstChild);
  setTimeout(() => div.remove(), 3600);
}

function syncWeaponHud() {
  if (!G.level) return;
  const ammo = G.level.getAmmo();
  ui.hudAmmoLabel.textContent = ammo.label;
  ui.hudAmmo.textContent = ammo.value;
  ui.weaponName.textContent = G.level.weapon.name;
}

/* ---------------- HUD modes ---------------- */
function setHud(mode) {
  ui.nhHud.classList.toggle('hidden', mode !== 'neighborhood');
  ui.lvlHud.classList.toggle('hidden', !(mode === 'level' || mode === 'paused' || mode === 'results'));
  ui.touch.classList.toggle('hidden', !isTouch || !(mode === 'neighborhood' || mode === 'level'));
  ui.markers.style.display = mode === 'neighborhood' ? 'block' : 'none';
  ui.compass.classList.toggle('hidden', mode !== 'neighborhood');
  if (mode !== 'neighborhood') {
    ui.prompt.classList.add('hidden');
    ui.touchEnter.classList.add('hidden');
  }
  ui.fire.style.display = mode === 'level' ? '' : 'none';
  ui.swap.style.display = mode === 'level' ? '' : 'none';
  ui.mapBtn.style.display = mode === 'neighborhood' ? '' : 'none';
  ui.use.style.display = (mode === 'level' || mode === 'neighborhood') ? '' : 'none';
  if (mode !== 'level') ui.lockHint.classList.add('hidden');
}

function updateNeighborhoodHud() {
  const cleared = save.cleared.length;
  const spans = ui.curse.children;
  for (let i = 0; i < spans.length; i++) {
    const house = HOUSE_LIST[i];
    const done = house ? save.cleared.includes(house.id) : i < cleared;
    spans[i].classList.toggle('cleared', done);
    spans[i].textContent = done ? '✓' : '◆';
  }
  ui.nhStatus.textContent = `${cleared} / 5 PROPERTIES CLEARED`;
  ui.needRest.textContent = `${38 + cleared * 9}%`;
  ui.needSanity.textContent = `${12 + cleared * 17}%`;
  ui.needValue.textContent = cleared ? `$${(cleared * 75).toLocaleString()}k` : '$0';
}

/* ---------------- neighborhood loop ---------------- */
function groundHeight(x, z) {
  return Math.hypot(x, z) < 10.35 ? 0.31 : 0.02;
}

function updatePlayer(dt) {
  syncInput();
  if (G.dialogue.open || G.mapOpen || G.state !== 'neighborhood') {
    input.forward = 0; input.right = 0;
    sim.update(dt, false, 0);
    return;
  }
  const f = input.forward, r = input.right;
  const len = Math.hypot(f, r);
  const speed = (input.sprint ? 8.3 : 5.2) * (len > 0.01 ? 1 : 0);
  const sy = Math.sin(camYaw), cy = Math.cos(camYaw);
  let dx = -sy * f + cy * r;
  let dz = -cy * f - sy * r;
  const dl = Math.hypot(dx, dz) || 1;
  dx /= dl; dz /= dl;
  const step = speed || 0;
  player.pos.x += dx * step * dt;
  player.pos.z += dz * step * dt;
  player.pos.y = 0;
  resolveColliders(player.pos, 0.5, neighborhood.colliders);
  const rad = Math.hypot(player.pos.x, player.pos.z);
  if (rad > 45) {
    player.pos.x *= 45 / rad;
    player.pos.z *= 45 / rad;
  }
  const gh = groundHeight(player.pos.x, player.pos.z);
  player.y += (gh - player.y) * Math.min(1, dt * 12);

  const moving = len > 0.05;
  sim.update(dt, moving, input.sprint ? 1.4 : 1);
  sim.group.position.set(player.pos.x, player.y, player.pos.z);
  if (moving) {
    const target = Math.atan2(dx, dz);
    let diff = target - player.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    player.angle += diff * Math.min(1, dt * 11);
    sim.group.rotation.y = player.angle;
  } else {
    sim.group.rotation.y = player.angle;
  }
  if (G.state === 'neighborhood') updateInteraction();
}

function updateInteraction() {
  const near = neighborhood.nearestInteraction(player.pos);
  G.near = near;
  if (!near) {
    ui.prompt.classList.add('hidden');
    ui.touchEnter.classList.add('hidden');
    return;
  }
  let text = '';
  if (near.type === 'npc') text = 'TALK TO MORTICIA';
  else if (near.house.locked) text = 'THE MODEL HOME · LOCKED';
  else text = `ENTER ${near.house.config.short.toUpperCase()}`;
  ui.promptText.textContent = text;
  if (isTouch) {
    ui.prompt.classList.add('hidden');
    ui.touchEnter.textContent = text;
    ui.touchEnter.classList.remove('hidden');
  } else {
    ui.prompt.classList.remove('hidden');
    ui.touchEnter.classList.add('hidden');
  }
}

function updateCameraNeighborhood(dt, t) {
  const target = camTarget;
  if (G.state === 'title') {
    const a = 0.5 + Math.sin(t * 0.035) * 0.35;
    target.set(0, 2.2, 0);
    const desired = new THREE.Vector3(Math.sin(a) * 34, 19 + Math.sin(t * 0.11) * 0.9, Math.cos(a) * 34);
    camN.position.lerp(desired, 1 - Math.exp(-dt * 2));
  } else if (G.state === 'ending') {
    const a = t * 0.035;
    target.set(0, 3, 0);
    const desired = new THREE.Vector3(Math.sin(a) * 36, 24, Math.cos(a) * 36);
    camN.position.lerp(desired, 1 - Math.exp(-dt * 1.2));
  } else if (G.state === 'intro' && G.activeHouse) {
    const h = G.activeHouse;
    const dir = new THREE.Vector3(-Math.sin(h.angle), 0, -Math.cos(h.angle));
    target.set(h.center.x, 2.4, h.center.z);
    const desired = new THREE.Vector3(
      h.entrance.x + dir.x * 16,
      8.5,
      h.entrance.z + dir.z * 16
    );
    camN.position.lerp(desired, 1 - Math.exp(-dt * 3));
  } else {
    target.set(player.pos.x, player.y + 1.35, player.pos.z);
    const r = Math.cos(camPitch) * camDist;
    const desired = new THREE.Vector3(
      target.x + Math.sin(camYaw) * r,
      target.y + Math.sin(camPitch) * camDist,
      target.z + Math.cos(camYaw) * r
    );
    camN.position.lerp(desired, 1 - Math.exp(-dt * 8));
  }
  camN.lookAt(target);
}

function updateCompass() {
  if (G.state !== 'neighborhood') return;
  let target = G.tracked;
  if (!target || target.cleared) {
    let best = null, bestD = Infinity;
    for (const h of neighborhood.houses) {
      if (h.locked || h.cleared) continue;
      const d = Math.hypot(h.center.x - player.pos.x, h.center.z - player.pos.z);
      if (d < bestD) { bestD = d; best = h; }
    }
    target = best || null;
  }
  if (!target) {
    ui.compassLabel.textContent = 'ALL QUIET ON THE CUL-DE-SAC';
    ui.compassArrow.style.transform = 'rotate(0deg)';
    ui.compassArrow.style.opacity = '0.25';
    return;
  }
  const dx = target.center.x - player.pos.x;
  const dz = target.center.z - player.pos.z;
  const bearing = Math.atan2(dx, dz);
  const forwardBearing = Math.atan2(-Math.sin(camYaw), -Math.cos(camYaw));
  let rel = bearing - forwardBearing;
  while (rel > Math.PI) rel -= Math.PI * 2;
  while (rel < -Math.PI) rel += Math.PI * 2;
  ui.compassArrow.style.opacity = '1';
  ui.compassArrow.style.transform = `rotate(${rel}rad)`;
  ui.compassLabel.textContent = `${target.config.short.toUpperCase()} · ${Math.round(Math.hypot(dx, dz))}m`;
}

/* ---------------- interaction / dialogue ---------------- */
const INTRO_LINES = [
  "Welcome to Whispering Pines, hon. I'm Morticia — your HOA liaison, grief counselor, and designated adult.",
  "Fair warning: every house on this cul-de-sac is a portal to hell. It's in the bylaws. Paragraph nine.",
  "Clear the four haunted properties and the Model Home opens. That's where the HOA President lives. Bring the shotgun.",
  "Inside each house: find the sigil key, then step into the portal. Kill whatever objects. Try not to die — it's murder on curb appeal.",
];
const HINT_LINES = {
  default: [
    "Rules of the association: keep your lawn tidy, your shotgun loaded, and your screams indoors after 10 p.m.",
    "The sigil key glows gold. The portal stays red until you take it. Then it turns a lovely shade of radioactive green.",
  ],
  near: [
    "That one's got a lovely open floor plan. Shame about the imps. They cluster near the portal — thin them out before you run for it.",
    "If the demons get too close, back into a doorway. They are terrible at queuing.",
  ],
  unlocked: [
    "Four properties cleansed! The Model Home is open. The President is expecting you. He's an enormous eyeball. Bring extra shells.",
  ],
  done: [
    "You did it. The cul-de-sac is quiet. Property values are up four hundred percent. I've never been prouder of a first-time buyer.",
  ],
};

function startDialogue(lines) {
  G.dialogue = { open: true, lines, index: 0 };
  ui.dialogue.classList.remove('hidden');
  ui.touch.classList.add('hidden');
  ui.dlgName.textContent = 'MORTICIA · HOA LIAISON';
  ui.dlgText.textContent = lines[0];
  ui.dlgHint.style.visibility = lines.length > 1 ? 'visible' : 'hidden';
  ui.prompt.classList.add('hidden');
  ui.touchEnter.classList.add('hidden');
  audio.ui();
}
function advanceDialogue() {
  if (!G.dialogue.open) return;
  G.dialogue.index++;
  if (G.dialogue.index >= G.dialogue.lines.length) {
    G.dialogue.open = false;
    ui.dialogue.classList.add('hidden');
    if (isTouch && G.state === 'neighborhood') ui.touch.classList.remove('hidden');
    return;
  }
  ui.dlgText.textContent = G.dialogue.lines[G.dialogue.index];
  ui.dlgHint.style.visibility = G.dialogue.index < G.dialogue.lines.length - 1 ? 'visible' : 'hidden';
  audio.ui();
}
ui.dialogue.addEventListener('click', advanceDialogue);

function interact() {
  audio.unlock();
  if (G.dialogue.open) { advanceDialogue(); return; }
  if (G.mapOpen || G.state !== 'neighborhood') return;
  const near = G.near;
  if (!near) return;
  if (near.type === 'npc') {
    const cleared = save.cleared.length;
    let lines;
    if (cleared === 0) lines = INTRO_LINES;
    else if (cleared >= 5) lines = HINT_LINES.done;
    else if (cleared >= 4) lines = HINT_LINES.unlocked;
    else lines = HINT_LINES.near;
    startDialogue(lines);
    return;
  }
  const house = near.house;
  if (house.locked) {
    audio.locked();
    showToast('THE MODEL HOME IS UNDER CONTRACT. CLEAR THE OTHER FOUR PROPERTIES FIRST.');
    return;
  }
  audio.ui();
  showIntro(house);
}

/* ---------------- intro / level lifecycle ---------------- */
function showIntro(house) {
  G.activeHouse = house;
  G.state = 'intro';
  G.dialogue.open = false;
  ui.dialogue.classList.add('hidden');
  // snap the establishing shot immediately so the intro backdrop is right even at low frame rates
  const dir = new THREE.Vector3(-Math.sin(house.angle), 0, -Math.cos(house.angle));
  camN.position.set(house.entrance.x + dir.x * 16, 8.5, house.entrance.z + dir.z * 16);
  camN.lookAt(house.center.x, 2.4, house.center.z);
  setHud('none');
  ui.markers.style.display = 'none';
  ui.intro.classList.remove('hidden');
  ui.introAddress.textContent = house.config.address;
  ui.introName.textContent = house.config.name;
  ui.introTagline.textContent = house.config.tagline;
  ui.introDiff.textContent = ROMAN[house.config.difficulty] || 'I';
  const demonCount = house.config.enemies + (house.config.demonTypes.includes('boss') ? 1 : 0);
  ui.introDemons.textContent = String(demonCount);
  ui.introStatus.textContent = ['DELINQUENT', 'FORECLOSED', 'POSSESSED', 'UNINSURABLE', 'HOA-OWNED'][house.config.difficulty - 1];
  ui.introFlavor.textContent = house.config.flavor;
  ui.introBtn.textContent = save.cleared.includes(house.config.id) ? 'RETURN INSIDE' : 'ENTER THE HOUSE';
  audio.ui();
}

function closeIntro() {
  if (G.state !== 'intro') return;
  ui.intro.classList.add('hidden');
  G.state = 'neighborhood';
  setHud('neighborhood');
  updateInteraction();
}

async function enterLevel() {
  if (G.state !== 'intro' || G.transition) return;
  const house = G.activeHouse;
  if (!house) return;
  G.transition = true;
  audio.unlock();
  ui.intro.classList.add('hidden');
  ui.markers.style.display = 'none';
  if (!isTouch) { try { canvas.requestPointerLock?.(); } catch {} }
  await fade(async () => {
    buildLevel(house);
    setHud('level');
    G.state = 'level';
    configureLevelHud();
  });
  G.transition = false;
}

function buildLevel(house) {
  disposeLevel();
  const theme = house.config.theme;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(theme.fog);
  scene.fog = new THREE.Fog(theme.fog, 12, 62);
  const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 140);
  const dungeon = new Dungeon(house.config);
  dungeon.build(scene);
  G.sceneL = scene;
  G.camL = camera;
  G.level = new LevelRun({
    scene, camera, dungeon, config: house.config, audio, input,
    messages: { message: levelMessage, weapon: syncWeaponHud },
    onDeath: handleDeath,
    onComplete: handleComplete,
  });
  G.faceT = 0;
  G.miniT = 0;
  ui.messages.innerHTML = '';
}

function configureLevelHud() {
  const h = G.activeHouse;
  ui.lhAddress.textContent = h.config.address;
  ui.lhName.textContent = h.config.name;
  ui.lhFloor.textContent = `B${h.config.difficulty}`;
  ui.lockHint.classList.toggle('hidden', isTouch || document.pointerLockElement === canvas);
  syncWeaponHud();
  const o = G.level.getObjective();
  ui.lhObjective.textContent = o.line;
  ui.lhSub.textContent = o.sub;
}

function disposeLevel() {
  if (G.level) {
    try { G.level.dispose(); } catch (err) { console.error(err); }
  }
  G.level = null;
  G.sceneL = null;
  G.camL = null;
  G.hadLock = false;
}

function levelUse() {
  if (G.level) G.level.onUse();
}

function pauseLevel() {
  if (G.state !== 'level' || G.transition) return;
  G.state = 'paused';
  input.fire = false;
  ui.pause.classList.remove('hidden');
  ui.lockHint.classList.add('hidden');
  if (document.pointerLockElement === canvas) document.exitPointerLock();
  audio.ui();
}

function resumeLevel() {
  if (G.state !== 'paused') return;
  audio.unlock();
  ui.pause.classList.add('hidden');
  G.state = 'level';
  if (!isTouch) { try { canvas.requestPointerLock?.(); } catch {} }
  audio.ui();
}

function restartLevel() {
  if (!G.activeHouse || G.transition) return;
  const house = G.activeHouse;
  G.transition = true;
  ui.pause.classList.add('hidden');
  audio.ui();
  fade(async () => {
    buildLevel(house);
    G.state = 'level';
    setHud('level');
    configureLevelHud();
    if (!isTouch) { try { canvas.requestPointerLock?.(); } catch {} }
  }).then(() => { G.transition = false; });
}

function handleDeath(stats) {
  if (G.state !== 'level') return;
  G.state = 'death';
  input.fire = false;
  if (document.pointerLockElement === canvas) document.exitPointerLock();
  ui.deathKills.textContent = String(stats.kills);
  ui.deathKeys.textContent = stats.keys ? '1 / 1' : '0 / 1';
  ui.death.classList.remove('hidden');
  ui.lockHint.classList.add('hidden');
  ui.messages.innerHTML = '';
}

function retryLevel() {
  if (G.transition) return;
  const house = G.activeHouse;
  if (!house) return;
  G.transition = true;
  ui.death.classList.add('hidden');
  audio.ui();
  fade(async () => {
    buildLevel(house);
    G.state = 'level';
    setHud('level');
    configureLevelHud();
    if (!isTouch) { try { canvas.requestPointerLock?.(); } catch {} }
  }).then(() => { G.transition = false; });
}

function handleComplete(stats) {
  if (G.state !== 'level') return;
  G.state = 'results';
  input.fire = false;
  if (document.pointerLockElement === canvas) document.exitPointerLock();
  const house = G.activeHouse;
  const first = !save.cleared.includes(house.config.id);
  if (first) save.cleared.push(house.config.id);
  save.bestTimes[house.config.id] = Math.min(save.bestTimes[house.config.id] || Infinity, Math.round(stats.time));
  save.stats.kills += stats.kills;
  save.stats.time += stats.time;
  persist();
  const modelUnlocked = save.cleared.length >= 4;
  neighborhood.setProgress(save.cleared, modelUnlocked);
  updateNeighborhoodHud();
  const allCleared = save.cleared.length >= 5;
  G.pendingEnding = allCleared;

  ui.resAddress.textContent = house.config.address;
  ui.resName.textContent = house.config.name;
  ui.resKills.textContent = `${stats.kills} / ${stats.total}`;
  ui.resAcc.textContent = `${stats.accuracy}%`;
  ui.resTime.textContent = formatTime(stats.time);
  ui.resValue.textContent = `+$${(house.config.difficulty * 15 + 25).toLocaleString()},000`;
  ui.resFlavor.textContent = house.config.id === 'model'
    ? 'The HOA President has been evicted. The bylaws are, at last, quiet.'
    : 'The house is quiet now. Mostly.';
  ui.resultsBtn.textContent = allCleared ? 'SEE WHAT YOU’VE DONE' : 'BACK TO THE NEIGHBORHOOD';
  ui.results.classList.remove('hidden');
  ui.lockHint.classList.add('hidden');
  ui.messages.innerHTML = '';
  audio.stopAmbient();
  setTimeout(() => audio.clear(), 200);
  if (save.cleared.length === 4 && first) {
    setTimeout(() => showToast('THE MODEL HOME IS NOW UNLOCKED · 1 WHISPERING PINES WAY', 4200), 900);
  }
}

function continueFromResults() {
  if (G.state !== 'results' || G.transition) return;
  const ending = G.pendingEnding;
  ui.results.classList.add('hidden');
  returnToNeighborhood(G.activeHouse, ending);
}

async function returnToNeighborhood(house, ending = false) {
  if (G.transition) return;
  G.transition = true;
  await fade(async () => {
    disposeLevel();
    ui.pause.classList.add('hidden');
    ui.death.classList.add('hidden');
    ui.results.classList.add('hidden');
    if (house) {
      player.pos.set(house.entrance.x, 0, house.entrance.z);
      player.y = groundHeight(player.pos.x, player.pos.z);
      player.angle = house.angle;
      sim.group.position.set(player.pos.x, player.y, player.pos.z);
      sim.group.rotation.y = player.angle;
      camYaw = house.angle + Math.PI;
      camPitch = 0.5;
      camDist = 19;
    }
    if (ending) {
      G.state = 'ending';
      setHud('none');
      ui.ending.classList.remove('hidden');
      ui.endKills.textContent = String(save.stats.kills);
      ui.endTime.textContent = formatTime(save.stats.time);
      audio.startAmbient('neighborhood');
      neighborhood.setProgress(save.cleared, true);
    } else {
      G.state = 'neighborhood';
      setHud('neighborhood');
      updateInteraction();
      updateNeighborhoodHud();
      audio.startAmbient('neighborhood');
      if (save.cleared.length === 4) {
        showToast('THE MODEL HOME IS UNLOCKED — 1 WHISPERING PINES WAY', 3600);
      }
    }
  });
  G.transition = false;
}

function closeEnding() {
  if (G.state !== 'ending') return;
  ui.ending.classList.add('hidden');
  G.state = 'neighborhood';
  setHud('neighborhood');
  player.pos.set(0, 0, 7.6); player.y = 0.31;
  sim.group.position.set(player.pos.x, player.y, player.pos.z);
  player.angle = Math.PI; sim.group.rotation.y = player.angle;
  camYaw = 0; camPitch = 0.55; camDist = 19;
  updateInteraction();
  updateNeighborhoodHud();
  showToast('FREE ROAM UNLOCKED · THE GRASS HAS NEVER BEEN GREENER', 3200);
}

/* ---------------- map ---------------- */
function toggleMap(force) {
  if (G.state !== 'neighborhood' && !(G.state === 'title' && force === false)) return;
  const open = force !== undefined ? force : !G.mapOpen;
  if (G.transition) return;
  G.mapOpen = open;
  ui.map.classList.toggle('hidden', !open);
  ui.prompt.classList.add('hidden');
  ui.touchEnter.classList.add('hidden');
  if (open) {
    drawMap();
    buildMapList();
    audio.ui();
  }
}

function drawMap() {
  const c = mapCtx;
  const S = 440;
  const scale = 4.0;
  const cx = S / 2, cy = S / 2;
  c.clearRect(0, 0, S, S);
  c.fillStyle = '#0c1410'; c.fillRect(0, 0, S, S);
  // grass textureish
  for (let i = 0; i < 1400; i++) {
    c.fillStyle = `rgba(120,160,100,${Math.random() * 0.05})`;
    c.fillRect(Math.random() * S, Math.random() * S, 1, 1);
  }
  // road ring
  c.strokeStyle = '#35353b'; c.lineWidth = 4.8 * scale;
  c.beginPath(); c.arc(cx, cy, 12.8 * scale, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = '#8d887c'; c.lineWidth = 1.5 * scale;
  c.beginPath(); c.arc(cx, cy, 15.9 * scale, 0, Math.PI * 2); c.stroke();
  // island
  c.fillStyle = '#26391f';
  c.beginPath(); c.arc(cx, cy, 10.2 * scale, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#6b6456'; c.lineWidth = 2;
  c.beginPath(); c.arc(cx, cy, 10.3 * scale, 0, Math.PI * 2); c.stroke();
  // center sign
  c.fillStyle = '#d9b15a'; c.fillRect(cx - 6, cy - 4, 12, 8);
  // houses
  for (const h of neighborhood.houses) {
    c.save();
    c.translate(cx + h.center.x * scale, cy + h.center.z * scale);
    c.rotate(-h.rot);
    c.fillStyle = h.cleared ? '#3d6a2e' : h.locked ? '#2a2a30' : '#5a2c23';
    c.strokeStyle = h.cleared ? '#97d05a' : h.locked ? '#6a6a72' : '#ff7a4a';
    c.lineWidth = 2;
    c.fillRect(-h.width / 2 * scale, -h.depth / 2 * scale, h.width * scale, h.depth * scale);
    c.strokeRect(-h.width / 2 * scale, -h.depth / 2 * scale, h.width * scale, h.depth * scale);
    c.restore();
    c.fillStyle = h.cleared ? '#97d05a' : h.locked ? '#8a8a92' : '#ffd0a0';
    c.font = '700 8px monospace'; c.textAlign = 'center';
    c.fillText(h.config.address.split(' ')[0], cx + h.center.x * scale, cy + h.center.z * scale + 3);
  }
  // npc
  const np = neighborhood.npc.group.position;
  c.fillStyle = '#ffb347';
  c.beginPath(); c.arc(cx + np.x * scale, cy + np.z * scale, 4, 0, Math.PI * 2); c.fill();
  // player
  c.save();
  c.translate(cx + player.pos.x * scale, cy + player.pos.z * scale);
  c.rotate(-player.angle);
  c.fillStyle = '#8bff5a';
  c.beginPath(); c.moveTo(0, -7); c.lineTo(5, 5); c.lineTo(0, 2); c.lineTo(-5, 5); c.closePath(); c.fill();
  c.restore();
  // border ticks
  c.strokeStyle = 'rgba(239,230,210,0.2)';
  c.lineWidth = 1;
  c.strokeRect(8, 8, S - 16, S - 16);
  c.fillStyle = 'rgba(239,230,210,0.55)';
  c.font = '9px monospace'; c.textAlign = 'left';
  c.fillText('N', 14, 24);
  c.textAlign = 'right';
  c.fillText('NOT TO SCALE · NOT TO CODE', S - 14, S - 16);
}

function buildMapList() {
  ui.mapList.innerHTML = '';
  for (const h of neighborhood.houses) {
    const div = document.createElement('div');
    div.className = 'map-item' + (h.cleared ? ' cleared' : h.locked ? ' locked' : '');
    const status = h.cleared ? 'CLEARED' : h.locked ? 'LOCKED' : 'OPEN HOUSE';
    div.innerHTML = `
      <div class="mi-icon">${h.cleared ? '✓' : h.locked ? '✕' : '◆'}</div>
      <div class="mi-body">
        <div class="mi-name">${h.config.name}</div>
        <div class="mi-sub">${h.config.address} · CURSE ${ROMAN[h.config.difficulty]}</div>
      </div>
      <div class="mi-status">${status} →</div>`;
    div.addEventListener('click', () => {
      if (h.locked) { audio.locked(); showToast('THE MODEL HOME IS LOCKED. CLEAR FOUR PROPERTIES FIRST.'); return; }
      G.tracked = h;
      toggleMap(false);
      showToast(`TRACKING ${h.config.short.toUpperCase()} — FOLLOW THE COMPASS`, 2600);
      audio.ui();
    });
    ui.mapList.appendChild(div);
  }
}

/* ---------------- title ---------------- */
function startGame() {
  if (G.state !== 'title') return;
  audio.unlock();
  audio.startAmbient('neighborhood');
  audio.ui();
  ui.title.classList.add('hidden');
  G.state = 'neighborhood';
  player.pos.set(0, 0, 7.6); player.y = 0.31;
  sim.group.position.set(player.pos.x, player.y, player.pos.z);
  player.angle = Math.PI;
  sim.group.rotation.y = player.angle;
  camYaw = 0; camPitch = 0.55; camDist = 19;
  setHud('neighborhood');
  updateNeighborhoodHud();
  updateInteraction();
  setTimeout(() => {
    if (G.state === 'neighborhood' && save.cleared.length === 0) startDialogue(INTRO_LINES);
  }, 1000);
}

ui.start.addEventListener('click', startGame);
ui.introBtn.addEventListener('click', enterLevel);
ui.introBack.addEventListener('click', closeIntro);
ui.resume.addEventListener('click', resumeLevel);
ui.restart.addEventListener('click', restartLevel);
ui.flee.addEventListener('click', () => {
  if (G.transition) return;
  ui.pause.classList.add('hidden');
  returnToNeighborhood(G.activeHouse, false);
});
ui.resultsBtn.addEventListener('click', continueFromResults);
ui.retry.addEventListener('click', retryLevel);
ui.deathFlee.addEventListener('click', () => {
  if (G.transition) return;
  ui.death.classList.add('hidden');
  returnToNeighborhood(G.activeHouse, false);
});
ui.endingBtn.addEventListener('click', closeEnding);
ui.mapClose.addEventListener('click', () => toggleMap(false));
ui.mapHintBtn.addEventListener('click', () => toggleMap());
ui.pauseBtn.addEventListener('click', () => pauseLevel());
ui.mute.addEventListener('click', () => {
  save.muted = !save.muted;
  audio.setMuted(save.muted);
  ui.mute.textContent = `SOUND: ${save.muted ? 'OFF' : 'ON'}`;
  persist();
  if (!save.muted) { audio.unlock(); audio.ui(); }
});
let resetArmed = false;
ui.reset.addEventListener('click', () => {
  if (!resetArmed) {
    resetArmed = true;
    ui.reset.textContent = 'CLICK AGAIN TO WIPE SAVE';
    setTimeout(() => { resetArmed = false; ui.reset.textContent = 'RESET SAVE'; }, 3000);
    return;
  }
  resetArmed = false;
  save.cleared = [];
  save.bestTimes = {};
  save.stats = { kills: 0, time: 0 };
  persist();
  neighborhood.setProgress(new Set(), false);
  updateNeighborhoodHud();
  ui.reset.textContent = 'RESET SAVE';
  showToast('SAVE WIPED · THE HOUSES ARE HUNGRY AGAIN');
});

/* ---------------- HUD per-frame ---------------- */
function updateLevelHud() {
  const lvl = G.level;
  if (!lvl) return;
  ui.hudHealth.textContent = String(Math.max(0, Math.round(lvl.hp)));
  ui.hudArmor.textContent = String(Math.max(0, Math.round(lvl.armor)));
  const ammo = lvl.getAmmo();
  if (ui.hudAmmoLabel.textContent !== ammo.label) ui.hudAmmoLabel.textContent = ammo.label;
  if (ui.hudAmmo.textContent !== ammo.value) ui.hudAmmo.textContent = ammo.value;
  ui.hudKills.textContent = `${lvl.kills} / ${lvl.totalKills}`;
  ui.hudKey.textContent = lvl.keys ? 'SIGIL' : '—';
  ui.hudKey.classList.toggle('has-key', !!lvl.keys);
  const o = lvl.getObjective();
  ui.lhObjective.textContent = o.line;
  ui.lhSub.textContent = o.sub;
  ui.weaponName.textContent = lvl.weapon.name;
  const mood = lvl.hp > 66 ? 'UNEASY' : lvl.hp > 33 ? 'PANICKED' : 'TERRIFIED';
  ui.hudMood.textContent = mood;
  ui.hudMood.style.color = lvl.hp > 33 ? '#ff9b7a' : '#ff4b3e';
  ui.lockHint.classList.toggle('hidden', isTouch || G.state !== 'level' || document.pointerLockElement === canvas);

  G.faceT -= 1 / 60;
  if (G.faceT <= 0) {
    G.faceT = 0.12;
    const portrait = simPortrait(Math.max(0, Math.round(lvl.hp)), mood);
    faceCtx.clearRect(0, 0, 84, 84);
    faceCtx.drawImage(portrait, 0, 0, 84, 84);
  }
  G.miniT -= 1 / 60;
  if (G.miniT <= 0) {
    G.miniT = 0.12;
    drawMinimap();
  }
}

function drawMinimap() {
  const lvl = G.level;
  if (!lvl) return;
  const d = lvl.dungeon;
  const c = miniCtx;
  const S = 168;
  const margin = 6;
  const inner = S - margin * 2;
  const cw = inner / d.W;
  c.clearRect(0, 0, S, S);
  c.fillStyle = '#080b09'; c.fillRect(0, 0, S, S);
  for (let z = 0; z < d.H; z++) {
    for (let x = 0; x < d.W; x++) {
      if (!d.visited[z][x]) continue;
      const px = margin + x * cw, pz = margin + z * cw;
      if (d.grid[z][x] === 1) { c.fillStyle = '#2a2528'; }
      else {
        const door = d.doorAt(x, z);
        c.fillStyle = door ? (door.open ? '#8a7a3a' : '#c9a34e') : '#2c4a2c';
      }
      c.fillRect(px, pz, cw + 0.5, cw + 0.5);
    }
  }
  // items + exit
  const mark = (wx, wz, color, size = 2.5) => {
    const gx = Math.floor(wx / d.cell + d.W / 2), gz = Math.floor(wz / d.cell + d.H / 2);
    if (d.inBounds(gx, gz) && !d.visited[gz][gx]) return;
    const px = margin + ((wx / (d.W * d.cell)) + 0.5) * inner;
    const pz = margin + ((wz / (d.H * d.cell)) + 0.5) * inner;
    c.fillStyle = color;
    c.beginPath(); c.arc(px, pz, size, 0, Math.PI * 2); c.fill();
  };
  if (d.exit) mark(d.exit.x, d.exit.z, d.exit.unlocked ? '#6affc0' : '#ff5a3a', 3.5);
  for (const item of d.items) {
    if (item.taken) continue;
    if (item.type === 'key') mark(item.x, item.z, '#ffd15a', 3);
  }
  // enemies near player
  for (const e of d.enemies) {
    if (e.dead || e.deathT >= 0) continue;
    const dist = Math.hypot(e.x - lvl.pos.x, e.z - lvl.pos.z);
    if (dist < 9) mark(e.x, e.z, '#ff3a2a', 2.2);
  }
  // player
  const px = margin + ((lvl.pos.x / (d.W * d.cell)) + 0.5) * inner;
  const pz = margin + ((lvl.pos.z / (d.H * d.cell)) + 0.5) * inner;
  c.save();
  c.translate(px, pz);
  c.rotate(-lvl.yaw);
  c.fillStyle = '#eaffb0';
  c.beginPath(); c.moveTo(0, -5); c.lineTo(4, 4); c.lineTo(0, 1.5); c.lineTo(-4, 4); c.closePath(); c.fill();
  c.restore();
  c.strokeStyle = 'rgba(239,230,210,0.18)'; c.lineWidth = 1;
  c.strokeRect(0.5, 0.5, S - 1, S - 1);
}

/* ---------------- fx overlay ---------------- */
function drawFx() {
  const w = innerWidth, h = innerHeight;
  fxCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
  fxCtx.clearRect(0, 0, w, h);
  if (G.state !== 'level' || !G.level) return;
  const lvl = G.level;

  // damage vignette
  const dmg = lvl.damageFlash;
  const low = lvl.hp < 32 && !lvl.dead ? (0.12 + Math.sin(performance.now() * 0.006) * 0.05) : 0;
  const edge = Math.max(dmg * 0.55, low);
  if (edge > 0.005) {
    const g = fxCtx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.22, w / 2, h / 2, Math.max(w, h) * 0.72);
    g.addColorStop(0, 'rgba(120,0,0,0)');
    g.addColorStop(0.72, `rgba(130,10,6,${edge * 0.4})`);
    g.addColorStop(1, `rgba(190,20,10,${Math.min(0.85, edge + 0.25)})`);
    fxCtx.fillStyle = g;
    fxCtx.fillRect(0, 0, w, h);
  }
  if (lvl.completed) {
    fxCtx.fillStyle = 'rgba(180,255,210,0.18)';
    fxCtx.fillRect(0, 0, w, h);
    return;
  }

  drawWeapon(fxCtx, w, h, lvl);
  drawCrosshair(fxCtx, w, h, lvl);
}

function drawCrosshair(ctx, w, h, lvl) {
  const cx = w / 2, cy = h / 2;
  const spread = lvl.current === 'shotgun' ? 11 : lvl.current === 'chaingun' ? 8 : 5;
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(240,232,210,0.82)';
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 3;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * (spread + 3), cy + dy * (spread + 3));
    ctx.lineTo(cx + dx * (spread + 9), cy + dy * (spread + 9));
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,196,110,0.9)';
  ctx.fillRect(cx - 1, cy - 1, 2, 2);
  if (lvl.hitMarker > 0) {
    const a = Math.min(1, lvl.hitMarker / 0.16);
    ctx.strokeStyle = `rgba(255,80,50,${a})`;
    ctx.lineWidth = 2.5;
    for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * 7, cy + sy * 7);
      ctx.lineTo(cx + sx * 15, cy + sy * 15);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawWeapon(ctx, w, h, lvl) {
  const u = Math.max(0.5, Math.min(1.1, h / 1200)) * (isTouch ? 0.9 : 1);
  const bobX = Math.sin(lvl.bob) * 9 * u;
  const bobY = Math.abs(Math.cos(lvl.bob)) * 6 * u;
  const kick = lvl.kick;
  const baseY = h - (isTouch ? 52 : 44) + bobY + kick * 24 * u;
  const cx = w / 2 + bobX + kick * 6 * u;
  const w0 = lvl.current;
  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(u * 1.18, u);
  ctx.rotate(-0.018 + kick * 0.022);
  ctx.lineJoin = 'round';

  const rect = (x, y, rw, rh, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, rw, rh); };
  const poly = (pts, color) => {
    ctx.fillStyle = color; ctx.beginPath();
    pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath(); ctx.fill();
  };
  const outline = (pts, color, width = 2) => {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
    pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath(); ctx.stroke();
  };

  let muzzle = { x: 44, y: -330 };
  if (w0 === 'shotgun') {
    // dark silhouette for contrast against dark rooms
    rect(-42, -420, 92, 15, '#08070a');
    rect(-40, -412, 34, 262, '#08070a');
    rect(-3, -412, 34, 262, '#08070a');
    poly([[-68, -312], [84, -312], [96, -188], [-78, -188]], '#08070a');
    poly([[-60, -194], [96, -194], [94, -44], [-56, -44]], '#08070a');
    // twin barrels
    for (const bx of [-33, 7]) {
      rect(bx, -410, 25, 258, '#23252a');
      rect(bx + 4, -408, 7, 252, '#5c616b');
      rect(bx + 19, -408, 3, 250, '#101115');
    }
    rect(-39, -416, 82, 13, '#7a5a34');
    rect(-8, -392, 5, 232, '#111216');
    // wooden pump / forend
    poly([[-60, -304], [76, -304], [88, -196], [-70, -196]], '#5b3a24');
    for (let i = 0; i < 6; i++) rect(-52 + i * 21, -298, 8, 94, '#3f2717');
    rect(-62, -306, 152, 9, '#7a5234');
    // receiver
    poly([[-52, -186], [88, -186], [86, -50], [-46, -50]], '#35373d');
    rect(-46, -178, 128, 10, '#5a5e67');
    rect(-40, -64, 120, 8, '#1d1e22');
    // wooden stock
    poly([[-46, -56], [40, -56], [34, 76], [-12, 108], [-70, 66], [-58, 12]], '#4a2f1c');
    rect(-54, 0, 54, 8, '#6a4529');
    rect(-26, -48, 50, 9, '#2a1a10');
    // holding hands + cuffs
    poly([[-58, -258], [-16, -268], [-2, -226], [-46, -210]], '#d0a17c');
    rect(-50, -256, 40, 7, '#b98a62');
    for (let i = 0; i < 3; i++) rect(-44 + i * 10, -244, 5, 18, '#b3825c');
    poly([[-18, -126], [36, -134], [48, -78], [0, -64]], '#d0a17c');
    rect(-8, -124, 42, 7, '#b98a62');
    for (let i = 0; i < 3; i++) rect(2 + i * 11, -112, 5, 20, '#b3825c');
    rect(-76, -214, 44, 10, '#2d5f5a');
    rect(14, -64, 54, 10, '#2d5f5a');
    // spare shell
    rect(75, -74, 9, 22, '#b23a2e'); rect(75, -74, 9, 5, '#d8b15a');
    muzzle = { x: 0, y: -421 };
  } else if (w0 === 'pistol') {
    rect(24, -248, 22, 200, '#2f3238');
    rect(27, -248, 5, 194, '#565a63');
    rect(20, -60, 34, 118, '#3a3d44');
    rect(24, -56, 26, 100, '#2a2c31');
    poly([[18, 40], [52, 34], [58, 102], [26, 108]], '#33353b');
    rect(24, 52, 28, 44, '#232529');
    poly([[22, -50], [60, -60], [74, 0], [34, 12]], '#d0a17c');
    rect(30, -48, 30, 7, '#b98a62');
    rect(34, 2, 36, 9, '#2d5f5a');
    rect(28, -238, 14, 6, '#8a6a3a');
    muzzle = { x: 35, y: -252 };
  } else {
    // chaingun
    for (let i = 0; i < 4; i++) {
      const ox = 6 + i * 18;
      rect(ox, -316, 12, 214, '#2a2c31');
      rect(ox + 3, -316, 3, 208, '#5a5f68');
    }
    rect(-6, -120, 92, 104, '#35373d');
    rect(0, -112, 80, 12, '#5a5e67');
    poly([[4, -22], [78, -22], [72, 38], [10, 38]], '#2e3035');
    poly([[-40, 30], [12, 14], [26, 70], [-16, 92]], '#40312a');
    // belt
    rect(-4, 4, 86, 12, '#6a4a2a');
    for (let i = 0; i < 6; i++) rect(4 + i * 13, 0, 7, 20, '#d8b15a');
    // hand
    poly([[12, -94], [62, -100], [76, -42], [26, -30]], '#d0a17c');
    rect(20, -94, 34, 7, '#b98a62');
    rect(54, -58, 36, 9, '#2d5f5a');
    rect(2, -314, 78, 8, '#1c1d21');
    muzzle = { x: 38, y: -320 };
  }

  // muzzle flash
  if (lvl.flash > 0) {
    const f = lvl.flash / 0.075;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const mx = muzzle.x, my = muzzle.y;
    const rad = (90 + Math.random() * 50) * (0.7 + f * 0.4);
    const grad = ctx.createRadialGradient(mx, my, 0, mx, my, rad);
    grad.addColorStop(0, 'rgba(255,255,235,0.95)');
    grad.addColorStop(0.18, 'rgba(255,230,150,0.8)');
    grad.addColorStop(0.5, 'rgba(255,140,40,0.35)');
    grad.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(mx, my, rad, 0, Math.PI * 2); ctx.fill();
    // star spikes
    ctx.fillStyle = `rgba(255,244,200,${0.85 * f})`;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(Math.random() * Math.PI);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r = i % 2 === 0 ? 40 + Math.random() * 18 : 12;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
  }
  ctx.restore();
}

/* ---------------- resize / loop ---------------- */
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(DPR);
  renderer.setSize(w, h);
  camN.aspect = w / h; camN.updateProjectionMatrix();
  if (G.camL) { G.camL.aspect = w / h; G.camL.updateProjectionMatrix(); }
  fx.width = Math.floor(w * DPR);
  fx.height = Math.floor(h * DPR);
  fx.style.width = w + 'px';
  fx.style.height = h + 'px';
  faceCtx.imageSmoothingEnabled = false;
  miniCtx.imageSmoothingEnabled = false;
  mapCtx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);

function buildCurseRow() {
  for (let i = 0; i < 5; i++) {
    const span = document.createElement('span');
    span.className = 'curse-skull';
    span.textContent = '◆';
    span.title = HOUSE_LIST[i].name;
    ui.curse.appendChild(span);
  }
}

let last = performance.now();
let time = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
  last = now;
  time += dt;

  if (G.state === 'title' || G.state === 'neighborhood' || G.state === 'intro' || G.state === 'ending') {
    if (G.state === 'neighborhood') updatePlayer(dt);
    else { syncInput(); input.forward = 0; input.right = 0; sim.update(dt, false, 0); }
    if (G.state === 'intro' || G.state === 'neighborhood') {
      // keep sim on the island/lawn
      sim.group.position.set(player.pos.x, player.y, player.pos.z);
    }
    neighborhood.update(dt, time);
    updateCameraNeighborhood(dt, time);
    if (G.state === 'neighborhood') {
      neighborhood.updateMarkers(camN, innerWidth, innerHeight, player.pos);
      updateCompass();
    } else {
      ui.markers.style.display = 'none';
    }
    if (G.mapOpen) ui.markers.style.display = 'none';
    renderer.render(sceneN, camN);
  } else if (G.state === 'level') {
    syncInput();
    G.level?.update(dt, time);
    updateLevelHud();
    renderer.render(G.sceneL, G.camL);
  } else if (G.state === 'paused' || G.state === 'results' || G.state === 'death') {
    if (G.sceneL) renderer.render(G.sceneL, G.camL);
    if (G.state === 'paused') { /* frozen */ }
  }
  drawFx();
}

/* ---------------- init ---------------- */
buildCurseRow();
updateNeighborhoodHud();
ui.mute.textContent = `SOUND: ${save.muted ? 'OFF' : 'ON'}`;
neighborhood.setProgress(new Set(save.cleared), save.cleared.length >= 4);
if (save.cleared.length >= 5) {
  neighborhood.setProgress(new Set(save.cleared), true);
}
setHud('none');
resize();
ui.markers.style.display = 'none';

// Set an intentional opening camera view.
camN.position.set(Math.sin(0.5) * 34, 19, Math.cos(0.5) * 34);
camN.lookAt(0, 2.2, 0);

requestAnimationFrame(loop);

// expose a tiny debug hook for automated verification
window.__pines = {
  get state() { return G.state; },
  get level() { return G.level; },
  get player() { return player; },
  get houses() { return neighborhood.houses; },
  save,
  startGame,
  enterHouse(id) {
    const h = neighborhood.houses.find((x) => x.config.id === id);
    if (h) { showIntro(h); enterLevel(); }
  },
  interact,
  toggleMap,
  camera: camN,
  _G: G,
};
