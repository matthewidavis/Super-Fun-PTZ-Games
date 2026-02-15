(function () {
    'use strict';

    // Browser PTZ via MediaStreamTrack.applyConstraints()
    // Velocity model: send pan/tilt speed each frame. 0 = stop.
    function PTZController(videoTrack) {
        this.track = videoTrack;
        this.hasPTZ = false;

        this.panMin = 0; this.panMax = 0;
        this.tiltMin = 0; this.tiltMax = 0;
        this.zoomMin = 1; this.zoomMax = 1;
        this.zoom = 1;

        this.panStep = 0;
        this.tiltStep = 0;

        this._pending = false;
        this._lastPan = 0;       // Last pan value sent to camera
        this._lastTilt = 0;      // Last tilt value sent to camera
        this._wantPan = 0;       // Desired pan value this frame
        this._wantTilt = 0;      // Desired tilt value this frame

        if (!videoTrack) return;

        try {
            var caps = videoTrack.getCapabilities();
            var settings = videoTrack.getSettings();

            if ('pan' in settings) {
                this.hasPTZ = true;
                this.panMin = caps.pan.min;
                this.panMax = caps.pan.max;
                this.panStep = (this.panMax - this.panMin) / 200;
            }
            if ('tilt' in settings) {
                this.hasPTZ = true;
                this.tiltMin = caps.tilt.min;
                this.tiltMax = caps.tilt.max;
                this.tiltStep = (this.tiltMax - this.tiltMin) / 200;
            }
            if ('zoom' in settings) {
                this.zoomMin = caps.zoom.min;
                this.zoomMax = caps.zoom.max;
                this.zoom = settings.zoom;
            }

            if (!this.hasPTZ) {
                console.warn('PTZ not found in settings. Keys:', Object.keys(settings).join(', '));
            }
        } catch (e) {
            console.error('PTZ init error:', e);
        }
    }

    // panSpeed/tiltSpeed: -1 to +1 (0 = stop). Called every frame from game loop.
    PTZController.prototype.update = function (panSpeed, tiltSpeed, zoomDelta) {
        if (!this.hasPTZ) return;

        this._wantPan = panSpeed;
        this._wantTilt = tiltSpeed;

        if (zoomDelta) {
            this.zoom = clamp(this.zoom + zoomDelta, this.zoomMin, this.zoomMax);
        }

        if (!this._pending) {
            this._flush();
        }
    };

    PTZController.prototype._flush = function () {
        var pan = this._wantPan;
        var tilt = this._wantTilt;

        // Skip if nothing changed from last send
        if (pan === this._lastPan && tilt === this._lastTilt) return;

        // Map speed to pan/tilt values: 0 = midpoint (stop), +/-1 = full range
        var panMid = (this.panMax + this.panMin) / 2;
        var panHalf = (this.panMax - this.panMin) / 2;
        var tiltMid = (this.tiltMax + this.tiltMin) / 2;
        var tiltHalf = (this.tiltMax - this.tiltMin) / 2;

        var constraints = { advanced: [{}] };
        if (this.panStep > 0) constraints.advanced[0].pan = panMid + pan * panHalf;
        if (this.tiltStep > 0) constraints.advanced[0].tilt = tiltMid + tilt * tiltHalf;

        this._lastPan = pan;
        this._lastTilt = tilt;

        var self = this;
        this._pending = true;
        this.track.applyConstraints(constraints)
            .then(function () {
                self._pending = false;
                if (self._wantPan !== self._lastPan || self._wantTilt !== self._lastTilt) {
                    self._flush();
                }
            })
            .catch(function (e) {
                console.warn('PTZ applyConstraints failed:', e);
                self._pending = false;
            });
    };

    function clamp(v, lo, hi) {
        return v < lo ? lo : v > hi ? hi : v;
    }

    ARGame.PTZController = PTZController;
})();
