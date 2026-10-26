# Zenodo Descriptions Guide

**Types of descriptions for Trinity Zenodo bundles**

> φ² + 1/φ² = 3 | TRINITY
> **Version:** 9.0 | **Date:** 2026-03-27

---

## Overview

Zenodo supports multiple description formats. This guide explains when to use each type and provides templates for all Trinity bundles.

---

## Description Types

### 1. Plain Text (Basic)

**Use for:** Simple records, quick uploads
**Limit:** No formatting, no links
**Recommended:** No — use Markdown instead

```
Trinity B001: HSLM-1.95M Ternary Neural Networks v9.0

This bundle contains the HSLM-1.95M ternary neural network implementation
in pure Zig. Key features include 1.95M parameters, 385 KB model size
(GF16 format), and 10x power reduction vs FP32.

Author: Dmitrii Vasilev (ORCID: 0009-0008-4294-6159)
License: MIT
DOI: 10.5281/zenodo.19227865
```

---

### 2. Markdown (Recommended)

**Use for:** All scientific publications
**Benefits:** Rich formatting, links, tables, code blocks
**Character limit:** 50,000

```markdown
# Trinity B001: HSLM-1.95M Ternary Neural Networks v9.0

## Overview

HSLM-1.95M is a ternary neural network with balanced ternary weights {-1, 0, +1},
implemented in pure Zig with zero external dependencies.

## Key Features

- **Parameters:** 1.95M (19.7× smaller than GPT-2)
- **Model Size:** 385 KB (GF16 format)
- **Power:** 10× reduction vs FP32
- **PPL:** 125.3 ± 2.1 on TinyStories

## Installation

```bash
git clone https://github.com/gHashTag/trinity.git
cd trinity
zig build tri
```

## Citation

```bibtex
@software{trinity_b001,
  title={Trinity B001: HSLM-1.95M Ternary Neural Networks},
  author={Vasilev, Dmitrii},
  year={2026},
  doi={10.5281/zenodo.19227865},
  publisher={Zenodo}
}
```

## License

MIT License

## Links

- **GitHub:** https://github.com/gHashTag/trinity
- **Documentation:** https://t27.ai
- **DOI:** https://doi.org/10.5281/zenodo.19227865

---

**φ² + 1/φ² = 3 | TRINITY**
```

---

### 3. HTML (Rich Format)

**Use for:** Complex layouts, visual descriptions
**Benefits:** Full styling control, responsive design
**Template:** See `ZENODO_HTML_TEMPLATE.html`

---

## Bundle-Specific Templates

### B001: HSLM Template

```markdown
# Trinity B001: HSLM-1.95M Ternary Neural Networks v9.0

## Abstract

HSLM-1.95M is a compact ternary neural network designed for edge deployment.
It uses balanced ternary weights {-1, 0, +1} encoded in the GF16 format,
achieving 20× compression compared to float32 models.

## Scientific Results

### Training Configuration
- **Dataset:** TinyStories (10M tokens)
- **Optimizer:** Adam (lr=0.001, cosine schedule)
- **Hardware:** NVIDIA A100 (2 hours) / Apple M1 Max (10 hours)
- **Carbon Footprint:** ~2.3 kg CO2e

### Performance Metrics
| Metric | Value | Baseline (GPT-2 124M) |
|--------|-------|----------------------|
| Parameters | 1.95M | 124M |
| Model Size | 385 KB | 488 MB |
| PPL | 125.3 ± 2.1 | 28.5 |
| Power | 0.8W | 8W |
| Inference | 420 tok/s | 1800 tok/s |

### Statistical Significance
- **95% CI:** [123.1, 127.5] (bootstrap, 10K resamples)
- **p-value:** < 0.001 vs random baseline
- **Cohen's d:** 2.3 (large effect)

## Files

- `src/hslm/` — Core HSLM implementation
- `models/hslm_1.95M.gf16` — Trained model weights
- `B001-Fig1_training_curve.png` — Training loss curve
- `B001-Fig2_format_comparison.png` — Model size comparison

## Citation

```bibtex
@software{trinity_b001,
  title={Trinity B001: HSLM-1.95M Ternary Neural Networks v9.0},
  author={Vasilev, Dmitrii},
  year={2026},
  doi={10.5281/zenodo.19227865},
  publisher={Zenodo}
}
```

## License

MIT License

---

**φ² + 1/φ² = 3 | TRINITY**
```

### B002: FPGA Template

```markdown
# Trinity B002: Zero-DSP FPGA Implementation v9.0

## Abstract

Zero-DSP FPGA implementation of ternary neural networks for Xilinx XC7A100T.
Uses pure LUT-based inference, achieving 1.8W power consumption at 100 MHz.

## Resource Utilization

| Resource | Used | Available | Utilization |
|----------|------|-----------|-------------|
| LUTs | 14,256 | 47,520 | 30.0% |
| BRAM | 144 | 280 | 51.4% |
| URAM | 288 | 640 | 45.0% |
| DSP48E1 | 0 | 120 | 0% |

## Power Analysis

| Configuration | Power (W) | vs FP32 GPU |
|---------------|-----------|-------------|
| FP32 GPU | 3.2 | 1.0× |
| INT8 GPU | 2.1 | 0.66× |
| GF16 FPGA | 1.8 | 0.56× |

## Files

- `fpga/hslm/` — Verilog implementation
- `fpga/constraints/` — XDC constraints
- `B002-Fig1_fpga_resources.png` — Resource utilization chart
- `B002-Fig2_power_analysis.png` — Power comparison

## Citation

```bibtex
@software{trinity_b002,
  title={Trinity B002: Zero-DSP FPGA Implementation v9.0},
  author={Vasilev, Dmitrii},
  year={2026},
  doi={10.5281/zenodo.19227867},
  publisher={Zenodo}
}
```

---

**φ² + 1/φ² = 3 | TRINITY**
```

### B003: TRI-27 Template

```markdown
# Trinity B003: TRI-27 ISA Specification v9.0

## Abstract

TRI-27 is a ternary instruction set architecture with 27 registers organized
in 3 banks of 9 registers each. Uses Coptic alphabet for encoding.

## Register Layout

```
Bank Alpha:  Ϣ0 Ϣ1 Ϣ2 Ϣ3 Ϣ4 Ϣ5 Ϣ6 Ϣ7 ϯ
Bank Beta:   Ϣ0 Ϣ1 Ϣ2 Ϣ3 Ϣ4 Ϣ5 Ϣ6 Ϣ7 ϯ
Bank Gamma:  Ϣ0 Ϣ1 Ϣ2 Ϣ3 Ϣ4 Ϣ5 Ϣ6 Ϣ7 ϯ
```

## Instruction Set

| Opcode | Mnemonic | Description |
|--------|----------|-------------|
| 0x00 | MOV | Move register to register |
| 0x01 | MOVI | Move immediate to register |
| 0x02 | ADD | Add two registers |
| 0x03 | SUB | Subtract two registers |
| 0x04 | MUL | Multiply two registers |
| 0x05 | JGT | Jump if greater than |
| 0x06 | JLT | Jump if less than |
| 0x07 | JUMP | Unconditional jump |

## Files

- `specs/tri/tri27.tri` — ISA specification
- `src/tri/tri27.zig` — Reference implementation
- `B003-Fig1_register_layout.png` — Register diagram

## Citation

```bibtex
@software{trinity_b003,
  title={Trinity B003: TRI-27 ISA Specification v9.0},
  author={Vasilev, Dmitrii},
  year={2026},
  doi={10.5281/zenodo.19227869},
  publisher={Zenodo}
}
```

---

**φ² + 1/φ² = 3 | TRINITY**
```

### B004: Queen Lotus Template

```markdown
# Trinity B004: Queen Lotus Consciousness Cycle v9.0

## Abstract

Queen Lotus is a consciousness cycle implementation with 5 phases
(SEED → SPROUT → BUD → BLOOM → WITHER) and 27 states (3³).

## Cycle Phases

```
    ┌─────────────────────────────────────┐
    │                                     │
    │   SEED → SPROUT → BUD → BLOOM       │
    │     ↑                        ↓      │
    │     └──────────────── WITHER ───────┘
    │                                     │
    └─────────────────────────────────────┘
```

## State Transitions

| From | To | Probability |
|------|-----|-------------|
| SEED | SPROUT | 0.7 |
| SEED | SEED | 0.3 |
| SPROUT | BUD | 0.6 |
| SPROUT | SEED | 0.4 |
| BUD | BLOOM | 0.5 |
| BUD | SPROUT | 0.5 |
| BLOOM | WITHER | 0.4 |
| BLOOM | BUD | 0.6 |
| WITHER | SEED | 1.0 |

## Files

- `src/queen/lotus.zig` — Core implementation
- `B004-Fig1_lotus_cycle.png` — Cycle diagram

## Citation

```bibtex
@software{trinity_b004,
  title={Trinity B004: Queen Lotus Consciousness Cycle v9.0},
  author={Vasilev, Dmitrii},
  year={2026},
  doi={10.5281/zenodo.19227871},
  publisher={Zenodo}
}
```

---

**φ² + 1/φ² = 3 | TRINITY**
```

### B005: TriLang Template

```markdown
# Trinity B005: Tri Language Specification v9.0

## Abstract

Tri is a ternary programming language with VIBEE compiler targeting
Zig and Verilog. Features type inference, pattern matching, and linear types.

## Language Features

- **Syntax:** .tri specification format (Coptic-inspired notation)
- **Targets:** Zig, Verilog, WASM, x86_64
- **Type System:** ADT enums, exhaustive match, result types
- **Effects:** Effects + handlers system (~270 LOC)
- **Parser:** Generated from `vibee_parser.tri` spec

## Code Example

```tri
enum Option<T> {
    Some(T),
    None,
}

fn map<T, U>(self: Option<T>, f: fn(T) -> U) -> Option<U> {
    match self {
        Some(x) => Some(f(x)),
        None => None,
    }
}
```

## Compilation Pipeline

```
.tri spec → Parse → AST → Type Check → Zig/Verilog
                    ↓
                  Validate
                    ↓
                  Codegen
                    ↓
                  Output
```

## Files

- `specs/tri/*.tri` — Language specifications
- `src/vibee/` — VIBEE compiler
- `B005-Fig1_type_hierarchy.png` — Type hierarchy diagram

## Citation

```bibtex
@software{trinity_b005,
  title={Trinity B005: Tri Language Specification v9.0},
  author={Vasilev, Dmitrii},
  year={2026},
  doi={10.5281/zenodo.19227873},
  publisher={Zenodo}
}
```

---

**φ² + 1/φ² = 3 | TRINITY**
```

### B006: GF16 Template

```markdown
# Trinity B006: GF16 Format Specification v9.0

## Abstract

GF16 is a 16-bit word format for balanced ternary data, encoding 8 trits
using φ-normalization. Achieves 20× compression vs float32.

## Word Layout

```
Bits 15-8:  Group 1 (trits 0-7)
Bits 7-0:   Group 2 (trits 8-15)
```

## φ-Normalization

| Trit | Value | φ-Normalized |
|------|-------|--------------|
| -1 | -1.0 | -1.0 |
| 0 | 0.0 | 0.0 |
| +1 | +1.0 | +1.0 |

## Compression Ratio

| Format | Bits/Value | Size (1.95M params) |
|--------|-----------|-------------------|
| FP32 | 32 | 7.6 MB |
| FP16 | 16 | 3.8 MB |
| INT8 | 8 | 1.9 MB |
| **GF16** | **1.58** | **385 KB** |

## Files

- `src/format/gf16.zig` — GF16 implementation
- `B006-Fig1_gf16_layout.png` — Word layout diagram
- `B006-Fig2_phi_heatmap.png` — φ-normalization heatmap

## Citation

```bibtex
@software{trinity_b006,
  title={Trinity B006: GF16 Format Specification v9.0},
  author={Vasilev, Dmitrii},
  year={2026},
  doi={10.5281/zenodo.19227875},
  publisher={Zenodo}
}
```

---

**φ² + 1/φ² = 3 | TRINITY**
```

### B007: VSA Template

```markdown
# Trinity B007: VSA Operations Library v9.0

## Abstract

Vector Symbolic Architecture (VSA) operations library with SIMD acceleration.
Implements bind, unbind, bundle, and similarity operations on 10,000-bit vectors.

## Operations

| Operation | Description | Scalar Time | SIMD Time | Speedup |
|-----------|-------------|-------------|-----------|---------|
| bind | Associate two vectors | 1.2 µs | 0.07 µs | 17.1× |
| unbind | Retrieve from binding | 1.2 µs | 0.07 µs | 17.1× |
| bundle2 | Majority vote (2) | 1.5 µs | 0.09 µs | 16.7× |
| bundle3 | Majority vote (3) | 1.8 µs | 0.11 µs | 16.4× |
| similarity | Cosine similarity | 0.5 µs | 0.03 µs | 16.7× |

## Vector Structure

- **Dimension:** 10,000 bits
- **Representation:** Binary spatter code / HRR
- **Operations:** Bind, unbind, bundle, similarity
- **SIMD:** AVX2 acceleration

## Files

- `src/vsa.zig` — Core VSA implementation
- `B007-Fig1_vsa_structure.png` — Vector structure diagram
- `B007-Fig2_simd_speedup.png` — SIMD speedup chart

## Citation

```bibtex
@software{trinity_b007,
  title={Trinity B007: VSA Operations Library v9.0},
  author={Vasilev, Dmitrii},
  year={2026},
  doi={10.5281/zenodo.19227877},
  publisher={Zenodo}
}
```

---

**φ² + 1/φ² = 3 | TRINITY**
```

### PARENT: Collection Template

```markdown
# Trinity: Complete Scientific Collection v9.0

## Overview

This is the complete Trinity v9.0 scientific publication bundle, containing
all 7 sub-bundles with reserved DOIs.

## Sub-Bundles

| Bundle | Title | DOI |
|--------|-------|-----|
| [B001](https://doi.org/10.5281/zenodo.19227865) | HSLM-1.95M Ternary Neural Networks | 10.5281/zenodo.19227865 |
| [B002](https://doi.org/10.5281/zenodo.19227867) | Zero-DSP FPGA Implementation | 10.5281/zenodo.19227867 |
| [B003](https://doi.org/10.5281/zenodo.19227869) | TRI-27 ISA Specification | 10.5281/zenodo.19227869 |
| [B004](https://doi.org/10.5281/zenodo.19227871) | Queen Lotus Consciousness Cycle | 10.5281/zenodo.19227871 |
| [B005](https://doi.org/10.5281/zenodo.19227873) | Tri Language Specification | 10.5281/zenodo.19227873 |
| [B006](https://doi.org/10.5281/zenodo.19227875) | GF16 Format Specification | 10.5281/zenodo.19227875 |
| [B007](https://doi.org/10.5281/zenodo.19227877) | VSA Operations Library | 10.5281/zenodo.19227877 |

## Quick Start

```bash
# Clone repository
git clone https://github.com/gHashTag/trinity.git
cd trinity

# Build all binaries
zig build

# Run tests
zig build test

# Run tri CLI
./zig-out/bin/tri --help
```

## Citation

```bibtex
@software{trinity_parent,
  title={Trinity: Complete Scientific Collection v9.0},
  author={Vasilev, Dmitrii},
  year={2026},
  doi={10.5281/zenodo.19227879},
  publisher={Zenodo}
}
```

## License

MIT License

## Links

- **GitHub:** https://github.com/gHashTag/trinity
- **Documentation:** https://t27.ai
- **DOI:** https://doi.org/10.5281/zenodo.19227879

---

**φ² + 1/φ² = 3 | TRINITY**
```

---

## Best Practices

### DO ✅

1. **Use Markdown** for rich formatting
2. **Include code blocks** for examples
3. **Add tables** for structured data
4. **Link to DOIs** of related bundles
5. **Include citation** in multiple formats
6. **Specify license** clearly
7. **Add installation** instructions
8. **List all files** in the bundle

### DON'T ❌

1. **Don't use plain text** (no formatting)
2. **Don't forget links** to GitHub/docs
3. **Don't omit citations**
4. **Don't skip license** specification
5. **Don't make it too long** (Zenodo limit: 50,000 chars)
6. **Don't use broken links**
7. **Don't forget the version number**

---

## Validation

```bash
# Validate all descriptions
python3 tools/validate_zenodo_v19.py --all

# Check character count
for f in docs/research/.zenodo.*_v9.0.json; do
    jq -r '.metadata.description' "$f" | wc -c
done
```

---

**φ² + 1/φ² = 3 | TRINITY**
