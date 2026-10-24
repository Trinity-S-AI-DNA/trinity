---
name: fpga-synth
description: Run FPGA synthesis pipeline from .tri spec to bitstream. Use when working with Verilog, FPGA, or hardware synthesis.
argument-hint: <spec.tri or module-name>
allowed-tools: Bash(zig *), Bash(cat *), Bash(ls *), Bash(make *), Read, Grep, Glob, Write, Edit
---

# FPGA Synthesis Pipeline

## Current FPGA Changes
!`git diff --name-only HEAD -- fpga/openxc7-synth/ 2>/dev/null | head -20`

## Available Bitstreams
!`ls -la /Users/playra/trinity-w1/fpga/openxc7-synth/*.bit 2>/dev/null`

## Task

Run the FPGA synthesis pipeline for: $ARGUMENTS

### Steps
1. If a .tri spec is provided, generate Verilog: `zig build vibee -- gen $ARGUMENTS`
2. Check generated .v files for syntax with iverilog if available
3. Run synthesis via openXC7 Makefile: `cd fpga/openxc7-synth && make`
4. Report timing, resource utilization, and any warnings
5. If synthesis succeeds, note the output .bit file location

### Key Files
- Synthesis scripts: `fpga/openxc7-synth/Makefile`, `fpga/openxc7-synth/synth_beal.tcl`
- Constraint files: `fpga/openxc7-synth/*.xdc`
- Output: `fpga/openxc7-synth/*.bit`, `*.fasm`, `*.frames`

### Board Target
- Artix-7 (xc7a35t) via openXC7 open-source toolchain
