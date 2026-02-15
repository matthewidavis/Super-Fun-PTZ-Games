(function () {
    'use strict';

    // Key code → action mapping
    var KEY_MAP = {
        'ArrowLeft': 'left', 'KeyA': 'left',
        'ArrowRight': 'right', 'KeyD': 'right',
        'ArrowUp': 'up', 'KeyW': 'up',
        'ArrowDown': 'down', 'KeyS': 'down',
        'Space': 'shoot',
        'KeyR': 'reset',
        'F3': 'debug',
        'Equal': 'threshUp', 'NumpadAdd': 'threshUp',
        'Minus': 'threshDown', 'NumpadSubtract': 'threshDown',
        'Enter': 'enter'
    };

    // Gamepad button → action
    var PAD_BUTTONS = {
        0: 'shoot',   // A
        5: 'shoot',   // RB
        1: 'reset',   // B
        2: 'debug',   // X
        3: 'enter'    // Y
    };

    function InputManager() {
        this.keysHeld = {};     // code → true
        this.keysPressed = {};  // code → true (one-shot, cleared each frame)
        this._prevButtons = {}; // gamepad button index → pressed last frame
        this.stickX = 0;
        this.stickY = 0;
        this.dpadX = 0;
        this.dpadY = 0;
        this.mouseClicked = false;
        this.gamepadConnected = false;
        this.gamepadName = '';

        var self = this;
        window.addEventListener('keydown', function (e) {
            if (e.code === 'F3') e.preventDefault();
            self.keysHeld[e.code] = true;
            if (!e.repeat) self.keysPressed[e.code] = true;
        });
        window.addEventListener('keyup', function (e) {
            delete self.keysHeld[e.code];
        });
        window.addEventListener('mousedown', function (e) {
            if (e.button === 0) self.mouseClicked = true;
        });
        window.addEventListener('gamepadconnected', function (e) {
            self.gamepadConnected = true;
            self.gamepadName = e.gamepad.id;
        });
        window.addEventListener('gamepaddisconnected', function (e) {
            self.gamepadConnected = false;
            self.gamepadName = '';
        });
    }

    InputManager.prototype.poll = function () {
        // Gamepad polling
        var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        var gp = null;
        for (var i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) { gp = gamepads[i]; break; }
        }

        this.stickX = 0;
        this.stickY = 0;
        this.dpadX = 0;
        this.dpadY = 0;

        if (gp) {
            var deadzone = ARGame.GameConfig.GAMEPAD_DEADZONE;
            var ax = gp.axes[0] || 0;
            var ay = gp.axes[1] || 0;
            if (Math.abs(ax) < deadzone) ax = 0;
            if (Math.abs(ay) < deadzone) ay = 0;
            this.stickX = ax;
            this.stickY = ay;

            // Button rising-edge detection
            for (var bi = 0; bi < gp.buttons.length; bi++) {
                var pressed = gp.buttons[bi].pressed;
                if (pressed && !this._prevButtons[bi]) {
                    var action = PAD_BUTTONS[bi];
                    if (action) {
                        // Synthesize a keysPressed entry for the action
                        this.keysPressed['_pad_' + action] = true;
                    }
                }
                this._prevButtons[bi] = pressed;
            }

            // D-pad (buttons 12-15 on standard mapping)
            if (gp.buttons[12] && gp.buttons[12].pressed) this.dpadY = -1;
            if (gp.buttons[13] && gp.buttons[13].pressed) this.dpadY = 1;
            if (gp.buttons[14] && gp.buttons[14].pressed) this.dpadX = -1;
            if (gp.buttons[15] && gp.buttons[15].pressed) this.dpadX = 1;
        }
    };

    InputManager.prototype.isHeld = function (action) {
        for (var code in this.keysHeld) {
            if (KEY_MAP[code] === action) return true;
        }
        // D-pad held
        if (action === 'left' && this.dpadX < 0) return true;
        if (action === 'right' && this.dpadX > 0) return true;
        if (action === 'up' && this.dpadY < 0) return true;
        if (action === 'down' && this.dpadY > 0) return true;
        return false;
    };

    InputManager.prototype.wasPressed = function (action) {
        // Keyboard
        for (var code in this.keysPressed) {
            if (KEY_MAP[code] === action) return true;
        }
        // Gamepad
        if (this.keysPressed['_pad_' + action]) return true;
        // Mouse click → shoot
        if (action === 'shoot' && this.mouseClicked) return true;
        return false;
    };

    InputManager.prototype.getStick = function () {
        return { x: this.stickX, y: this.stickY };
    };

    InputManager.prototype.endFrame = function () {
        this.keysPressed = {};
        this.mouseClicked = false;
    };

    ARGame.InputManager = InputManager;
})();
