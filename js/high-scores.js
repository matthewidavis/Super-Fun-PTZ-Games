(function () {
    'use strict';

    var STORAGE_KEY = 'funptzgames_highscores';
    var MAX_SCORES = 5;

    function HighScores() {
        this.data = this._load();
    }

    HighScores.prototype._key = function (mode, theme) {
        return mode + '_' + theme;
    };

    HighScores.prototype._load = function () {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return {};
    };

    HighScores.prototype._persist = function () {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {}
    };

    HighScores.prototype.get = function (mode, theme) {
        var key = this._key(mode, theme);
        return (this.data[key] || []).slice();
    };

    // Save score if it qualifies. Returns true if it's a new high score.
    HighScores.prototype.save = function (mode, theme, score) {
        var key = this._key(mode, theme);
        if (!this.data[key]) this.data[key] = [];
        var list = this.data[key];

        list.push(score);
        list.sort(function (a, b) { return b - a; });
        if (list.length > MAX_SCORES) {
            list.length = MAX_SCORES;
        }

        this.data[key] = list;
        this._persist();
        return list[0] === score;
    };

    // Check if a score would be a new high score (without saving)
    HighScores.prototype.check = function (mode, theme, score) {
        var key = this._key(mode, theme);
        var list = this.data[key] || [];
        if (list.length === 0) return score > 0;
        return score >= list[0];
    };

    ARGame.HighScores = new HighScores();
})();
