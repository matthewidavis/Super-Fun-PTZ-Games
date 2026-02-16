(function () {
    'use strict';

    var startScreen;
    var audio;
    var video;
    var overlay;
    var ctx;
    var procCanvas;
    var procCtx;
    var nativeCanvas;
    var nativeCtx;
    var config;
    var theme;
    var gameState;
    var renderer;
    var inputManager;
    var ptzController;
    var processScale;
    var targetWasActive = false;  // Track for appear sound
    var videoSource = null;       // Element to drawImage from (video or snapshot canvas)
    var displayEl = null;         // Visible element behind overlay (video or snapshot canvas)
    var snapshotSource = null;    // SnapshotSource instance (IP camera only)
    var sourceWidth = 0;
    var sourceHeight = 0;

    function init() {
        startScreen = new ARGame.StartScreen();
        audio = startScreen.audio;
        video = document.getElementById('camera-video');

        document.getElementById('start-btn').addEventListener('click', onStartClick);

        // Gamepad connection listener for start screen
        window.addEventListener('gamepadconnected', function () {
            pollStartGamepad();
        });

        enumerateCameras();

        // Touch support on overlay
        setupTouch();
    }

    function setupTouch() {
        // Touch on overlay for shooting (once game starts)
        document.addEventListener('touchstart', function (e) {
            if (!gameState || !overlay) return;
            var container = document.getElementById('game-container');
            if (container.style.display === 'none') return;

            e.preventDefault();
            if (inputManager) {
                inputManager.mouseClicked = true;
            }
        }, { passive: false });
    }

    function enumerateCameras() {
        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then(function (stream) {
                stream.getTracks().forEach(function (t) { t.stop(); });
                return navigator.mediaDevices.enumerateDevices();
            })
            .then(populateCameraSelect)
            .catch(function () {
                navigator.mediaDevices.enumerateDevices()
                    .then(populateCameraSelect)
                    .catch(function () {});
            });
    }

    function populateCameraSelect(devices) {
        var select = document.getElementById('camera-select');
        select.innerHTML = '<option value="">Default camera</option>';
        devices.forEach(function (dev) {
            if (dev.kind === 'videoinput') {
                var opt = document.createElement('option');
                opt.value = dev.deviceId;
                opt.textContent = dev.label || ('Camera ' + (select.options.length));
                select.appendChild(opt);
            }
        });
    }

    var _startPadPrev = {};
    function pollStartGamepad() {
        var screen = document.getElementById('start-screen');
        if (screen.style.display === 'none') return;

        var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        var gp = null;
        for (var i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) { gp = gamepads[i]; break; }
        }
        if (gp) {
            var step = startScreen.currentStep;

            // A button (0): advance step or start
            if (gp.buttons[0] && gp.buttons[0].pressed && !_startPadPrev[0]) {
                if (step < 2) {
                    startScreen._nextStep();
                } else {
                    document.getElementById('start-btn').click();
                }
            }
            // B button (1): go back
            if (gp.buttons[1] && gp.buttons[1].pressed && !_startPadPrev[1]) {
                startScreen._prevStep();
            }

            if (step === 0) {
                // D-pad left/right → toggle theme
                if (gp.buttons[14] && gp.buttons[14].pressed && !_startPadPrev[14]) {
                    startScreen._selectTheme(1 - startScreen.selectedTheme);
                    startScreen.audio.play('uiclick');
                }
                if (gp.buttons[15] && gp.buttons[15].pressed && !_startPadPrev[15]) {
                    startScreen._selectTheme(1 - startScreen.selectedTheme);
                    startScreen.audio.play('uiclick');
                }
            } else if (step === 1) {
                // D-pad left/up → prev mode, right/down → next mode
                if ((gp.buttons[14] && gp.buttons[14].pressed && !_startPadPrev[14]) ||
                    (gp.buttons[12] && gp.buttons[12].pressed && !_startPadPrev[12])) {
                    var modes = 3;
                    startScreen._selectMode((startScreen.selectedMode + modes - 1) % modes);
                    startScreen.audio.play('uiclick');
                }
                if ((gp.buttons[15] && gp.buttons[15].pressed && !_startPadPrev[15]) ||
                    (gp.buttons[13] && gp.buttons[13].pressed && !_startPadPrev[13])) {
                    startScreen._selectMode((startScreen.selectedMode + 1) % 3);
                    startScreen.audio.play('uiclick');
                }
            }
            // Step 2: no d-pad actions

            for (var bi = 0; bi < gp.buttons.length; bi++) {
                _startPadPrev[bi] = gp.buttons[bi].pressed;
            }
        }
        requestAnimationFrame(pollStartGamepad);
    }

    function onStartClick() {
        document.getElementById('error-msg').textContent = '';

        if (startScreen.getSelectedSource() === 'ip') {
            onStartIP();
        } else {
            onStartBrowser();
        }
    }

    function onStartBrowser() {
        var selectedId = document.getElementById('camera-select').value;

        var videoConstraints = {
            pan: true, tilt: true, zoom: true,
            width: { ideal: 1280 },
            height: { ideal: 720 }
        };
        if (selectedId) {
            videoConstraints.deviceId = { exact: selectedId };
        }

        navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false })
            .then(function (stream) {
                onBrowserStreamReady(stream);
            })
            .catch(function (err) {
                console.warn('PTZ getUserMedia failed, retrying without PTZ:', err.message);
                var fallback = { width: { ideal: 1280 }, height: { ideal: 720 } };
                if (selectedId) fallback.deviceId = { exact: selectedId };
                navigator.mediaDevices.getUserMedia({ video: fallback, audio: false })
                    .then(function (stream) {
                        onBrowserStreamReady(stream);
                    })
                    .catch(function (err2) {
                        startScreen.showError('Camera error: ' + err2.message);
                    });
            });
    }

    function onBrowserStreamReady(stream) {
        video.srcObject = stream;

        video.addEventListener('loadedmetadata', function onMeta() {
            video.removeEventListener('loadedmetadata', onMeta);

            var vw = video.videoWidth;
            var vh = video.videoHeight;

            var tracks = stream.getVideoTracks();
            var browserPtz = new ARGame.PTZController(tracks[0]);
            if (!browserPtz.hasPTZ) {
                document.getElementById('ptz-banner').style.display = 'block';
                setTimeout(function () {
                    document.getElementById('ptz-banner').style.display = 'none';
                }, 5000);
            }

            video.style.display = 'block';
            document.getElementById('snapshot-canvas').style.display = 'none';

            onSourceReady(video, vw, vh, browserPtz, video);
        });
    }

    function onStartIP() {
        var ip = startScreen.getIP();
        if (!ip) {
            startScreen.showError('Please enter a camera IP address.');
            return;
        }

        startScreen.showError('');
        document.getElementById('start-btn').disabled = true;
        document.getElementById('start-btn').textContent = 'CONNECTING...';

        ARGame.SnapshotSource.testSnapshot(ip)
            .then(function (info) {
                document.getElementById('start-btn').disabled = false;
                document.getElementById('start-btn').textContent = 'START';

                snapshotSource = new ARGame.SnapshotSource(ip);
                snapshotSource.start();

                var snapCanvas = document.getElementById('snapshot-canvas');
                snapCanvas.width = info.width;
                snapCanvas.height = info.height;
                snapCanvas.style.display = 'block';
                video.style.display = 'none';

                var httpPtz = new ARGame.HTTPPTZController(ip);

                onSourceReady(snapCanvas, info.width, info.height, httpPtz, snapCanvas);
            })
            .catch(function (err) {
                document.getElementById('start-btn').disabled = false;
                document.getElementById('start-btn').textContent = 'START';
                startScreen.showError('Could not connect to camera at ' + ip + '. Check IP and ensure camera is on the same network.');
            });
    }

    function onSourceReady(source, vw, vh, ptz, visibleEl) {
        videoSource = source;
        displayEl = visibleEl;
        sourceWidth = vw;
        sourceHeight = vh;

        // Setup config
        config = {};
        for (var k in ARGame.GameConfig) {
            if (ARGame.GameConfig.hasOwnProperty(k)) {
                config[k] = ARGame.GameConfig[k];
            }
        }
        ARGame.scaleConfig(config, vw, vh);

        // Apply selected mode
        var modeId = startScreen.getSelectedMode();
        ARGame.applyMode(config, modeId);

        // Setup theme
        var themeId = startScreen.getSelectedTheme();
        theme = new ARGame.ThemeConfig(themeId);
        config._themeId = themeId;

        // Setup audio
        audio.setTheme(themeId);

        // Setup overlay canvas
        overlay = document.getElementById('overlay');
        overlay.width = vw;
        overlay.height = vh;
        ctx = overlay.getContext('2d');

        fitToViewport(vw, vh);

        procCanvas = document.createElement('canvas');
        var procW = Math.round(vw * config.PROCESS_SCALE);
        procCanvas.width = procW;
        procCanvas.height = config.PROCESS_HEIGHT;
        procCtx = procCanvas.getContext('2d', { willReadFrequently: true });

        nativeCanvas = document.createElement('canvas');
        nativeCanvas.width = vw;
        nativeCanvas.height = vh;
        nativeCtx = nativeCanvas.getContext('2d', { willReadFrequently: true });

        ptzController = ptz;

        gameState = new ARGame.GameState(config);
        gameState.startGame();
        renderer = new ARGame.Renderer(theme);
        inputManager = new ARGame.InputManager();

        processScale = config.PROCESS_SCALE;
        targetWasActive = false;
        prevGray = null;
        lastFrameTime = 0;
        gameOverHandled = false;

        // Transition
        startScreen.hide();
        document.getElementById('game-container').style.display = 'flex';
        document.title = theme.windowTitle;

        requestAnimationFrame(gameLoop);
    }

    function fitToViewport(vw, vh) {
        var winW = window.innerWidth;
        var winH = window.innerHeight;
        var scale = Math.min(winW / vw, winH / vh);
        var displayW = Math.round(vw * scale);
        var displayH = Math.round(vh * scale);

        if (displayEl) {
            displayEl.style.width = displayW + 'px';
            displayEl.style.height = displayH + 'px';
        }
        if (overlay) {
            overlay.style.width = displayW + 'px';
            overlay.style.height = displayH + 'px';
            overlay.style.pointerEvents = 'auto';
        }
    }

    var lastFrameTime = 0;
    var prevGray = null;
    var prevAmmo = -1;
    var gameOverHandled = false;

    function gameLoop(timestamp) {
        requestAnimationFrame(gameLoop);

        var dt = timestamp - lastFrameTime;
        lastFrameTime = timestamp;

        // 1. Poll input
        inputManager.poll();

        // 2. PTZ control
        if (ptzController && ptzController.hasPTZ) {
            var panSpeed = 0;
            var tiltSpeed = 0;

            if (inputManager.isHeld('left')) panSpeed -= 0.7;
            if (inputManager.isHeld('right')) panSpeed += 0.7;
            if (inputManager.isHeld('up')) tiltSpeed += 0.7;
            if (inputManager.isHeld('down')) tiltSpeed -= 0.7;

            var stick = inputManager.getStick();
            if (Math.abs(stick.x) > Math.abs(panSpeed)) panSpeed = stick.x;
            if (Math.abs(stick.y) > Math.abs(tiltSpeed)) tiltSpeed = -stick.y;

            panSpeed = panSpeed < -1 ? -1 : panSpeed > 1 ? 1 : panSpeed;
            tiltSpeed = tiltSpeed < -1 ? -1 : tiltSpeed > 1 ? 1 : tiltSpeed;

            ptzController.update(panSpeed, tiltSpeed, 0);
        }

        // 3. Action buttons
        if (inputManager.wasPressed('shoot')) {
            var flashBefore = gameState.flashUntil;
            var hitsBeforeShot = gameState.hits;
            gameState.shoot();

            // Audio feedback — detect if a shot actually fired (flashUntil changes on shot)
            var shotFired = gameState.flashUntil > flashBefore;
            if (shotFired) {
                audio.play('shoot');
                if (gameState.hits > hitsBeforeShot) {
                    audio.play('hit');
                } else {
                    audio.play('miss');
                }
            }
        }

        if (inputManager.wasPressed('reset')) {
            if (gameState.gameOver) {
                gameState.showResults = false;
            }
            gameState.reset();
            prevAmmo = -1;
            targetWasActive = false;
            gameOverHandled = false;
        }
        if (inputManager.wasPressed('debug')) {
            gameState.debugMode = !gameState.debugMode;
        }
        if (inputManager.wasPressed('threshUp')) {
            config.DETECTION_THRESHOLD = Math.min(200, config.DETECTION_THRESHOLD + 10);
        }
        if (inputManager.wasPressed('threshDown')) {
            config.DETECTION_THRESHOLD = Math.max(10, config.DETECTION_THRESHOLD - 10);
        }
        if (inputManager.wasPressed('enter')) {
            if (gameState.gameOver && !gameState.showResults) {
                gameState.showResults = true;
            }
        }

        // 4. Update game timer
        gameState.updateTime();

        // 5. Pending target spawn
        var spawned = gameState.target.checkPendingSpawn(config);
        if (spawned) {
            audio.play('appear');
        }

        // 6. Despawn check
        gameState.despawnCheck();

        // 7. Track target appearance for sound
        if (gameState.target.active && !targetWasActive) {
            // Target just became active via scanning (not pending spawn)
            if (!spawned) {
                audio.play('appear');
            }
        }
        targetWasActive = gameState.target.active;

        // 8. Survival: check game over when no ammo and no active target
        if (config.GAME_MODE === 'survival' && gameState.ammo <= 0 &&
            !gameState.target.active && !gameState.target.pendingSpawn &&
            !gameState.gameOver) {
            gameState.gameOver = true;
            gameState.gameOverTime = performance.now() / 1000;
        }

        // 8b. Centralized game-over handling
        if (gameState.gameOver && !gameOverHandled) {
            gameOverHandled = true;
            audio.play('gameover');
            if (ARGame.HighScores) {
                ARGame.HighScores.save(config.GAME_MODE, theme.themeId, gameState.score);
            }
        }

        // 9. Computer vision
        if (!gameState.gameOver) {
            // Snapshot source: blit latest frame to canvas once so both
            // proc and native reads see the same image (no mid-frame tearing)
            if (snapshotSource) {
                snapshotSource.updateCanvas();
            }

            var procW = procCanvas.width;
            var procH = procCanvas.height;

            procCtx.drawImage(videoSource, 0, 0, procW, procH);
            var procImageData = procCtx.getImageData(0, 0, procW, procH);
            var gray = ARGame.toGrayscale(procImageData);

            var scale = 1.0 / processScale;
            var maxCount = config.POI_PERSISTENCE_MIN + config.TARGET_HOLD_FRAMES;

            // Phase correlation: detect camera motion between frames
            // (same approach as cv2.phaseCorrelate in the Python version)
            if (prevGray && ARGame.estimateMotionXY) {
                try {
                    var motion = ARGame.estimateMotionXY(prevGray, gray, procW, procH);
                    var dx = motion[0];
                    var nativeDx = dx * scale;

                    if (Math.abs(nativeDx) > 0.5) {
                        nativeDx = Math.round(nativeDx);
                        if (gameState.target.active) {
                            gameState.target.spawnX += nativeDx;
                        }
                        if (gameState.target.scanTarget) {
                            gameState.target.scanTarget[0] += nativeDx;
                        }
                        if (gameState.target.pendingSpawn) {
                            gameState.target.pendingSpawn[0] += nativeDx;
                        }
                        gameState.target.hitHistory = gameState.target.hitHistory
                            .map(function (h) { return [h[0] + nativeDx, h[1]]; })
                            .filter(function (h) { return h[0] >= 0 && h[0] <= config.GAME_WIDTH; });
                    }
                } catch (e) {}
            }
            prevGray = gray;

            var edges = ARGame.detectSimple(gray, procW, procH, config);
            gameState.lastEdges = edges;

            if (gameState.target.active) {
                nativeCtx.drawImage(videoSource, 0, 0, nativeCanvas.width, nativeCanvas.height);

                var result = ARGame.verifyEdge(
                    gray, procW, procH, nativeCanvas,
                    gameState.target.spawnX, gameState.target.spawnY,
                    processScale, config
                );

                if (result.found) {
                    gameState.target.spawnX = result.x;
                    gameState.target.spawnY = result.y;
                    gameState.target.poiCount = maxCount;
                    if (gameState.target.targetHeight < config.TARGET_MAX_HEIGHT) {
                        gameState.target.targetHeight += config.TARGET_RISE_SPEED;
                    }
                } else if (gameState.target.targetHeight < config.TARGET_MAX_HEIGHT) {
                    gameState.target.targetHeight += config.TARGET_RISE_SPEED;
                } else {
                    gameState.target.poiCount--;
                    if (gameState.target.poiCount <= 0) {
                        gameState.target.targetHeight = 0;
                        gameState.target.active = false;
                        gameState.target.scanTarget = null;
                    }
                }
            }

            if (!gameState.target.active && !gameState.target.pendingSpawn && edges.length > 0) {
                if (!gameState.target.scanTarget) {
                    gameState.target.scanTarget = gameState.target.pickScanTarget(edges, scale, config);
                }
                if (gameState.target.scanTarget) {
                    gameState.target.update(gameState.target.scanTarget[0], gameState.target.scanTarget[1], config);
                } else {
                    gameState.target.update(null, null, config);
                }
            } else if (!gameState.target.active && !gameState.target.pendingSpawn) {
                gameState.target.scanTarget = null;
                gameState.target.update(null, null, config);
            }
        } else {
            if (!gameState.showResults) {
                var elapsed = performance.now() / 1000 - gameState.gameOverTime;
                if (elapsed > 1.5) {
                    gameState.showResults = true;
                }
            }
        }

        // 10. Render overlay
        renderer.drawFrame(ctx, gameState);

        // 11. Frame timing
        gameState.frameTimeMs = dt;

        // 12. End frame
        inputManager.endFrame();
    }

    window.addEventListener('resize', function () {
        if (overlay && sourceWidth) {
            fitToViewport(sourceWidth, sourceHeight);
        }
        if (startScreen && startScreen.canvas) {
            startScreen._resizeCanvas();
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
