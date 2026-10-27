#!/usr/bin/env python3
"""Validate a PR's data-only work report and create unpublished blog artifacts.

Usage: pr_blog_report.py validate --event "$GITHUB_EVENT_PATH" --output out
           [--files files.jsonl --commits commits.jsonl]
The trusted caller supplies a GitHub pull_request event. No PR code, command,
template, URL, or instruction is ever executed or fetched by this program.

One narrow exemption: a Dependabot PR whose body has no report block, whose
every commit is Dependabot's own GitHub-signed commit and whose every changed
file is a dependency manifest or lockfile is its own report. The trusted caller
supplies the changed files and commits as JSON lines; the bump is recorded as a
`dependency-bump` report.json and no blog draft is produced. A PR that carries a
report block is always validated normally, Dependabot or not.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import html
import json
import math
import os
from pathlib import Path
import re
import sys
import tempfile
from typing import Any


START = "<!-- t27-work-report -->"
END = "<!-- /t27-work-report -->"
MAX_EVENT_BYTES = 2 * 1024 * 1024
MAX_REPORT_CHARS = 65536

# The field bounds live in specs/report/work_report.t27; pr-blog-report.yml reads
# the spec and passes them here as WR_* env (the POST_DIR precedent). The literals
# are the spec's own values, so a run without the env behaves identically.
MIN_RESULT = int(os.environ.get("WR_MIN_RESULT", "12"))
MIN_OUTLINE = int(os.environ.get("WR_MIN_OUTLINE", "80"))
MAX_FIELD = int(os.environ.get("WR_MAX_FIELD", "4000"))
SHA = re.compile(r"[0-9a-fA-F]{40}\Z")
REPOSITORY = re.compile(r"[A-Za-z0-9][A-Za-z0-9-]{0,38}/[A-Za-z0-9][A-Za-z0-9._-]{0,99}\Z")
CAST = re.compile(r"term/[a-z0-9][a-z0-9-]{0,63}/session\.cast\Z")
PLACEHOLDER = re.compile(r"\b(?:TODO|TBD|FIXME)\b", re.IGNORECASE)
EMPTY_VALUE = re.compile(r"(?:none|n/?a|not applicable|placeholder|replace(?: me| this)?|example|test|pending|\.\.\.|…|[-_]+)[.! ]*\Z", re.IGNORECASE)
TEMPLATE_VALUE = re.compile(r"(?:replace (?:this|me|with)\b.*|(?:insert|write|enter|your)\b.*\bhere[.! ]*|<[^>]+>|\[[^\]]+\])\Z", re.IGNORECASE)


DEPENDABOT = "dependabot[bot]"
# Basenames only. Workflow files are deliberately absent: a bump of a GitHub
# Action changes what runs with this repository's token, so it needs a report.
DEPENDENCY_FILE = re.compile(
    r"(?:package\.json|package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml"
    r"|bun\.lockb?|Cargo\.toml|Cargo\.lock|go\.mod|go\.sum|requirements[A-Za-z0-9._-]*\.(?:txt|in)"
    r"|poetry\.lock|uv\.lock|pyproject\.toml|Pipfile(?:\.lock)?|Gemfile(?:\.lock)?"
    r"|composer\.(?:json|lock)|build\.zig\.zon)\Z")
DEPENDENCY_FILE_STATUS = {"modified", "added", "changed"}

# A PR that changes a course carries its blog post. The rule's words and paths live in a
# t27 spec; this program reads only its str constants and fails closed when they are absent.
COURSE_POST_REL = "apps/website/specs/policy/course_post.t27"
COURSE_POST_SPEC = Path(__file__).resolve().parent.parent / COURSE_POST_REL
STR_CONST = re.compile(r'^pub const ([A-Z][A-Z0-9_]*) : str = "([^"\\]*)";$', re.MULTILINE)
STR_LIST_CONST = re.compile(r'^pub const ([A-Z][A-Z0-9_]*) : \[([0-9]+)\]str = \[([^\]]*)\];$', re.MULTILINE)
STR_ITEM = re.compile(r'"([^"\\]*)"')


class ReportError(ValueError):
    """A report or event failed the enforced contract."""


def fail(message: str) -> None:
    raise ReportError(message)


def object_pairs(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            fail(f"duplicate JSON key: {key!r}")
        result[key] = value
    return result


def decode_json(raw: str, context: str) -> Any:
    try:
        return json.loads(raw, object_pairs_hook=object_pairs,
                          parse_constant=lambda value: fail(f"non-finite JSON value: {value}"))
    except (json.JSONDecodeError, RecursionError) as exc:
        fail(f"{context}: malformed JSON ({exc})")


def mapping(value: Any, name: str, keys: set[str] | None = None,
            optional: frozenset[str] = frozenset()) -> dict[str, Any]:
    if not isinstance(value, dict):
        fail(f"{name} must be an object")
    if keys is not None:
        missing = sorted(keys - set(value))
        extra = sorted(set(value) - keys - optional)
        if missing or extra:
            fail(f"{name}: missing keys {missing}; unsupported keys {extra}")
    return value


def text(value: Any, name: str, minimum: int = MIN_RESULT, maximum: int = MAX_FIELD,
         words: int = 0) -> str:
    if not isinstance(value, str):
        fail(f"{name} must be a string")
    # Single-line values cannot introduce Markdown blocks, terminal control
    # sequences, or fake headings. Text is still escaped at the output boundary.
    if any((ord(char) < 32 and char not in "\n\r\t") or ord(char) == 127
           or 0xD800 <= ord(char) <= 0xDFFF for char in value):
        fail(f"{name} contains a control character")
    value = " ".join(value.split())
    if not minimum <= len(value) <= maximum:
        fail(f"{name} must contain {minimum}–{maximum} characters")
    if PLACEHOLDER.search(value) or EMPTY_VALUE.fullmatch(value) or TEMPLATE_VALUE.fullmatch(value):
        fail(f"{name} contains an unfinished placeholder")
    tokens = re.findall(r"\w+", value, flags=re.UNICODE)
    if words and (len(tokens) < words or len(set(word.casefold() for word in tokens)) < min(words, 7)):
        fail(f"{name} must contain meaningful prose (at least {words} words)")
    return value


def text_list(value: Any, name: str, minimum_items: int = 1,
              maximum_items: int = 30, minimum_chars: int = 20,
              words: int = 3) -> list[str]:
    if not isinstance(value, list) or not minimum_items <= len(value) <= maximum_items:
        fail(f"{name} must be a list with {minimum_items}–{maximum_items} items")
    result = [text(item, f"{name}[{index}]", minimum_chars, words=words)
              for index, item in enumerate(value)]
    if len(set(item.casefold() for item in result)) != len(result):
        fail(f"{name} must not contain duplicate items")
    return result


def cast_path(value: Any, name: str) -> str:
    # Only a recording published on the site itself: term/<id>/session.cast.
    if not isinstance(value, str) or not CAST.fullmatch(value):
        fail(f"{name} must be a published recording path term/<id>/session.cast")
    return value


def sha(value: Any, name: str) -> str:
    if not isinstance(value, str) or not SHA.fullmatch(value):
        fail(f"{name} must be a full 40-character hexadecimal commit SHA")
    return value.lower()


def timestamp(value: Any, name: str) -> str:
    if not isinstance(value, str):
        fail(f"{name} must be an ISO 8601 timestamp with a timezone")
    try:
        date = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if date.tzinfo is None:
            fail(f"{name} must include a timezone")
        return date.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    except (ValueError, OverflowError):
        fail(f"{name} must be an ISO 8601 timestamp with a timezone")


def validate_event_identity(event: Any) -> tuple[dict[str, Any], dict[str, Any], str, int, str, str]:
    """Check which repository, PR and head commit the event names."""
    event = mapping(event, "event")
    repository = mapping(event.get("repository"), "event.repository").get("full_name")
    if not isinstance(repository, str) or not REPOSITORY.fullmatch(repository) or repository.split("/")[1] in {".", ".."}:
        fail("event.repository.full_name must be a safe owner/repository name")
    pr = mapping(event.get("pull_request"), "event.pull_request")
    number = pr.get("number")
    if type(number) is not int or not 1 <= number <= 2147483647:
        fail("pull_request.number must be a positive integer")
    if "number" in event and (type(event["number"]) is not int or event["number"] != number):
        fail("event.number does not match pull_request.number")
    if "base" in pr:
        base_repo = mapping(mapping(pr["base"], "pull_request.base").get("repo"), "pull_request.base.repo")
        if base_repo.get("full_name") != repository:
            fail("pull_request.base.repo.full_name does not match event.repository")
    pr_url = f"https://github.com/{repository}/pull/{number}"
    if "html_url" in pr and pr["html_url"] != pr_url:
        fail("pull_request.html_url does not match repository and PR number")
    head_sha = sha(mapping(pr.get("head"), "pull_request.head").get("sha"), "pull_request.head.sha")
    return event, pr, repository, number, pr_url, head_sha


def validate_event(event: Any) -> dict[str, Any]:
    event, pr, repository, number, pr_url, head_sha = validate_event_identity(event)
    state = pr.get("state")
    merged = pr.get("merged")
    if state not in ("open", "closed") or type(merged) is not bool:
        fail("pull_request.state must be open/closed and merged must be a boolean")
    if merged and state != "closed":
        fail("a merged PR must have state closed")
    created_at = timestamp(pr.get("created_at"), "pull_request.created_at")
    merged_at = timestamp(pr.get("merged_at"), "pull_request.merged_at") if merged else None
    merge_sha = sha(pr.get("merge_commit_sha"), "pull_request.merge_commit_sha") if merged else None
    if not merged and pr.get("merged_at") is not None:
        fail("an unmerged PR cannot have merged_at")
    body = pr.get("body")
    if not isinstance(body, str) or len(body) > MAX_REPORT_CHARS * 2:
        fail("pull_request.body must be text within the size limit")
    if body.count(START) != 1 or body.count(END) != 1:
        fail(f"PR body must contain exactly one {START} … {END} block")
    start, end = body.index(START) + len(START), body.index(END)
    if end <= start:
        fail("work report closing marker must follow its opening marker")
    match = re.fullmatch(r"\s*```json[ \t]*\r?\n([\s\S]*?)\r?\n```\s*", body[start:end])
    if not match or len(match.group(1)) > MAX_REPORT_CHARS:
        fail("work report must be exactly one fenced JSON object (```json), within the size limit")
    report = mapping(decode_json(match.group(1), "work report"), "work report", {
        "version", "head_sha", "summary", "changes", "tests", "limitations", "tags", "blog",
    })
    if type(report["version"]) is not int or report["version"] != 1:
        fail("work report.version must be 1")
    if sha(report["head_sha"], "work report.head_sha") != head_sha:
        fail("work report.head_sha is stale: it must match the current PR head SHA")
    tests = report["tests"]
    if not isinstance(tests, list) or not 1 <= len(tests) <= 30:
        fail("work report.tests must have 1–30 test records")
    normalized_tests = []
    for index, raw_test in enumerate(tests):
        prefix = f"work report.tests[{index}]"
        test = mapping(raw_test, prefix, {"command", "result", "status", "evidence"})
        if test["status"] not in ("passed", "failed", "not_run"):
            fail(f"{prefix}.status must be passed, failed, or not_run")
        normalized_tests.append({
            "command": text(test["command"], f"{prefix}.command", 2, 1000),
            "result": text(test["result"], f"{prefix}.result", MIN_RESULT, words=3),
            "status": test["status"],
            "evidence": text(test["evidence"], f"{prefix}.evidence", 12),
        })
    tags = report["tags"]
    if not isinstance(tags, list) or not 2 <= len(tags) <= 5:
        fail("work report.tags must contain 2–5 topic tags")
    normalized_tags = []
    for index, tag in enumerate(tags):
        if not isinstance(tag, str):
            fail(f"work report.tags[{index}] must be a string")
        tag = tag.strip().removeprefix("#")
        if not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]{1,31}", tag) or PLACEHOLDER.search(tag) or EMPTY_VALUE.fullmatch(tag):
            fail(f"work report.tags[{index}] must be a 2–32 character topic hashtag without spaces")
        normalized_tags.append(tag)
    if len(set(tag.casefold() for tag in normalized_tags)) != len(normalized_tags):
        fail("work report.tags must be unique (case-insensitive)")
    blog = mapping(report["blog"], "work report.blog", {"title", "summary", "outline"},
                   frozenset({"cast", "reproduce"}))
    extras: dict[str, Any] = {}
    if "cast" in blog:
        extras["cast"] = cast_path(blog["cast"], "work report.blog.cast")
    if "reproduce" in blog:
        extras["reproduce"] = text_list(blog["reproduce"], "work report.blog.reproduce", 1, 8, 2, 1)
    return {
        "version": 1,
        "repository": repository,
        "number": number,
        "slug": f"pr-{number}",
        "pr_url": pr_url,
        "state": state,
        "merged": merged,
        "created_at": created_at,
        "merged_at": merged_at,
        "merge_commit_sha": merge_sha,
        "head_sha": head_sha,
        "summary": text(report["summary"], "work report.summary", 40, words=6),
        "changes": text_list(report["changes"], "work report.changes"),
        "tests": normalized_tests,
        "limitations": text_list(report["limitations"], "work report.limitations"),
        "tags": normalized_tags,
        "blog": {
            "title": text(blog["title"], "work report.blog.title", 15, 180, words=3),
            "summary": text(blog["summary"], "work report.blog.summary", 40, 600, words=6),
            "outline": text_list(blog["outline"], "work report.blog.outline", 3, 20, MIN_OUTLINE, 12),
            **extras,
        },
    }


def json_lines(raw: str, context: str) -> list[dict[str, Any]]:
    return [mapping(decode_json(line, f"{context} line {index + 1}"), f"{context} line {index + 1}")
            for index, line in enumerate(raw.splitlines()) if line.strip()]


def dependency_bump_refusal(event: Any, files: list[dict[str, Any]],
                            commits: list[dict[str, Any]]) -> str | None:
    """Return why the PR is NOT a pure Dependabot dependency bump, or None if it is."""
    pr = event.get("pull_request") if isinstance(event, dict) else None
    if not isinstance(pr, dict):
        return "event has no pull_request"
    user = pr.get("user") if isinstance(pr.get("user"), dict) else {}
    if user.get("login") != DEPENDABOT or user.get("type") != "Bot":
        return "author is not dependabot[bot]"
    head = pr.get("head") if isinstance(pr.get("head"), dict) else {}
    base = pr.get("base") if isinstance(pr.get("base"), dict) else {}
    head_repo = head.get("repo") if isinstance(head.get("repo"), dict) else {}
    base_repo = base.get("repo") if isinstance(base.get("repo"), dict) else {}
    if not base_repo.get("full_name") or head_repo.get("full_name") != base_repo.get("full_name"):
        return "head branch is not in the base repository"
    if not isinstance(head.get("ref"), str) or not head["ref"].startswith("dependabot/"):
        return "head branch is not a dependabot/ branch"
    if not files or type(pr.get("changed_files")) is not int or len(files) != pr["changed_files"]:
        return "changed-file list is missing or incomplete"
    for item in files:
        name, status = item.get("filename"), item.get("status")
        if not isinstance(name, str) or not DEPENDENCY_FILE.fullmatch(name.rsplit("/", 1)[-1]):
            return f"changes a file that is not a dependency manifest or lockfile: {name!r}"
        if status not in DEPENDENCY_FILE_STATUS:
            return f"{status!r} change to {name!r} is not a version bump"
    if not commits or type(pr.get("commits")) is not int or len(commits) != pr["commits"]:
        return "commit list is missing or incomplete"
    for item in commits:
        # Dependabot's commits are authored by it and signed by GitHub (web-flow).
        # A pushed commit with a forged author email is not web-flow verified.
        if (item.get("author") != DEPENDABOT or item.get("committer") != "web-flow"
                or item.get("verified") is not True):
            return f"commit {str(item.get('sha'))[:12]} is not a GitHub-signed Dependabot commit"
    if commits[-1].get("sha") != head.get("sha"):
        return "commit list does not end at the PR head"
    return None


def dependency_bump_report(event: dict[str, Any], files: list[dict[str, Any]],
                           commits: list[dict[str, Any]]) -> dict[str, Any]:
    """Build the bump's own report. Claims only what the API data shows."""
    pr = event["pull_request"]
    repository = event["repository"]["full_name"]
    title = pr.get("title")
    return {
        "version": 1,
        "kind": "dependency-bump",
        "repository": repository,
        "number": pr["number"],
        "pr_url": f"https://github.com/{repository}/pull/{pr['number']}",
        "head_sha": sha(pr["head"]["sha"], "pull_request.head.sha"),
        "title": text(title, "pull_request.title", 1, 300),
        "files": [{"filename": item["filename"], "status": item["status"]} for item in files],
        "commits": [sha(item.get("sha"), "commit.sha") for item in commits],
        "note": ("Dependabot dependency bump: manifests and lockfiles only, every commit "
                 "GitHub-signed by Dependabot. No tests are claimed by this report; CI on the "
                 "PR is the only verification. No blog draft is generated."),
    }


def course_post_policy(path: Path = COURSE_POST_SPEC) -> dict[str, Any]:
    """Read the course-post rule from its t27 spec. A missing or malformed spec fails closed."""
    try:
        source = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        fail(f"course-post policy {path.name} is unreadable: {exc}")
    strings = dict(STR_CONST.findall(source))
    lists = {name: (int(size), STR_ITEM.findall(items)) for name, size, items in STR_LIST_CONST.findall(source)}
    for name in ("RULE", "COURSE_DIR", "POST_DIR"):
        if not strings.get(name):
            fail(f"course-post policy {path.name} has no str constant {name}")
    if not strings["COURSE_DIR"].endswith("/") or not strings["POST_DIR"].endswith("/"):
        fail(f"course-post policy {path.name}: COURSE_DIR and POST_DIR must end with /")
    size, statuses = lists.get("POST_STATUSES", (0, []))
    # t27 does not check a declared array length (gHashTag/t27#7395), so this reader does.
    if not statuses or len(statuses) != size:
        fail(f"course-post policy {path.name}: POST_STATUSES must list exactly its declared length")
    return {"rule": strings["RULE"], "course_dir": strings["COURSE_DIR"],
            "post_dir": strings["POST_DIR"], "statuses": frozenset(statuses)}


def course_post_refusal(event: dict[str, Any], files: list[dict[str, Any]],
                        policy: dict[str, Any]) -> tuple[str | None, str | None]:
    """Return (refusal, notice): why a course PR lacks its post, and what could not be decided."""
    changes = [(item.get("filename"), item.get("status"), item.get("previous_filename")) for item in files]
    if any(not isinstance(name, str) or not isinstance(status, str) or not isinstance(old, (str, type(None)))
           for name, status, old in changes):
        return "changed-file list has an entry without a filename or status", None
    # A file renamed out of the course directory is still a course change.
    course = [name for name, _, old in changes
              if name.startswith(policy["course_dir"]) or (old or "").startswith(policy["course_dir"])]
    changed = event["pull_request"].get("changed_files")
    incomplete = type(changed) is int and len(files) < changed
    if not course:
        if incomplete:
            return None, (f"course-post rule not decided: the files API listed {len(files)} of "
                          f"{changed} changed files and none of them is under {policy['course_dir']}")
        return None, None
    if any(name.startswith(policy["post_dir"]) and status in policy["statuses"] for name, status, _ in changes):
        return None, None
    if incomplete:
        return None, (f"course-post rule not decided: the files API listed {len(files)} of {changed} "
                      f"changed files, {course[0]} among them, and no post under {policy['post_dir']} "
                      "was seen in the listed part")
    more = f" and {len(course) - 1} more course file(s)" if len(course) > 1 else ""
    return (f"{policy['rule']} This PR changes {course[0]}{more} but adds or modifies no post "
            f"under {policy['post_dir']} (rule in {COURSE_POST_REL})"), None


# Every post carries a widget; the rule lives in a t27 spec. Bodies are text the workflow saved, never run.
POST_WIDGET_REL = "apps/website/specs/policy/post_widget.t27"
BLOCK_KIND, BODY_EXPORT = re.compile(r"""\bkind["']?\s*:\s*["']([a-z]+)["']"""), re.compile(r"\bexport const (body|ruBody)\b")


def post_widget_policy(path: Path = COURSE_POST_SPEC.parent / "post_widget.t27") -> dict[str, Any]:
    """Read the widget rule from its t27 spec. A missing or malformed spec fails closed."""
    try:
        source = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        fail(f"post-widget policy {path.name} is unreadable: {exc}")
    strings = dict(STR_CONST.findall(source))
    lists = {name: STR_ITEM.findall(items) for name, size, items in STR_LIST_CONST.findall(source)
             if len(STR_ITEM.findall(items)) == int(size)}  # t27 does not check it (gHashTag/t27#7395)
    if not (strings.get("RULE") and strings.get("POST_DIR", "").endswith("/") and "WIDGET_KINDS" in lists and "GRANDFATHERED" in lists):
        fail(f"post-widget policy {path.name} needs RULE, POST_DIR ending with /, WIDGET_KINDS and GRANDFATHERED at their declared length")
    return {"rule": strings["RULE"], "post_dir": strings["POST_DIR"], "kinds": frozenset(lists["WIDGET_KINDS"]), "old": frozenset(lists["GRANDFATHERED"])}


def post_widget_refusal(files: list[dict[str, Any]], posts: Path, policy: dict[str, Any]) -> str | None:
    """Why a post body this PR adds or changes has no widget; None when every one has."""
    for item in files:
        name, base = item.get("filename"), str(item.get("filename")).rsplit("/", 1)[-1]
        if (item.get("status") == "removed" or not isinstance(name, str) or not name.startswith(policy["post_dir"])
                or not base.endswith(".ts") or base[:-3] in policy["old"]):
            continue
        try:
            parts = BODY_EXPORT.split((posts / base).read_text(encoding="utf-8"))
        except (OSError, UnicodeError) as exc:
            return f"{name}: the post body was not saved as data, so its widgets cannot be read ({exc})"
        bare = [parts[i] for i in range(1, len(parts) - 1, 2) if not policy["kinds"] & set(BLOCK_KIND.findall(parts[i + 1]))]
        if bare or "body" not in parts[1::2]:
            return f"{policy['rule']} {name} has none in {' or '.join(bare) or 'body'} (rule in {POST_WIDGET_REL})"
    return None


def lifecycle(report: dict[str, Any]) -> str:
    if report["merged"]:
        return "Merged PR; unpublished blog draft"
    if report["state"] == "closed":
        return "Closed without merge; unpublished blog draft"
    return "Open PR; unpublished blog draft (not merged)"


STATUS_LABEL = {"passed": "passed", "failed": "FAILED", "not_run": "not run"}


def code_span(value: str) -> str:
    return value if "`" in value else f"`{value}`"


def check_count(tests: list[dict[str, Any]]) -> str:
    counts = {status: sum(test["status"] == status for test in tests) for status in STATUS_LABEL}
    parts = [f"{counts[status]} {STATUS_LABEL[status]}" for status in STATUS_LABEL if counts[status]]
    return ", ".join(parts)


def make_post(report: dict[str, Any]) -> dict[str, Any]:
    """Produce the website's Post schema, never an SVG/HTML block or published post.

    The order follows what readers do with a technical post: they read the
    first lines and skim headings. So the result comes first, then the problem
    (outline[0]) and how it was solved (the rest of the outline), then the
    evidence and its limits. Where the text came from closes the post.
    """
    blog = report["blog"]
    tests = report["tests"]
    status = (f"{lifecycle(report).split(';')[0]}. Checks reported by the author: "
              f"{check_count(tests)}; this generator did not rerun them.")
    body: list[dict[str, Any]] = [
        {"kind": "p", "text": report["summary"]},
        {"kind": "p", "text": status},
        {"kind": "h", "text": "The problem"},
        {"kind": "p", "text": blog["outline"][0]},
        {"kind": "h", "text": "How it works"},
    ]
    body.extend({"kind": "p", "text": paragraph} for paragraph in blog["outline"][1:])
    page = None
    if "cast" in blog:
        page = f"https://t27.ai/{blog['cast'].rsplit('/', 1)[0]}/"
        body.extend([
            {"kind": "h", "text": "See it run"},
            {"kind": "p", "text": f"A terminal recording of the commands is published at {page} "
                                  "(prompt and typing staged, every printed byte real)."},
        ])
    body.extend([
        {"kind": "h", "text": "What changed"},
        {"kind": "ul", "items": report["changes"]},
        {"kind": "h", "text": "How we checked"},
        {"kind": "table", "head": ["Check", "Status", "Result", "Evidence"],
         "rows": [[code_span(test["command"]), STATUS_LABEL[test["status"]], test["result"], test["evidence"]]
                  for test in tests]},
    ])
    if "reproduce" in blog:
        body.extend([
            {"kind": "h", "text": "Try it yourself"},
            {"kind": "p", "text": "The author lists these commands to reproduce the result; "
                                  "this generator did not run them."},
            {"kind": "code", "text": "\n".join(blog["reproduce"])},
        ])
    body.extend([
        {"kind": "h", "text": "What this does not show"},
        {"kind": "ul", "items": report["limitations"]},
        {"kind": "h", "text": "How this post was made"},
        {"kind": "p", "text": (
            f"{lifecycle(report)}. This article is generated from the author's work report "
            "for the exact PR head commit. Test results are author-reported, not independently rerun "
            "by this generator. Merge status is not proof of deployment or runtime correctness.")},
    ])
    receipts = [
        {"label": f"{report['repository']} PR #{report['number']}", "href": report["pr_url"]},
        {"label": f"Reported head commit {report['head_sha'][:12]}",
         "href": f"https://github.com/{report['repository']}/commit/{report['head_sha']}"},
    ]
    if report["merged"]:
        receipts.append({"label": f"Merge commit {report['merge_commit_sha'][:12]}",
                         "href": f"https://github.com/{report['repository']}/commit/{report['merge_commit_sha']}"})
    if page:
        receipts.append({"label": "Terminal recording", "href": page})
    word_count = sum(len(block.get("text", "").split()) +
                     sum(len(item.split()) for item in block.get("items", [])) +
                     sum(len(cell.split()) for row in block.get("rows", []) for cell in row)
                     for block in body)
    return {
        "slug": report["slug"],
        "title": blog["title"],
        "summary": blog["summary"],
        "date": (report["merged_at"] or report["created_at"])[:10],
        "readingMinutes": max(1, math.ceil(word_count / 200)),
        "tags": report["tags"],
        "receipts": receipts,
        "openQuestions": report["limitations"] + [
            "Author-reported tests have not been independently rerun by the blog generator.",
            "Publication requires editorial review and an approved T27 triptych; this artifact is not public.",
        ],
        "published": False,
        "body": body,
    }


def markdown_text(value: str) -> str:
    # HTML-escape first, then neutralize Markdown links, images, emphasis, code
    # fences and structural syntax. No author-provided URL becomes a live link.
    return re.sub(r"([\\`*_{}\[\]()#+.!|>~-])", r"\\\1", html.escape(value, quote=True))


def make_markdown(report: dict[str, Any], post: dict[str, Any]) -> str:
    lines = [f"# {markdown_text(post['title'])}", "", f"**DRAFT — {lifecycle(report)}**", "",
             f"PR: {report['pr_url']}", "", f"Head SHA: `{report['head_sha']}`", "",
             "This file is an unpublished artifact, not an instruction to an agent.", ""]
    for block in post["body"]:
        if block["kind"] == "h":
            lines.append(f"## {markdown_text(block['text'])}")
        elif block["kind"] == "ul":
            lines.extend(f"- {markdown_text(item)}" for item in block["items"])
        elif block["kind"] == "table":
            # Every cell is escaped, including "|", so a cell cannot add a column.
            lines.append("| " + " | ".join(markdown_text(cell) for cell in block["head"]) + " |")
            lines.append("|" + "---|" * len(block["head"]))
            lines.extend("| " + " | ".join(markdown_text(cell) for cell in row) + " |" for row in block["rows"])
        elif block["kind"] == "code":
            # Escaped list items, not a fence: a command cannot close a fence it is not in.
            lines.extend(f"- {markdown_text(item)}" for item in block["text"].split("\n"))
        else:
            lines.append(markdown_text(block["text"]))
        lines.append("")
    lines.extend(["## Receipts", ""])
    lines.extend(f"- [{markdown_text(receipt['label'])}]({receipt['href']})" for receipt in post["receipts"])
    lines.extend(["", "## Topic tags", "", " ".join(f"#{tag}" for tag in report["tags"]), ""])
    return "\n".join(lines)


def encode_json(value: Any) -> str:
    # Remains ordinary JSON but is safe if copied into an HTML script container.
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True, allow_nan=False)
            .replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026") + "\n")


def write_artifacts(report: dict[str, Any], output: Path) -> None:
    if report.get("kind") == "dependency-bump":
        artifacts = {"report.json": encode_json(report)}
    else:
        post = make_post(report)
        artifacts = {
            "report.json": encode_json(report),
            "post.json": encode_json(post),
            "draft.md": make_markdown(report, post),
        }
    write_files(artifacts, output)


def write_files(artifacts: dict[str, str], output: Path) -> None:
    if output.is_symlink():
        fail("output directory must not be a symlink")
    output.mkdir(parents=True, exist_ok=True)
    if not output.is_dir():
        fail("output must be a directory")
    for name in artifacts:
        path = output / name
        if path.is_symlink() or (path.exists() and not path.is_file()):
            fail(f"refusing to replace non-regular output file: {name}")
    for name, content in artifacts.items():
        path = output / name
        if path.exists() and path.read_text(encoding="utf-8") == content:
            continue  # Re-running the same event does not even change mtimes.
        descriptor, temporary = tempfile.mkstemp(prefix=f".{name}.", dir=output)
        try:
            with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
                stream.write(content)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary, path)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    validate = commands.add_parser("validate", help="validate the current PR report and emit drafts")
    validate.add_argument("--event", type=Path, required=True)
    validate.add_argument("--output", type=Path, required=True)
    validate.add_argument("--files", type=Path, help="changed files as JSON lines {filename,status}")
    validate.add_argument("--commits", type=Path,
                          help="PR commits as JSON lines {sha,author,committer,verified}")
    validate.add_argument("--posts", type=Path, help="directory of the changed post bodies, saved as text")
    check = commands.add_parser("check", help="check a PR body file locally before the pull request exists")
    check.add_argument("--body", type=Path, required=True)
    check.add_argument("--head-sha", required=True)
    args = parser.parse_args(argv)
    if args.command == "check":
        try:
            body = args.body.read_text(encoding="utf-8")
            event = {"repository": {"full_name": "local/check"}, "number": 1,
                     "pull_request": {"number": 1,
                                       "html_url": "https://github.com/local/check/pull/1",
                                       "user": {"login": "local-agent"},
                                       "state": "open", "merged": False, "created_at": "2026-10-27T00:00:00Z",
                                       "head": {"sha": args.head_sha}, "body": body}}
            report = validate_event(event)
            print(f"Body checks out locally: {lifecycle(report)}. Bounds: specs/report/work_report.t27")
            return 0
        except (ReportError, OSError, UnicodeError, RecursionError) as exc:
            print(f"PR work report check failed: {exc}", file=sys.stderr)
            return 1
    try:
        with args.event.open("rb") as stream:
            raw = stream.read(MAX_EVENT_BYTES + 1)
        if len(raw) > MAX_EVENT_BYTES:
            fail("event JSON exceeds the 2 MiB limit")
        event = decode_json(raw.decode("utf-8"), "event")
        pr = event.get("pull_request") if isinstance(event, dict) else None
        body = pr.get("body") if isinstance(pr, dict) else None
        files = json_lines(args.files.read_text(encoding="utf-8"), "files") if args.files else None
        if files is not None and args.commits and not (isinstance(body, str) and START in body):
            commits = json_lines(args.commits.read_text(encoding="utf-8"), "commits")
            refusal = dependency_bump_refusal(event, files, commits)
            if refusal is None:
                validate_event_identity(event)
                report = dependency_bump_report(event, files, commits)
                write_artifacts(report, args.output)
                print(f"Dependency bump {report['repository']}#{report['number']} at "
                      f"{report['head_sha']}: {len(files)} manifest/lockfile change(s) by Dependabot; "
                      f"the bump is its own report; artifacts written to {args.output}")
                return 0
            if isinstance(pr, dict) and isinstance(pr.get("user"), dict) and pr["user"].get("login") == DEPENDABOT:
                print(f"Dependency-bump exemption does not apply: {refusal}", file=sys.stderr)
        report = validate_event(event)
        if files is not None:
            refusal, notice = course_post_refusal(event, files, course_post_policy())
            if notice:
                print(notice, file=sys.stderr)
            if refusal:
                fail(refusal)
        refusal = post_widget_refusal(files, args.posts, post_widget_policy()) if files and args.posts else None
        if refusal:
            fail(refusal)
        write_artifacts(report, args.output)
        print(f"Validated {report['repository']}#{report['number']} at {report['head_sha']}: "
              f"{lifecycle(report)}; artifacts written to {args.output}")
        return 0
    except (ReportError, OSError, UnicodeError, RecursionError) as exc:
        print(f"PR work report validation failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
