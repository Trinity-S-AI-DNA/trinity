// tc-half-adder/tool.js -- lesson 7 of the course "The ternary machine": The half adder: two trits in, a sum and a carry out.
// It computes nothing. ./logic.js is the fn bodies of the t27 spec in ./logic.t27, compiled to wasm;
// ../ternary-kit.js draws the "adder" view from it and from window.T27_WIDGET
// (specs/widgets/tc-half-adder.t27). Reads only its own files; sends nothing.
import * as logic from './logic.js'
import { mount } from '../ternary-kit.js'

mount("adder", logic, window.T27_WIDGET, "half")
