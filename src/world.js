import * as THREE from 'three';
import {
  grassTexture, asphaltTexture, sidewalkTexture, concreteTexture, sidingTexture,
  brickTexture, roofTexture, hedgeTexture, signTexture, cloudTexture, smokeTexture,
  glowTexture, labelTexture,
} from './textures.js';

/* ============================================================
   House definitions — five lots, five Doom levels.
   ============================================================ */
export const HOUSES = {
  split: {
    id: 'split', name: 'THE SPLIT-LEVEL OF SIN', short: 'Split-Level', address: '12 CURSED COURT',
    tagline: '4 bed · 2 bath · 1 bottomless pit', difficulty: 1, seed: 1201,
    color: '#93a887', roof: '#4b352f', accent: '#ffb347', style: 'gable',
    flavor: 'The previous owners left in a hurry. Most of them.',
    enemies: 13, demonTypes: ['zombie', 'imp'], theme: {
      id: 'split', seed: 12, pattern: 'stripe', wall: ['#5e5a3d', '#7b744e'], floor: ['#2c231a', '#4a3a28'],
      door: '#5b4a36', accent: '#d8b15a', ceil: '#1a1714', fog: 0x170f0d, name: 'Avocado Hell',
    },
  },
  bunker: {
    id: 'bunker', name: 'THE BRADY BUNKER', short: 'Bunker', address: '8 PENTAGRAM PLACE',
    tagline: '5 bed · 3 bath · 0 windows', difficulty: 2, seed: 2202,
    color: '#c8bd9c', roof: '#5c2f2a', accent: '#97d05a', style: 'gable',
    flavor: 'A charming family home with original shag carpet and a sealed sub-basement.',
    enemies: 17, demonTypes: ['zombie', 'imp', 'pinky'], theme: {
      id: 'bunker', seed: 22, pattern: 'tile', wall: ['#5f6248', '#8a8a63'], floor: ['#2b2a22', '#55523c'],
      door: '#6f5a3d', accent: '#97d05a', ceil: '#15150f', fog: 0x10130d, name: 'Shag & Bone',
    },
  },
  carnage: {
    id: 'carnage', name: 'CASA DE CARNAGE', short: 'Casa', address: '13 BLOODSTONE BEND',
    tagline: '3 bed · 2 bath · infinite screaming', difficulty: 3, seed: 3303,
    color: '#b9825f', roof: '#3c2a28', accent: '#e2542b', style: 'gable',
    flavor: 'Sold as-is. The as-is includes the screaming.',
    enemies: 21, demonTypes: ['imp', 'pinky', 'zombie'], theme: {
      id: 'carnage', seed: 33, pattern: 'flesh', wall: ['#6a2c26', '#943d32'], floor: ['#2a1412', '#5a2a22'],
      door: '#4a241e', accent: '#e2542b', ceil: '#170b0a', fog: 0x1a0807, name: 'Terracotta Terror',
    },
  },
  concept: {
    id: 'concept', name: 'THE OPEN CONCEPT', short: 'Open Concept', address: '6 ABYSS AVENUE',
    tagline: '6 bed · 6 bath · no doors, only portals', difficulty: 4, seed: 4404,
    color: '#b9bcc2', roof: '#2e3038', accent: '#6fd6e0', style: 'modern',
    flavor: 'Light-filled. Airy. The air is mostly sulfur.',
    enemies: 26, demonTypes: ['imp', 'pinky', 'zombie'], theme: {
      id: 'concept', seed: 44, pattern: 'panel', wall: ['#6a6a72', '#9a9aa4'], floor: ['#252529', '#4a4a52'],
      door: '#3a3a42', accent: '#6fd6e0', ceil: '#111115', fog: 0x0c0c12, name: 'Brutalist Abyss',
    },
  },
  model: {
    id: 'model', name: 'THE MODEL HOME', short: 'Model Home', address: '1 WHISPERING PINES WAY',
    tagline: '5 bed · 5 bath · 1 homeowner’s association', difficulty: 5, seed: 5505,
    color: '#2e2a30', roof: '#1a1418', accent: '#ffb347', style: 'model',
    flavor: 'The crown jewel of the cul-de-sac. The HOA has been expecting you.',
    enemies: 30, demonTypes: ['imp', 'pinky', 'zombie', 'boss'], theme: {
      id: 'model', seed: 55, pattern: 'flesh', wall: ['#3a1a20', '#6a2a2c'], floor: ['#121014', '#2e2630'],
      door: '#2a1a1c', accent: '#ffb347', ceil: '#0a080b', fog: 0x0c0508, name: 'The Model Home',
    },
  },
};

export const HOUSE_LIST = Object.values(HOUSES);

/* ============================================================
   Sim character built from primitives.
   ============================================================ */
export function createSim({ shirt = '#4f9a8a', pants = '#2d3446', skin = '#e0b894', hair = '#2a1d16', dress = false, hat = false, scale = 1 } = {}) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  const mat = (c, rough = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0.02 });
  const shirtMat = mat(shirt);
  const pantsMat = mat(pants);
  const skinMat = mat(skin, 0.95);
  const hairMat = mat(hair, 0.9);

  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), shadowMat);
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012;
  group.add(shadow);

  const legGeo = new THREE.BoxGeometry(0.19, 0.62, 0.22);
  const legL = new THREE.Group(); legL.position.set(-0.14, 0.7, 0);
  const legR = new THREE.Group(); legR.position.set(0.14, 0.7, 0);
  for (const [leg, x] of [[legL, -0.14], [legR, 0.14]]) {
    const m = new THREE.Mesh(legGeo, pantsMat); m.position.y = -0.31; leg.add(m);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.32), mat('#1c1a1e')); shoe.position.set(0, -0.61, 0.05); leg.add(shoe);
    body.add(leg);
  }

  if (dress) {
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.42, 0.9, 8), shirtMat);
    skirt.position.y = 0.88; body.add(skirt);
  }
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.66, 0.3), shirtMat);
  torso.position.y = 1.16; body.add(torso);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 6), skinMat); neck.position.y = 1.53; body.add(neck);

  const head = new THREE.Group(); head.position.y = 1.72; body.add(head);
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.3), skinMat); head.add(face);
  const hairCap = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, 0.33), hairMat); hairCap.position.y = 0.13; head.add(hairCap);
  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, 0.08), hairMat); hairBack.position.set(0, 0.03, -0.16); head.add(hairBack);
  if (dress) {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), hairMat); bun.position.set(0, 0.14, -0.2); head.add(bun);
  }
  if (hat) {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.04, 16), hairMat); brim.position.y = 0.22; head.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.22, 12), hairMat); crown.position.y = 0.33; head.add(crown);
  }
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x16100d });
  for (const x of [-0.08, 0.08]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.055, 0.02), eyeMat);
    eye.position.set(x, 0.02, 0.156); head.add(eye);
  }

  const armGeo = new THREE.BoxGeometry(0.15, 0.55, 0.17);
  const armL = new THREE.Group(); armL.position.set(-0.35, 1.4, 0);
  const armR = new THREE.Group(); armR.position.set(0.35, 1.4, 0);
  for (const [arm, x] of [[armL, -0.35], [armR, 0.35]]) {
    const a = new THREE.Mesh(armGeo, dress ? shirtMat : skinMat); a.position.y = -0.27; arm.add(a);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.18), skinMat); hand.position.y = -0.57; arm.add(hand);
    body.add(arm);
  }

  const plumbGeo = new THREE.OctahedronGeometry(0.19, 0);
  const plumbMat = new THREE.MeshStandardMaterial({
    color: 0x8bff5a, emissive: 0x3ddb2a, emissiveIntensity: 1.6, roughness: 0.3, metalness: 0.1,
  });
  const plumbob = new THREE.Mesh(plumbGeo, plumbMat);
  plumbob.position.y = 2.22; plumbob.scale.y = 1.5;
  group.add(plumbob);
  const plumbGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture('#8bff5a'), color: 0x9dff6a, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  plumbGlow.scale.set(0.85, 0.85, 1); plumbGlow.position.y = 2.22; group.add(plumbGlow);

  group.scale.setScalar(scale);
  let phase = 0;
  return {
    group, plumbob,
    update(dt, moving = false, speed = 1) {
      phase += dt * (moving ? 9.5 * Math.min(1.4, speed) : 2);
      const swing = moving ? Math.sin(phase) * 0.62 : Math.sin(phase) * 0.04;
      legL.rotation.x = swing; legR.rotation.x = -swing;
      armL.rotation.x = -swing * 0.8; armR.rotation.x = swing * 0.8;
      body.position.y = moving ? Math.abs(Math.sin(phase)) * 0.045 : Math.sin(phase) * 0.012;
      plumbob.rotation.y += dt * 2.4;
      plumbob.position.y = 2.22 + Math.sin(phase * 0.5) * 0.05;
      plumbGlow.position.y = plumbob.position.y;
    },
  };
}

/* ============================================================
   Helpers
   ============================================================ */
function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.02, ...opts });
}
function basic(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color, ...opts });
}

function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  return m;
}

function gableRoof(w, d, eave, peak, material) {
  const geo = new THREE.BufferGeometry();
  const hw = w / 2, hd = d / 2;
  const positions = [
    // front slope
    -hw, eave, hd,  hw, eave, hd,  hw, peak, 0,
    -hw, eave, hd,  hw, peak, 0,  -hw, peak, 0,
    // back slope
    hw, eave, -hd,  -hw, eave, -hd,  -hw, peak, 0,
    hw, eave, -hd,  -hw, peak, 0,  hw, peak, 0,
    // gable left
    -hw, eave, -hd,  -hw, eave, hd,  -hw, peak, 0,
    // gable right
    hw, eave, hd,  hw, eave, -hd,  hw, peak, 0,
  ];
  const uvs = [];
  for (let i = 0; i < positions.length; i += 3) {
    uvs.push((positions[i] + hw) / w, (positions[i + 2] + hd) / d);
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.material.side = THREE.DoubleSide;
  return m;
}

/* ============================================================
   The neighborhood
   ============================================================ */
export class Neighborhood {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.colliders = [];
    this.houses = [];
    this.markers = [];
    this.clouds = [];
    this.smoke = [];
    this.lamps = [];
    this.time = 0;
    this.npcMarker = null;
    this.cleared = new Set();
    this.modelUnlocked = false;
    this.build();
  }

  build() {
    const scene = this.scene;
    scene.background = new THREE.Color(0x2a1d31);
    scene.fog = new THREE.Fog(0x3a2530, 46, 122);

    this.hemi = new THREE.HemisphereLight(0xffd2b0, 0x2c3320, 1.15);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffa768, 2.1);
    this.sun.position.set(-30, 42, 24);
    scene.add(this.sun);
    this.fill = new THREE.DirectionalLight(0x6f86c9, 0.5);
    this.fill.position.set(24, 18, -30);
    scene.add(this.fill);
    scene.add(new THREE.AmbientLight(0x4a3648, 0.55));

    this.buildSky();
    this.buildGround();
    this.buildRoad();
    this.buildIsland();
    this.buildHouses();
    this.buildProps();
    this.buildNpc();
    this.buildTrees();
    this.setProgress(new Set(), false);
  }

  buildSky() {
    const geo = new THREE.SphereGeometry(150, 32, 16);
    this.skyUniforms = {
      top: { value: new THREE.Color(0x241736) },
      bottom: { value: new THREE.Color(0xff8b54) },
      offset: { value: 0.12 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 top; uniform vec3 bottom; uniform float offset;
        varying vec3 vWorld;
        void main() {
          float h = normalize(vWorld).y;
          float t = pow(clamp((h + offset) / (1.0 + offset), 0.0, 1.0), 0.62);
          vec3 col = mix(bottom, top, t);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.sky = new THREE.Mesh(geo, mat);
    this.group.add(this.sky);

    this.sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('#ffd0a0'), color: 0xffc08a, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    this.sunSprite.scale.set(46, 46, 1);
    this.sunSprite.position.set(-58, 34, 88);
    this.group.add(this.sunSprite);

    for (let i = 0; i < 12; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: cloudTexture(), color: 0xffcfb0, transparent: true, opacity: 0.5,
        depthWrite: false, fog: false,
      }));
      const a = (i / 12) * Math.PI * 2 + Math.random() * 0.4;
      const r = 55 + Math.random() * 35;
      sp.position.set(Math.cos(a) * r, 26 + Math.random() * 16, Math.sin(a) * r);
      sp.scale.set(34 + Math.random() * 26, 16 + Math.random() * 10, 1);
      sp.userData.speed = 0.25 + Math.random() * 0.4;
      this.clouds.push(sp); this.group.add(sp);
    }

    // distant hills
    const hillMat = new THREE.MeshBasicMaterial({ color: 0x201a28, fog: true });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r = 92 + Math.random() * 20;
      const h = 6 + Math.random() * 10;
      const hill = new THREE.Mesh(new THREE.ConeGeometry(16 + Math.random() * 12, h, 5), hillMat);
      hill.position.set(Math.cos(a) * r, h / 2 - 1, Math.sin(a) * r);
      hill.rotation.y = Math.random() * 3;
      this.group.add(hill);
    }
  }

  buildGround() {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), new THREE.MeshStandardMaterial({
      map: grassTexture(), roughness: 1, color: 0x9aa77e,
    }));
    g.rotation.x = -Math.PI / 2;
    this.group.add(g);

    // subtle darker lot ground circles
    for (const h of HOUSE_LIST) {
      const a = this.houseAngle(h.id);
      const r = 23;
      const lot = new THREE.Mesh(new THREE.CircleGeometry(8.2, 32), new THREE.MeshStandardMaterial({
        map: grassTexture(), color: h.id === 'model' ? 0x6f6a58 : 0x8a9a6d, roughness: 1,
      }));
      lot.rotation.x = -Math.PI / 2;
      lot.position.set(Math.sin(a) * r, 0.012, Math.cos(a) * r);
      this.group.add(lot);
    }
  }

  houseAngle(id) {
    const idx = HOUSE_LIST.findIndex((h) => h.id === id);
    return (idx / HOUSE_LIST.length) * Math.PI * 2;
  }

  buildRoad() {
    const ring = new THREE.Mesh(new THREE.RingGeometry(10.4, 15.2, 72, 1), new THREE.MeshStandardMaterial({
      map: asphaltTexture(), color: 0x8f8f96, roughness: 1,
    }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02;
    this.group.add(ring);

    const walk = new THREE.Mesh(new THREE.RingGeometry(15.2, 16.7, 72, 1), new THREE.MeshStandardMaterial({
      map: sidewalkTexture(), color: 0xb5afa0, roughness: 1,
    }));
    walk.rotation.x = -Math.PI / 2; walk.position.y = 0.016;
    this.group.add(walk);

    // dashed center line
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xd8c98f });
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const dash = mesh(new THREE.BoxGeometry(0.14, 0.01, 1.1), dashMat, Math.sin(a) * 12.8, 0.032, Math.cos(a) * 12.8);
      dash.rotation.y = a;
      this.group.add(dash);
    }

    // driveways + walkways per house
    for (const h of HOUSE_LIST) {
      const a = this.houseAngle(h.id);
      const dir = new THREE.Vector3(-Math.sin(a), 0, -Math.cos(a));
      const drive = mesh(new THREE.PlaneGeometry(4.6, 3.4), new THREE.MeshStandardMaterial({
        map: concreteTexture('#8f8a7e'), color: 0x9d9a8e, roughness: 1,
      }), Math.sin(a) * 17.2, 0.026, Math.cos(a) * 17.2);
      drive.rotation.x = -Math.PI / 2; drive.rotation.z = -a;
      this.group.add(drive);
      const walkway = mesh(new THREE.PlaneGeometry(1.4, 2.2), new THREE.MeshStandardMaterial({
        map: sidewalkTexture(), color: 0xaaa494, roughness: 1,
      }), Math.sin(a) * 19.6, 0.028, Math.cos(a) * 19.6);
      walkway.rotation.x = -Math.PI / 2; walkway.rotation.z = -a;
      this.group.add(walkway);
    }
  }

  buildIsland() {
    const curb = new THREE.Mesh(new THREE.CylinderGeometry(10.35, 10.55, 0.28, 48), new THREE.MeshStandardMaterial({
      map: concreteTexture('#8a8578'), color: 0xa9a294, roughness: 1,
    }));
    curb.position.y = 0.14;
    this.group.add(curb);
    const lawn = new THREE.Mesh(new THREE.CircleGeometry(10.2, 48), new THREE.MeshStandardMaterial({
      map: grassTexture(), color: 0x93a577, roughness: 1,
    }));
    lawn.rotation.x = -Math.PI / 2; lawn.position.y = 0.29;
    this.group.add(lawn);

    // monument sign
    const signGroup = new THREE.Group();
    signGroup.position.set(0, 0, 0.4);
    const base = mesh(new THREE.BoxGeometry(5.4, 0.5, 0.9), new THREE.MeshStandardMaterial({
      map: brickTexture('#6a5d4d', '#8b8271'), roughness: 1,
    }), 0, 0.55, 0);
    signGroup.add(base);
    const board = mesh(new THREE.BoxGeometry(4.9, 1.5, 0.24), mat('#20301f'), 0, 1.55, 0);
    signGroup.add(board);
    const face = mesh(new THREE.PlaneGeometry(4.5, 1.24), new THREE.MeshBasicMaterial({
      map: signTexture({ lines: ['WHISPERING PINES'], bg: '#1d2c20', fg: '#f0e8d3', accent: '#c9a34e', size: 30, sub: 'EST. 1974 · POP. 0 · HOA ACTIVE' }),
    }), 0, 1.55, 0.13);
    signGroup.add(face);
    for (const x of [-2.1, 2.1]) {
      const post = mesh(new THREE.BoxGeometry(0.18, 1.5, 0.18), mat('#3a2a1e'), x, 0.75, -0.2);
      signGroup.add(post);
    }
    this.group.add(signGroup);
    this.colliders.push({ kind: 'box', x: 0, z: 0.4, hw: 2.7, hd: 0.6, rot: 0 });

    // benches
    for (const side of [-1, 1]) {
      const b = new THREE.Group();
      const seat = mesh(new THREE.BoxGeometry(2.2, 0.16, 0.6), mat('#6a4a30'), 0, 0.55, 0); b.add(seat);
      const back = mesh(new THREE.BoxGeometry(2.2, 0.55, 0.14), mat('#6a4a30'), 0, 0.86, -0.26); b.add(back);
      for (const x of [-0.85, 0.85]) { const leg = mesh(new THREE.BoxGeometry(0.12, 0.55, 0.5), mat('#2a2520'), x, 0.28, 0); b.add(leg); }
      b.position.set(side * 6.3, 0.29, 2.4); b.rotation.y = side * -0.7;
      this.group.add(b);
      this.colliders.push({ kind: 'box', x: b.position.x, z: b.position.z, hw: 1.2, hd: 0.4, rot: b.rotation.y });
    }

    // flower beds
    const flowerColors = [0xff7a8a, 0xffd36b, 0xc9a0ff];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const r = 8.7 + Math.random() * 1.1;
      const stem = mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.28, 4), mat('#3a5a28'), Math.sin(a) * r, 0.42, Math.cos(a) * r);
      this.group.add(stem);
      const bloom = mesh(new THREE.IcosahedronGeometry(0.09, 0), basic(flowerColors[i % 3]), Math.sin(a) * r, 0.58, Math.cos(a) * r);
      this.group.add(bloom);
    }
  }

  buildHouse(config, index) {
    const a = this.houseAngle(config.id);
    const R = 23;
    const center = new THREE.Vector3(Math.sin(a) * R, 0, Math.cos(a) * R);
    const rot = a + Math.PI;
    const g = new THREE.Group();
    g.position.copy(center);
    g.rotation.y = rot;
    this.group.add(g);

    const isModel = config.style === 'model';
    const isModern = config.style === 'modern';
    const w = isModel ? 10.5 : 9.6;
    const d = isModel ? 8.2 : 7.2;
    const wallH = isModel ? 4.1 : 3.5;

    const siding = new THREE.MeshStandardMaterial({
      map: sidingTexture(config.color), color: 0xffffff, roughness: 0.92,
    });
    const foundation = new THREE.MeshStandardMaterial({
      map: brickTexture(isModel ? '#3a2e2c' : '#6d5b49', '#8a8070'), roughness: 1,
    });

    const found = mesh(new THREE.BoxGeometry(w + 0.35, 0.5, d + 0.35), foundation, 0, 0.25, 0);
    g.add(found);
    const body = mesh(new THREE.BoxGeometry(w, wallH, d), siding, 0, 0.5 + wallH / 2, 0);
    g.add(body);

    // trim
    const trimMat = mat(isModern ? '#3a3a40' : '#d8d1bd', { roughness: 0.8 });
    const trim = mesh(new THREE.BoxGeometry(w + 0.12, 0.16, d + 0.12), trimMat, 0, 0.5 + 0.08, 0);
    g.add(trim);

    if (isModel) {
      const upper = mesh(new THREE.BoxGeometry(w * 0.66, 2.6, d * 0.62), siding, 0, 0.5 + wallH + 1.3, -0.4);
      g.add(upper);
      const roofSlab = mesh(new THREE.BoxGeometry(w * 0.7, 0.3, d * 0.66), mat('#1a1418'), 0, 0.5 + wallH + 2.65, -0.4);
      g.add(roofSlab);
      // tall windows on upper
      for (const x of [-1.6, 0, 1.6]) {
        const wm = new THREE.MeshBasicMaterial({ color: 0x4a1415 });
        const wm2 = new THREE.MeshBasicMaterial({ color: 0xffb347 });
        const win = mesh(new THREE.PlaneGeometry(0.7, 1.5), wm, x, 0.5 + wallH + 1.35, d * 0.31 - 0.38);
        g.add(win);
        const frame = mesh(new THREE.BoxGeometry(0.82, 1.62, 0.06), mat('#2a1a1c'), x, 0.5 + wallH + 1.35, d * 0.31 - 0.44);
        g.add(frame);
        win.position.z += 0.04;
      }
    }

    // roof
    const roofMat = new THREE.MeshStandardMaterial({ map: roofTexture(config.roof), color: 0xffffff, roughness: 0.95 });
    if (isModern) {
      const slab = mesh(new THREE.BoxGeometry(w + 1.1, 0.26, d + 1.1), roofMat, 0, 0.5 + wallH + 0.13, 0);
      g.add(slab);
      const parapet = mesh(new THREE.BoxGeometry(w + 1.2, 0.34, 0.3), mat('#2e3038'), 0, 0.5 + wallH + 0.38, d / 2 + 0.4);
      g.add(parapet);
      const parapet2 = parapet.clone(); parapet2.position.z = -d / 2 - 0.4; g.add(parapet2);
    } else if (!isModel) {
      const roof = gableRoof(w + 1.2, d + 1.2, 0.5 + wallH, 0.5 + wallH + 1.9, roofMat);
      g.add(roof);
      const ridge = mesh(new THREE.CylinderGeometry(0.1, 0.1, w + 1.4, 6), mat('#2a2020'), 0, 0.5 + wallH + 1.9, 0);
      ridge.rotation.z = Math.PI / 2; g.add(ridge);
    }

    // chimney
    if (!isModern) {
      const chimney = mesh(new THREE.BoxGeometry(0.8, 2.0, 0.8), foundation, w * 0.28, 0.5 + wallH + 0.9, -d * 0.18);
      g.add(chimney);
      const cap = mesh(new THREE.BoxGeometry(0.95, 0.14, 0.95), mat('#3a2c26'), w * 0.28, 0.5 + wallH + 1.95, -d * 0.18);
      g.add(cap);
    }

    // door
    const doorMat = new THREE.MeshStandardMaterial({ map: null, color: 0x3a2a20, roughness: 0.7, metalness: 0.15 });
    const door = mesh(new THREE.BoxGeometry(1.25, 2.35, 0.12), doorMat, 0, 1.18, d / 2 + 0.06);
    door.material.color.set(config.accent);
    door.material.color.multiplyScalar(0.5);
    g.add(door);
    const doorFrame = mesh(new THREE.BoxGeometry(1.55, 2.6, 0.16), trimMat, 0, 1.3, d / 2 + 0.01);
    g.add(doorFrame);
    door.renderOrder = 1;
    // door handle
    const handle = mesh(new THREE.SphereGeometry(0.055, 8, 6), mat('#d8b15a', { metalness: 0.6, roughness: 0.3 }), 0.42, 1.15, d / 2 + 0.14);
    g.add(handle);

    // porch
    const porch = mesh(new THREE.BoxGeometry(3.2, 0.18, 1.5), foundation, 0, 0.12, d / 2 + 0.7);
    g.add(porch);
    const step = mesh(new THREE.BoxGeometry(2.4, 0.12, 0.5), foundation, 0, 0.06, d / 2 + 1.65);
    g.add(step);
    if (!isModern) {
      for (const x of [-1.4, 1.4]) {
        const post = mesh(new THREE.BoxGeometry(0.14, 2.5, 0.14), trimMat, x, 1.3, d / 2 + 1.3);
        g.add(post);
      }
      const porchRoof = gableRoof(3.6, 2.0, 0.5 + 2.4, 0.5 + 2.9, roofMat);
      porchRoof.position.z = d / 2 + 0.55;
      g.add(porchRoof);
    }

    // windows
    const windowMats = [];
    const glowSprites = [];
    const addWindow = (x, y, z, ry, sw = 1.55, sh = 1.25) => {
      const wm = new THREE.MeshBasicMaterial({ color: 0x6a1a16 });
      windowMats.push(wm);
      const pane = mesh(new THREE.PlaneGeometry(sw, sh), wm, x, y, z);
      pane.rotation.y = ry;
      g.add(pane);
      const frame = mesh(new THREE.BoxGeometry(sw + 0.18, sh + 0.18, 0.08), trimMat, x, y, z - 0.02);
      frame.rotation.y = ry;
      g.add(frame);
      // mullions
      const mv = mesh(new THREE.BoxGeometry(0.08, sh, 0.07), trimMat, x, y, z + 0.02);
      mv.rotation.y = ry; g.add(mv);
      const mh = mesh(new THREE.BoxGeometry(sw, 0.07, 0.07), trimMat, x, y, z + 0.02);
      mh.rotation.y = ry; g.add(mh);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture('#ff5a3a'), color: 0xff5a3a, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      glow.scale.set(2.2, 1.9, 1);
      glow.position.set(x + Math.sin(ry) * 0.1, y, z + Math.cos(ry) * 0.1);
      g.add(glow);
      glowSprites.push(glow);
    };
    addWindow(-2.6, 2.15, d / 2 + 0.045, 0, 1.5, 1.2);
    addWindow(2.6, 2.15, d / 2 + 0.045, 0, 1.5, 1.2);
    addWindow(w / 2 + 0.045, 2.1, 0.6, Math.PI / 2, 1.5, 1.2);
    addWindow(-w / 2 - 0.045, 2.1, -1.2, Math.PI / 2, 1.3, 1.15);

    // house number plaque
    const plaque = mesh(new THREE.PlaneGeometry(0.75, 0.3), new THREE.MeshBasicMaterial({
      map: labelTexture(config.address.split(' ')[0], { fg: '#e8dcc0', size: 40 }),
      transparent: true,
    }), 1.55, 2.65, d / 2 + 0.08);
    g.add(plaque);

    // lawn sign
    const signGroup = new THREE.Group();
    signGroup.position.set(-3.6, 0, d / 2 + 2.9);
    const post = mesh(new THREE.BoxGeometry(0.1, 1.15, 0.1), mat('#3a2a1e'), 0, 0.575, 0);
    signGroup.add(post);
    const signMesh = mesh(new THREE.PlaneGeometry(2.55, 1.05), new THREE.MeshBasicMaterial({
      map: signTexture({ lines: ['OPEN HOUSE'], bg: '#1c2b1f', fg: '#f0e8d3', accent: '#ffb347', size: 34, sub: 'SERIOUSLY. COME IN.' }),
      side: THREE.FrontSide,
    }), 0, 1.42, 0);
    signGroup.add(signMesh);
    g.add(signGroup);

    // mailbox
    const mail = new THREE.Group();
    mail.position.set(3.5, 0, d / 2 + 2.4);
    const mpost = mesh(new THREE.BoxGeometry(0.1, 1.1, 0.1), mat('#4a3a2a'), 0, 0.55, 0); mail.add(mpost);
    const mbox = mesh(new THREE.BoxGeometry(0.42, 0.32, 0.62), mat('#3a3a40', { metalness: 0.3 }), 0, 1.2, 0); mail.add(mbox);
    const flag = mesh(new THREE.BoxGeometry(0.04, 0.3, 0.06), basic('#c93a2a'), 0.24, 1.32, 0); mail.add(flag);
    g.add(mail);

    // flamingo
    if (!isModel) {
      const fl = new THREE.Group();
      fl.position.set(3.8, 0, d / 2 + 3.6);
      const bodyF = mesh(new THREE.SphereGeometry(0.22, 8, 6), basic('#ff8fa3'), 0, 0.72, 0);
      bodyF.scale.set(0.8, 1.2, 0.7); fl.add(bodyF);
      const neck = mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.6, 5), basic('#ff8fa3'), 0.1, 1.0, 0);
      neck.rotation.z = -0.4; fl.add(neck);
      const headF = mesh(new THREE.SphereGeometry(0.1, 8, 6), basic('#ff8fa3'), 0.22, 1.3, 0); fl.add(headF);
      const beak = mesh(new THREE.ConeGeometry(0.05, 0.18, 4), basic('#2a2520'), 0.32, 1.29, 0);
      beak.rotation.z = -Math.PI / 2; fl.add(beak);
      for (const x of [-0.05, 0.05]) {
        const leg = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 4), basic('#3a3a40'), x, 0.3, 0);
        fl.add(leg);
      }
      fl.rotation.y = -0.4;
      g.add(fl);
    }

    // hedges
    const hedgeMat = new THREE.MeshStandardMaterial({ map: hedgeTexture(), color: 0x6f8a4e, roughness: 1 });
    if (!isModern) {
      for (const x of [-w / 2 - 1.3, w / 2 + 1.3]) {
        const hedge = mesh(new THREE.BoxGeometry(1.2, 1.15, 5.5), hedgeMat, x, 0.58, -1.5);
        g.add(hedge);
      }
    }

    // banner for model home
    if (isModel) {
      const banner = mesh(new THREE.PlaneGeometry(3.2, 0.7), new THREE.MeshBasicMaterial({
        map: signTexture({ lines: ['THE MODEL HOME'], bg: '#2a1214', fg: '#ffd9a1', accent: '#ffb347', size: 30, sub: 'BY APPOINTMENT ONLY' }),
        side: THREE.DoubleSide,
      }), 0, 3.1, d / 2 + 1.35);
      g.add(banner);
    }

    // door glow sprite
    const doorGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('#ff5a3a'), color: 0xff4a2a, transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    doorGlow.scale.set(2.6, 2.6, 1);
    doorGlow.position.set(0, 1.8, d / 2 + 0.5);
    g.add(doorGlow);

    // chimney smoke
    const smokeSprites = [];
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: smokeTexture(), color: 0x6f6466, transparent: true, opacity: 0.0,
        depthWrite: false,
      }));
      sp.position.set(w * 0.28, 0.5 + wallH + 2.1 + i * 0.7, -d * 0.18);
      sp.userData.phase = i * 0.6;
      sp.scale.set(1.2 + i * 0.5, 1.2 + i * 0.5, 1);
      g.add(sp); smokeSprites.push(sp);
    }

    // collider (oriented box)
    this.colliders.push({ kind: 'box', x: center.x, z: center.z, hw: w / 2 + 0.35, hd: d / 2 + 1.0, rot });

    // marker
    const marker = document.createElement('div');
    marker.className = 'marker';
    marker.innerHTML = `<div class="mk-pin"></div><div class="mk-line"></div>`;
    document.getElementById('markers').appendChild(marker);

    const dir = new THREE.Vector3(-Math.sin(a), 0, -Math.cos(a));
    const doorWorld = new THREE.Vector3(center.x + dir.x * (d / 2 + 0.2), 0, center.z + dir.z * (d / 2 + 0.2));
    const entrance = new THREE.Vector3(center.x + dir.x * (d / 2 + 1.9), 0, center.z + dir.z * (d / 2 + 1.9));

    const house = {
      config, index, group: g, center, angle: a, rot, marker, doorWorld, entrance,
      windowMats, glowSprites, doorGlow, smokeSprites, signMesh, signGroup,
      collider: this.colliders[this.colliders.length - 1],
      cleared: false, locked: config.id === 'model',
      bodyHeight: wallH, width: w, depth: d,
    };
    this.houses.push(house);

    // smoke base positions
    smokeSprites.forEach((sp) => {
      sp.userData.baseY = sp.position.y;
      sp.userData.baseX = sp.position.x;
      sp.userData.baseZ = sp.position.z;
      this.smoke.push(sp);
    });

    return house;
  }

  buildHouses() {
    HOUSE_LIST.forEach((h, i) => this.buildHouse(h, i));
  }

  buildNpc() {
    this.npc = createSim({ shirt: '#1e1a26', pants: '#1e1a26', skin: '#cfd2c2', hair: '#6a6672', dress: true, hat: true, scale: 1.02 });
    this.npc.group.position.set(-3.4, 0.3, 7.4);
    this.npc.group.rotation.y = 2.0;
    this.group.add(this.npc.group);

    const bubble = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('#ffb347'), color: 0xffb347, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    bubble.scale.set(1.1, 1.1, 1); bubble.position.y = 2.8;
    this.npc.group.add(bubble);
    this.npcBubble = bubble;

    this.npcMarker = document.createElement('div');
    this.npcMarker.className = 'marker npc';
    this.npcMarker.innerHTML = `<div class="mk-pin"><b>◆</b> MORTICIA · REALTOR</div>`;
    document.getElementById('markers').appendChild(this.npcMarker);
    this.markers.push(this.npcMarker);
  }

  buildTrees() {
    const leafMats = [0x2f4a25, 0x39562b, 0x2a3f22].map((c) => mat(c, { roughness: 1 }));
    const trunkMat = mat('#4a3626', { roughness: 1 });
    const positions = [];
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + (Math.random() - 0.5) * 0.16;
      const r = 30 + Math.random() * 14;
      if (Math.abs(a) < 0.02) continue;
      positions.push([Math.sin(a) * r, Math.cos(a) * r]);
    }
    positions.push([-9, 30], [9, 33], [-28, -12], [27, -8], [-15, -24], [16, -27]);

    for (const [x, z] of positions) {
      const s = 0.8 + Math.random() * 0.8;
      const tree = new THREE.Group();
      tree.position.set(x, 0, z);
      const trunk = mesh(new THREE.CylinderGeometry(0.22 * s, 0.35 * s, 2.6 * s, 6), trunkMat, 0, 1.3 * s, 0);
      tree.add(trunk);
      const dead = Math.random() < 0.22;
      if (dead) {
        for (let i = 0; i < 4; i++) {
          const branch = mesh(new THREE.CylinderGeometry(0.06 * s, 0.12 * s, 1.6 * s, 4), trunkMat, 0, 2.4 * s, 0);
          branch.rotation.z = (Math.random() - 0.5) * 1.8; branch.rotation.y = Math.random() * 3;
          branch.position.x = (Math.random() - 0.5) * 0.5 * s;
          tree.add(branch);
        }
      } else {
        for (let i = 0; i < 3; i++) {
          const foliage = mesh(new THREE.IcosahedronGeometry((1.35 - i * 0.22) * s, 0), leafMats[i % 3],
            (Math.random() - 0.5) * 0.6 * s, (2.6 + i * 0.85) * s, (Math.random() - 0.5) * 0.6 * s);
          foliage.rotation.set(Math.random(), Math.random(), Math.random());
          tree.add(foliage);
        }
      }
      this.group.add(tree);
      this.colliders.push({ kind: 'circle', x, z, r: 0.55 * s });
    }

    // lot shrubs
    const shrubMat = new THREE.MeshStandardMaterial({ map: hedgeTexture(), color: 0x5f7a45, roughness: 1 });
    for (const h of HOUSE_LIST) {
      const a = this.houseAngle(h.id);
      for (const off of [-5.8, 5.8]) {
        const bx = Math.sin(a) * 23 + Math.cos(a) * off;
        const bz = Math.cos(a) * 23 - Math.sin(a) * off;
        const shrub = mesh(new THREE.IcosahedronGeometry(0.8, 1), shrubMat, bx, 0.7, bz);
        shrub.scale.set(1, 0.8, 1);
        this.group.add(shrub);
      }
    }
  }

  buildProps() {
    // street lamps
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      const x = Math.sin(a) * 15.9, z = Math.cos(a) * 15.9;
      const lamp = new THREE.Group();
      lamp.position.set(x, 0, z);
      lamp.userData.angle = a;
      const pole = mesh(new THREE.CylinderGeometry(0.09, 0.14, 4.6, 6), mat('#26282c', { metalness: 0.5, roughness: 0.5 }), 0, 2.3, 0);
      lamp.add(pole);
      const arm = mesh(new THREE.BoxGeometry(0.1, 0.1, 0.9), mat('#26282c'), 0, 4.55, -0.42);
      lamp.add(arm);
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffc177 });
      const bulb = mesh(new THREE.SphereGeometry(0.22, 8, 6), bulbMat, 0, 4.5, -0.85);
      lamp.add(bulb);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture('#ffb347'), color: 0xffb347, transparent: true, opacity: 0.8,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      glow.scale.set(4.5, 4.5, 1); glow.position.set(0, 4.5, -0.85);
      lamp.add(glow);
      lamp.rotation.y = a + Math.PI;
      this.group.add(lamp);
      this.lamps.push({ lamp, glow, bulbMat });
      this.colliders.push({ kind: 'circle', x, z, r: 0.35 });
    }

    // parked car
    const car = this.makeCar('#7a2d2a');
    car.position.set(Math.sin(0.9) * 17.9, 0.03, Math.cos(0.9) * 17.9);
    car.rotation.y = 0.9 + Math.PI + 0.1;
    this.group.add(car);
    this.colliders.push({ kind: 'box', x: car.position.x, z: car.position.z, hw: 1.15, hd: 2.2, rot: car.rotation.y });

    // hydrant
    const hyd = new THREE.Group();
    hyd.position.set(15.9, 0.02, -8.5);
    const hbody = mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.55, 8), basic('#b23a2e'), 0, 0.3, 0); hyd.add(hbody);
    const htop = mesh(new THREE.SphereGeometry(0.17, 8, 6), basic('#c94737'), 0, 0.62, 0); hyd.add(htop);
    for (const x of [-0.2, 0.2]) { const nub = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 6), basic('#8f2a22'), x, 0.38, 0); nub.rotation.z = Math.PI / 2; hyd.add(nub); }
    this.group.add(hyd);

    // trash bins at a couple houses
    for (const idx of [1, 3]) {
      const h = HOUSE_LIST[idx]; const a = this.houseAngle(h.id);
      const bin = new THREE.Group();
      bin.position.set(Math.sin(a) * 18.6 + Math.cos(a) * 3.4, 0.02, Math.cos(a) * 18.6 - Math.sin(a) * 3.4);
      const b = mesh(new THREE.BoxGeometry(0.65, 0.95, 0.6), mat('#2f4a35'), 0, 0.5, 0); bin.add(b);
      const lid = mesh(new THREE.BoxGeometry(0.72, 0.1, 0.66), mat('#3a5a40'), 0, 1.0, 0); bin.add(lid);
      bin.rotation.y = a; this.group.add(bin);
    }

    // basketball hoop near one house
    const hoop = new THREE.Group();
    const ha = this.houseAngle('bunker');
    hoop.position.set(Math.sin(ha) * 17.4 + Math.cos(ha) * 3.6, 0, Math.cos(ha) * 17.4 - Math.sin(ha) * 3.6);
    hoop.rotation.y = ha + Math.PI;
    const hp = mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.4, 6), mat('#3a3a40'), 0, 1.7, 0); hoop.add(hp);
    const board = mesh(new THREE.BoxGeometry(1.2, 0.75, 0.08), basic('#d8d2c0'), 0, 3.3, 0.2); hoop.add(board);
    const rim = mesh(new THREE.TorusGeometry(0.28, 0.03, 6, 12), basic('#e2542b'), 0, 3.05, 0.5); rim.rotation.x = Math.PI / 2; hoop.add(rim);
    this.group.add(hoop); this.colliders.push({ kind: 'circle', x: hoop.position.x, z: hoop.position.z, r: 0.3 });
  }

  makeCar(color) {
    const car = new THREE.Group();
    const bodyMat = mat(color, { roughness: 0.5, metalness: 0.35 });
    const glassMat = mat('#2a3038', { roughness: 0.2, metalness: 0.6 });
    const body = mesh(new THREE.BoxGeometry(2.1, 0.55, 4.2), bodyMat, 0, 0.62, 0); car.add(body);
    const cabin = mesh(new THREE.BoxGeometry(1.86, 0.6, 2.2), bodyMat, 0, 1.12, -0.15); car.add(cabin);
    const glass = mesh(new THREE.BoxGeometry(1.88, 0.42, 2.0), glassMat, 0, 1.16, -0.15); car.add(glass);
    const wheelMat = mat('#16161a');
    for (const x of [-1.02, 1.02]) for (const z of [-1.35, 1.35]) {
      const wheel = mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.24, 10), wheelMat, x, 0.36, z);
      wheel.rotation.z = Math.PI / 2; car.add(wheel);
    }
    for (const x of [-0.65, 0.65]) {
      const light = mesh(new THREE.BoxGeometry(0.4, 0.16, 0.06), basic('#ffe0a0'), x, 0.67, 2.11); car.add(light);
    }
    return car;
  }

  /* ---------------- state ---------------- */
  setProgress(cleared, modelUnlocked) {
    this.cleared = new Set(cleared);
    this.modelUnlocked = modelUnlocked;
    for (const h of this.houses) {
      const isCleared = this.cleared.has(h.config.id);
      const locked = h.config.id === 'model' && !modelUnlocked;
      h.cleared = isCleared; h.locked = locked;
      this.refreshHouse(h);
    }
    this.refreshMood();
  }

  refreshHouse(h) {
    const cursed = !h.cleared;
    const winColor = h.locked ? 0x22242c : h.cleared ? 0xffca7a : 0x8a1f19;
    const glowColor = h.locked ? 0x3a4a5a : h.cleared ? 0xffc36b : 0xff4a2a;
    for (const wm of h.windowMats) wm.color.setHex(winColor);
    for (const sp of h.glowSprites) {
      sp.material.color.setHex(glowColor);
      sp.material.opacity = h.locked ? 0.12 : h.cleared ? 0.5 : 0.65;
    }
    h.doorGlow.material.color.setHex(glowColor);
    h.doorGlow.material.opacity = h.locked ? 0.1 : h.cleared ? 0.5 : 0.7;
    for (const sm of h.smokeSprites) sm.visible = cursed && !h.locked;

    let signArgs;
    if (h.locked) signArgs = { lines: ['MODEL HOME'], bg: '#191a1e', fg: '#8f8f96', accent: '#6f7784', size: 26, sub: 'CLEAR 4 PROPERTIES' };
    else if (h.cleared) signArgs = { lines: ['SOLD'], bg: '#1c2b1f', fg: '#dff5c0', accent: '#97d05a', size: 46, sub: 'DEMONS EVICTED' };
    else signArgs = { lines: ['OPEN HOUSE'], bg: '#2a1712', fg: '#f0e8d3', accent: '#ff7a4a', size: 30, sub: 'SERIOUSLY. COME IN.' };
    if (h.signMesh.material.map) h.signMesh.material.map.dispose();
    h.signMesh.material.map = signTexture(signArgs);
    h.signMesh.material.needsUpdate = true;

    h.marker.className = 'marker' + (h.cleared ? ' cleared' : h.locked ? ' locked' : '');
    const pin = h.marker.querySelector('.mk-pin');
    if (pin) {
      const status = h.cleared ? '<b>CLEARED</b>' : h.locked ? '<b>LOCKED</b>' : '<b>◆</b> OPEN';
      pin.innerHTML = `${status} · ${h.config.address}`;
    }
  }

  refreshMood() {
    const n = this.cleared.size;
    const t = n / 5;
    const top = new THREE.Color(0x241736).lerp(new THREE.Color(0x4f88b8), t);
    const bot = new THREE.Color(0xff7450).lerp(new THREE.Color(0xffd39b), t);
    this.skyUniforms.top.value.copy(top);
    this.skyUniforms.bottom.value.copy(bot);
    this.scene.fog.color.copy(bot).lerp(new THREE.Color(0x2a2030), 0.7);
    this.sun.color.copy(new THREE.Color(0xff9a5a).lerp(new THREE.Color(0xffdcae), t));
    this.sun.intensity = 2.1 + t * 0.7;
    this.hemi.intensity = 1.15 + t * 0.4;
    this.scene.background.copy(top);
    for (const sp of this.clouds) sp.material.color.copy(new THREE.Color(0xffb28a).lerp(new THREE.Color(0xffe9d2), t));
    for (const l of this.lamps) {
      l.bulbMat.color.copy(new THREE.Color(0xffb060).lerp(new THREE.Color(0xffe6b0), t));
      l.glow.material.color.copy(l.bulbMat.color);
    }
    if (this.npcBubble) this.npcBubble.material.opacity = n === 5 ? 0.9 : 0.55;
  }

  /* ---------------- per-frame ---------------- */
  update(dt, time) {
    this.time = time;
    for (const c of this.clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 95) c.position.x = -95;
    }
    for (const sp of this.smoke) {
      if (!sp.visible) continue;
      const ph = (time * 0.16 + sp.userData.phase) % 3.4;
      sp.position.y = sp.userData.baseY + ph * 1.3;
      sp.position.x = sp.userData.baseX + Math.sin(time * 0.5 + sp.userData.phase) * 0.35 + ph * 0.18;
      sp.position.z = sp.userData.baseZ + Math.cos(time * 0.4 + sp.userData.phase) * 0.3;
      sp.material.opacity = Math.max(0, 0.24 * (1 - ph / 3.4));
      sp.scale.setScalar(1.2 + ph * 0.52);
    }
    if (this.npc) {
      this.npc.update(dt, false, 0);
      this.npc.group.rotation.y += Math.sin(time * 0.35) * dt * 0.12;
      if (this.npcBubble) {
        this.npcBubble.position.y = 2.85 + Math.sin(time * 1.7) * 0.08;
        this.npcBubble.material.opacity = 0.4 + Math.sin(time * 2.2) * 0.15;
      }
    }
    for (const l of this.lamps) {
      l.glow.material.opacity = 0.7 + Math.sin(time * 3.1 + l.lamp.userData.angle * 5) * 0.06;
    }
    this.sunSprite.material.opacity = 0.8 + Math.sin(time * 0.4) * 0.05;
    this.sky.position.copy(this.scene.userData.cameraPos || new THREE.Vector3());
  }

  /* ---------------- interactions ---------------- */
  nearestInteraction(pos) {
    let best = null;
    for (const h of this.houses) {
      const d = pos.distanceTo(h.entrance);
      if (d < 2.9 && (!best || d < best.dist)) best = { type: 'house', house: h, dist: d };
    }
    const npcPos = this.npc.group.position;
    const nd = Math.hypot(pos.x - npcPos.x, pos.z - npcPos.z);
    if (nd < 2.6 && (!best || nd < best.dist)) best = { type: 'npc', dist: nd };
    return best;
  }

  updateMarkers(camera, w, h, pos) {
    const v = new THREE.Vector3();
    const clampX = (node, x) => {
      const half = (node.offsetWidth || 80) / 2 + 4;
      return Math.max(half, Math.min(w - half, x));
    };
    for (const h of this.houses) {
      if (!h.marker) continue;
      v.set(h.center.x, 7.6, h.center.z);
      const dist = pos.distanceTo(h.center);
      v.project(camera);
      const visible = v.z < 1 && v.x > -1.25 && v.x < 1.25 && v.y > -1.15 && v.y < 1.2 && dist < 70;
      h.marker.style.display = visible ? 'flex' : 'none';
      if (visible) {
        h.marker.style.left = `${clampX(h.marker, (v.x * 0.5 + 0.5) * w)}px`;
        h.marker.style.top = `${(-v.y * 0.5 + 0.5) * h}px`;
        h.marker.style.opacity = String(Math.max(0.35, 1 - dist / 85));
      }
    }
    if (this.npcMarker) {
      v.set(this.npc.group.position.x, 3.1, this.npc.group.position.z);
      const dist = pos.distanceTo(this.npc.group.position);
      v.project(camera);
      const visible = v.z < 1 && v.x > -1.2 && v.x < 1.2 && v.y > -1.1 && v.y < 1.2 && dist < 34;
      this.npcMarker.style.display = visible ? 'flex' : 'none';
      if (visible) {
        this.npcMarker.style.left = `${clampX(this.npcMarker, (v.x * 0.5 + 0.5) * w)}px`;
        this.npcMarker.style.top = `${(-v.y * 0.5 + 0.5) * h}px`;
      }
    }
  }

  getSpawn() {
    return new THREE.Vector3(0, 0, 7.6);
  }
}

/* ============================================================
   Collision resolution shared by neighbourhood and level.
   ============================================================ */
export function resolveColliders(pos, radius, colliders) {
  for (const c of colliders) {
    if (c.kind === 'circle') {
      const dx = pos.x - c.x, dz = pos.z - c.z;
      const d = Math.hypot(dx, dz);
      const min = radius + c.r;
      if (d < min && d > 0.0001) {
        const push = (min - d);
        pos.x += (dx / d) * push;
        pos.z += (dz / d) * push;
      }
    } else if (c.kind === 'box') {
      const cos = Math.cos(c.rot), sin = Math.sin(c.rot);
      const dx = pos.x - c.x, dz = pos.z - c.z;
      const lx = dx * cos - dz * sin;
      const lz = dx * sin + dz * cos;
      const cx = Math.max(-c.hw, Math.min(c.hw, lx));
      const cz = Math.max(-c.hd, Math.min(c.hd, lz));
      let px = lx - cx, pz = lz - cz;
      const d = Math.hypot(px, pz);
      if (d < radius) {
        let pushX = 0, pushZ = 0;
        if (d > 0.0001) {
          const push = radius - d;
          pushX = (px / d) * push; pushZ = (pz / d) * push;
        } else {
          // inside the box: push out via nearest face
          const ox = c.hw - Math.abs(lx), oz = c.hd - Math.abs(lz);
          if (ox < oz) pushX = (lx >= 0 ? 1 : -1) * (ox + radius);
          else pushZ = (lz >= 0 ? 1 : -1) * (oz + radius);
        }
        pos.x += pushX * cos + pushZ * sin;
        pos.z += -pushX * sin + pushZ * cos;
      }
    }
  }
  return pos;
}
