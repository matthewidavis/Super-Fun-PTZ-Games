(function () {
    'use strict';

    var DIRECTIONS = {
        '0,-1': 'up',
        '0,1': 'down',
        '-1,0': 'left',
        '1,0': 'right',
        '-1,-1': 'leftup',
        '1,-1': 'rightup',
        '-1,1': 'leftdown',
        '1,1': 'rightdown'
    };

    var MAX_SPEED = 20;      // PTZOptics speed 1-24; matches Python gamepad max zone
    var RAMP_MS = 200;       // Time to reach full target speed from standstill
    var RAMP_INTERVAL = 60;  // How often to re-evaluate speed during ramp (ms)

    function HTTPPTZController(ip) {
        this.ip = ip;
        this.hasPTZ = true;
        this._pending = false;
        this._lastCmd = '';
        this._wantPan = 0;
        this._wantTilt = 0;
        this._moveStart = 0;     // Timestamp when current movement began
        this._rampTimer = null;  // Periodic timer to update speed during ramp
    }

    HTTPPTZController.prototype.update = function (panSpeed, tiltSpeed) {
        this._wantPan = panSpeed;
        this._wantTilt = tiltSpeed;

        if (!this._pending) {
            this._flush();
        }
    };

    HTTPPTZController.prototype._flush = function () {
        var pan = this._wantPan;
        var tilt = this._wantTilt;
        var mag = Math.sqrt(pan * pan + tilt * tilt);

        var cmd;
        if (mag < 0.15) {
            cmd = 'ptzstop';
            this._moveStart = 0;
            if (this._rampTimer) {
                clearInterval(this._rampTimer);
                this._rampTimer = null;
            }
        } else {
            var dx = pan > 0.1 ? 1 : (pan < -0.1 ? -1 : 0);
            var dy = tilt > 0.1 ? -1 : (tilt < -0.1 ? 1 : 0);
            var dir = DIRECTIONS[dx + ',' + dy];
            if (!dir) {
                cmd = 'ptzstop';
                this._moveStart = 0;
            } else {
                // Target speed: map magnitude 0.15..1.0 → 1..MAX_SPEED
                var targetSpeed = Math.round(1 + (mag - 0.15) * ((MAX_SPEED - 1) / 0.85));
                targetSpeed = targetSpeed < 1 ? 1 : targetSpeed > MAX_SPEED ? MAX_SPEED : targetSpeed;

                // Soft ramp: ease from speed 1 to target over RAMP_MS
                var now = Date.now();
                if (!this._moveStart) this._moveStart = now;
                var elapsed = now - this._moveStart;
                var ramp = Math.min(1, elapsed / RAMP_MS);
                var speed = Math.max(1, Math.round(1 + (targetSpeed - 1) * ramp));

                // Start ramp timer if not already running
                if (!this._rampTimer && ramp < 1) {
                    var self = this;
                    this._rampTimer = setInterval(function () {
                        if (!self._pending) self._flush();
                    }, RAMP_INTERVAL);
                }
                // Clear ramp timer once fully ramped
                if (ramp >= 1 && this._rampTimer) {
                    clearInterval(this._rampTimer);
                    this._rampTimer = null;
                }

                cmd = dir + '&' + speed + '&' + speed;
            }
        }

        if (cmd === this._lastCmd) return;
        this._lastCmd = cmd;

        var url = 'http://' + this.ip + '/cgi-bin/ptzctrl.cgi?ptzcmd&' + cmd;
        var self = this;
        this._pending = true;

        fireAndForget(url, function () {
            self._pending = false;
            var newPan = self._wantPan;
            var newTilt = self._wantTilt;
            if (newPan !== pan || newTilt !== tilt) {
                self._flush();
            }
        });
    };

    function fireAndForget(url, done) {
        fetch(url, { mode: 'no-cors', cache: 'no-store' })
            .then(function () { done(); })
            .catch(function () {
                var img = new Image();
                img.src = url + '&_t=' + Date.now();
                done();
            });
    }

    ARGame.HTTPPTZController = HTTPPTZController;
})();
