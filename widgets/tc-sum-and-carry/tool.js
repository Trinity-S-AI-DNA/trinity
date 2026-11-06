// tc-sum-and-carry/tool.js -- lesson 6 of the course "The ternary machine": Sum and carry: addition as two gates.
// It computes nothing. ./logic.js is the fn bodies of the t27 spec in ./logic.t27, compiled to wasm;
// ../ternary-kit.js draws the "gates" view from it and from window.T27_WIDGET
// (specs/widgets/tc-sum-and-carry.t27). Reads only its own files; sends nothing.
import * as logic from './logic.js'
import { mount } from '../ternary-kit.js'

mount("gates", logic, window.T27_WIDGET, undefined)
