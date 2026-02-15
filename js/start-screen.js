(function () {
    'use strict';

    var MODE_LIST = ['classic', 'timeAttack', 'survival'];

    function StartScreen() {
        this.selectedTheme = 0; // 0=cats, 1=aliens
        this.selectedMode = 0;  // 0=classic, 1=timeAttack, 2=survival
        this.selectedSource = 'browser'; // 'browser' or 'ip'
        this.particles = [];
        this.canvas = document.getElementById('particle-canvas');
        this.ctx = null;
        this.renderer = new ARGame.Renderer(new ARGame.ThemeConfig('cats'));
        this.audio = new ARGame.Audio();

        this._initParticles();
        this._initCardIcons();
        this._bindEvents();
        this._resizeCanvas();
        this._animateParticles();
        this._updateHighScoreDisplay();
        this._restoreIP();
    }

    StartScreen.prototype._initParticles = function () {
        for (var i = 0; i < 60; i++) {
            this.particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.8,
                vy: -(Math.random() * 0.6 + 0.2),
                radius: Math.random() * 3 + 1,
                brightness: Math.random() * 60 + 30
            });
        }
    };

    StartScreen.prototype._resizeCanvas = function () {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.ctx = this.canvas.getContext('2d');
    };

    StartScreen.prototype._initCardIcons = function () {
        var cards = document.querySelectorAll('.theme-card');
        for (var i = 0; i < cards.length; i++) {
            var iconCanvas = cards[i].querySelector('.card-icon');
            var iconCtx = iconCanvas.getContext('2d');
            if (cards[i].dataset.theme === 'cats') {
                this.renderer.drawMiniCat(iconCtx, 60, 50);
            } else {
                this.renderer.drawMiniAlien(iconCtx, 60, 50);
            }
        }
    };

    StartScreen.prototype._bindEvents = function () {
        var self = this;

        // Theme cards
        var themeCards = document.querySelectorAll('.theme-card');
        for (var i = 0; i < themeCards.length; i++) {
            (function (idx) {
                themeCards[idx].addEventListener('click', function () {
                    self._selectTheme(idx);
                    self.audio.play('uiclick');
                });
            })(i);
        }

        // Mode cards
        var modeCards = document.querySelectorAll('.mode-card');
        for (var i = 0; i < modeCards.length; i++) {
            (function (idx) {
                modeCards[idx].addEventListener('click', function () {
                    self._selectMode(idx);
                    self.audio.play('uiclick');
                });
            })(i);
        }

        // Start button click sound
        document.getElementById('start-btn').addEventListener('mousedown', function () {
            self.audio.play('uiclick');
        });

        // Source toggle buttons
        var sourceBtns = document.querySelectorAll('.source-btn');
        for (var j = 0; j < sourceBtns.length; j++) {
            (function (btn) {
                btn.addEventListener('click', function () {
                    self._selectSource(btn.dataset.source);
                    self.audio.play('uiclick');
                });
            })(sourceBtns[j]);
        }

        // Keyboard navigation
        document.addEventListener('keydown', function (e) {
            var screen = document.getElementById('start-screen');
            if (screen.style.display === 'none' || screen.classList.contains('fade-out')) return;

            // Don't intercept arrows when typing in IP input
            if (document.activeElement && document.activeElement.id === 'camera-ip') return;

            if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
                self._selectTheme(1 - self.selectedTheme);
                self.audio.play('uiclick');
            } else if (e.code === 'ArrowUp') {
                self._selectMode((self.selectedMode + MODE_LIST.length - 1) % MODE_LIST.length);
                self.audio.play('uiclick');
            } else if (e.code === 'ArrowDown') {
                self._selectMode((self.selectedMode + 1) % MODE_LIST.length);
                self.audio.play('uiclick');
            } else if (e.code === 'Tab') {
                e.preventDefault();
                self._selectSource(self.selectedSource === 'browser' ? 'ip' : 'browser');
                self.audio.play('uiclick');
            } else if (e.code === 'Enter' || e.code === 'Space') {
                document.getElementById('start-btn').click();
            }
        });
    };

    StartScreen.prototype._selectTheme = function (idx) {
        this.selectedTheme = idx;
        var cards = document.querySelectorAll('.theme-card');
        for (var i = 0; i < cards.length; i++) {
            cards[i].classList.toggle('selected', i === idx);
        }
        this._updateHighScoreDisplay();
    };

    StartScreen.prototype._selectMode = function (idx) {
        this.selectedMode = idx;
        var cards = document.querySelectorAll('.mode-card');
        for (var i = 0; i < cards.length; i++) {
            cards[i].classList.toggle('selected', i === idx);
        }
        this._updateHighScoreDisplay();
    };

    StartScreen.prototype._updateHighScoreDisplay = function () {
        var display = document.getElementById('high-scores-display');
        if (!display || !ARGame.HighScores) {
            if (display) display.innerHTML = '';
            return;
        }

        var mode = MODE_LIST[this.selectedMode];
        var theme = this.selectedTheme === 0 ? 'cats' : 'aliens';
        var scores = ARGame.HighScores.get(mode, theme);

        if (scores.length === 0) {
            display.innerHTML = '';
            return;
        }

        var html = '<div class="hs-title">HIGH SCORES (' + mode.toUpperCase() + ')</div>';
        for (var i = 0; i < scores.length; i++) {
            html += (i + 1) + '. ' + scores[i] + '  ';
        }
        display.innerHTML = html;
    };

    StartScreen.prototype._animateParticles = function () {
        var self = this;
        var w = this.canvas.width;
        var h = this.canvas.height;

        function loop() {
            var screen = document.getElementById('start-screen');
            if (screen.style.display === 'none') return;

            self.ctx.clearRect(0, 0, w, h);

            var base = self.selectedTheme === 0
                ? [255, 150, 50]
                : [0, 200, 80];

            for (var i = 0; i < self.particles.length; i++) {
                var p = self.particles[i];
                p.x += p.vx;
                p.y += p.vy;

                if (p.y < -5) {
                    p.y = h + Math.random() * 10;
                    p.x = Math.random() * w;
                }
                if (p.x < -5) p.x = w + 5;
                else if (p.x > w + 5) p.x = -5;

                var b = p.brightness / 255;
                self.ctx.beginPath();
                self.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                self.ctx.fillStyle = 'rgb(' +
                    ((base[0] * b) | 0) + ',' +
                    ((base[1] * b) | 0) + ',' +
                    ((base[2] * b) | 0) + ')';
                self.ctx.fill();
            }

            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);
    };

    StartScreen.prototype.getSelectedTheme = function () {
        return this.selectedTheme === 0 ? 'cats' : 'aliens';
    };

    StartScreen.prototype.getSelectedMode = function () {
        return MODE_LIST[this.selectedMode];
    };

    StartScreen.prototype.showError = function (msg) {
        document.getElementById('error-msg').textContent = msg;
    };

    StartScreen.prototype.hide = function () {
        var screen = document.getElementById('start-screen');
        screen.classList.add('fade-out');
        setTimeout(function () {
            screen.style.display = 'none';
        }, 300);
    };

    StartScreen.prototype.show = function () {
        var screen = document.getElementById('start-screen');
        screen.style.display = 'flex';
        screen.classList.remove('fade-out');
        this._updateHighScoreDisplay();
        this._animateParticles();
    };

    StartScreen.prototype._selectSource = function (source) {
        this.selectedSource = source;
        var btns = document.querySelectorAll('.source-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.toggle('selected', btns[i].dataset.source === source);
        }
        document.getElementById('browser-camera-row').style.display = source === 'browser' ? 'flex' : 'none';
        document.getElementById('ip-camera-row').style.display = source === 'ip' ? 'flex' : 'none';
    };

    StartScreen.prototype.getSelectedSource = function () {
        return this.selectedSource;
    };

    StartScreen.prototype.getIP = function () {
        var ip = (document.getElementById('camera-ip').value || '').trim();
        if (ip) {
            try { localStorage.setItem('funptz_camera_ip', ip); } catch (e) {}
        }
        return ip;
    };

    StartScreen.prototype._restoreIP = function () {
        try {
            var saved = localStorage.getItem('funptz_camera_ip');
            if (saved) {
                document.getElementById('camera-ip').value = saved;
            }
        } catch (e) {}
    };

    ARGame.StartScreen = StartScreen;
})();
