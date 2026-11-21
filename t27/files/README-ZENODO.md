# T27 Zenodo Publication

This repository is published to Zenodo with DOI: `https://doi.org/10.5281/zenodo.19456875`

## Authors

Vasilev, Dmitrii — Trinity Computing

## Repository Structure

**Main framework:** `https://github.com/gHashTag/trinity` — Trinity S³AI Framework
**Spec language (this repo):** `https://github.com/gHashTag/t27` — T27 specification language

This Zenodo entry publishes the **T27 specification language** which is used within the Trinity framework.

## Citation

```bibtex
@software{t27_v0_1_0,
  title     = {T27: TRI-27 — Spec-First Language for Ternary Computing},
  author    = {Vasilev, Dmitrii},
  year      = {2026},
  month     = {4},
  version   = {0.1.0},
  doi       = {10.5281/zenodo.19456875},
  publisher = {Zenodo},
  keywords = {ternary computing, specification language, Zig, Coq, formal verification, t27, tri CLI}
}
```

## Abstract

T27 is a spec-first language for ternary computing built on Zig with formal verification support via Coq. Provides comprehensive tooling for software development, specification, and testing.

## Description

T27 implements the TRI-27 spec-first language with:

- **Specification Language (`.t27`)**: Declarative, testable specifications for all software components
- **Formal Verification (Coq)**: Machine-checked proofs for mathematical theorems
- **Build System (`tri` CLI)**: Compiler and toolchain for generating verified software
- **Testing Framework**: Comprehensive test runner with TDD-Inside-Spec methodology
- **Documentation Generation**: Automatic documentation from `.t27` specifications

## Key Features

- **Spec-first development**: Write `.t27` specifications, generate code
- **TDD-Inside-Spec**: Every spec includes `test`/`invariant`/`bench` sections
- **Formal verification**: Coq proofs for core mathematical properties
- **Zero-parameter mechanism**: Theorem 3 proves φ emerges as universal fixed-point attractor from balancing recursion

## References

Whitepaper: "GoldenFloat: φ-Optimal Floating-Point Formats" (in-progress)

**Trinity framework:** https://github.com/gHashTag/trinity — Main repository
**T27 spec language:** https://github.com/gHashTag/t27 — This repository

## Zenodo Rules

- **Open Access**: Published under CC-BY 4.0 or MIT license
- **Versioned**: Semantic versioning (v0.1.0) for tracking changes
- **Preserved**: Zenodo creates permanent DOI for all versions
- **DOI**: Each version gets unique DOI in 10.5281/zenodo.* namespace

## Publication Checklist

- [x] .zenodo.json configured with complete metadata
- [x] CITATION.cff created with author information
- [x] GitHub workflow for automated Zenodo publishing
- [x] Version 0.1.0 created
- [ ] GitHub release v0.1.0 created
- [ ] DOI generated and verified

## How to Cite

Use the Bibtex entry above or visit: https://doi.org/10.5281/zenodo.19456875

---

**Note:** This is the t27 companion repository. The main trinity framework repository is published separately under the trinity community.
