# Changelog

All notable changes to Trinity will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Note:** The Zig library version (`build.zig.zon`: 0.15.2) tracks the Zig SDK compatibility.
> Release versions (v1.0.x) track the Trinity product releases.

## [1.0.1] - 2026-02-28

### Added

- Production distribution across 4 platforms (npm, Homebrew, AUR, Docker)
- 134 TRI CLI commands covering AI, math, chemistry, git workflows
- Live dashboard at https://t27.ai

### Changed

- VSA Bind performance improved 71.7% (45.2ms -> 12.8ms)
- SIMD Bundle performance improved 73.4% (128.5ms -> 34.2ms)
- WASM overhead reduced 55.7% (18.5% -> 8.2%)
- Memory usage reduced 66.7% (2.4GB -> 0.8GB)

## [1.0.0] - 2026-02-28

### Added

- Vector Symbolic Architecture (VSA) with bind/unbind/bundle operations
- Ternary Virtual Machine (VM) with 100+ opcodes
- VIBEE Compiler v7 with self-improving code generation
- Firebird LLM engine for CPU-only inference (no GPU required)
- DePIN Network with P2P node discovery and DHT routing
- Sacred Swarm Intelligence with 32-agent coordination
- Ternary encoding: 1.58 bits/trit, 20x memory savings vs float32
- 41 sacred opcodes (mathematics, chemistry, physics)
- JIT compiler architecture with hot opcode tracking
- SIMD batch processing
- FPGA toolchain (OpenXC7 + Vivado)
- Multi-language code generation (Zig, Verilog, Python)

[1.0.1]: https://github.com/gHashTag/trinity/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/gHashTag/trinity/releases/tag/v1.0.0
