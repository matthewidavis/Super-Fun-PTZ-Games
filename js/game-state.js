(function () {
    'use strict';

    function now() { return performance.now() / 1000; }
    function nowMs() { return performance.now(); }

    function GameState(config) {
        this.config = config;
        this.score = 0;
        this.hits = 0;
        this.bullseyes = 0;
        this.ammo = config.MAX_AMMO;
        this.shots = [];
        this.lastShotTime = 0;
        this.target = new ARGame.TargetState();
        this.gameOver = false;
        this.gameOverTime = 0;
        this.showResults = false;
        this.flashUntil = 0;

        this.crosshairX = config.GAME_WIDTH >> 1;
        this.crosshairY = config.GAME_HEIGHT >> 1;

        this.debugMode = false;
        this.lastEdges = null;
        this.frameTimeMs = 0;

        // Streak tracking
        this.streak = 0;
        this.bestStreak = 0;

        // Game timer
        this.gameStartTime = 0;
        this.gameTime = 0;

        // Effects arrays (drawn by renderer)
        this.hitEffects = [];      // ParticleBurst instances
        this.missEffects = [];     // MissMarker instances
        this.scorePopups = [];     // ScorePopup instances
        this.streakGlows = [];     // StreakGlow instances
        this.pipEffects = [];      // { index, time, type:'empty'|'gain' }

        // Screen shake
        this.shakeUntil = 0;

        // Crosshair red flash on miss
        this.crosshairRedUntil = 0;

        // Survival difficulty
        this.survivalDespawnTime = 4.0;
    }

    GameState.prototype.startGame = function () {
        this.gameStartTime = now();
    };

    GameState.prototype.shoot = function () {
        var t = nowMs();
        if (t - this.lastShotTime < this.config.SHOT_DEBOUNCE_MS) return;
        if (this.gameOver) return;

        var cfg = this.config;
        var mode = cfg.GAME_MODE;

        // Time attack has unlimited ammo
        if (mode !== 'timeAttack' && this.ammo <= 0) return;

        this.lastShotTime = t;
        if (mode !== 'timeAttack') {
            this.ammo--;
            this.pipEffects.push({ index: this.ammo, time: t, type: 'empty' });
        }
        this.flashUntil = t + 100;
        this.shakeUntil = t + 50;

        var didHit = false;

        if (this.target.active) {
            var aimX = this.target.spawnX - this.crosshairX;
            var aimY = this.target.spawnY - this.crosshairY;

            var relX = this.crosshairX - this.target.spawnX + (cfg.TARGET_WIDTH >> 1);
            var visibleH = this.target.targetHeight * ((cfg.TARGET_HEIGHT / cfg.TARGET_MAX_HEIGHT) | 0);
            var relY = cfg.TARGET_HEIGHT - (this.target.spawnY - this.crosshairY) - (cfg.TARGET_HEIGHT - visibleH);

            this.shots.push([relX, relY]);

            var dist = Math.sqrt(aimX * aimX + aimY * aimY);

            if (relX >= 0 && relX <= cfg.TARGET_WIDTH &&
                relY >= 0 && relY <= cfg.TARGET_HEIGHT) {
                var points;
                if (dist < cfg.TARGET_BULLSEYE_RADIUS) {
                    var ratio = dist / Math.max(1, cfg.TARGET_BULLSEYE_RADIUS);
                    points = Math.max(1, Math.round(cfg.MAX_SCORE_PER_SHOT * (1.0 - ratio)));
                    this.bullseyes++;
                } else {
                    points = 1;
                }

                // Streak bonus
                this.streak++;
                if (this.streak > this.bestStreak) this.bestStreak = this.streak;
                if (this.streak >= 2) {
                    points = points * this.streak;
                }

                // Check streak milestones for glow
                if (this.streak === 3 || this.streak === 5 || this.streak === 7 || this.streak === 10) {
                    this.streakGlows.push(new ARGame.StreakGlow(this.streak));
                }

                this.score += points;
                this.hits++;
                didHit = true;

                // Hit effects
                this.hitEffects.push(new ARGame.ParticleBurst(
                    this.target.spawnX, this.target.spawnY - (visibleH >> 1),
                    6, this.config._themeId || 'cats'
                ));
                this.scorePopups.push(new ARGame.ScorePopup(
                    this.target.spawnX, this.target.spawnY - visibleH - 10,
                    '+' + points,
                    this.config._themeId === 'aliens' ? 'rgb(100,255,150)' : 'rgb(255,200,100)'
                ));

                // Survival: earn ammo on hit
                if (mode === 'survival') {
                    this.ammo++;
                    this.pipEffects.push({ index: this.ammo - 1, time: t, type: 'gain' });
                }

                var edgeScale = 1.0 / cfg.PROCESS_SCALE;
                this.target.queueNextCandidate(cfg, cfg.SPAWN_DELAY, this.lastEdges, edgeScale);
            }
        } else {
            this.shots.push([null, null]);
        }

        if (!didHit) {
            this.streak = 0;
            this.crosshairRedUntil = t + 100;
            this.missEffects.push(new ARGame.MissMarker(this.crosshairX, this.crosshairY));
        }

        // Check game over conditions (survival handled in main loop)
        if (mode === 'classic' && this.ammo <= 0) {
            this.gameOver = true;
            this.gameOverTime = now();
        }
    };

    GameState.prototype.updateTime = function () {
        if (this.gameOver) return;
        this.gameTime = now() - this.gameStartTime;

        var cfg = this.config;

        // Time attack: end on timer
        if (cfg.GAME_MODE === 'timeAttack' && cfg.TIME_LIMIT && this.gameTime >= cfg.TIME_LIMIT) {
            this.gameOver = true;
            this.gameOverTime = now();
        }

        // Survival: increase difficulty over time
        if (cfg.GAME_MODE === 'survival') {
            this.survivalDespawnTime = Math.max(1.5, 4.0 - this.hits * 0.1);
        }
    };

    GameState.prototype.despawnCheck = function () {
        var cfg = this.config;
        var despawnTime = cfg.GAME_MODE === 'survival'
            ? this.survivalDespawnTime
            : cfg.TARGET_DESPAWN_TIME;

        if (!despawnTime || !this.target.active) return;
        if (!this.target.activatedTime) return;

        if (now() - this.target.activatedTime >= despawnTime) {
            // Target timed out — despawn and queue next
            var edgeScale = 1.0 / cfg.PROCESS_SCALE;
            this.target.queueNextCandidate(cfg, cfg.SPAWN_DELAY, this.lastEdges, edgeScale);
        }
    };

    // Clean up expired effects
    GameState.prototype.cleanEffects = function () {
        this.hitEffects = this.hitEffects.filter(function (e) { return e.isAlive(); });
        this.missEffects = this.missEffects.filter(function (e) { return e.isAlive(); });
        this.scorePopups = this.scorePopups.filter(function (e) { return e.isAlive(); });
        this.streakGlows = this.streakGlows.filter(function (e) { return e.isAlive(); });
        // Pip effects: keep for 200ms
        var now = performance.now();
        this.pipEffects = this.pipEffects.filter(function (e) { return now - e.time < 200; });
    };

    GameState.prototype.reset = function () {
        var cfg = this.config;
        this.score = 0;
        this.hits = 0;
        this.bullseyes = 0;
        this.ammo = cfg.MAX_AMMO;
        this.shots = [];
        this.lastShotTime = 0;
        this.target.reset();
        this.gameOver = false;
        this.gameOverTime = 0;
        this.showResults = false;
        this.flashUntil = 0;
        this.streak = 0;
        this.bestStreak = 0;
        this.gameStartTime = now();
        this.gameTime = 0;
        this.hitEffects = [];
        this.missEffects = [];
        this.scorePopups = [];
        this.streakGlows = [];
        this.pipEffects = [];
        this.shakeUntil = 0;
        this.crosshairRedUntil = 0;
        this.survivalDespawnTime = 4.0;
    };

    GameState.prototype.getTimeRemaining = function () {
        if (!this.config.TIME_LIMIT) return null;
        return Math.max(0, this.config.TIME_LIMIT - this.gameTime);
    };

    ARGame.GameState = GameState;
})();
