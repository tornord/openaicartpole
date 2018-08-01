"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Environment = exports.State = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _seedrandom = require("seedrandom");

var _seedrandom2 = _interopRequireDefault(_seedrandom);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var State = exports.State = function () {
    function State(factor, seed) {
        _classCallCheck(this, State);

        if (seed) {
            (0, _seedrandom2.default)(seed, { global: true });
        }
        var f = factor ? factor : 1;
        this.x = f * State.randomInit();
        this.xDot = f * State.randomInit();
        this.theta = f * State.randomInit();
        this.thetaDot = f * State.randomInit();
    }

    _createClass(State, null, [{
        key: "randomInit",
        value: function randomInit() {
            return -0.05 + 0.1 * Math.random();
        }
    }]);

    return State;
}();

var Environment = function () {
    function Environment() {
        _classCallCheck(this, Environment);

        this.gravity = 9.8;
        this.masscart = 1.0;
        this.masspole = 0.1;
        this.totalMass = this.masspole + this.masscart;
        this.length = 0.5; // actually half the pole's length
        this.polemassLength = this.masspole * this.length;
        this.forceMag = 10.0;
        this.tau = 1 / 60; // seconds between state updates

        // Angle at which to fail the episode
        this.thetaThresholdRadians = 12 * 2 * Math.PI / 360;
        this.xThreshold = 2.4;

        // Angle limit set to 2 * theta_threshold_radians so failing observation is still within bounds
        // var high = [
        //   this.x_threshold * 2,
        //   np.finfo(np.float32).max,
        //   this.theta_threshold_radians * 2,
        //   np.finfo(np.float32).max
        // ];

        // self.action_space = spaces.Discrete(2);
        // self.observation_space = spaces.Box(-high, high)

        //this.seed("0")
        this.state = undefined;
        this.stepsBeyondDone = undefined;
        this.done = undefined;
        this.reward = undefined;
    }

    _createClass(Environment, [{
        key: "getState",
        value: function getState() {
            return _extends({}, this.state);
        }
    }, {
        key: "seed",
        value: function seed(_seed) {
            Math.seedrandom(_seed);
        }
    }, {
        key: "step",
        value: function step(action) {
            var state = this.state;
            var force = action === 1 ? this.forceMag : -this.forceMag;
            var costheta = Math.cos(state.theta);
            var sintheta = Math.sin(state.theta);
            var temp = (force + this.polemassLength * state.thetaDot * state.thetaDot * sintheta) / this.totalMass;
            var thetaacc = (this.gravity * sintheta - costheta * temp) / (this.length * (4.0 / 3.0 - this.masspole * costheta * costheta / this.totalMass));
            var xacc = temp - this.polemassLength * thetaacc * costheta / this.totalMass;
            state.x += this.tau * state.xDot;
            state.xDot += this.tau * xacc;
            state.theta += this.tau * state.thetaDot;
            state.thetaDot += this.tau * thetaacc;

            if (!this.done) {
                this.done = state.x < -this.xThreshold || state.x > this.xThreshold || state.theta < -this.thetaThresholdRadians || state.theta > this.thetaThresholdRadians;
            }

            if (!this.done) {
                this.reward = 1; // + (state.x>0 ? 0.5*state.x : 0);
            } else if (typeof this.stepsBeyondDone === "undefined") {
                // Pole just fell!
                this.stepsBeyondDone = 0;
                this.reward = 0.0;
            } else if (this.stepsBeyondDone >= 0) {
                //logger.warn("You are calling 'step()' even though this environment has already returned done = True. You should always call 'reset()' once you receive 'done = True' -- any further steps are undefined behavior.")
                this.stepsBeyondDone += 1;
                this.reward = 0.0;
            }

            return {
                state: _extends({}, this.state),
                reward: this.reward,
                done: this.done
            };
        }
    }, {
        key: "reset",
        value: function reset(randomFactor, seed) {
            this.state = new State(randomFactor, seed);
            this.done = false;
            this.reward = 1.0;
            this.stepsBeyondDone = undefined;
            return _extends({}, this.state);
        }
    }]);

    return Environment;
}();

exports.Environment = Environment;