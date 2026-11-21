---
name: wrap-up
description: Format and upload session wrap-up to NotebookLM for persistent semantic memory
version: 1.0.0
author: Trinity S3AI Framework
---

# Wrap-Up Skill

Upload session summaries to NotebookLM for cross-session memory persistence.

## What It Does

1. Extracts session context from `.trinity/` state files
2. Formats summary as Markdown with metadata
3. Uploads to NotebookLM as searchable source

## Usage

```
/wrap-up "Session completed Phi Loop iterations for Ring-071"
```

Or with full details:

```
/wrap-up --summary "Implemented NotebookLM backend" \
         --decisions "Used notebooklm-py SDK with cookie auth" \
         --files "contrib/backend/notebooklm/*.py" \
         --steps "Run integration tests"
```

## Implementation

This skill uses the t27 spec-first approach:

- **Spec**: `specs/automation/wrapup-auto.t27`
- **Backend**: `contrib/backend/notebooklm/wrapup_auto.py`
- **Invocation**: Python script directly (no shell scripts - L7 compliant)

**Direct invocation (for debugging):**
```bash
.trinity/notebooklm-venv/bin/python3 \
    contrib/backend/notebooklm/wrapup_auto.py \
    --summary "Session summary" \
    --session-id "$(git rev-parse --short HEAD)" \
    --decisions "Key decisions" \
    --files "file1.py,file2.py" \
    --steps "Next steps"
```

## Configuration

- **Auth**: Cookie-based via `notebooklm login` (stores in `~/.notebooklm/storage_state.json`)
- **Active Notebook**: Set via `--notebook` flag (default: "t27-QUEEN-BRAIN")
- **Default Notebook**: "t27-QUEEN-BRAIN" (creates if not exists)
- **Storage**: `~/.notebooklm/` — browser profile, storage state

**Setup Commands:**
```bash
python -m venv .trinity/notebooklm-venv
.trinity/notebooklm-venv/bin/pip install notebooklm-py
notebooklm login              # Authenticate via browser (one-time)
```

## Output

Returns source ID and notebook ID for verification:
```json
{
  "notebook_id": "...",
  "source_id": "...",
  "uploaded_at": "2026-04-08T..."
}
```
