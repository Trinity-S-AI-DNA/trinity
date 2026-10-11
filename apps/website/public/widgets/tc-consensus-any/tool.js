// tc-consensus-any/tool.js -- lesson 5 of the course "The ternary machine": Consensus and any: gates binary logic does not have.
// It computes nothing. ./logic.js is the fn bodies of the t27 spec in ./logic.t27, compiled to wasm;
// ../ternary-kit.js draws the "gates" view from it and from window.T27_WIDGET
// (specs/widgets/tc-consensus-any.t27). Reads only its own files; sends nothing.
import * as logic from './logic.js'
import { mount } from '../ternary-kit.js'

mount("gates", logic, window.T27_WIDGET, undefined)
