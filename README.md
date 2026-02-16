<div align="center">

# Super Fun PTZ Games

**Your camera sees edges. We hide characters on them. You find and boop them.**
An AR camera game for people who spent too much money on PTZ cameras.

<a href="https://matthewidavis.github.io/Super-Fun-PTZ-Games/"><b>&#9654; Play in your browser</b></a>
&nbsp;&nbsp;&bull;&nbsp;&nbsp;
<a href="#run-it-locally"><b>Run locally</b></a>
&nbsp;&nbsp;&bull;&nbsp;&nbsp;
<a href="#how-it-works"><b>How it works</b></a>

<br/>

![GitHub last commit](https://img.shields.io/github/last-commit/matthewidavis/Super-Fun-PTZ-Games?style=for-the-badge)
![GitHub repo size](https://img.shields.io/github/repo-size/matthewidavis/Super-Fun-PTZ-Games?style=for-the-badge)
![GitHub issues](https://img.shields.io/github/issues/matthewidavis/Super-Fun-PTZ-Games?style=for-the-badge)
![GitHub stars](https://img.shields.io/github/stars/matthewidavis/Super-Fun-PTZ-Games?style=for-the-badge)

</div>

---

## What is this?

Point a webcam (or PTZ) at a bookshelf, a doorframe, your messy desk — anywhere with strong horizontal lines.
The game detects those edges, hides characters along them, and challenges you to find and tag them for points.

Pick your theme:

- **Cats** — boop the peeking cats, cozy chaos mode
- **Aliens** — tag the hiding specimens, sci-fi scanner mode

---

## Play now

**https://matthewidavis.github.io/Super-Fun-PTZ-Games/**

No install. No build step. Just open the link, allow camera access, and start playing.

> Tip: bookshelves are basically a cheat code. Lots of horizontal edges means lots of characters to find.

---

## Demo

<p align="center">
  <img src="assets/demo.gif" alt="Gameplay demo" width="800" />
</p>

---

## Pick your vibe

### Themes

| | Cats | Aliens |
|---|---|---|
| What you do | Boop cats | Tag specimens |
| Cursor | Paw with toe beans | Radar scanner |
| Sounds | Soft boops | Electronic zaps |
| Game over screen | Sleeping cat on yarn | UFO on a radar grid |
| Mood | Cozy chaos | Sci-fi serious |

### Modes

- **Classic** — 10 tries, make them count
- **Time Attack** — 60 seconds, unlimited tries, characters vanish fast
- **Survival** — start with 3 tries, every hit earns +1, misses cost you

---

## Controls

### Keyboard and mouse

| Input | Action |
|---|---|
| Click or Space | Boop / Tag |
| WASD or Arrow keys | Move camera (if PTZ is available) |
| R | Restart |
| F3 | Debug overlay |
| + / - | Adjust edge detection sensitivity |

### Gamepad

Works with Xbox, PlayStation, and anything your browser recognizes.

| Button | Action |
|---|---|
| A or RB | Boop / Tag |
| Left stick | Pan and tilt |
| B | Restart |
| Y | Confirm / Start |

### Start screen navigation

Each step uses arrow keys for its selections:

| Key | Step 1 (Theme) | Step 2 (Mode) | Step 3 (Camera) |
|---|---|---|---|
| Left / Right | Switch theme | Cycle mode | — |
| Up / Down | — | Cycle mode | — |
| Tab | — | — | Toggle source |
| Enter / Space | Next step | Next step | Start game |
| Escape | — | Back | Back |

---

## Camera setup

### Browser camera

Default option. Pick your camera from the dropdown on the start screen.

If your browser and camera expose PTZ controls, the game will use them.
If not, you can still play by aiming the camera manually.

### IP camera (work in progress)

There is an IP Camera option on the start screen. If you are experimenting with a PTZOptics or similar camera, you can enter the camera IP and try snapshot control. This is still evolving.

---

## Scoring

- Land a hit: **1 point**, plus a distance bonus up to **12** for perfect center hits
- Consecutive hits: streak multiplier climbs past **2x**
- Miss: streak resets, cursor turns red
- Bullseye: tracked separately for bragging rights
- Streak milestones at **3, 5, 7, 10** trigger a satisfying screen glow

High scores are saved in your browser per theme and mode, top 5 shown on the start screen.

---

## How it works

The game uses real-time computer vision in the browser:

1. **Edge detection** — scans the camera feed for horizontal edges (shelves, desk edges, doorframes)
2. **Character spawning** — places characters along detected edges so they look like they are peeking over real objects
3. **Motion tracking** — compensates for camera panning so characters stay anchored to their real-world positions
4. **PTZ control** — if your camera supports pan/tilt/zoom, use keyboard, gamepad, or touch to move the camera and hunt for characters

All processing runs locally in your browser. No server, no data sent anywhere.

---

## Run it locally

```bash
git clone https://github.com/matthewidavis/Super-Fun-PTZ-Games.git
cd Super-Fun-PTZ-Games
```

Then open `index.html` in your browser.

If your browser blocks camera access for local files, use a tiny static server:

```bash
# Python 3
python -m http.server 8000
```

Open `http://localhost:8000` and you are good.

---

## Roadmap ideas

- More themes (robots, pirates, dinosaurs, whatever)
- Multiplayer pass-and-play high scores
- Accessibility options (bigger characters, reduced motion, etc.)

---

## Credits

Original concept by **HJWWalters**: an ESP32-CAM AR game that inspired this project.
https://hjwwalters.com/augmented-reality-game-esp32-cam/

---

## License

[MIT](LICENSE)
