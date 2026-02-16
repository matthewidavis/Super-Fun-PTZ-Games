(function () {
    'use strict';

    // Shared easing functions
    ARGame.Easing = {
        easeOutQuad: function (t) {
            return 1 - (1 - t) * (1 - t);
        }
    };

    // Particle burst helper for hit effects
    function ParticleBurst(x, y, count, theme) {
        this.particles = [];
        this.startTime = performance.now();
        this.duration = 400; // ms
        this.theme = theme;

        for (var i = 0; i < count; i++) {
            var angle = (Math.PI * 2 * i / count) + (Math.random() - 0.5) * 0.5;
            var speed = 60 + Math.random() * 80;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 40, // bias upward
                size: 3 + Math.random() * 4,
                rotation: Math.random() * Math.PI * 2
            });
        }
    }

    ParticleBurst.prototype.isAlive = function () {
        return (performance.now() - this.startTime) < this.duration;
    };

    ParticleBurst.prototype.draw = function (ctx) {
        var elapsed = performance.now() - this.startTime;
        var progress = elapsed / this.duration;
        if (progress >= 1) return;

        var alpha = 1 - progress;
        var dt = elapsed / 1000;

        ctx.save();
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            var px = p.x + p.vx * dt;
            var py = p.y + p.vy * dt + 80 * dt * dt; // gravity
            var size = p.size * (1 - progress * 0.5);

            ctx.globalAlpha = alpha;

            if (this.theme === 'cats') {
                // Tiny paw prints
                ctx.fillStyle = 'rgb(255,150,180)';
                // Main pad
                ctx.beginPath();
                ctx.ellipse(px, py + 1, size * 0.6, size * 0.5, p.rotation, 0, Math.PI * 2);
                ctx.fill();
                // Three beans
                var beanR = size * 0.25;
                for (var b = -1; b <= 1; b++) {
                    ctx.beginPath();
                    ctx.arc(px + b * size * 0.4, py - size * 0.4, beanR, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                // Green energy sparks
                ctx.fillStyle = 'rgb(0,255,100)';
                ctx.beginPath();
                // Diamond shape
                ctx.moveTo(px, py - size);
                ctx.lineTo(px + size * 0.5, py);
                ctx.lineTo(px, py + size);
                ctx.lineTo(px - size * 0.5, py);
                ctx.closePath();
                ctx.fill();
                // Glow
                ctx.fillStyle = 'rgba(0,255,100,0.3)';
                ctx.beginPath();
                ctx.arc(px, py, size * 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    };

    // Score popup that floats upward and fades
    function ScorePopup(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.startTime = performance.now();
        this.duration = 600; // ms
    }

    ScorePopup.prototype.isAlive = function () {
        return (performance.now() - this.startTime) < this.duration;
    };

    ScorePopup.prototype.draw = function (ctx) {
        var elapsed = performance.now() - this.startTime;
        var progress = elapsed / this.duration;
        if (progress >= 1) return;

        var alpha = 1 - progress;
        var yOff = -40 * ARGame.Easing.easeOutQuad(progress);
        var scale = 1 + 0.3 * (1 - progress);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold ' + Math.round(22 * scale) + 'px Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Outline
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, this.x, this.y + yOff);
        // Fill
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, this.x, this.y + yOff);
        ctx.globalAlpha = 1;
        ctx.restore();
    };

    // Miss effect: X marker at crosshair
    function MissMarker(x, y) {
        this.x = x;
        this.y = y;
        this.startTime = performance.now();
        this.duration = 300;
    }

    MissMarker.prototype.isAlive = function () {
        return (performance.now() - this.startTime) < this.duration;
    };

    MissMarker.prototype.draw = function (ctx) {
        var elapsed = performance.now() - this.startTime;
        var progress = elapsed / this.duration;
        if (progress >= 1) return;

        var alpha = 1 - progress;
        var size = 8;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = 'rgb(255,60,60)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.x - size, this.y - size);
        ctx.lineTo(this.x + size, this.y + size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(this.x + size, this.y - size);
        ctx.lineTo(this.x - size, this.y + size);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
    };

    // Streak glow on screen edges
    function StreakGlow(milestone) {
        this.startTime = performance.now();
        this.duration = 500;
        this.intensity = Math.min(1, milestone / 10);
    }

    StreakGlow.prototype.isAlive = function () {
        return (performance.now() - this.startTime) < this.duration;
    };

    StreakGlow.prototype.draw = function (ctx, w, h, theme) {
        var elapsed = performance.now() - this.startTime;
        var progress = elapsed / this.duration;
        if (progress >= 1) return;

        var alpha = (1 - progress) * this.intensity * 0.4;
        var color = theme === 'cats' ? '255,180,50' : '0,255,100';
        var size = 40;

        ctx.save();
        // Top edge
        var grad = ctx.createLinearGradient(0, 0, 0, size);
        grad.addColorStop(0, 'rgba(' + color + ',' + alpha + ')');
        grad.addColorStop(1, 'rgba(' + color + ',0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, size);
        // Bottom edge
        grad = ctx.createLinearGradient(0, h, 0, h - size);
        grad.addColorStop(0, 'rgba(' + color + ',' + alpha + ')');
        grad.addColorStop(1, 'rgba(' + color + ',0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, h - size, w, size);
        // Left edge
        grad = ctx.createLinearGradient(0, 0, size, 0);
        grad.addColorStop(0, 'rgba(' + color + ',' + alpha + ')');
        grad.addColorStop(1, 'rgba(' + color + ',0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, h);
        // Right edge
        grad = ctx.createLinearGradient(w, 0, w - size, 0);
        grad.addColorStop(0, 'rgba(' + color + ',' + alpha + ')');
        grad.addColorStop(1, 'rgba(' + color + ',0)');
        ctx.fillStyle = grad;
        ctx.fillRect(w - size, 0, size, h);
        ctx.restore();
    };

    ARGame.ParticleBurst = ParticleBurst;
    ARGame.ScorePopup = ScorePopup;
    ARGame.MissMarker = MissMarker;
    ARGame.StreakGlow = StreakGlow;
})();
