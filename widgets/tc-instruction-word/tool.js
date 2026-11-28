// tc-instruction-word/tool.js -- lesson 16 of the course "The ternary machine": The TRI-27 instruction word, field by field.
// It computes nothing. ./logic.js is the fn bodies of the t27 spec in ./logic.t27, compiled to wasm;
// ../ternary-kit.js draws the "decode" view from it and from window.T27_WIDGET
// (specs/widgets/tc-instruction-word.t27). Reads only its own files; sends nothing.
import * as logic from './logic.js'
import { mount } from '../ternary-kit.js'

mount("decode", logic, window.T27_WIDGET, "fields")
