// tc-tiny-layer/tool.js -- lesson 27 of the course "The ternary machine": A layer of three ternary neurons.
// It computes nothing. ./logic.js is the fn bodies of the t27 spec in ./logic.t27, compiled to wasm;
// ../ternary-kit.js draws the "neuron" view from it and from window.T27_WIDGET
// (specs/widgets/tc-tiny-layer.t27). Reads only its own files; sends nothing.
import * as logic from './logic.js'
import { mount } from '../ternary-kit.js'

mount("neuron", logic, window.T27_WIDGET, "layer")
