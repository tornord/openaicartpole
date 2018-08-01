"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ModelHelper = exports.Loader = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _tfjs = require("@tensorflow/tfjs");

var tf = _interopRequireWildcard(_tfjs);

var _CartPole = require("./CartPole");

require("babel-polyfill");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// import fs from "fs";
// import path from "path";

var Loader = exports.Loader = function () {
    function Loader(modelTopology, weightSpecs, weightData) {
        _classCallCheck(this, Loader);

        this.modelTopology = modelTopology;
        this.weightSpecs = weightSpecs;
        this.weightData = weightData;
    }

    _createClass(Loader, [{
        key: "load",
        value: function load() {
            return this;
        }
    }], [{
        key: "toArrayBuffer",
        value: function toArrayBuffer(buf) {
            var ab = new ArrayBuffer(buf.length);
            var view = new Uint8Array(ab);
            for (var i = 0; i < buf.length; ++i) {
                view[i] = buf[i];
            }
            return ab;
        }
    }, {
        key: "base64ToArrayBuffer",
        value: function base64ToArrayBuffer(base64) {
            var binary_string = window.atob(base64);
            var len = binary_string.length;
            var bytes = new Uint8Array(len);
            for (var i = 0; i < len; i++) {
                bytes[i] = binary_string.charCodeAt(i);
            }
            return bytes.buffer;
        }
    }]);

    return Loader;
}();

var ModelHelper = exports.ModelHelper = function () {
    function ModelHelper() {
        _classCallCheck(this, ModelHelper);
    }

    _createClass(ModelHelper, null, [{
        key: "create",
        value: function create(opt) {
            var res = tf.sequential();
            opt.layers.forEach(function (d, i) {
                var layer = _extends({}, d);
                if (i === 0) {
                    layer.inputShape = opt.inputDim;
                }
                var lay = tf.layers.dense(layer);
                res.add(lay);
            });
            res.compile({ optimizer: tf.train.sgd(opt.learningRate), loss: 'meanSquaredError', metrics: ['accuracy'] }); //binaryCrossentropy
            return res;
        }

        // static async saveModel(saveModel(model, modelPath, name, learningData) {
        //     var ws = model.getNamedWeights();
        //     const { data: weightData, specs: weightSpecs } = await tf.io.encodeWeights(ws);
        //     const modelTopology = model.toJSON(null, false); 
        //     fs.writeFileSync(path.join(modelPath, name + ".json"), JSON.stringify({ modelTopology, weightSpecs }));
        //     if (learningData) {
        //         fs.writeFileSync(path.join(modelPath, name + "-learningData.json"), JSON.stringify(learningData));
        //     }
        //     var b64 = new Buffer(weightData).toString('base64');
        //     fs.writeFileSync(path.join(modelPath, name + "-weightData.json"), JSON.stringify({ weights: b64 }));            
        // }

        // static async loadModel(modelPath, name) {
        //     var { modelTopology, weightSpecs } = JSON.parse(fs.readFileSync(path.join(modelPath, name + ".json")));
        //     var { weights } = JSON.parse(fs.readFileSync(path.join(modelPath, name + "-weightData.json")));       
        //     var weightData = Loader.toArrayBuffer(Buffer.from(weights, 'base64'));
        //     return await tf.loadModel(new Loader(modelTopology, weightSpecs, weightData));            
        // }

    }, {
        key: "predict",
        value: function predict(model, state, action) {
            return model.predict(tf.tensor2d([state.x, state.xDot, state.theta, state.thetaDot, action], [1, 5]), { batchSize: 1 }).get(0, 0);
        }
    }, {
        key: "predictAction",
        value: function predictAction(model, state) {
            var yleft = ModelHelper.predict(model, state, -1);
            var yright = ModelHelper.predict(model, state, 1);
            return yleft < yright ? -1 : 1;
        }
    }, {
        key: "explore",
        value: function explore(agentModel) {
            var keepActionSteps = 3;
            var randomMoveProb = 0.5;
            var discountedFutureReward = 1;
            var env = new _CartPole.Environment();
            var logState = function logState(state, action, score) {
                return [state.x, state.xDot, state.theta, state.thetaDot, action, score];
            };
            var res = [];
            var score = 1;
            env.reset(2);
            //env.xThreshold = 0.4;
            env.state.x = 4 * Math.random() - 2;
            var done = false;
            var i = 1;
            var action = Math.random() < 0.5 ? -1 : 1; // ModelHelper.predictAction(agentModel, env.state)*(Math.random()<randomMoveProb?-1:1);
            res.push(logState(env.state, action, score));
            while (!done && i < 600) {
                var resp = env.step(action);
                done = resp.done;
                //score += resp.reward;                        
                res.push(logState(env.state, action, resp.reward));
                if (i++ % keepActionSteps === 0) {
                    action = Math.random() < 0.5 ? -1 : 1; // ModelHelper.predictAction(agentModel, env.state)*(Math.random()<randomMoveProb?-1:1);
                }
            }
            var q = 0;
            for (var _i = res.length - 1; _i >= 0; _i--) {
                var r = res[_i][5];
                res[_i][5] = q;
                q = r + discountedFutureReward * q;
            }
            return res.filter(function (d, i) {
                return i % keepActionSteps === 0 || i === res.length - 1;
            });
        }
    }, {
        key: "fit",
        value: function () {
            var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(model, episodes) {
                var i, toTrainingData, tot, _toTrainingData, xs, ys;

                return regeneratorRuntime.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                i = 0;

                                toTrainingData = function toTrainingData(arr) {
                                    var xs = [];
                                    var ys = [];
                                    arr.forEach(function (d) {
                                        var m = d.length - 1;
                                        xs.push(d.slice(0, m));
                                        ys.push(d[m]);
                                    });
                                    return { xs: xs, ys: ys };
                                };

                            case 2:
                                if (!(i < episodes)) {
                                    _context.next = 10;
                                    break;
                                }

                                tot = ModelHelper.explore(model);
                                _toTrainingData = toTrainingData(tot), xs = _toTrainingData.xs, ys = _toTrainingData.ys;
                                // var m = tot[0].length-1;          
                                // tot.forEach(d => toTrainingData(d, xs, ys));

                                // var callbacks = { onEpochEnd: (epoch, log) => { logger(`Epoch ${i}: loss = ${log.loss}, acc = ${log.acc}`); } };      

                                _context.next = 7;
                                return model.fit(tf.tensor2d(xs, [xs.length, xs[0].length]), tf.tensor2d(ys, [ys.length, 1]), { epochs: 1 });

                            case 7:
                                i++;
                                _context.next = 2;
                                break;

                            case 10:
                            case "end":
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));

            function fit(_x, _x2) {
                return _ref.apply(this, arguments);
            }

            return fit;
        }()

        // static getWeights(model) {
        //     var res = [];
        //     var toArray = (arr) => { 
        //         var res = []; 
        //         arr.dataSync().forEach(d => res.push(d)); 
        //         return res; 
        //     };
        //     for (var i=0; i<model.layers.length; i++) {
        //         var lay = model.layers[i];
        //         if (lay.weights.length === 0) {
        //             continue;
        //         }
        //         res.push(lay.getWeights().map(toArray));
        //     }
        //     return res;
        // }

        // static setWeights(model, ws) {
        //     var j = 0;
        //     for (var i=0; i<model.layers.length; i++) {
        //         var lay = model.layers[i];
        //         var u = lay.units;
        //         lay.setWeights([tf.tensor2d(ws[j][0], [ws[j][0].length / u, u], "float32"), tf.tensor1d(ws[j][1], "float32")]);
        //         j++;
        //     }
        // }

        // test() {

        // }

    }]);

    return ModelHelper;
}();