import * as tf from "@tensorflow/tfjs";
import { Environment } from "./CartPole";
import "babel-polyfill";
// import fs from "fs";
// import path from "path";

export class Loader {
    constructor(modelTopology, weightSpecs, weightData) {
        this.modelTopology = modelTopology;
        this.weightSpecs = weightSpecs;
        this.weightData = weightData;
    }

    static toArrayBuffer(buf) {
        var ab = new ArrayBuffer(buf.length);
        var view = new Uint8Array(ab);
        for (var i = 0; i < buf.length; ++i) {
            view[i] = buf[i];
        }
        return ab;
    }

    // or 
    // Uint8Array.from(atob(base64), c => c.charCodeAt(0))
    static base64ToArrayBuffer(base64) {
        var binary_string =  window.atob(base64);
        var len = binary_string.length;
        var bytes = new Uint8Array( len );
        for (var i = 0; i < len; i++)        {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }
    
    load() {
        return this;
    }
}

export class ModelHelper {
    static create(opt) {
        var res = tf.sequential();
        opt.layers.forEach((d,i) => {
            var layer = { ...d };
            if (i === 0) {
                layer.inputShape = opt.inputDim;
            }
            var lay = tf.layers.dense(layer);
            res.add(lay);
        });
        res.compile({optimizer: tf.train.sgd(opt.learningRate), loss: 'meanSquaredError', metrics: ['accuracy']}) //binaryCrossentropy
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

    static predict(model, state, action) {
        return model.predict(tf.tensor2d([state.x, state.xDot, state.theta, state.thetaDot, action], [1, 5]), { batchSize: 1 }).get(0,0);
    };

    static predictAction(model, state) {
        var yleft = ModelHelper.predict(model, state, -1);
        var yright = ModelHelper.predict(model, state, 1);
        return yleft<yright ? -1 : 1;
    }

    static explore(agentModel) {
        var keepActionSteps = 3;
        var randomMoveProb = 0.5;
        var discountedFutureReward = 1;
        var env = new Environment();
        var logState = (state, action, score) => [state.x, state.xDot, state.theta, state.thetaDot, action, score];
        var res = [];
        var score = 1;
        env.reset(2);
        //env.xThreshold = 0.4;
        env.state.x = 4*Math.random()-2;
        var done = false;
        var i = 1;
        var action = Math.random()<0.5?-1:1;// ModelHelper.predictAction(agentModel, env.state)*(Math.random()<randomMoveProb?-1:1);
        res.push(logState(env.state, action, score));
        while (!done && (i<600)) {
            var resp = env.step(action);
            done = resp.done;
            //score += resp.reward;                        
            res.push(logState(env.state, action, resp.reward));
            if ((i++ % keepActionSteps) === 0) {
                action = Math.random()<0.5?-1:1;// ModelHelper.predictAction(agentModel, env.state)*(Math.random()<randomMoveProb?-1:1);
            }
        }
        var q = 0;
        for (let i = res.length-1; i >= 0; i--) {
            let r = res[i][5];
            res[i][5] = q;
            q = r + discountedFutureReward * q;
        }
        return res.filter((d,i) => (i%keepActionSteps===0) || (i===(res.length-1)));
    }

    static async fit(model, episodes) {
        var i = 0;
        var toTrainingData = (arr) => {
            var xs = [];
            var ys = [];
            arr.forEach(d => {
                let m = d.length-1;
                xs.push(d.slice(0,m));
                ys.push(d[m]);
            });
            return { xs, ys };
        };
        while (i < episodes) {
            var tot = ModelHelper.explore(model);
            let { xs, ys} = toTrainingData(tot);
            // var m = tot[0].length-1;          
            // tot.forEach(d => toTrainingData(d, xs, ys));

            // var callbacks = { onEpochEnd: (epoch, log) => { logger(`Epoch ${i}: loss = ${log.loss}, acc = ${log.acc}`); } };      
            await model.fit(tf.tensor2d(xs, [xs.length, xs[0].length]), tf.tensor2d(ys, [ys.length, 1]), { epochs: 1 });
            i++;
        }
    }

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
}
