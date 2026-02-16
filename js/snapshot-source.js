(function () {
    'use strict';

    function SnapshotSource(ip) {
        this.ip = ip;
        this.width = 0;
        this.height = 0;
        this.ready = false;
        this.canvas = document.getElementById('snapshot-canvas');
        this._ctx = null;
        this._running = false;
        this._fetching = false;
        this._backoff = 100;
        this._latestImg = null;   // Latest decoded image (back buffer)
    }

    SnapshotSource.prototype.start = function () {
        this._running = true;
        this._fetchNext();
    };

    SnapshotSource.prototype.stop = function () {
        this._running = false;
    };

    // Called once per game loop frame BEFORE any drawImage calls.
    // Copies the latest snapshot to the display canvas atomically,
    // so both proc and native reads see the same frame.
    SnapshotSource.prototype.updateCanvas = function () {
        if (this._latestImg && this._ctx) {
            this._ctx.drawImage(this._latestImg, 0, 0);
        }
    };

    SnapshotSource.prototype._fetchNext = function () {
        if (!this._running || this._fetching) return;
        this._fetching = true;

        var self = this;
        var img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = function () {
            if (!self.ready) {
                self.width = img.naturalWidth;
                self.height = img.naturalHeight;
                self.canvas.width = self.width;
                self.canvas.height = self.height;
                self._ctx = self.canvas.getContext('2d');
                self.ready = true;
            }
            // Store to back buffer — game loop will blit via updateCanvas()
            self._latestImg = img;
            self._backoff = 100;
            self._fetching = false;
            if (self._running) {
                self._fetchNext();
            }
        };

        img.onerror = function () {
            self._fetching = false;
            if (self._running) {
                setTimeout(function () {
                    self._fetchNext();
                }, self._backoff);
                self._backoff = Math.min(self._backoff * 2, 1000);
            }
        };

        img.src = 'http://' + this.ip + '/snapshot.jpg?_t=' + Date.now();
    };

    // Test a single snapshot load — returns a Promise
    SnapshotSource.testSnapshot = function (ip) {
        return new Promise(function (resolve, reject) {
            var img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function () {
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.onerror = function () {
                reject(new Error('Could not load snapshot from ' + ip));
            };
            img.src = 'http://' + ip + '/snapshot.jpg?_t=' + Date.now();
        });
    };

    ARGame.SnapshotSource = SnapshotSource;
})();
