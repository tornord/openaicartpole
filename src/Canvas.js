import React, { Component } from 'react';
import { Environment } from "./CartPole";
import { ModelHelper } from "./ModelHelper";

var format = (v, size, decimals) => {
    return v.toFixed(decimals, 10).padStart(size);
}

class CanvasHelper {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    rectangle(x, y, width, height, color) { 
        this.ctx.fillStyle = color; 
        this.ctx.fillRect(x, y, width, height); 
    }

    fill(color) {
        this.rectangle(0, 0, this.canvas.width, this.canvas.height, color);
    }

    line(x1, y1, x2, y2, width, color) { 
        this.ctx.strokeStyle = color; 
        this.ctx.lineWidth = width;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }

    text(x, y, size, text, color) {
        this.ctx.fillStyle = color; 
        this.ctx.font = size + 'px Monospace';
        this.ctx.fillText(text, x, y);
    }
}

export class Canvas extends Component {
	componentDidMount() {
        var canvas = this.canvasRef;
        if (canvas) {
            var wh = this.calcWidthHeight(canvas, 4/3)
            canvas.width = wh.width;
            canvas.height = wh.height;
        }
        this.animationFrameFn = () => { this.update(this); };
        window.requestAnimationFrame(this.animationFrameFn);
        this.score = 0;
        this.env = new Environment();
        this.env.reset(2);
        this.env.state.x = 4*Math.random()-2;
    }
  
    componentWillUnmount() {
        window.cancelAnimationFrame(this.animationFrameFn);
        if (this.requestAnimationFrameTimeoutId) {
            window.clearTimeout(this.requestAnimationFrameTimeoutId);
        }
        if (this.restartPendingTimerId) {
            window.clearTimeout(this.restartPendingTimerId);
        }
    }
  
    calcWidthHeight(node, widthHeightRatio) {
        var width = node.clientWidth;
        if (node.parentNode && node.parentNode.clientWidth) {
            width = node.parentNode.clientWidth - 40;
        }
        var height = Math.min(width / (widthHeightRatio ? widthHeightRatio : 4 / 3), 400);
        return { width, height };
    }
  
    update(_this) {
        var env = _this.env;
        var state = env.state;
        var model = this.props.model;

        var canvas = _this.canvasRef;
        if (!canvas) {
            return;
        }
        var ch = new CanvasHelper(canvas);

        var dx = canvas.width/8.0;
        var x0 = canvas.width/2 + dx * state.x;
        var y0 = canvas.height * 0.7;

        ch.fill("#d5e7f9");
        ch.rectangle(0, y0 + 15, canvas.width, canvas.height * 0.3 - 15, "#3d3");

        var polelen = 100;
        ch.rectangle(x0-20, y0, 40, 15, env.done ? "#d33" : "#333");
        ch.line(x0, y0, x0+polelen*Math.sin(state.theta), y0-polelen*Math.cos(state.theta), 8,env.done ? "#d33" : "#333");
        ch.line(canvas.width/2 - dx * env.xThreshold, y0 + 15, canvas.width/2 - dx * env.xThreshold, y0 + 21, 3, "#888");
        ch.line(canvas.width/2 + dx * env.xThreshold, y0 + 15, canvas.width/2 + dx * env.xThreshold, y0 + 21, 3, "#888");

        var action = ModelHelper.predictAction(model, state);
        ch.text(10, 14, 10, format(_this.score, 5, 0) + format(ModelHelper.predict(model, state, -1), 6, 1) + format(ModelHelper.predict(model, state, 1), 6, 1) + format(action, 4, 0), "#333");

        var { reward, done } = env.step(action);

        _this.score += reward;

        if (done && !_this.restartPendingTimerId) {
            _this.restartPendingTimerId = window.setTimeout(() => { 
                _this.env.reset(2); 
                _this.env.state.x = 4*Math.random()-2;
                _this.score = 0;
                _this.restartPendingTimerId = null;
            }, 1000);
        }

        _this.requestAnimationFrameTimeoutId = window.setTimeout(() => {
            window.requestAnimationFrame(this.animationFrameFn); 
        }, 1);
    }

    render() {
        return <canvas ref={ (e) => { this.canvasRef = e; } } ></canvas>;
    }
}