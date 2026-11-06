// tc-ternary-alu/tool.js -- lesson 19 of the course "The ternary machine": A ternary ALU built from this course's adders.
// It computes nothing. ./logic.js is the fn bodies of the t27 spec in ./logic.t27, compiled to wasm;
// ../ternary-kit.js draws the "machine" view from it and from window.T27_WIDGET
// (specs/widgets/tc-ternary-alu.t27). Reads only its own files; sends nothing.
import * as logic from './logic.js'
import { mount } from '../ternary-kit.js'

mount("machine", logic, window.T27_WIDGET, "alu")
