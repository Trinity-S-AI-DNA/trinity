// tc-why-three/tool.js -- lesson 1 of the course "The ternary machine": Why three: what a number costs in each base.
// It computes nothing. ./logic.js is the fn bodies of the t27 spec in ./logic.t27, compiled to wasm;
// ../ternary-kit.js draws the "economy" view from it and from window.T27_WIDGET
// (specs/widgets/tc-why-three.t27). Reads only its own files; sends nothing.
import * as logic from './logic.js'
import { mount } from '../ternary-kit.js'

mount("economy", logic, window.T27_WIDGET, undefined)
