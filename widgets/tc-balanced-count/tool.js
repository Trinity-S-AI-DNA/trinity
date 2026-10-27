// tc-balanced-count/tool.js -- lesson 2 of the course "The ternary machine": Balanced ternary: count with -1, 0 and +1.
// It computes nothing. ./logic.js is the fn bodies of the t27 spec in ./logic.t27, compiled to wasm;
// ../ternary-kit.js draws the "odometer" view from it and from window.T27_WIDGET
// (specs/widgets/tc-balanced-count.t27). Reads only its own files; sends nothing.
import * as logic from './logic.js'
import { mount } from '../ternary-kit.js'

mount("odometer", logic, window.T27_WIDGET, "count")
