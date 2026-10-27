---
name: vsa-verify
description: Verify VSA (Vector Symbolic Architecture) mathematical proofs and operations. Use for math verification, bind/unbind/bundle testing, phi identity checks.
argument-hint: [operation or proof to verify]
allowed-tools: Bash(zig *), Bash(cat *), Read, Grep, Glob
---

# VSA Mathematical Verification

## Current Test Status
!`cd /Users/playra/trinity-w1 && zig test src/vsa.zig 2>&1 | tail -10`

## Task

Verify VSA mathematical correctness for: $ARGUMENTS

### Verification Checklist
1. **Bind/Unbind invertibility**: `unbind(bind(a, b), b) == a` for all hypervectors
2. **Bundle majority vote**: `bundle3(a, a, b) ~ a` (similarity > 0.5)
3. **Orthogonality**: random vectors have similarity ~ 0
4. **Permutation**: `permute(permute(v, k), -k) == v`
5. **Trinity Identity**: verify `phi^2 + 1/phi^2 = 3` in computations
6. **Information density**: confirm 1.58 bits/trit encoding

### Key Source Files
- Core VSA: `src/vsa.zig` (bind, unbind, bundle, similarity)
- Tests: `src/vsa/tests.zig`
- BSD verification: `src/bsd/verify_bsd.zig`
- Math foundations: `docs/docs/math-foundations/vsa-theorems.md`
- Constants: `src/hslm/constants.zig`

### Mathematical Constants
- phi = (1 + sqrt(5)) / 2 = 1.6180339...
- mu = phi^(-4) = 0.0382
- chi = 0.0618
- sigma = phi
- epsilon = 1/3
