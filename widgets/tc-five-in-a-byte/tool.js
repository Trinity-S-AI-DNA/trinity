// tc-five-in-a-byte/tool.js -- lesson 14 of the course "The ternary machine": Five trits in one byte: 243 of 256 codes.
// It computes nothing. ./logic.js is the fn bodies of the t27 spec in ./logic.t27, compiled to wasm;
// ../ternary-kit.js draws the "pack" view from it and from window.T27_WIDGET
// (specs/widgets/tc-five-in-a-byte.t27). Reads only its own files; sends nothing.
import * as logic from './logic.js'
import { mount } from '../ternary-kit.js'

mount("pack", logic, window.T27_WIDGET, "five")
