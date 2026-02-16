<div align="center">

# Super Fun PTZ Games

**Your camera sees edges. We put targets on them. You shoot the targets.**  
Laser tag vibes for people who spent too much money on PTZ cameras.

<a href="https://matthewidavis.github.io/Super-Fun-PTZ-Games/"><b>▶ Play in your browser</b></a>
&nbsp;&nbsp;•&nbsp;&nbsp;
<a href="#run-it-locally"><b>Run locally</b></a>
&nbsp;&nbsp;•&nbsp;&nbsp;
<a href="#how-it-works"><b>How it works</b></a>

<br/>

<!-- Badges (feel free to delete any you do not want) -->
![GitHub last commit](https://img.shields.io/github/last-commit/matthewidavis/Super-Fun-PTZ-Games?style=for-the-badge)
![GitHub repo size](https://img.shields.io/github/repo-size/matthewidavis/Super-Fun-PTZ-Games?style=for-the-badge)
![GitHub issues](https://img.shields.io/github/issues/matthewidavis/Super-Fun-PTZ-Games?style=for-the-badge)
![GitHub stars](https://img.shields.io/github/stars/matthewidavis/Super-Fun-PTZ-Games?style=for-the-badge)

</div>

---

## What is this?

Point a webcam (or PTZ) at a bookshelf, a doorframe, your messy desk, anywhere with strong horizontal lines.  
The game finds those edges, spawns targets along them, and lets you shoot for score.

You can play as:

- 🐱 **Cats**: boop the peeking cats, cozy chaos mode
- 👽 **Aliens**: tag the invaders, sci‑fi serious mode

---

## Play now

**https://matthewidavis.github.io/Super-Fun-PTZ-Games/**

No install. No build step. Just open the link, allow camera access, start blasting.

> Tip: shelves are basically a cheat code. Lots of horizontal edges means lots of targets.

---

## Demo

Want this to really pop on GitHub? Add a short GIF.

1. Record 10–15 seconds of gameplay (ScreenToGif on Windows is perfect)
2. Save it as `assets/demo.gif`
3. Un-comment the image below

<!--
<p align="center">
  <img src="assets/demo.gif" alt="Gameplay demo" width="800" />
</p>
-->

You can also add a screenshot like `assets/screenshot.png` for quick vibes.

---

## Pick your vibe

### Themes

| | Cats | Aliens |
|---|---|---|
| What you are doing | Booping cats | Tagging aliens |
| Crosshair | Paw with toe beans | Radar scanner |
| Sounds | Soft boops | Electronic zaps |
| Game over screen | Sleeping cat on yarn | UFO on a radar grid |
| Mood | Cozy chaos | Sci‑fi serious |

### Modes

- 🎯 **Classic**: 10 shots, make them count  
- ⏱ **Time Attack**: 60 seconds, unlimited ammo, targets vanish fast  
- ⚡ **Survival**: start with 3 shots, every hit gives +1 ammo, misses hurt

---

## Controls

### Keyboard and mouse

| Input | Action |
|---|---|
| Click or Space | Shoot |
| WASD or Arrow keys | Move camera (if PTZ is available) |
| R | Restart |
| F3 | Debug overlay |
| + / - | Adjust edge detection sensitivity |

### Gamepad

Works with Xbox, PlayStation, and anything your browser recognizes.

| Button | Action |
|---|---|
| A or RB | Shoot |
| Left stick | Pan and tilt |
| B | Restart |
| Y | Confirm / Start |

### Start screen shortcuts

| Key | Action |
|---|---|
| Left / Right | Switch theme |
| Up / Down | Switch mode |
| Tab | Toggle camera source |
| Enter | Start game |

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

- Hit a target: **1 point**, plus a distance bonus up to **12** for bullseye hits  
- Consecutive hits: streak multiplier climbs after **2x**  
- Miss: streak resets, crosshair turns red, shame  
- Bullseye: tracked separately for bragging rights  
- Streak milestones at **3, 5, 7, 10** trigger a satisfying screen glow

High scores are saved in your browser per theme and mode, top 5 shown on the start screen.

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

If you want to keep building this out:

- More themes (zombies, pirates, robots, whatever)
- Multiplayer pass and play highscores
- Accessibility options (bigger targets, no motion flash, etc.)

---

## Credits

Original concept by **HJWWalters**: an ESP32‑CAM AR game that inspired this project.  
https://hjwwalters.com/augmented-reality-game-esp32-cam/

---

## License

No `LICENSE` file is currently in this repo. If you want it to be easy for others to reuse, consider adding MIT or Apache‑2.0.

