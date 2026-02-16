(function () {
    'use strict';

    // RGBA ImageData → Uint8Array grayscale via BT.601 integer weights
    ARGame.toGrayscale = function (imageData) {
        var data = imageData.data;
        var len = data.length >> 2; // pixel count
        var gray = new Uint8Array(len);
        for (var i = 0, j = 0; i < len; i++, j += 4) {
            gray[i] = (data[j] * 77 + data[j + 1] * 150 + data[j + 2] * 29) >> 8;
        }
        return gray;
    };

    // Horizontal edge detection: vertical gradient + run-length scan
    // Returns array of [x0, y0, x1, y1, length, centerX, centerY]
    ARGame.detectSimple = function (gray, w, h, config) {
        var threshold = (config.DETECTION_THRESHOLD / 3) | 0;
        var scanStart = (48 * h / 240) | 0;
        var scanEnd = Math.min((192 * h / 240) | 0, h - 2);
        var minLen = (config.MIN_LINE_LENGTH * Math.max(w, h) / 240) | 0;

        // Build vertical gradient and threshold to binary
        // grad row y corresponds to gray rows y and y+2
        var edgeBinary = new Uint8Array(w * h);
        for (var y = 0; y < h - 2; y++) {
            var rowAbove = y * w;
            var rowBelow = (y + 2) * w;
            var rowOut = y * w;
            for (var x = 0; x < w; x++) {
                var diff = gray[rowBelow + x] - gray[rowAbove + x];
                if (diff < 0) diff = -diff;
                edgeBinary[rowOut + x] = diff > threshold ? 1 : 0;
            }
        }

        // Horizontal dilation: 1x5 kernel
        var dilated = new Uint8Array(w * h);
        for (var y = scanStart; y < scanEnd; y++) {
            var base = y * w;
            for (var x = 0; x < w; x++) {
                if (edgeBinary[base + x]) {
                    var lo = Math.max(0, x - 2);
                    var hi = Math.min(w - 1, x + 2);
                    for (var dx = lo; dx <= hi; dx++) {
                        dilated[base + dx] = 1;
                    }
                }
            }
        }

        // Row scan: find contiguous runs
        var results = [];
        for (var y = scanStart; y < scanEnd; y++) {
            var base = y * w;
            var inRun = false;
            var runStart = 0;
            for (var x = 0; x <= w; x++) {
                var val = x < w ? dilated[base + x] : 0;
                if (val && !inRun) {
                    inRun = true;
                    runStart = x;
                } else if (!val && inRun) {
                    inRun = false;
                    var length = x - runStart;
                    if (length >= minLen) {
                        var cx = (runStart + x) >> 1;
                        var cy = y + 1;
                        results.push([runStart, cy, x, cy, length, cx, cy]);
                    }
                }
            }
        }

        // Sort by length descending
        results.sort(function (a, b) { return b[4] - a[4]; });

        // Deduplicate: same physical edge spans multiple rows
        var filtered = [];
        for (var i = 0; i < results.length; i++) {
            var r = results[i];
            var cx = r[5], cy = r[6];
            var tooClose = false;
            for (var j = 0; j < filtered.length; j++) {
                var f = filtered[j];
                if (Math.abs(f[6] - cy) < 8 &&
                    Math.abs(f[5] - cx) < (Math.max(r[4], f[4]) >> 1)) {
                    tooClose = true;
                    break;
                }
            }
            if (!tooClose) filtered.push(r);
        }

        return filtered;
    };

    // Two-pass edge verification for locked target tracking
    // Pass 1: coarse check at processing resolution
    // Pass 2: refine at native resolution using nativeCanvas
    // Returns { found: bool, x: number, y: number }
    ARGame.verifyEdge = function (grayProc, procW, procH, nativeCanvas, gameX, gameY, processScale, config) {
        var threshold = (config.DETECTION_THRESHOLD / 3) | 0;
        var px = (gameX * processScale) | 0;
        var py = (gameY * processScale) | 0;

        // --- Pass 1: Coarse check at processing resolution ---
        var xStart = Math.max(1, px - 5);
        var xEnd = Math.min(procW - 1, px + 6);
        var yStart = Math.max(1, py - 6);
        var yEnd = Math.min(procH - 1, py + 7);

        if (xEnd <= xStart || yEnd <= yStart) {
            return { found: false, x: gameX, y: gameY };
        }

        // Find strongest gradient row in region
        var bestRow = 0;
        var bestStrength = 0;
        for (var ry = yStart; ry < yEnd; ry++) {
            var strength = 0;
            for (var rx = xStart; rx < xEnd; rx++) {
                var above = grayProc[(ry - 1) * procW + rx];
                var below = grayProc[(ry + 1) * procW + rx];
                var diff = below - above;
                if (diff < 0) diff = -diff;
                strength += diff;
            }
            if (strength > bestStrength) {
                bestStrength = strength;
                bestRow = ry - yStart;
            }
        }

        if (bestStrength < threshold * (xEnd - xStart)) {
            return { found: false, x: gameX, y: gameY };
        }

        // --- Pass 2: Refine at full resolution ---
        var roiHalfX = 10;
        var roiHalfY = 12;
        var fh = nativeCanvas.height;
        var fw = nativeCanvas.width;
        var ry1 = Math.max(1, gameY - roiHalfY);
        var ry2 = Math.min(fh - 1, gameY + roiHalfY);
        var rx1 = Math.max(0, gameX - roiHalfX);
        var rx2 = Math.min(fw, gameX + roiHalfX);

        if (ry2 <= ry1 + 2 || rx2 <= rx1) {
            var newY = ((yStart + bestRow) / processScale) | 0;
            return { found: true, x: gameX, y: newY };
        }

        // Get pixel data from native-res canvas for tiny ROI
        var nativeCtx = nativeCanvas.getContext('2d');
        var roiW = rx2 - rx1;
        var roiH = ry2 - ry1;
        var roiData;
        try {
            roiData = nativeCtx.getImageData(rx1, ry1, roiW, roiH);
        } catch (e) {
            var newY = ((yStart + bestRow) / processScale) | 0;
            return { found: true, x: gameX, y: newY };
        }

        // Convert ROI to grayscale
        var roiGray = ARGame.toGrayscale(roiData);

        if (roiH < 3) {
            var newY = ((yStart + bestRow) / processScale) | 0;
            return { found: true, x: gameX, y: newY };
        }

        // Vertical gradient at full res
        var fineBest = 0;
        var fineBestStrength = 0;
        for (var y = 0; y < roiH - 2; y++) {
            var str = 0;
            for (var x = 0; x < roiW; x++) {
                var a = roiGray[y * roiW + x];
                var b = roiGray[(y + 2) * roiW + x];
                var d = b - a;
                if (d < 0) d = -d;
                str += d;
            }
            if (str > fineBestStrength) {
                fineBestStrength = str;
                fineBest = y;
            }
        }

        var refinedY = ry1 + fineBest + 1;
        return { found: true, x: gameX, y: refinedY };
    };

    // Horizontal motion estimation via column-average cross-correlation.
    // Averages each column across all rows to build a 1D brightness profile,
    // then cross-correlates prev vs cur profiles over ±maxShift.
    // Parabolic interpolation at the SAD minimum gives SUBPIXEL precision —
    // the critical piece that all previous integer-SAD approaches lacked.
    // Returns dx in processing-resolution pixels (float).
    ARGame.estimateMotionX = function (prevGray, curGray, w, h) {
        if (!prevGray || prevGray.length !== curGray.length) return 0;

        var maxShift = 16;
        var yStart = (h * 0.15) | 0;
        var yEnd = (h * 0.85) | 0;
        if (yEnd - yStart < 10 || w < maxShift * 4) return 0;

        // Column-sum profiles (full vertical integration = max SNR)
        var prevP = new Float64Array(w);
        var curP = new Float64Array(w);
        for (var y = yStart; y < yEnd; y++) {
            var base = y * w;
            for (var x = 0; x < w; x++) {
                prevP[x] += prevGray[base + x];
                curP[x] += curGray[base + x];
            }
        }

        // Cross-correlate with margin to avoid boundary wrap
        var margin = maxShift + 2;
        var xS = margin;
        var xE = w - margin;
        if (xE - xS < 20) return 0;

        var n = 2 * maxShift + 1;
        var sadArr = new Float64Array(n);
        var bestIdx = maxShift; // default to shift=0
        var bestSAD = Infinity;

        for (var s = -maxShift; s <= maxShift; s++) {
            var sad = 0;
            for (var x = xS; x < xE; x++) {
                var diff = prevP[x] - curP[x + s];
                if (diff < 0) diff = -diff;
                sad += diff;
            }
            var idx = s + maxShift;
            sadArr[idx] = sad;
            if (sad < bestSAD) {
                bestSAD = sad;
                bestIdx = idx;
            }
        }

        // Subpixel refinement via parabolic interpolation
        var intShift = bestIdx - maxShift;
        if (bestIdx > 0 && bestIdx < n - 1) {
            var s0 = sadArr[bestIdx - 1];
            var s1 = sadArr[bestIdx];
            var s2 = sadArr[bestIdx + 1];
            var denom = s0 - 2 * s1 + s2;
            if (denom > 0.001) {
                return intShift + 0.5 * (s0 - s2) / denom;
            }
        }

        return intShift;
    };

    // OpenCV.js phaseCorrelate wrapper — used when OpenCV finishes loading.
    // FFT-based, full-frame, subpixel. Returns dx in proc-res pixels (float).
    var _hanningCache = null;
    var _hanningW = 0;
    var _hanningH = 0;

    ARGame.estimateMotionXY = function (prevGray, curGray, w, h) {
        if (!prevGray || prevGray.length !== curGray.length) return [0, 0];
        if (typeof cv === 'undefined' || !window.opencvReady) return [0, 0];

        if (!_hanningCache || _hanningW !== w || _hanningH !== h) {
            if (_hanningCache) _hanningCache.delete();
            _hanningCache = new cv.Mat();
            cv.createHanningWindow(_hanningCache, new cv.Size(w, h), cv.CV_64F);
            _hanningW = w;
            _hanningH = h;
        }

        var prevMat = null, curMat = null, prevFloat = null, curFloat = null;
        try {
            prevMat = cv.matFromArray(h, w, cv.CV_8UC1, Array.from(prevGray));
            curMat = cv.matFromArray(h, w, cv.CV_8UC1, Array.from(curGray));
            prevFloat = new cv.Mat();
            curFloat = new cv.Mat();
            prevMat.convertTo(prevFloat, cv.CV_64F);
            curMat.convertTo(curFloat, cv.CV_64F);
            var result = cv.phaseCorrelate(prevFloat, curFloat, _hanningCache);
            return [result.x, result.y];
        } catch (e) {
            return [0, 0];
        } finally {
            if (prevMat) prevMat.delete();
            if (curMat) curMat.delete();
            if (prevFloat) prevFloat.delete();
            if (curFloat) curFloat.delete();
        }
    };
})();
