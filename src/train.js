var tf = require("@tensorflow/tfjs");
var fs = require("fs");
var path = require("path");
var { ModelHelper, Loader } = require("../commonjs/src/ModelHelper");
var seedrandom = require('seedrandom');
var { Environment } = require("../commonjs/src/CartPole");

var seed = "123";

var format = (v, size, decimals) => {
    return v.toFixed(decimals, 10).padStart(size);
}

// var test = (model, learningData, seed) => {
//     seedrandom(seed);
//     var m = learningData.xs[0].length;
//     var err = 0;
//     for (var i=0; i<20; i++) {
//         var j = Math.floor(learningData.xs.length*Math.random());
//         var yp = model.predict(tf.tensor2d(learningData.xs[j], [1,m]), { batchSize: 32 });
//         var ym = learningData.ys[j]
//         err += Math.pow(ym - yp.get(0,0), 2);
//         console.log([ym, yp.get(0,0)].map(d=>format(d,9,4)).join(" = "));
//     }
//     console.log(err);
// }

async function fitModel() {
    var modelOpt = {
        inputDim: 5,
        layers: [{units: 5, activation: 'tanh'}, {units: 1, activation: 'relu'}],
        learningRate: 0.01,
        episodes: 250
    };

    seedrandom(seed);

    var model = ModelHelper.create(modelOpt);
    var models = [];
    for (let i=0; i<=50*modelOpt.episodes; i+=modelOpt.episodes) {
        if (i>0) {
            await ModelHelper.fit(model, modelOpt.episodes /*, (s) => { console.log(s); }*/);
        }
        var n = 0;
        var nruns = 10;
        for (let j=0; j<nruns; j++) {
            let env = new Environment();
            env.reset();
            let done = false;
            let m = 0;
            while (!done && (++m<600)) { 
                done = env.step(ModelHelper.predictAction(model, env.state)).done;  
            }
            n += m;
        }

        let env = new Environment();
        var qseed = Math.random();
        var q = (hist, action) => {
            var s = env.reset(0.1, qseed);
            hist.forEach(d => { env.step(d); });
            return ModelHelper.predict(model, env.state, action).toFixed(2); 
        }   
        console.log(i + ": " + (n/nruns).toFixed(1) + 
            ", " + q([], -1) + ", " + q([], 1) + 
            ", " + q([-1, -1, -1, -1, -1, -1], -1) + ", " + q([-1, -1, -1, -1, -1, -1], 1) +
            ", " + q([1, 1, 1, 1, 1, 1], -1) + ", " + q([1, 1, 1, 1, 1, 1], 1));

        var ws = model.getNamedWeights();
        const { data: weightData, specs: weightSpecs } = await tf.io.encodeWeights(ws);
        const modelTopology = model.toJSON(null, false);    
        models.push({ name: "Model" + i, modelTopology, weightSpecs, weightData: new Buffer(weightData).toString('base64') });
        var modelPath = path.join(__dirname, "data");
        fs.writeFileSync(path.join(modelPath, "models.json"), JSON.stringify(models));
    }        
    //await ModelHelper.saveModel(model, modelPath, "model" + (agentModelNumber+1), learningData);
}
fitModel();

async function loadModel() {
    var name = "model1";
    var modelPath = path.join(__dirname, "data");
    var m = await ModelHelper.loadModel(modelPath, name);
    var learningData = JSON.parse(fs.readFileSync(path.join(modelPath, name + "-learningData.json")));
    test(m, learningData, seed);
}
//loadModel();