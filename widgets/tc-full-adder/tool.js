// tc-full-adder/tool.js -- lesson 8 of the course "The ternary machine": The full adder: a carry comes in, a carry goes out.
// It computes nothing. ./logic.js is the fn bodies of the t27 spec in ./logic.t27, compiled to wasm;
// ../ternary-kit.js draws the "adder" view from it and from window.T27_WIDGET
// (specs/widgets/tc-full-adder.t27). Reads only its own files; sends nothing.
import * as logic from './logic.js'
import { mount } from '../ternary-kit.js'

mount("adder", logic, window.T27_WIDGET, "full")
