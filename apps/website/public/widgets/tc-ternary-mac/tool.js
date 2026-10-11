// tc-ternary-mac/tool.js -- lesson 12 of the course "The ternary machine": A MAC with ternary weights: add, subtract or skip.
// It computes nothing. ./logic.js is the fn bodies of the t27 spec in ./logic.t27, compiled to wasm;
// ../ternary-kit.js draws the "mul" view from it and from window.T27_WIDGET
// (specs/widgets/tc-ternary-mac.t27). Reads only its own files; sends nothing.
import * as logic from './logic.js'
import { mount } from '../ternary-kit.js'

mount("mul", logic, window.T27_WIDGET, "mac")
