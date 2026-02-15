(function () {
    'use strict';

    function Renderer(theme) {
        this.theme = theme;
        this.radarAngle = 0;
        this.resultsStartTime = 0;
        this.resultsShownMarkers = 0;
    }

    // -- Main draw entry point --
    Renderer.prototype.drawFrame = function (ctx, gs) {
        var cfg = gs.config;
        var w = cfg.GAME_WIDTH;
        var h = cfg.GAME_HEIGHT;

        // Screen shake
        var shaking = performance.now() < gs.shakeUntil;
        if (shaking) {
            ctx.save();
            var sx = (Math.random() - 0.5) * 4;
            var sy = (Math.random() - 0.5) * 4;
            ctx.translate(sx, sy);
        }

        ctx.clearRect(-4, -4, w + 8, h + 8);

        if (gs.gameOver && gs.showResults) {
            if (!this.resultsStartTime) {
                this.resultsStartTime = performance.now();
                this.resultsShownMarkers = 0;
            }
            this.drawResults(ctx, gs);
            if (shaking) ctx.restore();
            return;
        }
        this.resultsStartTime = 0;

        // Streak glow (behind everything)
        for (var i = 0; i < gs.streakGlows.length; i++) {
            gs.streakGlows[i].draw(ctx, w, h, this.theme.themeId);
        }

        if (gs.target.active) {
            this.drawTarget(ctx, gs);
        }

        // Hit particle effects
        for (var i = 0; i < gs.hitEffects.length; i++) {
            gs.hitEffects[i].draw(ctx);
        }

        // Score popups
        for (var i = 0; i < gs.scorePopups.length; i++) {
            gs.scorePopups[i].draw(ctx);
        }

        // Muzzle flash (themed)
        var t = performance.now();
        if (t < gs.flashUntil) {
            var cx = gs.crosshairX, cy = gs.crosshairY;
            if (this.theme.themeId === 'cats') {
                ctx.beginPath();
                ctx.arc(cx, cy, 12, 0, Math.PI * 2);
                ctx.fillStyle = this.theme.colorFlashInner;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(cx, cy, 8, 0, Math.PI * 2);
                ctx.fillStyle = this.theme.colorFlashOuter;
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(cx, cy, 18, 0, Math.PI * 2);
                ctx.fillStyle = this.theme.colorFlashInner;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(cx, cy, 12, 0, Math.PI * 2);
                ctx.fillStyle = this.theme.colorFlashOuter;
                ctx.fill();
            }
        }

        // Miss X markers
        for (var i = 0; i < gs.missEffects.length; i++) {
            gs.missEffects[i].draw(ctx);
        }

        this.drawCrosshair(ctx, gs);
        this.drawHUD(ctx, gs);

        if (gs.debugMode) {
            this.drawDebug(ctx, gs);
        }

        // Clean expired effects
        gs.cleanEffects();

        if (shaking) ctx.restore();
    };

    // -- Crosshairs --
    Renderer.prototype.drawCrosshair = function (ctx, gs) {
        // Red flash on miss
        var isRed = performance.now() < gs.crosshairRedUntil;

        if (this.theme.crosshairStyle === 'paw') {
            this.drawCrosshairPaw(ctx, gs, isRed);
        } else {
            this.drawCrosshairRadar(ctx, gs, isRed);
        }
    };

    Renderer.prototype.drawCrosshairPaw = function (ctx, gs, isRed) {
        var cfg = gs.config;
        var cx = gs.crosshairX, cy = gs.crosshairY;
        var r = cfg.CROSSHAIR_GAP;
        var pink = isRed ? 'rgb(255,60,60)' : 'rgb(255,150,180)';
        var outline = 'rgb(0,0,0)';
        var ol = Math.max(2, Math.round(r * 0.06));

        var padW = Math.max(8, Math.round(r * 0.45));
        var padH = Math.max(7, Math.round(r * 0.38));

        ctx.beginPath();
        ctx.ellipse(cx, cy + 4, padW + ol, padH + ol, 0, 0, Math.PI * 2);
        ctx.fillStyle = outline;
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(cx, cy + 4, padW, padH, 0, 0, Math.PI * 2);
        ctx.fillStyle = pink;
        ctx.fill();

        var beanR = Math.max(4, Math.round(r * 0.17));
        var beanY = cy - padH - beanR + 3;
        var offsets = [-padW + 3, 0, padW - 3];
        for (var i = 0; i < 3; i++) {
            var bx = cx + offsets[i];
            ctx.beginPath();
            ctx.arc(bx, beanY, beanR + ol, 0, Math.PI * 2);
            ctx.fillStyle = outline;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(bx, beanY, beanR, 0, Math.PI * 2);
            ctx.fillStyle = pink;
            ctx.fill();
        }
    };

    Renderer.prototype.drawCrosshairRadar = function (ctx, gs, isRed) {
        var cfg = gs.config;
        var cx = gs.crosshairX, cy = gs.crosshairY;
        var bracket = cfg.CROSSHAIR_GAP;
        var arm = cfg.CROSSHAIR_LENGTH;
        var color = isRed ? 'rgb(255,60,60)' : 'rgb(0,200,0)';
        var dim = isRed ? 'rgb(180,30,30)' : 'rgb(0,100,0)';
        var blen = Math.max(8, (bracket / 3) | 0);

        var corners = [
            [cx - bracket, cy - bracket, blen, 0, 0, blen],
            [cx + bracket, cy - bracket, -blen, 0, 0, blen],
            [cx - bracket, cy + bracket, blen, 0, 0, -blen],
            [cx + bracket, cy + bracket, -blen, 0, 0, -blen],
        ];
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        for (var i = 0; i < corners.length; i++) {
            var c = corners[i];
            ctx.beginPath();
            ctx.moveTo(c[0], c[1]);
            ctx.lineTo(c[0] + c[2], c[1] + c[3]);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(c[0], c[1]);
            ctx.lineTo(c[0] + c[4], c[1] + c[5]);
            ctx.stroke();
        }

        ctx.strokeStyle = dim;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - bracket + blen, cy);
        ctx.lineTo(cx + bracket - blen, cy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy - bracket + blen);
        ctx.lineTo(cx, cy + bracket - blen);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        this.radarAngle += 0.05;
        var sweepLen = bracket - 4;
        var ex = cx + sweepLen * Math.cos(this.radarAngle);
        var ey = cy + sweepLen * Math.sin(this.radarAngle);
        ctx.strokeStyle = isRed ? 'rgb(255,100,100)' : 'rgb(0,255,0)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.fillRect(cx - 1, cy - bracket - arm, 2, arm);
        ctx.fillRect(cx - 1, cy + bracket, 2, arm);
        ctx.fillRect(cx - bracket - arm, cy - 1, arm, 2);
        ctx.fillRect(cx + bracket, cy - 1, arm, 2);
    };

    // -- Target sprites with easing + idle animation --
    Renderer.prototype.drawTarget = function (ctx, gs) {
        if (this.theme.themeId === 'cats') {
            this.drawTargetCat(ctx, gs);
        } else {
            this.drawTargetAlien(ctx, gs);
        }
    };

    Renderer.prototype.drawTargetCat = function (ctx, gs) {
        var cfg = gs.config;
        var t = gs.target;
        var fullH = cfg.TARGET_HEIGHT;

        // Apply ease-out-quad to rise (gentler than easeOutBack, no overshoot)
        var rawT = t.targetHeight / cfg.TARGET_MAX_HEIGHT;
        var easedT = rawT >= 1 ? 1 : ARGame.Easing.easeOutQuad(Math.min(1, rawT));
        var visibleH = (easedT * fullH) | 0;
        if (visibleH < 4) return;

        var tw = cfg.TARGET_WIDTH;
        var s = tw / 60.0;

        // Idle sway: gentle horizontal sine when fully risen
        var idleOffX = 0;
        if (rawT >= 1) {
            idleOffX = Math.sin(performance.now() / 500) * 2;
        }

        var tx = t.spawnX - (tw >> 1) + idleOffX;
        var ty = t.spawnY - visibleH;

        ctx.save();
        ctx.beginPath();
        ctx.rect(tx, ty, tw, visibleH);
        ctx.clip();

        var bottom = t.spawnY;
        var cx = t.spawnX + idleOffX;

        // --- Paws ---
        var pawY = bottom - Math.round(8 * s);
        var pawW = Math.round(10 * s);
        var pawH = Math.round(10 * s);
        for (var side = -1; side <= 1; side += 2) {
            var px = cx + side * Math.round(14 * s) - (pawW >> 1);
            ctx.beginPath();
            ctx.ellipse(px + (pawW >> 1), pawY + (pawH >> 1), pawW >> 1, pawH >> 1, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgb(230,150,50)';
            ctx.fill();
            var beanR = Math.max(1, Math.round(2 * s));
            for (var bi = 0; bi < 3; bi++) {
                var bx = px + (pawW >> 2) + bi * ((pawW / 3) | 0);
                var by = pawY + Math.round(2 * s);
                ctx.beginPath();
                ctx.arc(bx, by, beanR, 0, Math.PI * 2);
                ctx.fillStyle = 'rgb(240,130,150)';
                ctx.fill();
            }
            ctx.beginPath();
            ctx.ellipse(px + (pawW >> 1), pawY + Math.round(6 * s), pawW >> 2, Math.round(2 * s), 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgb(240,130,150)';
            ctx.fill();
        }

        // --- Head ---
        var headR = Math.round(22 * s);
        var headCY = bottom - Math.round(38 * s);
        ctx.beginPath();
        ctx.arc(cx, headCY, headR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(230,150,50)';
        ctx.fill();

        // --- Ears ---
        for (var side = -1; side <= 1; side += 2) {
            var earCX = cx + side * Math.round(15 * s);
            var earTipY = headCY - headR - Math.round(4 * s);
            var earBaseY = headCY - Math.round(12 * s);
            var earW = Math.round(12 * s);

            ctx.beginPath();
            ctx.moveTo(earCX - side * (earW >> 1), earBaseY);
            ctx.lineTo(earCX + side * Math.round(2 * s), earTipY);
            ctx.lineTo(earCX + side * (earW >> 1), earBaseY);
            ctx.closePath();
            ctx.fillStyle = 'rgb(230,150,50)';
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(earCX - side * ((earW / 3) | 0), earBaseY + Math.round(2 * s));
            ctx.lineTo(earCX + side * Math.round(2 * s), earTipY + Math.round(4 * s));
            ctx.lineTo(earCX + side * ((earW / 3) | 0), earBaseY + Math.round(2 * s));
            ctx.closePath();
            ctx.fillStyle = 'rgb(240,140,160)';
            ctx.fill();
        }

        // --- Eyes (with blink) ---
        var eyeY = headCY - Math.round(2 * s);
        var eyeR = Math.round(6 * s);
        var blinkCycle = (performance.now() % 3000);
        var isBlinking = blinkCycle > 2800;

        for (var side = -1; side <= 1; side += 2) {
            var ex = cx + side * Math.round(9 * s);
            if (isBlinking) {
                // Closed eyes
                ctx.strokeStyle = 'rgb(60,40,20)';
                ctx.lineWidth = Math.max(1, Math.round(2 * s));
                ctx.beginPath();
                ctx.arc(ex, eyeY, eyeR * 0.6, 0, Math.PI);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
                ctx.fillStyle = 'rgb(50,200,50)';
                ctx.fill();
                ctx.strokeStyle = 'rgb(0,0,0)';
                ctx.lineWidth = Math.max(1, Math.round(2 * s));
                ctx.beginPath();
                ctx.moveTo(ex, eyeY - Math.round(4 * s));
                ctx.lineTo(ex, eyeY + Math.round(4 * s));
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(ex - Math.round(2 * s), eyeY - Math.round(2 * s), Math.max(1, Math.round(1.5 * s)), 0, Math.PI * 2);
                ctx.fillStyle = 'rgb(220,255,220)';
                ctx.fill();
            }
        }

        // --- Nose ---
        var noseY = headCY + Math.round(5 * s);
        var nr = Math.max(2, Math.round(3 * s));
        ctx.beginPath();
        ctx.moveTo(cx, noseY);
        ctx.lineTo(cx - nr, noseY + nr);
        ctx.lineTo(cx + nr, noseY + nr);
        ctx.closePath();
        ctx.fillStyle = 'rgb(240,120,140)';
        ctx.fill();

        // --- Whiskers ---
        var whY = headCY + Math.round(8 * s);
        var whLen = Math.round(18 * s);
        ctx.strokeStyle = 'rgb(200,200,200)';
        ctx.lineWidth = 1;
        for (var side = -1; side <= 1; side += 2) {
            var wx = cx + side * Math.round(10 * s);
            for (var di = -1; di <= 1; di += 2) {
                var dy = di * Math.round(2 * s);
                ctx.beginPath();
                ctx.moveTo(wx, whY + dy);
                ctx.lineTo(wx + side * whLen, whY + dy * 2);
                ctx.stroke();
            }
        }

        ctx.restore();
    };

    Renderer.prototype.drawTargetAlien = function (ctx, gs) {
        var cfg = gs.config;
        var t = gs.target;
        var fullH = cfg.TARGET_HEIGHT;

        // Apply ease-out-quad to rise (gentler than easeOutBack, no overshoot)
        var rawT = t.targetHeight / cfg.TARGET_MAX_HEIGHT;
        var easedT = rawT >= 1 ? 1 : ARGame.Easing.easeOutQuad(Math.min(1, rawT));
        var visibleH = (easedT * fullH) | 0;
        if (visibleH < 4) return;

        var tw = cfg.TARGET_WIDTH;
        var s = tw / 60.0;

        // Idle bob: vertical sine when fully risen
        var idleOffY = 0;
        if (rawT >= 1) {
            idleOffY = Math.sin(performance.now() / 600) * 2;
        }

        var tx = t.spawnX - (tw >> 1);
        var ty = t.spawnY - visibleH + idleOffY;

        ctx.save();
        ctx.beginPath();
        ctx.rect(tx, ty, tw, visibleH);
        ctx.clip();

        var bottom = t.spawnY + idleOffY;
        var cx = t.spawnX;

        // --- Fingers ---
        var fingerH = Math.round(12 * s);
        var fingerW = Math.max(2, Math.round(3 * s));
        for (var side = -1; side <= 1; side += 2) {
            var baseX = cx + side * Math.round(16 * s);
            for (var fi = 0; fi < 3; fi++) {
                var fx = baseX + (fi - 1) * Math.round(5 * s);
                var fy = bottom - fingerH;
                ctx.beginPath();
                ctx.ellipse(fx, fy + (fingerH >> 1), fingerW, fingerH >> 1, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgb(80,200,80)';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(fx, fy + Math.round(2 * s), Math.max(1, Math.round(1.5 * s)), 0, Math.PI * 2);
                ctx.fillStyle = 'rgb(120,230,120)';
                ctx.fill();
            }
        }

        // --- Head ---
        var headW = Math.round(22 * s);
        var headH = Math.round(30 * s);
        var headCY = bottom - Math.round(42 * s);
        ctx.beginPath();
        ctx.ellipse(cx, headCY, headW, headH, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(80,200,80)';
        ctx.fill();
        ctx.strokeStyle = 'rgb(50,150,50)';
        ctx.lineWidth = Math.max(1, Math.round(s));
        ctx.stroke();

        // --- Eyes (with pulsing glow) ---
        var eyeY = headCY - Math.round(4 * s);
        var eyeW = Math.round(10 * s);
        var eyeH = Math.round(7 * s);
        var glowPulse = 0.5 + 0.5 * Math.sin(performance.now() / 400);

        for (var side = -1; side <= 1; side += 2) {
            var ex = cx + side * Math.round(10 * s);
            // Glow behind eye
            if (rawT >= 1) {
                ctx.beginPath();
                ctx.ellipse(ex, eyeY, eyeW + 3, eyeH + 3, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0,255,80,' + (glowPulse * 0.3).toFixed(2) + ')';
                ctx.fill();
            }
            ctx.beginPath();
            ctx.ellipse(ex, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgb(0,0,0)';
            ctx.fill();
            var irisR = Math.round(3 * s);
            ctx.beginPath();
            ctx.arc(ex, eyeY, irisR, 0, Math.PI * 2);
            ctx.fillStyle = 'rgb(0,180,0)';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(ex - Math.round(2 * s), eyeY - Math.round(2 * s), Math.max(1, Math.round(1.5 * s)), 0, Math.PI * 2);
            ctx.fillStyle = 'rgb(200,255,200)';
            ctx.fill();
        }

        // --- Mouth ---
        var mouthY = headCY + Math.round(10 * s);
        var mouthW = Math.round(6 * s);
        ctx.strokeStyle = 'rgb(40,120,40)';
        ctx.lineWidth = Math.max(1, Math.round(s));
        ctx.beginPath();
        ctx.arc(cx, mouthY, mouthW, 0, Math.PI);
        ctx.stroke();

        ctx.restore();
    };

    // -- HUD --
    Renderer.prototype.drawHUD = function (ctx, gs) {
        var cfg = gs.config;
        var th = this.theme;
        var mode = cfg.GAME_MODE;
        var barH = 45;
        var yPos = cfg.GAME_HEIGHT - 40;

        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, cfg.GAME_HEIGHT - barH, cfg.GAME_WIDTH, barH);

        ctx.font = 'bold 20px Consolas, Courier New, monospace';
        ctx.textBaseline = 'top';

        // Score (left)
        ctx.fillStyle = th.colorHudText;
        ctx.fillText(th.scoreNoun + ': ' + gs.score, 20, yPos);

        // Mode-specific right side
        if (mode === 'timeAttack') {
            // Timer
            var remaining = gs.getTimeRemaining();
            if (remaining !== null) {
                var secs = Math.ceil(remaining);
                var timerColor = secs <= 10 ? 'rgb(255,80,80)' : th.colorHudText;
                ctx.fillStyle = timerColor;
                ctx.fillText('Time: ' + secs + 's', cfg.GAME_WIDTH - 180, yPos);
            }
        } else {
            // Ammo text
            ctx.fillStyle = th.colorHudText;
            ctx.fillText(th.ammoNoun + ': ' + gs.ammo, cfg.GAME_WIDTH - 180, yPos);
        }

        // Ammo pips (classic + survival)
        if (mode !== 'timeAttack') {
            var pipCount = mode === 'survival' ? Math.max(gs.ammo, 10) : cfg.MAX_AMMO;
            var pipStartX = (cfg.GAME_WIDTH >> 1) - (pipCount * 8);
            var nowMs = performance.now();

            for (var i = 0; i < pipCount; i++) {
                var pipX = pipStartX + i * 16;
                var pipY = yPos + 8;
                var pipR = 4;
                var pipColor = i < gs.ammo ? th.colorHudAmmoFull : th.colorHudAmmoEmpty;

                // Check pip effects
                for (var ei = 0; ei < gs.pipEffects.length; ei++) {
                    var eff = gs.pipEffects[ei];
                    if (eff.index === i) {
                        var elapsed = nowMs - eff.time;
                        var progress = elapsed / 200;
                        if (progress < 1) {
                            if (eff.type === 'empty') {
                                pipR = 4 * (1 - progress * 0.5);
                                pipColor = 'rgb(255,60,60)';
                            } else {
                                pipR = 4 * (1 + (1 - progress) * 0.5);
                                pipColor = 'rgb(60,255,60)';
                            }
                        }
                    }
                }

                ctx.beginPath();
                ctx.arc(pipX, pipY, pipR, 0, Math.PI * 2);
                ctx.fillStyle = pipColor;
                ctx.fill();
            }
        }

        // Streak display (when >= 2)
        if (gs.streak >= 2) {
            ctx.font = 'bold 24px Consolas, Courier New, monospace';
            ctx.fillStyle = th.colorScore;
            ctx.textAlign = 'center';
            ctx.fillText(gs.streak + 'x!', cfg.GAME_WIDTH >> 1, yPos - 30);
            ctx.textAlign = 'left';
        }

        // Frame time
        ctx.font = '14px Consolas, Courier New, monospace';
        ctx.fillStyle = 'rgb(150,150,150)';
        ctx.fillText(gs.frameTimeMs.toFixed(0) + 'ms', (cfg.GAME_WIDTH >> 1) - 20, yPos + 20);
    };

    // -- Debug overlay --
    Renderer.prototype.drawDebug = function (ctx, gs) {
        var cfg = gs.config;
        var sx = 1.0 / cfg.PROCESS_SCALE;

        if (gs.lastEdges) {
            var edgeCount = Math.min(gs.lastEdges.length, 8);
            for (var i = 0; i < edgeCount; i++) {
                var edge = gs.lastEdges[i];
                var x0s = (edge[0] * sx) | 0;
                var y0s = (edge[1] * sx) | 0;
                var x1s = (edge[2] * sx) | 0;
                var y1s = (edge[3] * sx) | 0;
                var cxs = (edge[5] * sx) | 0;
                var cys = (edge[6] * sx) | 0;

                ctx.strokeStyle = 'rgb(255,100,0)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x0s, y0s);
                ctx.lineTo(x1s, y1s);
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(cxs, cys, 5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgb(0,0,255)';
                ctx.fill();
            }

            if (gs.target.prevPoiX > 0) {
                ctx.strokeStyle = 'rgb(255,0,255)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(gs.target.prevPoiX, gs.target.prevPoiY, 8, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        var state = gs.target.active ? 'LOCKED' : 'scanning';
        var lines = [
            'State: ' + state + '  PoI: ' + gs.target.poiCount,
            'Threshold: ' + cfg.DETECTION_THRESHOLD,
            'Edges: ' + (gs.lastEdges ? gs.lastEdges.length : 0),
            'Mode: ' + cfg.GAME_MODE + '  Streak: ' + gs.streak,
        ];
        ctx.font = '14px Consolas, monospace';
        ctx.fillStyle = 'rgb(0,255,0)';
        for (var i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], 10, 20 + i * 18);
        }
    };

    // -- Results screen --
    Renderer.prototype.drawResults = function (ctx, gs) {
        if (this.theme.themeId === 'cats') {
            this.drawResultsCat(ctx, gs);
        } else {
            this.drawResultsAlien(ctx, gs);
        }
    };

    Renderer.prototype.drawResultsCat = function (ctx, gs) {
        var cfg = gs.config;
        var th = this.theme;
        var cx = cfg.GAME_WIDTH >> 1;
        var cy = (cfg.GAME_HEIGHT >> 1) - 10;
        var radius = 140;

        // Fade-in overlay
        var fadeElapsed = performance.now() - this.resultsStartTime;
        var fadeAlpha = Math.min(1, fadeElapsed / 500);
        ctx.globalAlpha = fadeAlpha;

        ctx.fillStyle = 'rgba(40,20,10,0.75)';
        ctx.fillRect(0, 0, cfg.GAME_WIDTH, cfg.GAME_HEIGHT);

        // Yarn ball
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(220,140,160)';
        ctx.fill();
        var grad = ctx.createRadialGradient(cx - 30, cy - 30, 20, cx, cy, radius);
        grad.addColorStop(0, 'rgba(255,180,200,0.4)');
        grad.addColorStop(1, 'rgba(140,60,80,0.5)');
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = 'rgba(200,100,130,0.6)';
        ctx.lineWidth = 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.clip();
        for (var a = 0; a < Math.PI; a += 0.35) {
            ctx.beginPath();
            ctx.ellipse(cx, cy, radius * 0.95, radius * 0.3, a, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgb(180,90,110)';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.strokeStyle = 'rgb(220,140,160)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx + radius * 0.7, cy + radius * 0.7);
        ctx.quadraticCurveTo(cx + radius + 20, cy + radius * 0.5, cx + radius + 35, cy + radius * 0.9);
        ctx.quadraticCurveTo(cx + radius + 40, cy + radius + 10, cx + radius + 15, cy + radius + 20);
        ctx.stroke();
        ctx.lineCap = 'butt';

        // Staggered shot markers
        var markerCount = Math.min(gs.shots.length, Math.floor(fadeElapsed / 100));
        this.resultsShownMarkers = markerCount;
        var scaleX = (radius * 2) / cfg.TARGET_WIDTH;
        var scaleY = (radius * 2) / cfg.TARGET_HEIGHT;
        var ox = cx - radius;
        var oy = cy - radius;
        for (var i = 0; i < markerCount; i++) {
            var relX = gs.shots[i][0];
            var relY = gs.shots[i][1];
            if (relX !== null) {
                var sx = ox + (relX * scaleX) | 0;
                var sy = oy + (relY * scaleY) | 0;
                ctx.fillStyle = th.colorMarker;
                ctx.beginPath();
                ctx.ellipse(sx, sy + 2, 5, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                for (var b = -1; b <= 1; b++) {
                    ctx.beginPath();
                    ctx.arc(sx + b * 4, sy - 4, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.strokeStyle = th.colorMarkerOutline;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.ellipse(sx, sy + 2, 5, 4, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Sleeping cat (with gentle rock)
        var rockAngle = Math.sin(performance.now() / 1200) * 0.03;
        var catX = cx;
        var catY = cy - radius - 15;
        ctx.save();
        ctx.translate(catX, catY);
        ctx.rotate(rockAngle);
        ctx.translate(-catX, -catY);
        ctx.beginPath();
        ctx.ellipse(catX, catY + 5, 35, 18, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(230,150,50)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(catX - 22, catY - 2, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(catX - 32, catY - 10); ctx.lineTo(catX - 28, catY - 24); ctx.lineTo(catX - 22, catY - 10);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(catX - 22, catY - 10); ctx.lineTo(catX - 16, catY - 22); ctx.lineTo(catX - 12, catY - 8);
        ctx.fill();
        ctx.strokeStyle = 'rgb(60,40,20)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(catX - 27, catY - 2, 3, 0, Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(catX - 18, catY - 2, 3, 0, Math.PI);
        ctx.stroke();
        ctx.strokeStyle = 'rgb(230,150,50)';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(catX + 30, catY + 5);
        ctx.quadraticCurveTo(catX + 45, catY - 20, catX + 25, catY - 25);
        ctx.stroke();
        ctx.lineCap = 'butt';
        ctx.restore();

        // Floating Zzz
        var zFloat = Math.sin(performance.now() / 800) * 3;
        ctx.font = 'bold 18px Consolas, monospace';
        ctx.fillStyle = 'rgba(255,200,100,0.7)';
        ctx.textAlign = 'left';
        ctx.fillText('z', catX - 8, catY - 22 + zFloat);
        ctx.font = 'bold 14px Consolas, monospace';
        ctx.fillText('z', catX - 3, catY - 32 + zFloat * 0.7);
        ctx.font = 'bold 11px Consolas, monospace';
        ctx.fillText('z', catX + 1, catY - 40 + zFloat * 0.5);

        this._drawResultsText(ctx, gs);
        ctx.globalAlpha = 1;
    };

    Renderer.prototype.drawResultsAlien = function (ctx, gs) {
        var cfg = gs.config;
        var th = this.theme;
        var cx = cfg.GAME_WIDTH >> 1;
        var cy = (cfg.GAME_HEIGHT >> 1) - 10;
        var radius = 140;

        var fadeElapsed = performance.now() - this.resultsStartTime;
        var fadeAlpha = Math.min(1, fadeElapsed / 500);
        ctx.globalAlpha = fadeAlpha;

        ctx.fillStyle = 'rgba(0,15,5,0.8)';
        ctx.fillRect(0, 0, cfg.GAME_WIDTH, cfg.GAME_HEIGHT);

        ctx.beginPath();
        ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(0,40,10)';
        ctx.fill();
        ctx.strokeStyle = 'rgb(0,120,40)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(0,100,30,0.5)';
        ctx.lineWidth = 1;
        for (var r = 35; r <= radius; r += 35) {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius);
        ctx.stroke();
        var d = radius * 0.707;
        ctx.strokeStyle = 'rgba(0,80,25,0.3)';
        ctx.beginPath();
        ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx + d, cy + d);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + d, cy - d); ctx.lineTo(cx - d, cy + d);
        ctx.stroke();

        var sweepAngle = this.radarAngle * 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, sweepAngle - 0.5, sweepAngle, false);
        ctx.closePath();
        var sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        sweepGrad.addColorStop(0, 'rgba(0,255,80,0.3)');
        sweepGrad.addColorStop(1, 'rgba(0,255,80,0.05)');
        ctx.fillStyle = sweepGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,255,80,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(sweepAngle) * radius, cy + Math.sin(sweepAngle) * radius);
        ctx.stroke();
        ctx.restore();

        // Staggered shot markers
        var markerCount = Math.min(gs.shots.length, Math.floor(fadeElapsed / 100));
        var scaleX = (radius * 2) / cfg.TARGET_WIDTH;
        var scaleY = (radius * 2) / cfg.TARGET_HEIGHT;
        var ox = cx - radius;
        var oy = cy - radius;
        for (var i = 0; i < markerCount; i++) {
            var relX = gs.shots[i][0];
            var relY = gs.shots[i][1];
            if (relX !== null) {
                var sx = ox + (relX * scaleX) | 0;
                var sy = oy + (relY * scaleY) | 0;
                ctx.beginPath();
                ctx.arc(sx, sy, 8, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0,255,80,0.2)';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(sx, sy, 4, 0, Math.PI * 2);
                ctx.fillStyle = th.colorMarker;
                ctx.fill();
                ctx.strokeStyle = th.colorMarkerOutline;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(sx, sy - 6);
                ctx.lineTo(sx + 6, sy);
                ctx.lineTo(sx, sy + 6);
                ctx.lineTo(sx - 6, sy);
                ctx.closePath();
                ctx.stroke();
            }
        }

        // UFO with cycling lights
        var ux = cx;
        var uy = cy - radius - 25;
        ctx.fillStyle = 'rgba(0,255,80,0.08)';
        ctx.beginPath();
        ctx.moveTo(ux - 10, uy + 8);
        ctx.lineTo(ux - 30, uy + 50);
        ctx.lineTo(ux + 30, uy + 50);
        ctx.lineTo(ux + 10, uy + 8);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(ux, uy, 30, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(60,60,70)';
        ctx.fill();
        ctx.strokeStyle = 'rgb(0,200,80)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(ux, uy - 4, 14, 10, 0, Math.PI, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,255,100,0.3)';
        ctx.fill();
        ctx.strokeStyle = 'rgb(0,200,80)';
        ctx.stroke();
        // Cycling lights
        var lightPhase = (performance.now() / 200) | 0;
        for (var li = -2; li <= 2; li++) {
            ctx.beginPath();
            ctx.arc(ux + li * 10, uy + 2, 2, 0, Math.PI * 2);
            ctx.fillStyle = ((li + lightPhase) % 2 === 0) ? 'rgb(0,255,80)' : 'rgb(0,100,40)';
            ctx.fill();
        }

        this._drawResultsText(ctx, gs);
        ctx.globalAlpha = 1;
    };

    Renderer.prototype._drawResultsText = function (ctx, gs) {
        var cfg = gs.config;
        var th = this.theme;
        var mode = cfg.GAME_MODE;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Title
        ctx.font = 'bold 48px Consolas, Courier New, monospace';
        ctx.fillStyle = th.colorHudText;
        ctx.fillText(th.gameOverTitle, cfg.GAME_WIDTH >> 1, 15);

        // Score summary — mode-aware
        ctx.font = 'bold 24px Consolas, Courier New, monospace';
        ctx.fillStyle = th.colorScore;
        var bottomY = cfg.GAME_HEIGHT - 90;

        if (mode === 'classic') {
            ctx.fillText(th.resultsSummary + ': ' + gs.hits + ' / ' + ARGame.ModePresets.classic.MAX_AMMO,
                cfg.GAME_WIDTH >> 1, bottomY);
        } else if (mode === 'timeAttack') {
            ctx.fillText('Hits: ' + gs.hits + '  Score: ' + gs.score,
                cfg.GAME_WIDTH >> 1, bottomY);
        } else {
            ctx.fillText('Hits: ' + gs.hits + '  Score: ' + gs.score,
                cfg.GAME_WIDTH >> 1, bottomY);
        }

        // Stats line
        ctx.font = '18px Consolas, Courier New, monospace';
        ctx.fillStyle = 'rgb(180,180,180)';
        var statsLine = 'Bullseyes: ' + gs.bullseyes;
        if (gs.bestStreak > 1) {
            statsLine += '  Best streak: ' + gs.bestStreak;
        }
        ctx.fillText(statsLine, cfg.GAME_WIDTH >> 1, bottomY + 28);

        // High score notification
        var hs = ARGame.HighScores ? ARGame.HighScores.check(mode, th.themeId, gs.score) : false;
        if (hs) {
            ctx.font = 'bold 20px Consolas, Courier New, monospace';
            var flashAlpha = 0.5 + 0.5 * Math.sin(performance.now() / 200);
            ctx.fillStyle = 'rgba(255,255,0,' + flashAlpha.toFixed(2) + ')';
            ctx.fillText('NEW HIGH SCORE!', cfg.GAME_WIDTH >> 1, bottomY + 52);
        }

        // Restart hint
        ctx.font = 'bold 20px Consolas, Courier New, monospace';
        ctx.fillStyle = 'rgb(200,200,200)';
        ctx.fillText('Press R to restart', cfg.GAME_WIDTH >> 1, cfg.GAME_HEIGHT - 25);

        ctx.textAlign = 'left';
    };

    // -- Mini icons for start screen cards --
    Renderer.prototype.drawMiniCat = function (ctx, cx, cy) {
        ctx.beginPath();
        ctx.arc(cx, cy, 32, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(230,150,50)';
        ctx.fill();
        var ears = [
            [[cx - 28, cy - 18], [cx - 18, cy - 46], [cx - 7, cy - 18]],
            [[cx + 28, cy - 18], [cx + 18, cy - 46], [cx + 7, cy - 18]],
        ];
        for (var e = 0; e < ears.length; e++) {
            ctx.beginPath();
            ctx.moveTo(ears[e][0][0], ears[e][0][1]);
            ctx.lineTo(ears[e][1][0], ears[e][1][1]);
            ctx.lineTo(ears[e][2][0], ears[e][2][1]);
            ctx.closePath();
            ctx.fillStyle = 'rgb(230,150,50)';
            ctx.fill();
        }
        var innerEars = [
            [[cx - 25, cy - 19], [cx - 18, cy - 40], [cx - 10, cy - 19]],
            [[cx + 25, cy - 19], [cx + 18, cy - 40], [cx + 10, cy - 19]],
        ];
        for (var e = 0; e < innerEars.length; e++) {
            ctx.beginPath();
            ctx.moveTo(innerEars[e][0][0], innerEars[e][0][1]);
            ctx.lineTo(innerEars[e][1][0], innerEars[e][1][1]);
            ctx.lineTo(innerEars[e][2][0], innerEars[e][2][1]);
            ctx.closePath();
            ctx.fillStyle = 'rgb(240,140,160)';
            ctx.fill();
        }
        ctx.beginPath();
        ctx.ellipse(cx - 11, cy - 2, 6.5, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(50,180,50)';
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 11, cy - 2, 6.5, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(50,180,50)';
        ctx.fill();
        ctx.strokeStyle = 'rgb(0,0,0)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx - 12, cy - 7); ctx.lineTo(cx - 12, cy + 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 11, cy - 7); ctx.lineTo(cx + 11, cy + 4); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy + 6);
        ctx.lineTo(cx - 5, cy + 12);
        ctx.lineTo(cx + 5, cy + 12);
        ctx.closePath();
        ctx.fillStyle = 'rgb(240,120,140)';
        ctx.fill();
        ctx.strokeStyle = 'rgb(200,200,200)';
        ctx.lineWidth = 1;
        for (var dy = -3; dy <= 3; dy += 6) {
            ctx.beginPath(); ctx.moveTo(cx - 30, cy + 8 + dy); ctx.lineTo(cx - 50, cy + 4 + dy * 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + 30, cy + 8 + dy); ctx.lineTo(cx + 50, cy + 4 + dy * 2); ctx.stroke();
        }
    };

    Renderer.prototype.drawMiniAlien = function (ctx, cx, cy) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, 25, 32, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(80,200,80)';
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx - 11, cy - 6, 10, 6.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(0,0,0)';
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 12, cy - 6, 10, 6.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(0,0,0)';
        ctx.fill();
        ctx.beginPath(); ctx.arc(cx - 11, cy - 6, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(0,180,0)'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 12, cy - 6, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(0,180,0)'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx - 14, cy - 8, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(200,255,200)'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 9, cy - 8, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(200,255,200)'; ctx.fill();
        ctx.strokeStyle = 'rgb(40,120,40)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy + 12, 9, 0, Math.PI);
        ctx.stroke();
    };

    ARGame.Renderer = Renderer;
})();
