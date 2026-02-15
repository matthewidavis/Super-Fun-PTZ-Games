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

    // Global horizontal motion estimation via multi-row SAD voting.
    // Samples rows across the full frame; each row independently finds its
    // best horizontal shift. Rows with real texture contribute reliable votes;
    // uniform rows (horizontal edges, blank walls) are filtered out.
    // Median of votes gives a robust camera-pan estimate.
    ARGame.estimateGlobalMotionX = function (prevGray, curGray, w, h) {
        if (!prevGray || prevGray.length !== curGray.length) return 0;

        var maxShift = 12;
        var numRows = 12;
        var margin = maxShift + 2;

        if (w < margin * 2 + 10 || h < numRows) return 0;

        var votes = [];

        for (var s = 0; s < numRows; s++) {
            var y = Math.round((s + 0.5) * h / numRows);
            if (y < 0 || y >= h) continue;

            var base = y * w;
            var bestShift = 0;
            var bestSAD = Infinity;
            var sadAtZero = 0;

            for (var shift = -maxShift; shift <= maxShift; shift++) {
                var sad = 0;
                var x0 = Math.max(margin, -shift);
                var x1 = Math.min(w - margin, w - shift);
                for (var x = x0; x < x1; x++) {
                    var diff = prevGray[base + x] - curGray[base + x + shift];
                    sad += diff < 0 ? -diff : diff;
                }
                if (shift === 0) sadAtZero = sad;
                if (sad < bestSAD) {
                    bestSAD = sad;
                    bestShift = shift;
                }
            }

            // Only count rows with enough horizontal texture for a reliable match.
            // avgZeroSAD > 3: the row changed between frames (not static/uniform).
            // bestSAD < sadAtZero * 0.85: the best shift clearly beats no-shift.
            var pixelCount = w - 2 * margin;
            var avgZeroSAD = pixelCount > 0 ? sadAtZero / pixelCount : 0;

            if (avgZeroSAD > 3 && bestSAD < sadAtZero * 0.85) {
                votes.push(bestShift);
            }
        }

        if (votes.length < 2) return 0;

        votes.sort(function (a, b) { return a - b; });
        var m = votes.length >> 1;
        return votes.length & 1 ? votes[m] : (votes[m - 1] + votes[m]) * 0.5;
    };

    // Local horizontal motion estimation centered on a target position.
    // Cross-correlates a patch around (px, py) in processing-resolution
    // grayscale between two frames. Uses texture above+below the edge
    // for reliable matching even on uniform horizontal edges.
    // Returns dx in processing-resolution pixels.
    ARGame.estimateLocalMotionX = function (prevGray, curGray, w, h, px, py) {
        if (!prevGray || prevGray.length !== curGray.length) return 0;

        var maxShift = 12;
        var halfH = 8;              // ±8 rows: captures texture above+below edge
        var halfW = 30;             // ±30 columns around target

        var yStart = Math.max(0, py - halfH);
        var yEnd = Math.min(h, py + halfH + 1);
        var xStart = Math.max(maxShift, px - halfW);
        var xEnd = Math.min(w - maxShift, px + halfW + 1);

        if (yEnd - yStart < 3 || xEnd - xStart < 10) return 0;

        var bestShift = 0;
        var bestSAD = Infinity;

        for (var shift = -maxShift; shift <= maxShift; shift++) {
            var sad = 0;
            var count = 0;
            for (var y = yStart; y < yEnd; y++) {
                var base = y * w;
                var x0 = Math.max(xStart, -shift);
                var x1 = Math.min(xEnd, w - shift);
                for (var x = x0; x < x1; x++) {
                    var diff = prevGray[base + x] - curGray[base + x + shift];
                    sad += diff < 0 ? -diff : diff;
                    count++;
                }
            }
            if (count > 0) sad /= count;
            if (sad < bestSAD) {
                bestSAD = sad;
                bestShift = shift;
            }
        }

        if (bestSAD > 30) return 0;
        return bestShift;
    };
    // Vertical motion estimation between two grayscale frames.
    // Cross-correlates a vertical strip from the middle of the frame
    // over a search range to find the pixel shift.
    // Returns dy in processing-resolution pixels (negative = scene moved up).
    ARGame.estimateMotionY = function (prevGray, curGray, w, h) {
        if (!prevGray || prevGray.length !== curGray.length) return 0;

        var maxShift = 16;          // Search ±16 pixels at processing res
        var stripX = (w >> 1) - 2;  // Middle of frame
        var stripW = 4;             // 4-column strip for noise averaging
        var margin = maxShift + 4;

        if (stripX < 0 || stripX + stripW >= w || h < margin * 2) return 0;

        var bestShift = 0;
        var bestSAD = Infinity;

        for (var shift = -maxShift; shift <= maxShift; shift++) {
            var sad = 0;
            var count = 0;
            var y0 = Math.max(margin, -shift);
            var y1 = Math.min(h - margin, h - shift);
            for (var y = y0; y < y1; y++) {
                for (var col = 0; col < stripW; col++) {
                    var x = stripX + col;
                    var diff = prevGray[y * w + x] - curGray[(y + shift) * w + x];
                    sad += diff < 0 ? -diff : diff;
                    count++;
                }
            }
            if (count > 0) sad /= count;
            if (sad < bestSAD) {
                bestSAD = sad;
                bestShift = shift;
            }
        }

        if (bestSAD > 30) return 0;
        return bestShift;
    };
})();
