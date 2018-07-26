import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import { App } from './App';
import * as tf from '@tensorflow/tfjs';
import registerServiceWorker from './registerServiceWorker';
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
        
ReactDOM.render(<Router><Switch><Route path="/:id" component={App} /></Switch></Router>, document.getElementById("root"));
registerServiceWorker();
window.tf = tf;


