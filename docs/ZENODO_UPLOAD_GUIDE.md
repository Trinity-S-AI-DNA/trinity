# Trinity Zenodo v9.0 Upload Guide

**Complete Step-by-Step Instructions for Publishing to Zenodo**

> φ² + 1/φ² = 3 | TRINITY
> **Version:** 9.0 | **Date:** 2026-03-27
> **Status:** ✅ Ready for Publication

---

## Quick Start (5 Minutes)

```bash
# 1. Set API token
export ZENODO_TOKEN="your_token_here"

# 2. Validate metadata
python3 tools/validate_zenodo_v19.py --all

# 3. Dry-run test
python3 tools/zenodo_upload_v9.py --dry-run --all

# 4. Upload all bundles
python3 tools/zenodo_upload_v9.py --all
```

---

## Prerequisites

### 1. Zenodo Account
- Create account: https://zenodo.org/signup
- Verify email address
- Link ORCID profile (0009-0008-4294-6159)

### 2. API Token
- Go to: https://zenodo.org/account/settings/applications/tokens/new
- Click "New token"
- Required scopes:
  - `deposit:write` — Create/modify depositions
  - `deposit:actions` — Publish depositions
  - `files:write` — Upload files
- Copy token to clipboard

### 3. Set Environment Variable
```bash
# Option A: Environment variable (recommended for CI)
export ZENODO_TOKEN="your_token_here"

# Option B: .env file (add to .gitignore!)
echo "ZENODO_TOKEN=your_token_here" >> .env
```

**⚠️ SECURITY:** Never commit `.env` with real tokens!

### 4. Verify Token
```bash
curl -H "Authorization: Bearer $ZENODO_TOKEN" https://zenodo.org/api/deposit/depositions
```

Expected output: JSON array of your depositions (may be empty `[]`)

---

## Required Files Checklist

### Metadata Files (8 JSON)
| Bundle | File | Status |
|--------|------|--------|
| B001 | `docs/research/.zenodo.B001_v9.0.json` | ✅ |
| B002 | `docs/research/.zenodo.B002_v9.0.json` | ✅ |
| B003 | `docs/research/.zenodo.B003_v9.0.json` | ✅ |
| B004 | `docs/research/.zenodo.B004_v9.0.json` | ✅ |
| B005 | `docs/research/.zenodo.B005_v9.0.json` | ✅ |
| B006 | `docs/research/.zenodo.B006_v9.0.json` | ✅ |
| B007 | `docs/research/.zenodo.B007_v9.0.json` | ✅ |
| PARENT | `docs/research/.zenodo.PARENT_v9.0.json` | ✅ |

### Figure Files (12 PNG)
| Figure | File | Size | Status |
|--------|------|------|--------|
| B001-Fig1 | `B001-Fig1_training_curve.png` | ~170 KB | ✅ |
| B001-Fig2 | `B001-Fig2_format_comparison.png` | ~75 KB | ✅ |
| B002-Fig1 | `B002-Fig1_fpga_resources.png` | ~99 KB | ✅ |
| B002-Fig2 | `B002-Fig2_power_analysis.png` | ~82 KB | ✅ |
| B003-Fig1 | `B003-Fig1_register_layout.png` | ~104 KB | ✅ |
| B004-Fig1 | `B004-Fig1_lotus_cycle.png` | ~133 KB | ✅ |
| B005-Fig1 | `B005-Fig1_type_hierarchy.png` | ~120 KB | ✅ |
| B006-Fig1 | `B006-Fig1_gf16_layout.png` | ~79 KB | ✅ |
| B006-Fig2 | `B006-Fig2_phi_heatmap.png` | ~100 KB | ✅ |
| B007-Fig1 | `B007-Fig1_vsa_structure.png` | ~84 KB | ✅ |
| B007-Fig2 | `B007-Fig2_simd_speedup.png` | ~91 KB | ✅ |

### Generate Figures (if needed)
```bash
cd docs/research/figures
python3 generate_all.py
```

---

---

## Step-by-Step Upload

### Step 1: Validate Metadata (2 minutes)

```bash
# Validate all 8 bundles
python3 tools/validate_zenodo_v19.py --all

# Expected output:
# ✅ B001: VALID (100/100)
# ✅ B002: VALID (100/100)
# ✅ B003: VALID (100/100)
# ✅ B004: VALID (100/100)
# ✅ B005: VALID (100/100)
# ✅ B006: VALID (100/100)
# ✅ B007: VALID (100/100)
# ✅ PARENT: VALID (100/100)
#
# ✅ All bundles VALID!
# Average Score: 100/100
```

### Step 2: Dry-Run Test (1 minute)

```bash
# Test upload without actually publishing
python3 tools/zenodo_upload_v9.py --dry-run --all
```

### Step 3: Upload Bundles

#### Option A: Upload All Bundles (Recommended)

```bash
# Upload all 8 bundles sequentially
python3 tools/zenodo_upload_v9.py --all
```

**Expected Duration:** ~10 minutes (1 minute per bundle)

#### Option B: Upload Individual Bundle

```bash
# B001 (HSLM)
python3 tools/zenodo_upload_v9.py --bundle B001

# B002 (FPGA)
python3 tools/zenodo_upload_v9.py --bundle B002

# Or use aliases (A-G)
python3 tools/zenodo_upload_v9.py --alias A  # B001
python3 tools/zenodo_upload_v9.py --alias B  # B002
```

#### Option C: Upload Parent Collection Only

```bash
python3 tools/zenodo_upload_v9.py --bundle PARENT
```

### Upload Process Details

For each bundle, the script performs 4 steps:

| Step | Action | Duration |
|------|--------|----------|
| 1/4 | Create deposition (draft) | ~5 sec |
| 2/4 | Update metadata with v9.0 JSON | ~10 sec |
| 3/4 | Upload figure files (12 PNG) | ~30 sec |
| 4/4 | Publish and return DOI | ~10 sec |
| **Total** | **Per bundle** | **~1 min** |

---

## Expected Output

### Successful Upload

```
============================================================
Publishing B001 to Zenodo...
============================================================
Title: Trinity B001: HSLM-1.95M Ternary Neural Networks v9.0
Version: 9.0

[1/4] Creating deposition...
     Draft ID: 1234567

[2/4] Updating metadata...

[3/4] Uploading figures...
     Uploaded 3 figure files

[4/4] Publishing...

============================================================
✅ B001 Published!
============================================================
DOI:         10.5281/zenodo.19227865
Concept DOI: 10.5281/zenodo.19227865
URL:         https://doi.org/10.5281/zenodo.19227865
```

---

## Troubleshooting

### Error: "401 Unauthorized"
**Cause:** Invalid or missing API token
**Fix:**
```bash
# Verify token
curl -H "Authorization: Bearer $ZENODO_TOKEN" https://zenodo.org/api/deposit/depositions
# If 401, regenerate token and try again
```

### Error: "400 Bad Request"
**Cause:** Invalid metadata format
**Fix:**
```bash
# Validate metadata
python3 tools/validate_zenodo_v19.py --all
```

### Error: "404 Not Found"
**Cause:** Bundle JSON file not found
**Fix:** Verify file exists at `docs/research/.zenodo.BXXX_v9.0.json`

### Error: "413 Payload Too Large"
**Cause:** Files exceed Zenodo limit
**Fix:**
- Remove large files from upload
- Use Git LFS for large binaries
- Compress figures before upload

---

## Post-Upload Verification

### 1. Check Zenodo Record
- Visit: https://zenodo.org/record/19227865
- Verify title, authors, description
- Check DOI is correct

### 2. Verify Files
- Click "Files" tab
- Check all expected files are present
- Verify file sizes

### 3. Test Download
- Click "Download" button
- Extract and verify contents

### 4. Update CITATION.cff
After first upload, update DOI if auto-generated:
```yaml
doi: 10.5281/zenodo.YOUR_ACTUAL_DOI
```

---

## Version Management

### Creating New Version

```bash
# Update version in metadata JSON
# "version": "9.0" → "9.1"

# Upload new version
python3 tools/zenodo_upload_v9.py --bundle B001
```

Zenodo automatically:
- Creates new version under same concept DOI
- Preserves version history
- Links all versions together

### Best Practices

1. **Semantic Versioning:** Major.Minor.Patch (e.g., 9.0.0 → 9.0.1 → 9.1.0)
2. **Changelog:** Document changes in description
3. **Backward Compatibility:** Minor versions should be compatible
4. **Deletion:** Never delete published versions

---

## Integration with GitHub

### Automatic Deposit from GitHub Actions

Add `.github/workflows/zenodo-publish.yml`:

```yaml
name: Zenodo Publish

on:
  release:
    types: [published]

jobs:
  zenodo:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Publish to Zenodo
        env:
          ZENODO_TOKEN: ${{ secrets.ZENODO_TOKEN }}
        run: |
          python3 tools/zenodo_upload_v9.py --bundle PARENT
```

### GitHub-Zenodo Link

1. Go to Zenodo record
2. Click "On GitHub integration"
3. Select repository: `gHashTag/trinity`
4. Zenodo will automatically update on new releases

---

## Citation After Upload

### BibTeX
```bibtex
@software{trinity_b001,
  title={Trinity B001: HSLM-1.95M Ternary Neural Networks v9.0},
  author={Vasilev, Dmitrii},
  year={2026},
  doi={10.5281/zenodo.19227865},
  publisher={Zenodo}
}
```

### APA
```
Vasilev, D. (2026). Trinity B001: HSLM-1.95M ternary neural networks v9.0. Zenodo. https://doi.org/10.5281/zenodo.19227865
```

### IEEE
```
D. Vasilev, "Trinity B001: HSLM-1.95M ternary neural networks v9.0," Zenodo, 2026. doi: 10.5281/zenodo.19227865.
```

---

## Checklist

Before Upload:
- [ ] All metadata validated (`python3 tools/validate_zenodo_v19.py --all`)
- [ ] CITATION.cff exists at project root
- [ ] README.md is up to date
- [ ] LICENSE file is included
- [ ] All tests pass (`zig build test`)
- [ ] Code formatted (`zig fmt`)

After Upload:
- [ ] Verify record on Zenodo website
- [ ] Check DOI is correct
- [ ] Test download
- [ ] Update GitHub release notes
- [ ] Notify collaborators

---

## Support

**Documentation:** https://t27.ai

**Issues:** https://github.com/gHashTag/trinity/issues

**Email:** dmitrii@trinity.ai

---

**φ² + 1/φ² = 3 | TRINITY**
