import React, { Component } from 'react';
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import './App.css';
import { Loader } from "./ModelHelper";
import { Canvas } from "./Canvas";
import * as models from "./data/models";

var tf = window.tf;

export class App extends Component {
    static propTypes = {
        match: PropTypes.object
	};
	constructor() {
		super();
		this.state = { hasError: false, id: -1, name: null, model: null };
	}

	componentDidCatch(error, info) {
		this.setState((prevState, props) => ({ hasError: true }));
	}

	render() {
		var state = this.state;
		if (state.hasError) {
			return <div className="App">
				<div className="App-header">
					<h2>Error</h2>
				</div>
			</div>;
		}
		var id = (this.props.match && this.props.match.params && this.props.match.params.id) ? 
			Number(this.props.match.params.id) : -1;
		if ((id !== state.id) || (state.model === null)) {
			var idx = (id<0) ? 0 : (id < models.length ? id : models.length-1);
			let { name, modelTopology, weightSpecs, weightData } = models[idx];
			let ldr = new Loader(modelTopology, weightSpecs, Loader.base64ToArrayBuffer(weightData));
			tf.loadModel(ldr).then((model) => {
				this.setState((prevState, props) => ({ ...prevState, id, name, model }));
			});
			return <div className="App">
				<div className="App-header">
					<h2>Loading</h2>
				</div>
			</div>
		}
		
		let { name, model } = state;
		return <div className="App">
			<div className="App-header">
				<h2>{ name }</h2>
			</div>
			<div className="App-content row">
				<div className="col-12">
					<p className="model-links">
					{ models.map((d,i) => <span key={ i }><Link to={ "/" + i }>{ (i).toFixed(0) }</Link>&nbsp;</span>) }
					</p>
				</div>
				<div className="col-12">
					{ model ? <Canvas model={ model } /> : null }
				</div>
			</div>
		</div>
	}
}