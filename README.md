# Super Fun PTZ Games

Your camera sees edges. We put targets on them. You shoot the targets. It's basically laser tag for people who spent too much money on PTZ cameras.

Point your webcam (or fancy IP camera) at a bookshelf, a doorframe, your messy desk — anywhere with horizontal lines — and watch as cats peek out or aliens pop up along those edges. Boop the cats. Tag the aliens. Try not to miss.

<!-- TODO: gameplay gif here -->

---

## Getting Started

**You need:** A browser. A camera. That's it. No install, no server, no build step.

Open `index.html` in Chrome or Edge. Done.

> **Dev note:** `serve.py` is included if you want a local server with cache-busting headers (`python serve.py`), but it's totally optional. The game is just static files.

---

## Pick Your Vibe

### Themes

| | Cats | Aliens |
|---|---|---|
| **What you're doing** | Booping cats | Tagging aliens |
| **Crosshair** | A paw (with toe beans!) | Radar scanner |
| **Sounds** | Soft boops | Electronic zaps |
| **Game over screen** | Sleeping cat on a yarn ball | UFO on a radar grid |
| **Mood** | Cozy chaos | Sci-fi serious |

### Game Modes

**Classic** — 10 shots. Make 'em count. Targets stick around waiting for you, so no excuses.

**Time Attack** — 60 seconds, unlimited ammo. Targets vanish after 3 seconds if you're too slow. Go go go.

**Survival** — Start with 3 shots. Every hit gives you +1 ammo. Every miss brings you closer to the end. Targets get impatient the longer you last. How far can you go?

---

## Controls

### Keyboard & Mouse

| Key | What it does |
|-----|-------------|
| **Click** or **Space** | Shoot |
| **WASD** / **Arrow keys** | Move camera (if your camera supports PTZ) |
| **R** | Restart |
| **F3** | Debug overlay (for nerds) |
| **+** / **-** | Tweak edge detection sensitivity |

### Gamepad

Works with Xbox, PlayStation, or anything your browser recognizes.

| Button | What it does |
|--------|-------------|
| **A** or **RB** | Shoot |
| **Left Stick** | Pan & tilt |
| **B** | Restart |
| **Y** | Confirm / Start |

### Start Screen Shortcuts

| Key | What it does |
|-----|-------------|
| **Left / Right** | Switch theme |
| **Up / Down** | Switch game mode |
| **Tab** | Toggle camera source |
| **Enter** | Start game |

---

## Camera Setup

### Browser Webcam

The default. Pick your webcam from the dropdown on the start screen and you're good. If your webcam supports pan/tilt/zoom (some Logitech models do), the game will use it automatically.

### IP Camera

Got a PTZOptics or similar IP camera? Switch to "IP Camera" on the start screen, type in the IP address (like `192.168.1.100`), and the game grabs snapshots over HTTP. The game remembers your IP next time.

Move the camera with your keyboard/gamepad — the game sends PTZ commands over HTTP so you can aim by physically moving the camera. It's the whole point, honestly.

---

## Scoring

- **Hit a target:** 1 point (+ distance bonus up to 12 if you nail the bullseye)
- **Consecutive hits:** Streak multiplier kicks in at 2x and keeps climbing
- **Miss:** Streak resets. Crosshair turns red. Shame.
- **Bullseye:** Land it dead center for max points. The game tracks these separately because you'll want to brag.

Streak milestones at 3, 5, 7, and 10 hits trigger a satisfying screen glow. Keep it going.

---

## High Scores

Saved in your browser per theme and mode (so your Cat Classic scores don't compete with your Alien Survival scores — that would be unfair to the cats).

Top 5 shown on the start screen. Beat one and you'll see "NEW HIGH SCORE!" flash on the results screen. Nobody else can see it, but you'll know.

---

## Tips

- **Bookshelves are your best friend.** Lots of horizontal edges = lots of targets.
- **Good lighting helps.** The edge detector needs contrast to work with.
- **If nothing spawns,** hit `-` to lower the detection threshold. If everything spawns, hit `+`.
- **Survival mode** gets mean around 15+ hits. The targets start disappearing faster. Stay calm.
- **The debug overlay (F3)** shows you exactly what edges the game sees. Useful for finding the sweet spot.

---

## How It Actually Works

No AI, no cloud, no server. Everything runs in your browser:

1. Grabs a video frame from your camera
2. Shrinks it down to 240px tall (speed matters)
3. Runs a vertical gradient scan to find horizontal edges
4. Tracks which edges stick around across multiple frames (no false positives from noise)
5. Spawns targets at random spots along stable edges
6. Once a target spawns, a small tracker keeps it glued to the edge even if the camera moves a little

The whole thing runs at 60fps on most machines. It's surprisingly efficient for what it does.

---

## Credits

- Original concept by [HJWWalters](https://hjwwalters.com/augmented-reality-game-esp32-cam/) — an ESP32-CAM AR game that inspired this whole thing
- Built with zero frameworks, zero dependencies, zero build steps. Just vibes and vanilla JavaScript.
