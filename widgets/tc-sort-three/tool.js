// tc-sort-three/tool.js -- lesson 24 of the course "The ternary machine": Sort three numbers with three-way compares.
// It computes nothing. ./logic.js is the fn bodies of the t27 spec in ./logic.t27, compiled to wasm;
// ../ternary-kit.js draws the "three" view from it and from window.T27_WIDGET
// (specs/widgets/tc-sort-three.t27). Reads only its own files; sends nothing.
import * as logic from './logic.js'
import { mount } from '../ternary-kit.js'

mount("three", logic, window.T27_WIDGET, "sort")
