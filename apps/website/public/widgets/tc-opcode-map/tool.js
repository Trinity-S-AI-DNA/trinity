// tc-opcode-map/tool.js -- lesson 17 of the course "The ternary machine": The opcode map: 47 of 256 bytes mean something.
// It computes nothing. ./logic.js is the fn bodies of the t27 spec in ./logic.t27, compiled to wasm;
// ../ternary-kit.js draws the "decode" view from it and from window.T27_WIDGET
// (specs/widgets/tc-opcode-map.t27). Reads only its own files; sends nothing.
import * as logic from './logic.js'
import { mount } from '../ternary-kit.js'

mount("decode", logic, window.T27_WIDGET, "opcodes")
