(function () {
    'use strict';

    ARGame.GameConfig = {
        // Display (set at runtime from video stream)
        GAME_WIDTH: 640,
        GAME_HEIGHT: 480,

        // Edge Detection
        DETECTION_THRESHOLD: 100,
        MIN_LINE_LENGTH: 30,

        // Point of Interest Tracking
        POI_DISTANCE_THRESHOLD: 12,
        POI_PERSISTENCE_MIN: 10,
        TARGET_RISE_SPEED: 1,
        TARGET_MAX_HEIGHT: 10,
        TARGET_HOLD_FRAMES: 20,
        HIT_HISTORY_SIZE: 5,

        // Target appearance
        TARGET_WIDTH: 60,
        TARGET_HEIGHT: 80,
        TARGET_BULLSEYE_RADIUS: 24,

        // Crosshair
        CROSSHAIR_THICKNESS: 3,
        CROSSHAIR_GAP: 40,
        CROSSHAIR_LENGTH: 80,

        // Game rules
        MAX_AMMO: 10,
        MAX_SCORE_PER_SHOT: 12,
        SHOT_DEBOUNCE_MS: 200,

        // Game modes
        GAME_MODE: 'classic',
        SPAWN_DELAY: 1.0,
        TARGET_DESPAWN_TIME: null,
        TIME_LIMIT: null,

        // Gamepad
        GAMEPAD_DEADZONE: 0.25,

        // Performance
        PROCESS_HEIGHT: 240,
        PROCESS_SCALE: 0.5
    };

    ARGame.ModePresets = {
        classic: {
            MAX_AMMO: 10,
            SPAWN_DELAY: 1.0,
            TARGET_DESPAWN_TIME: null,
            TIME_LIMIT: null
        },
        timeAttack: {
            MAX_AMMO: 999,
            SPAWN_DELAY: 0.5,
            TARGET_DESPAWN_TIME: 3.0,
            TIME_LIMIT: 60
        },
        survival: {
            MAX_AMMO: 3,
            SPAWN_DELAY: 0.8,
            TARGET_DESPAWN_TIME: 4.0,
            TIME_LIMIT: null
        }
    };

    ARGame.applyMode = function (config, mode) {
        var preset = ARGame.ModePresets[mode];
        if (!preset) return;
        config.GAME_MODE = mode;
        for (var k in preset) {
            if (preset.hasOwnProperty(k)) {
                config[k] = preset[k];
            }
        }
    };

    ARGame.scaleConfig = function (config, videoW, videoH) {
        config.GAME_WIDTH = videoW;
        config.GAME_HEIGHT = videoH;
        config.PROCESS_SCALE = config.PROCESS_HEIGHT / videoH;

        var uiScale = videoH / 480.0;
        config.POI_DISTANCE_THRESHOLD = Math.round(6 * (Math.max(videoW, videoH) / 240));
        config.TARGET_WIDTH = Math.round(60 * uiScale);
        config.TARGET_HEIGHT = Math.round(80 * uiScale);
        config.TARGET_BULLSEYE_RADIUS = Math.round(24 * uiScale);
        config.CROSSHAIR_GAP = Math.round(40 * uiScale);
        config.CROSSHAIR_LENGTH = Math.round(80 * uiScale);
        config.CROSSHAIR_THICKNESS = Math.max(2, Math.round(3 * uiScale));
    };

    ARGame.ThemeConfig = function (themeId) {
        this.themeId = themeId || 'cats';

        if (this.themeId === 'cats') {
            this.actionVerb = 'Boop';
            this.scoreNoun = 'Boops';
            this.ammoNoun = 'Boops';
            this.gameOverTitle = 'NAP TIME!';
            this.resultsSummary = 'Boops landed';
            this.windowTitle = 'Super Fun PTZ Games \u2014 Boop';
            this.crosshairStyle = 'paw';
            this.colorHudText = 'rgb(255,180,50)';
            this.colorHudAmmoFull = 'rgb(255,160,80)';
            this.colorHudAmmoEmpty = 'rgb(80,60,40)';
            this.colorScore = 'rgb(255,200,100)';
            this.colorFlashInner = 'rgb(255,200,220)';
            this.colorFlashOuter = 'rgb(255,120,160)';
            this.colorMarker = 'rgb(255,150,200)';
            this.colorMarkerOutline = 'rgb(200,80,120)';
        } else {
            this.actionVerb = 'Tag';
            this.scoreNoun = 'Specimens';
            this.ammoNoun = 'Scans';
            this.gameOverTitle = 'SCAN COMPLETE';
            this.resultsSummary = 'Specimens tagged';
            this.windowTitle = 'Super Fun PTZ Games \u2014 Alien Detection';
            this.crosshairStyle = 'radar';
            this.colorHudText = 'rgb(0,255,100)';
            this.colorHudAmmoFull = 'rgb(0,200,80)';
            this.colorHudAmmoEmpty = 'rgb(30,80,30)';
            this.colorScore = 'rgb(100,255,150)';
            this.colorFlashInner = 'rgb(200,255,200)';
            this.colorFlashOuter = 'rgb(50,255,100)';
            this.colorMarker = 'rgb(0,255,100)';
            this.colorMarkerOutline = 'rgb(0,150,50)';
        }
    };
})();
