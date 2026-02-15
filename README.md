# Super Fun PTZ Games

An augmented-reality target shooting game that runs in your browser. Point your camera at a scene, and the game detects edges (shelves, tables, doorframes) and spawns targets along them. Aim by moving the camera and shoot to score!

<!-- TODO: add gameplay screenshot/gif -->

## Play It

```bash
python serve.py            # http://localhost:8080
python serve.py 3000       # custom port
```

Or just open `index.html` directly in Chrome/Edge.

## Features

- **Themes:** Cats (boop peeking cats) and Aliens (tag hiding aliens)
- **Game modes:** Classic, Time Attack, Survival
- **Camera sources:** Browser webcam or IP camera snapshot URL
- **PTZ control:** Browser MediaStreamTrack constraints, HTTP CGI for PTZOptics, or gamepad
- **Input:** Keyboard, mouse, Xbox/DualShock gamepad
- **High scores:** Saved locally per theme and mode
- **Sound & animations:** Hit effects, combo streaks, results screen

## How It Works

1. Captures video frames from your camera
2. Downscales to 240px and runs edge detection (vertical gradient + run-length scan)
3. Tracks stable edges across frames with persistence counters
4. Spawns targets at random positions along confirmed edges
5. A small-region verifier keeps targets locked to edges as the camera moves

No server-side processing — everything runs client-side in the browser.

## Controls

| Input | Action |
|-------|--------|
| **Click** / **Space** / **Gamepad A** | Shoot |
| **WASD** / **Arrows** / **Left Stick** | Pan/tilt camera |
| **Gamepad triggers** | Zoom |
| **F3** | Toggle debug overlay |

## Credits

- Inspired by [HJWWalters' ESP32-CAM AR Game](https://hjwwalters.com/augmented-reality-game-esp32-cam/)
