// tc-flip-and-cut/tool.js -- lesson 3 of the course "The ternary machine": Flip every trit to negate, cut trits to round.
// It computes nothing. ./logic.js is the fn bodies of the t27 spec in ./logic.t27, compiled to wasm;
// ../ternary-kit.js draws the "odometer" view from it and from window.T27_WIDGET
// (specs/widgets/tc-flip-and-cut.t27). Reads only its own files; sends nothing.
import * as logic from './logic.js'
import { mount } from '../ternary-kit.js'

mount("odometer", logic, window.T27_WIDGET, "negate")
