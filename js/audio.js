(function () {
    'use strict';

    function Audio() {
        this.ctx = null;
        this.theme = 'cats';
        this.enabled = true;
        this.volume = 0.3;
    }

    Audio.prototype._ensureContext = function () {
        if (!this.ctx) {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                this.enabled = false;
            }
        }
        // Resume suspended context (autoplay policy)
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    };

    Audio.prototype.setTheme = function (themeId) {
        this.theme = themeId;
    };

    Audio.prototype.play = function (soundName) {
        if (!this.enabled) return;
        var ctx = this._ensureContext();
        if (!ctx) return;

        switch (soundName) {
            case 'shoot': this._playShoot(ctx); break;
            case 'hit': this._playHit(ctx); break;
            case 'miss': this._playMiss(ctx); break;
            case 'appear': this._playAppear(ctx); break;
            case 'gameover': this._playGameOver(ctx); break;
            case 'uiclick': this._playUIClick(ctx); break;
        }
    };

    // Short click/pop
    Audio.prototype._playShoot = function (ctx) {
        var t = ctx.currentTime;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (this.theme === 'cats') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, t);
            osc.frequency.exponentialRampToValueAtTime(200, t + 0.06);
        } else {
            osc.type = 'square';
            osc.frequency.setValueAtTime(1200, t);
            osc.frequency.exponentialRampToValueAtTime(300, t + 0.05);
        }

        gain.gain.setValueAtTime(this.volume * 0.6, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc.start(t);
        osc.stop(t + 0.08);
    };

    // Satisfying rising ding (cats: soft mew-like, aliens: zap)
    Audio.prototype._playHit = function (ctx) {
        var t = ctx.currentTime;
        var vol = this.volume;

        if (this.theme === 'cats') {
            // Soft warm rising tone
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, t);
            osc.frequency.exponentialRampToValueAtTime(1200, t + 0.1);
            osc.frequency.exponentialRampToValueAtTime(900, t + 0.25);
            gain.gain.setValueAtTime(vol * 0.5, t);
            gain.gain.setValueAtTime(vol * 0.5, t + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            osc.start(t);
            osc.stop(t + 0.3);

            // Harmonic overtone
            var osc2 = ctx.createOscillator();
            var gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1200, t);
            osc2.frequency.exponentialRampToValueAtTime(2400, t + 0.1);
            gain2.gain.setValueAtTime(vol * 0.15, t);
            gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc2.start(t);
            osc2.stop(t + 0.2);
        } else {
            // Electronic zap
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, t);
            osc.frequency.exponentialRampToValueAtTime(2000, t + 0.05);
            osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);
            gain.gain.setValueAtTime(vol * 0.4, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc.start(t);
            osc.stop(t + 0.2);

            // High sparkle
            var osc2 = ctx.createOscillator();
            var gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(2500, t + 0.02);
            osc2.frequency.exponentialRampToValueAtTime(4000, t + 0.08);
            gain2.gain.setValueAtTime(vol * 0.15, t + 0.02);
            gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
            osc2.start(t + 0.02);
            osc2.stop(t + 0.12);
        }
    };

    // Quiet low thud
    Audio.prototype._playMiss = function (ctx) {
        var t = ctx.currentTime;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);
        gain.gain.setValueAtTime(this.volume * 0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);
    };

    // Soft whoosh
    Audio.prototype._playAppear = function (ctx) {
        var t = ctx.currentTime;
        // Noise-like whoosh via rapid frequency sweep
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (this.theme === 'cats') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(200, t);
            osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);
            osc.frequency.exponentialRampToValueAtTime(400, t + 0.3);
        } else {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.exponentialRampToValueAtTime(800, t + 0.12);
            osc.frequency.exponentialRampToValueAtTime(300, t + 0.25);
        }

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(this.volume * 0.2, t + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
    };

    // Descending tone
    Audio.prototype._playGameOver = function (ctx) {
        var t = ctx.currentTime;
        var vol = this.volume;

        var notes = this.theme === 'cats'
            ? [500, 400, 300, 200]
            : [800, 600, 400, 200];
        var type = this.theme === 'cats' ? 'sine' : 'sawtooth';

        for (var i = 0; i < notes.length; i++) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = type;
            var start = t + i * 0.15;
            osc.frequency.setValueAtTime(notes[i], start);
            gain.gain.setValueAtTime(vol * 0.35, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
            osc.start(start);
            osc.stop(start + 0.2);
        }
    };

    // Tiny tick
    Audio.prototype._playUIClick = function (ctx) {
        var t = ctx.currentTime;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, t);
        gain.gain.setValueAtTime(this.volume * 0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        osc.start(t);
        osc.stop(t + 0.03);
    };

    ARGame.Audio = Audio;
})();
