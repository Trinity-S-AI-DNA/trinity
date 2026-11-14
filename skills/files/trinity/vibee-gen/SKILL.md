---
name: vibee-gen
description: Generate Zig or Verilog code from VIBEE specifications. Use when creating or updating .tri specs and regenerating code.
argument-hint: <path/to/spec.tri>
allowed-tools: Bash(zig *), Bash(cat *), Bash(ls *), Read, Grep, Glob
---

# VIBEE Code Generation

## Available Specs
!`find /Users/playra/trinity-w1/specs -name "*.tri" 2>/dev/null | head -20`

## Task

Generate code from VIBEE specification: $ARGUMENTS

### Pipeline
1. Validate the .tri spec format (YAML: name, version, language, module, types, behaviors)
2. Run codegen: `cd /Users/playra/trinity-w1 && zig build vibee -- gen $ARGUMENTS`
3. Check generated output in `var/trinity/output/` (Zig) or `var/trinity/output/fpga/` (Verilog)
4. Run tests on generated code: `zig test <generated_file>`
5. Report: generated files, line count, any warnings

### Spec Format Reference
```yaml
name: module_name
version: "1.0.0"
language: zig        # or: varlog (Verilog), python
module: module_name
types:
  TypeName:
    fields:
      field: Type
behaviors:
  - name: function_name
    given: Precondition
    when: Action
    then: Result
```

### Key Directories
- Specs: `specs/tri/*.tri`, `trinity-nexus/tri/*.tri`
- Generated Zig: `var/trinity/output/tri/zig/`
- Generated Verilog: `var/trinity/output/fpga/`
- Compiler source: `trinity-nexus/lang/src/` (imported as trinity-lang module)
