#!/usr/bin/env python3
"""Check dispatch identifiers before invoking a privileged article author."""
import json
import os
import re
from pathlib import Path


def validate(pr, issue, number, outbox):
    if not re.fullmatch(r"[1-9][0-9]*", number) or not re.fullmatch(r"[1-9][0-9]*", outbox):
        raise ValueError("Expected positive PR and outbox numbers")
    repo = "Trinity-S-AI-DNA/trinity"
    if pr.get("number") != int(number) or pr.get("base", {}).get("repo", {}).get("full_name") != repo:
        raise ValueError("Source PR identity mismatch")
    if pr.get("merged") is not True or not pr.get("merged_at") or pr.get("state") != "closed":
        raise ValueError("Source PR is not merged")
    if issue.get("number") != int(outbox) or "pull_request" in issue:
        raise ValueError("Outbox is not the expected issue")
    if issue.get("user", {}).get("login") != "github-actions[bot]":
        raise ValueError("Outbox was not created by the workflow")
    if (issue.get("body") or "").splitlines()[:1] != [f"<!-- t27-pr-blog:{number} -->"]:
        raise ValueError("Outbox belongs to another source PR")
    if issue.get("state") != "open":
        raise ValueError("Outbox is already closed; no new publication")
    return {"repository": {"full_name": repo}, "number": int(number), "pull_request": pr}


if __name__ == "__main__":
    pr = json.loads(Path("/tmp/pr.json").read_text())
    issue = json.loads(Path("/tmp/outbox.json").read_text())
    event = validate(pr, issue, os.environ["SOURCE_PR_NUMBER"], os.environ["BLOG_OUTBOX_NUMBER"])
    Path("/tmp/event.json").write_text(json.dumps(event))
