(function () {
    'use strict';

    function now() { return performance.now() / 1000; }

    function sampleSpawnPositions(edges, scale, targetWidth, gameWidth) {
        var yValues = [];
        for (var i = 0; i < edges.length; i++) {
            var ey = Math.round(edges[i][6] * scale);
            var dupe = false;
            for (var j = 0; j < yValues.length; j++) {
                if (Math.abs(yValues[j] - ey) < 20) { dupe = true; break; }
            }
            if (!dupe) yValues.push(ey);
        }

        var positions = [];
        var halfTW = targetWidth >> 1;
        var step = Math.max(30, targetWidth >> 1);
        for (var yi = 0; yi < yValues.length; yi++) {
            var y = yValues[yi];
            for (var sx = halfTW; sx <= gameWidth - halfTW; sx += step) {
                positions.push([sx, y]);
            }
        }
        return positions;
    }

    function pickRandomPosition(positions, hitHistory, targetWidth) {
        if (positions.length === 0) return null;
        if (hitHistory.length === 0) {
            return positions[(Math.random() * positions.length) | 0];
        }

        var last = hitHistory[hitHistory.length - 1];

        var diffEdge = [];
        var sameEdge = [];
        for (var i = 0; i < positions.length; i++) {
            if (Math.abs(positions[i][1] - last[1]) > 20) {
                diffEdge.push(positions[i]);
            } else {
                sameEdge.push(positions[i]);
            }
        }

        if (diffEdge.length > 0) {
            return diffEdge[(Math.random() * diffEdge.length) | 0];
        }

        if (sameEdge.length === 0) sameEdge = positions;
        var minDist = targetWidth * 2;
        var minDistSq = minDist * minDist;
        var byDist = [];
        for (var i = 0; i < sameEdge.length; i++) {
            var dx = sameEdge[i][0] - last[0], dy = sameEdge[i][1] - last[1];
            var d = dx * dx + dy * dy;
            if (d >= minDistSq) {
                byDist.push({ pos: sameEdge[i], d: d });
            }
        }

        if (byDist.length === 0) {
            for (var i = 0; i < sameEdge.length; i++) {
                var dx = sameEdge[i][0] - last[0], dy = sameEdge[i][1] - last[1];
                byDist.push({ pos: sameEdge[i], d: dx * dx + dy * dy });
            }
        }

        byDist.sort(function (a, b) { return b.d - a.d; });
        var count = Math.max(1, Math.ceil(byDist.length / 3));
        return byDist[(Math.random() * count) | 0].pos;
    }

    function TargetState() {
        this.reset();
    }

    TargetState.prototype.reset = function () {
        this.poiX = 0;
        this.poiY = 0;
        this.prevPoiX = 0;
        this.prevPoiY = 0;
        this.poiCount = 0;
        this.targetHeight = 0;
        this.active = false;
        this.spawnX = 0;
        this.spawnY = 0;
        this.pendingSpawn = null;
        this.pendingSpawnTime = 0;
        this.hitHistory = [];
        this.scanTarget = null;
        this.activatedTime = 0;  // When target became active (for despawn)
    };

    TargetState.prototype.update = function (detectedCx, detectedCy, config) {
        var maxCount = config.POI_PERSISTENCE_MIN + config.TARGET_HOLD_FRAMES;

        if (detectedCx === null || detectedCx === undefined) {
            if (this.poiCount > 0) this.poiCount--;
            if (this.poiCount <= 0) {
                this.targetHeight = 0;
                this.active = false;
            }
            return;
        }

        var dx = Math.abs(detectedCx - this.prevPoiX);
        var dy = Math.abs(detectedCy - this.prevPoiY);
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < config.POI_DISTANCE_THRESHOLD) {
            this.poiCount = Math.min(this.poiCount + 1, maxCount);
            this.poiX = (detectedCx + this.prevPoiX) >> 1;
            this.poiY = (detectedCy + this.prevPoiY) >> 1;

            if (this.poiCount > config.POI_PERSISTENCE_MIN) {
                this.spawnX = this.poiX;
                this.spawnY = this.poiY;
                if (!this.active) {
                    this.activatedTime = now();
                }
                this.active = true;
                this.scanTarget = null;
                if (this.targetHeight < config.TARGET_MAX_HEIGHT) {
                    this.targetHeight += config.TARGET_RISE_SPEED;
                }
            }
        } else {
            if (this.poiCount > 0) this.poiCount--;
            if (this.poiCount <= 0) {
                this.targetHeight = 0;
                this.active = false;
            }
        }

        this.prevPoiX = detectedCx;
        this.prevPoiY = detectedCy;
    };

    TargetState.prototype.queueNextCandidate = function (config, delay, lastEdges, scale) {
        if (delay === undefined) delay = 1.0;

        this.hitHistory.push([this.spawnX, this.spawnY]);
        if (this.hitHistory.length > config.HIT_HISTORY_SIZE) {
            this.hitHistory.shift();
        }

        this.poiCount = 0;
        this.targetHeight = 0;
        this.active = false;
        this.scanTarget = null;
        this.activatedTime = 0;

        if (lastEdges && lastEdges.length > 0) {
            var positions = sampleSpawnPositions(lastEdges, scale, config.TARGET_WIDTH, config.GAME_WIDTH);
            if (positions.length > 0) {
                var pick = pickRandomPosition(positions, this.hitHistory, config.TARGET_WIDTH);
                if (pick) {
                    this.pendingSpawn = pick;
                    this.pendingSpawnTime = now() + delay;
                    return;
                }
            }
        }

        var tw = config.TARGET_WIDTH;
        var dir = Math.random() > 0.5 ? 1 : -1;
        var offset = tw + Math.random() * tw * 2;
        var nx = this.spawnX + dir * offset;
        nx = Math.max(tw, Math.min(config.GAME_WIDTH - tw, nx));
        this.pendingSpawn = [Math.round(nx), this.spawnY];
        this.pendingSpawnTime = now() + delay;
    };

    TargetState.prototype.pickScanTarget = function (edges, scale, config) {
        var positions = sampleSpawnPositions(edges, scale, config.TARGET_WIDTH, config.GAME_WIDTH);
        if (positions.length === 0) return null;
        var pick = pickRandomPosition(positions, this.hitHistory, config.TARGET_WIDTH);
        return pick || null;
    };

    TargetState.prototype.checkPendingSpawn = function (config) {
        if (this.pendingSpawn && now() >= this.pendingSpawnTime) {
            var cx = this.pendingSpawn[0];
            var cy = this.pendingSpawn[1];
            this.spawnX = cx;
            this.spawnY = cy;
            this.poiX = cx;
            this.poiY = cy;
            this.prevPoiX = cx;
            this.prevPoiY = cy;
            this.poiCount = 60;
            this.targetHeight = 1;
            this.active = true;
            this.pendingSpawn = null;
            this.scanTarget = null;
            this.activatedTime = now();
            return true;  // Signal: new target appeared
        }
        return false;
    };

    ARGame.TargetState = TargetState;
})();
