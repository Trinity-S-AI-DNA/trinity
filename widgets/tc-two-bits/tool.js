// tc-two-bits/tool.js -- lesson 13 of the course "The ternary machine": A trit in two bits, and the code nobody uses.
// It computes nothing. ./logic.js is the fn bodies of the t27 spec in ./logic.t27, compiled to wasm;
// ../ternary-kit.js draws the "pack" view from it and from window.T27_WIDGET
// (specs/widgets/tc-two-bits.t27). Reads only its own files; sends nothing.
import * as logic from './logic.js'
import { mount } from '../ternary-kit.js'

mount("pack", logic, window.T27_WIDGET, "two")
