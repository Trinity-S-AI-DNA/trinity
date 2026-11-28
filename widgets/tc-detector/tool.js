// tc-detector/tool.js -- lesson 26 of the course "The ternary machine": A bar detector: one neuron, four patterns.
// It computes nothing. ./logic.js is the fn bodies of the t27 spec in ./logic.t27, compiled to wasm;
// ../ternary-kit.js draws the "neuron" view from it and from window.T27_WIDGET
// (specs/widgets/tc-detector.t27). Reads only its own files; sends nothing.
import * as logic from './logic.js'
import { mount } from '../ternary-kit.js'

mount("neuron", logic, window.T27_WIDGET, "detect")
