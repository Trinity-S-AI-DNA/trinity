// tc-long-multiply/tool.js -- lesson 11 of the course "The ternary machine": Long multiplication in balanced ternary.
// It computes nothing. ./logic.js is the fn bodies of the t27 spec in ./logic.t27, compiled to wasm;
// ../ternary-kit.js draws the "mul" view from it and from window.T27_WIDGET
// (specs/widgets/tc-long-multiply.t27). Reads only its own files; sends nothing.
import * as logic from './logic.js'
import { mount } from '../ternary-kit.js'

mount("mul", logic, window.T27_WIDGET, "long")
