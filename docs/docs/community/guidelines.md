---
sidebar_position: 1
---

# Community Guidelines

Welcome to the Trinity community! We're thrilled to have you here. This document will help you understand how to contribute, interact, and grow with our community.

---

## Welcome to Trinity! 👋

Trinity is a groundbreaking project that combines **ternary computing**, **Vector Symbolic Architecture (VSA)**, and **sacred mathematics** to build the next generation of AI infrastructure. Our community is built on curiosity, collaboration, and respect.

Whether you're a beginner exploring ternary computing for the first time or an expert in distributed systems, your contribution matters. We believe that diverse perspectives lead to better solutions.

<div class="green-card">
<h4>Before You Start</h4>

Please read and follow our <a href="https://github.com/gHashTag/trinity/blob/main/CODE_OF_CONDUCT.md" target="_blank">Code of Conduct</a>. We're committed to providing a welcoming and inclusive environment for everyone.

</div>

---

## Contribution Levels 🎯

Trinity offers multiple ways to contribute based on your experience and interests. Choose your path and grow at your own pace.

### Beginner 🌱

**Perfect for you if:** You're new to the project, ternary computing, or open-source contributions.

**What you can do:**

- **Documentation Improvements**
  - Fix typos and grammar in our docs
  - Add clarifying examples to existing explanations
  - Translate documentation to other languages
  - Improve tutorial clarity

- **Bug Reports**
  - Report issues you encounter with clear reproduction steps
  - Test pre-release versions and provide feedback
  - Verify bug fixes and confirm they work

- **Example Code**
  - Create simple example programs in `.tri` or `.vibee`
  - Write tutorials for specific features
  - Record screen captures of workflows

- **Community Support**
  - Answer questions in GitHub Discussions
  - Help newcomers in Telegram chat
  - Share your learning journey via blog posts

**Example First Contribution:**

```bash
# 1. Find a "good first issue" label
# 2. Comment that you'd like to work on it
# 3. Fork the repository
# 4. Create a simple documentation fix
git checkout -b docs/fix-typo-in-readme
# 5. Make your changes and submit a PR
```

### Developer 💻

**Perfect for you if:** You're comfortable with Zig, understand VIBEE specs, and want to build features.

**What you can do:**

- **Feature Development**
  - Write new `.vibee` specifications
  - Implement VIBEE compiler improvements
  - Add new language backends to the code generator
  - Extend the VSA operation set

- **Performance Optimization**
  - Profile and optimize hot paths
  - Add SIMD implementations (AVX2, AVX-512, NEON)
  - Improve memory layout for cache efficiency
  - Write benchmarks for new optimizations

- **Testing & Quality**
  - Add comprehensive test cases to `.vibee` specs
  - Improve test coverage in existing modules
  - Write property-based tests for VSA operations
  - Create fuzzing harnesses for parsers

- **Tooling**
  - Improve the TRI CLI (Command Line Interface)
  - Add new commands to `tri` toolchain
  - Build developer tools and dashboards
  - Create debugging utilities

**Example Feature Workflow:**

```bash
# 1. Discuss your idea in an issue or discussion
# 2. Create a feature branch
git checkout -b feature/sparse-vsa-operations

# 3. Write the VIBEE specification
cat > specs/tri/sparse_operations.vibee << 'EOF'
name: sparse_operations
version: "1.0.0"
language: zig
module: sparse_operations

types:
  SparseVector:
    fields:
      indices: List<Int>
      values: List<Trit>
      dimension: Int

behaviors:
  - name: sparse_bundle
    given: Two sparse vectors with same dimension
    when: Element-wise majority voting at non-zero indices
    then: Returns sparse vector with bundled values
EOF

# 4. Generate code
zig build vibee -- gen specs/tri/sparse_operations.vibee

# 5. Test
zig build test

# 6. Write Critical Assessment and propose Tech Tree options
# 7. Submit PR with complete 16-link cycle documentation
```

### Expert 🔥

**Perfect for you if:** You deeply understand the architecture, mathematics, and want to push boundaries.

**What you can do:**

- **Architecture Design**
  - Propose major subsystem changes
  - Design new VSA operations with mathematical proofs
  - Extend the Golden Chain (17-link development pipeline)
  - Improve the VIBEE language itself

- **Research & Innovation**
  - Explore novel ternary algorithms
  - Publish benchmark comparisons
  - Integrate cutting-edge AI/ML research
  - Write formal proofs for VSA properties

- **Infrastructure**
  - Design and implement DePIN protocols
  - Build distributed consensus mechanisms
  - Create cross-language SDKs (Python, Rust, Go, etc.)
  - Optimize WebAssembly and FPGA targets

- **Mentorship**
  - Review complex pull requests
  - Guide developers through the 16-link cycle
  - Host workshops and webinars
  - Write in-depth technical blog posts

**Example Expert Contribution:**

```bash
# 1. Start with a research document
docsite/docs/research/my-research-topic.md

# 2. Create proof-of-concept specification
specs/tri/experimental_feature.vibee

# 3. Implement with full validation
zig build vibee -- gen specs/tri/experimental_feature.vibee
zig build test
zig build bench

# 4. Document with research report
# docsite/docs/research/feature-validation-report.md

# 5. Lead discussion in RFC (Request for Comments)
# 6. Iterate based on community feedback
# 7. Merge and update architecture docs
```

---

## Development Workflow 🔄

Trinity follows a **strict specification-first development paradigm**. This ensures quality, consistency, and mathematical rigor.

### The Golden Chain (17-Link Cycle)

Every contribution follows the mandatory 17-link development cycle. Run `tri pipeline run` to execute the full cycle, or follow these steps manually:

<div class="theorem-card">
<h4>Specification-First Development</h4>

All code MUST be generated from `.vibee` specifications. The specification is the **source of truth** — never edit generated code directly.

</div>

| Link | Phase | Action | Command |
|------|-------|--------|---------|
| 0 | Analyze | Understand the problem | Review docs, existing specs |
| 1 | Research | Study prior art and mathematics | Read papers, analyze algorithms |
| 2 | Spec | Write `.vibee` specification | Create `specs/tri/feature.vibee` |
| 3 | Validate | Check specification correctness | `tri spec_validate <file.vibee>` |
| 4 | Decompose | Break into sub-tasks | `tri decompose <task>` |
| 5 | Plan | Generate implementation plan | `tri plan <task>` |
| 6 | Spec-Create | Create spec from template | `tri spec_create <name>` |
| 7 | Verify-Unit | Run unit tests | `zig build test` |
| 8 | Verify-Integ | Run integration tests | `zig build test` |
| 9 | Verify-E2E | Run end-to-end tests | `tri verify` |
| 10 | Verify-Perf | Run performance benchmarks | `tri bench` |
| 11 | Verify-Load | Run load testing | Custom scripts |
| 12 | Verdict | Generate critical assessment | `tri verdict` |
| 13 | Tech-Tree | Propose 3 next steps | Manual (see below) |
| 14 | Document | Update documentation | Edit `docsite/` files |
| 15 | Commit | Create atomic commit | `tri commit "<message>"` |
| 16 | Deploy | Deploy to production | Manual or CI |
| 17 | Loop-Decide | Decide to continue or exit | `tri loop-decide [mode]` |

### Quick Start Workflow

For small changes, you can use the minimal workflow:

```bash
# Step 1: Create specification
cat > specs/tri/my_feature.vibee << 'EOF'
name: my_feature
version: "1.0.0"
language: zig
module: my_feature

types:
  MyType:
    fields:
      value: Int

behaviors:
  - name: my_function
    given: A MyType instance
    when: Calling my_function
    then: Returns transformed value
EOF

# Step 2: Generate code
tri gen specs/tri/my_feature.vibee

# Step 3: Test
zig build test

# Step 4: Run full verification
tri verify

# Step 5: Generate verdict (Critical Assessment)
tri verdict

# Step 6: Commit
tri commit "feat: add my_feature specification"

# Step 7: Submit PR
gh pr create --title "feat: add my_feature" --body-file PR_TEMPLATE.md
```

### Ralph Autonomous Development

For automated development, use **Ralph** — our autonomous development agent:

```bash
# Start Ralph in monitoring mode
ralph --monitor

# Ralph will:
# 1. Read .ralph/fix_plan.md for current tasks
# 2. Execute the 17-link Golden Chain cycle
# 3. Enforce quality gates (build + test + format)
# 4. Update TECH_TREE.md and memory files
# 5. Loop until EXIT_SIGNAL is satisfied
```

---

## Branch Naming Conventions 🌿

Clear branch names help us understand the purpose of changes at a glance.

### Format

```
<type>/<short-description>
```

### Branch Types

| Type | Usage | Examples |
|------|-------|----------|
| `feature/` | New features or specifications | `feature/sparse-vsa-ops`, `feature/vibee-python-backend` |
| `fix/` | Bug fixes | `fix/trit-bundling-off-by-one`, `fix/memory-leak-in-hypervector` |
| `docs/` | Documentation changes | `docs/api-reference-update`, `docs/contributing-guide` |
| `refactor/` | Code restructuring (compiler only) | `refactor/codegen-pipeline`, `refactor/vm-instruction-set` |
| `perf/` | Performance improvements | `perf/simd-vsa-bind`, `perf/cache-friendly-layout` |
| `test/` | Test additions or improvements | `test/property-based-vsa`, `test/fuzz-vibee-parser` |
| `chore/` | Build, CI, tooling | `chore/zig-0.15.0-upgrade`, `chore/github-actions-fix` |
| `release/` | Release preparation | `release/v2.0.0`, `release/patch-v2.1.3` |
| `revert/` | Revert previous commit | `revert-fix-1234` |
| `experiment/` | Experimental features | `experiment/quantum-vsa`, `experiment/alternative-encoding` |

### Examples

```bash
# Good branch names
git checkout -b feature/hypervector-cache
git checkout -b fix/unbind-edge-case
git checkout -b docs/contributing-guide
git checkout -b perf/avx2-bundle3
git checkout -b experiment/future-vsa-operations

# Avoid (too vague)
git checkout -b updates
git checkout -b stuff
git checkout -b tmp
```

### Branch Lifecycle

1. **Create**: `git checkout -b feature/my-feature`
2. **Develop**: Follow the 17-link Golden Chain cycle
3. **Test**: Ensure `zig build test` passes
4. **Format**: Run `zig fmt src/`
5. **Commit**: Follow Conventional Commits
6. **Push**: `git push origin feature/my-feature`
7. **PR**: Create pull request with template
8. **Review**: Address feedback
9. **Merge**: Squash-merge to `main`
10. **Cleanup**: Delete branch after merge

---

## Commit Message Format ✉️

Trinity follows [Conventional Commits](https://www.conventionalcommits.org/) for clear, structured commit history.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types

| Type | Purpose | Example |
|------|---------|---------|
| `feat` | New feature | `feat(vsa): add sparse vector operations` |
| `fix` | Bug fix | `fix(vm): correct stack underflow error` |
| `docs` | Documentation | `docs: update VIBEE specification guide` |
| `refactor` | Code restructuring | `refactor(codegen): simplify AST traversal` |
| `test` | Test additions | `test(vsa): add property-based tests` |
| `perf` | Performance improvement | `perf(bind): SIMD-accelerate ternary multiply` |
| `chore` | Build/tooling | `chore: upgrade Zig to 0.15.0` |
| `style` | Style changes | `style: format code with zig fmt` |
| `revert` | Revert previous | `revert: fix(vsa) incorrect unbind logic` |

### Scope

The scope indicates the module or component affected:

| Scope | Module |
|-------|--------|
| `vsa` | Vector Symbolic Architecture |
| `vm` | Ternary Virtual Machine |
| `hybrid` | HybridBigInt (packed trit encoding) |
| `firebird` | LLM inference engine |
| `vibee` | VIBEE compiler |
| `depin` | DePIN infrastructure |
| `cli` | TRI CLI tool |
| `docs` | Documentation |

### Examples

```bash
# Simple commit
git commit -m "feat(vsa): add sparse vector bundle operation"

# Complex commit with body
git commit -m "feat(vsa): add sparse vector operations

- Implement SparseVector type with index-value encoding
- Add sparse_bundle for efficient sparse representation
- Include test cases for edge cases (empty, full density)
- Performance: 20x faster for density < 0.1

Closes #42"

# Bug fix
git commit -m "fix(vm): prevent stack underflow in conditional jumps

The previous implementation allowed negative stack indices,
causing undefined behavior. Added bounds checking.

Fixes #38"

# Breaking change
git commit -m "feat(vsa)!: change Hypervector dimension default

BREAKING CHANGE: Default dimension changed from 10000 to 8192
for better cache alignment. Users relying on old default must
update their code."
```

### Rules

1. **Use imperative mood**: "add" not "added" or "adds"
2. **Keep subject short**: Under 72 characters
3. **Capitalize subject**: First letter uppercase
5. **Don't end with period**: Subject is a sentence fragment
6. **Reference issues**: Use "Closes #42" or "Refs #38"
7. **One change per commit**: Atomic commits are easier to review
8. **Explain WHY, not WHAT**: Body should provide context

### Before Pushing

```bash
# Check your commits
git log origin/main..HEAD --oneline

# Format should look like:
# feat(vsa): add sparse vector operations
# fix(vm): prevent stack underflow
# docs: update contributing guide
```

---

## Getting Help 🆘

We're here to help! Don't hesitate to reach out.

### GitHub Issues

Use GitHub Issues for:

- **Bug Reports**: Clear reproduction steps, environment details
- **Feature Requests**: Describe the problem, not just the solution
- **Documentation Gaps**: Point out confusing or missing docs
- **Performance Issues**: Include benchmarks and profiles

**Issue Template:**

```markdown
## Problem Description
[Clear description of the issue]

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- OS: [e.g., macOS 14.0]
- Zig version: [e.g., 0.15.0]
- Trinity version: [e.g., v2.0.0]

## Additional Context
[Logs, screenshots, benchmarks]
```

### GitHub Discussions

Use Discussions for:

- **Questions**: How to use specific features
- **Design Discussions**: Explore ideas before implementation
- **Show and Tell**: Share what you've built
- **RFCs**: Request for Comments on major changes

**Discussion Categories:**

| Category | Purpose |
|----------|---------|
| `q-and-a` | Questions and answers |
| `ideas` | Feature ideas and proposals |
| `show-and-tell` | Community projects |
| `rfc` | Request for Comments (major changes) |

### Telegram Community

Join our **Telegram chat** for real-time discussion:

- **Quick questions**: Get fast help from community members
- **Development chat**: Discuss ongoing work
- **Announcements**: Stay updated on releases

**Telegram Guidelines:**

1. **Be patient**: Community members volunteer their time
2. **Search first**: Check if your question was already answered
3. **Use threads**: Reply in threads to keep chat organized
4. **English preferred**: Helps the widest audience understand
5. **No DMs**: Keep discussions public for everyone's benefit

### Documentation

- **Quick Reference**: [CLI Reference](/cli)
- **API Docs**: [API Reference](/api)
- **Concepts**: [Core Concepts](/concepts)
- **Math**: [Mathematical Foundations](/math-foundations)
- **Contributing**: [Contributing Guide](/contributing)

---

## Recognition 🏆

We value every contribution. Here's how we recognize our community members.

### Contributors List

Every contributor is listed in our **ALL CONTRIBUTORS** file:

```bash
# View all contributors
cat docsite/data/contributors.json
```

### Contribution Types

We use the [All Contributors](https://allcontributors.org/) specification:

| Type | Emoji | Description |
|------|-------|-------------|
| `code` | 💻 | Code contributions |
| `doc` | 📖 | Documentation improvements |
| `design` | 🎨 | Design and graphics |
| `test` | ⚠️ | Test additions |
| `bug` | 🐛 | Bug reports |
| `question` | ❓ | Answering questions |
| `review` | 👀 | Code review |
| `ideas` | 🤔 | Feature ideas |
| `infra` | 🚇 | Infrastructure/tooling |
| `tool` | 🔧 | Developer tools |

### Major Contributors

Contributors with significant impact are featured:

- **Hall of Fame**: `docsite/docs/community/hall-of-fame.md`
- **Release Notes**: Acknowledged in each release
- **Blog Posts**: Featured contributor spotlights

### How to Add Yourself

After your first contribution is merged:

```bash
# 1. The maintainer will update contributors.json
# 2. Your name appears on the website
# 3. You'll be listed in release notes

# Optionally, add yourself to ALL CONTRIBUTORS:
npx all-contributors add @yourusername <type>
```

---

## Release Process 🚀

Trinity follows **Semantic Versioning** (`MAJOR.MINOR.PATCH`):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

### Release Cycle

1. **Development**: Happens on `main` branch
2. **Stabilization**: Feature freeze, bug fixes only
3. **Release Candidate**: Pre-release testing
4. **Release**: Tagged version (`v2.0.0`)
5. **Post-Release**: Monitor for issues

### Release Checklist

Maintainers use this checklist for releases:

```markdown
## Pre-Release
- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in all files
- [ ] Release notes drafted

## Release
- [ ] Git tag created
- [ ] GitHub release published
- [ ] Website deployed
- [ ] Docsite deployed
- [ ] Announcement posted

## Post-Release
- [ ] Monitor for issues
- [ ] Address critical bugs
- [ ] Plan next iteration
```

### Staying Updated

To stay informed about releases:

- **Watch releases on GitHub**: Click "Watch" → "Custom" → "Releases"
- **Join Telegram**: Release announcements posted there
- **Check CHANGELOG.md**: Detailed release notes
- **Subscribe to RSS**: GitHub releases feed

---

## Quick Reference 📋

### Essential Commands

```bash
# Build
zig build                    # Build all
zig build test              # Run tests
zig build bench             # Run benchmarks

# VIBEE
tri gen <spec.vibee>        # Generate code
tri verify                  # Full verification
tri bench                   # Performance benchmarks

# Git
tri status                  # Show working tree status
tri commit "<message>"      # Stage and commit
tri diff                    # Show changes

# Ralph
ralph --monitor             # Autonomous development
```

### Important Links

| Resource | URL |
|----------|-----|
| Repository | https://github.com/gHashTag/trinity |
| Documentation | https://t27.ai |
| Issues | https://github.com/gHashTag/trinity/issues |
| Questions and discussion | https://github.com/gHashTag/trinity/issues (Discussions is not enabled) |
| Code of Conduct | https://github.com/gHashTag/trinity/blob/main/CODE_OF_CONDUCT.md |

### File Locations

| What | Where |
|------|-------|
| Specifications | `specs/tri/*.vibee` |
| VIBEE Compiler | `src/vibeec/*.zig` |
| Core Library | `src/*.zig` (vsa, vm, hybrid) |
| Generated Code | `var/trinity/output/*.zig` (DO NOT EDIT) |
| Documentation | `docsite/docs/*.md` |
| CLI Tools | `src/tri/*.zig` |
| Ralph Config | `.ralph/*` |

---

## Thank You! 🙏

Trinity exists because of contributors like you. Whether you're fixing a typo, implementing a new feature, or helping a newcomer in Telegram — **you make this project better**.

### Ready to Contribute?

1. Read the [Contributing Guide](/contributing)
2. Explore [Good First Issues](https://github.com/gHashTag/trinity/labels/good%20first%20issue)
3. Join our [Telegram community](https://t.me/trinity)
4. Start with something small and grow from there

**Remember:** Every contribution, no matter how small, is valuable. Welcome to the Trinity community! 🌟

---

<div class="formula formula-green">

**Together, we're building the future of AI — one trit at a time.**

</div>
