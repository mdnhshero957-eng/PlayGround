# Whispering Pines — Every House Is a Doom Level

A complete, playable 3D browser game. Explore a quiet suburban cul-de-sac in third person, then step inside any open house and it becomes a first-person Doom-style level: BSP floor plans, closing doors, sigil keys, demons, a shotgun, a minimap, and an exit portal.

The neighborhood is built with **Three.js** (vendored locally). Every texture, sprite, portrait, and sound is generated at runtime with canvas and WebAudio — there are no external art or audio files.

## Play

Serve the repo root with any static file server and open it in a browser:

```bash
python3 -m http.server 3002
# open http://localhost:3002
```

The provided `start.sh` uses the OMGithub runtime's `default-start.mjs` if you are running inside that environment.

### Desktop

| Input | Action |
| --- | --- |
| `WASD` / arrows | Move |
| Mouse drag (neighborhood) | Orbit camera |
| Mouse (level, pointer lock) | Look |
| Left click | Fire |
| `E` | Interact / advance dialogue |
| `M` | Neighborhood map |
| `1` `2` `3` | Shotgun / pistol / chaingun |
| `Q` | Cycle weapon |
| `Shift` | Sprint |
| `Esc` | Pause / release mouse |
| Wheel (neighborhood) | Zoom camera |

### Mobile / touch

- **Left side drag**: virtual joystick.
- **Right side drag**: look around.
- **FIRE**: fire the current weapon (hold for automatic weapons).
- **USE**: interact, read the objective, or use the portal.
- **SWAP**: cycle weapons.
- **MAP** (neighborhood): open the association directory.
- **ENTER …**: contextual button when standing at a house or NPC.

The layout respects `env(safe-area-inset-*)`, keeps the joystick and action buttons clear of the Doom HUD, and uses touch-native pointer events.

## The neighborhood

Whispering Pines Estates has five properties around a cul-de-sac:

1. **The Split-Level of Sin** — 12 Cursed Court
2. **The Brady Bunker** — 8 Pentagram Place
3. **Casa de Carnage** — 13 Bloodstone Bend
4. **The Open Concept** — 6 Abyss Avenue
5. **The Model Home** — 1 Whispering Pines Way (locked until the other four are cleared)

Each house has a generated layout, a different color/theme, and a rising demon count. The Model Home is the boss level; clearing it triggers the ending and free-roam neighborhood.

## Features

- Third-person Sims-style neighborhood with a plumbob, realtor NPC, house markers, compass, minimap-style directory, and a cursed HOA.
- Five playable first-person houses, each generated from a BSP floor plan with corridors, rooms, doors, torches, hanging lamps, props, and collision.
- Three weapons: shotgun, pistol, and chaingun, with ammo, cooldowns, spread, muzzle flash, recoil, screen shake, and a pixel-art weapon overlay.
- Four enemy archetypes: zombies, imps, pinkies, and the HOA President boss, with projectile attacks, damage, death animations, and sound.
- Sigil key → sealed portal → results → return to neighborhood loop.
- Doom HUD (health, armor, ammo, kills, key), procedural face portrait, hit markers, damage flash, minimap, pause menu, death/retry/flee flow.
- Persistent progression in `localStorage` under `whispering-pines-save-v1`: cleared houses, best times, total kills/time, mute state.
- Responsive title, intro, map, pause, results, death, and ending screens.
- Zero external runtime dependencies beyond the vendored Three.js module.

## Project layout

```
index.html            markup, HUDs, overlays, import map, favicon
style.css             full responsive visual design + touch controls
src/game.js           state machine, input, cameras, HUD, screens, fx, weapon drawing
src/world.js          neighborhood, houses, signs, NPC, colliders, markers
src/dungeon.js        BSP level generation, props, torches, items, enemies, exit
src/level.js          first-person movement, combat, enemy AI, doors, portal, minimap
src/textures.js       procedural canvas textures, signs, sprites, portraits
src/audio.js          procedural WebAudio music, ambience, and sound effects
vendor/three.module.js Three.js r160
```

## Notes and assumptions

- The brief was intentionally open, so the game assumes a single-player, offline, desktop-or-mobile experience with no backend.
- "3D The Sims neighborhood" is interpreted as a third-person explorable cul-de-sac with a realtor NPC and lot markers; "every house is a Doom level" is interpreted literally once you enter.
- Progression is local-only. Clearing houses unlocks the Model Home; no account or network is required.
- The game targets modern evergreen browsers with ES modules, WebGL, and WebAudio. A mouse/keyboard is recommended on desktop; touch controls are enabled automatically for coarse pointers and narrow viewports.
- Audio is unlocked on the first user gesture, as required by browser autoplay policies.
- Deterministic BSP generation uses the house id to seed layouts, so a given property is consistent between visits.
- All art and audio are procedural. Three.js is vendored for offline use.

## Credits

- Three.js r160 (MIT) — `vendor/three.module.js`.
- Everything else — procedural canvas art, WebAudio synthesis, level generation, and game code — was built for this project.

---

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Created using [OMGithub.com](https://go.ondev.store/).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://go.ondev.store/mdnhshero957-eng/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/mdnhshero957-eng/PlayGround)

- 🎮 [Open the project](https://go.ondev.store/mdnhshero957-eng/PlayGround).
- ✨ [Remix this project](https://go.ondev.store/mdnhshero957-eng/PlayGround?remix=1).
- 💻 [Explore the source](https://github.com/mdnhshero957-eng/PlayGround).
- 🛠️ [Check build runs](https://github.com/mdnhshero957-eng/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/mdnhshero957-eng/PlayGround/issues).
- 👤 [Explore the creator's projects](https://go.ondev.store/mdnhshero957-eng).
- 🌍 [Create with OMGithub](https://go.ondev.store/).
<!-- omgithub:readme:end -->
