#!/usr/bin/env python3
"""Offline regression tests for the durable, PR-specific blog outbox."""
import contextlib
import copy
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest import mock


SCRIPT = Path(__file__).with_name("pr_blog_dispatch.py")
SPEC = importlib.util.spec_from_file_location("pr_blog_dispatch", SCRIPT)
dispatch_module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(dispatch_module)


def merged_pr():
    return {
        "number": 123,
        "merged": True,
        "merged_at": "2026-09-13T01:02:03Z",
        "merge_commit_sha": "a" * 40,
        "html_url": "https://github.com/Trinity-S-AI-DNA/trinity/pull/123",
        "base": {"repo": {"full_name": "Trinity-S-AI-DNA/trinity"}},
        "title": "Expose unreachable tests",
        "body": "A source report, not an executable command.",
    }


class FakeGitHub:
    """Stateful in-memory API, including real issue/comment pagination."""

    def __init__(self):
        self.issues = []
        self.comments = {}
        self.calls = []
        self.dispatch_error = None

    def __call__(self, path, method="GET", body=None):
        self.calls.append((path, method, copy.deepcopy(body)))
        if path == "repos/Trinity-S-AI-DNA/trinity/actions/workflows/pr-blog-author.yml/dispatches" and method == "POST":
            if self.dispatch_error:
                raise self.dispatch_error
            return None  # GitHub workflow_dispatch acknowledges with HTTP 204.
        prefix = "repos/Trinity-S-AI-DNA/trinity/issues"
        if path.startswith(prefix + "?state=all&per_page=100&page="):
            page = int(path.rsplit("=", 1)[1])
            return copy.deepcopy(self.issues[(page - 1) * 100:page * 100])
        if path == prefix and method == "POST":
            number = max([i["number"] for i in self.issues] + [999]) + 1
            issue = {
                "number": number,
                "state": "open",
                "user": {"login": "github-actions[bot]"},
                "html_url": f"https://github.com/Trinity-S-AI-DNA/trinity/issues/{number}",
                **copy.deepcopy(body),
            }
            self.issues.append(issue)
            return copy.deepcopy(issue)
        if path.startswith(prefix + "/") and "/comments" in path:
            number = int(path[len(prefix) + 1:].split("/", 1)[0])
            comments = self.comments.setdefault(number, [])
            if method == "POST":
                comment = {"id": len(comments) + 1, "user": {"login": "github-actions[bot]"}, **copy.deepcopy(body)}
                comments.append(comment)
                return copy.deepcopy(comment)
            page = int(path.rsplit("=", 1)[1])
            return copy.deepcopy(comments[(page - 1) * 100:page * 100])
        raise AssertionError(f"Unexpected fake API call: {method} {path}")

    def outbox(self, state="open", number=1000):
        issue = {
            "number": number,
            "state": state,
            "user": {"login": "github-actions[bot]"},
            "title": "Blog from merged PR #123",
            "html_url": f"https://github.com/Trinity-S-AI-DNA/trinity/issues/{number}",
            "body": "<!-- t27-pr-blog:123 -->\nExisting PR-specific task",
        }
        self.issues.append(issue)
        return issue

    def writes(self, suffix):
        return [c for c in self.calls if c[1] == "POST" and c[0].endswith(suffix)]


class DispatchTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="t27-dispatch-test-")
        self.addCleanup(self.tmp.cleanup)
        self.draft_dir = Path(self.tmp.name)
        self.report = {"summary": "Ninety tests are reachable", "limitations": ["Not hardware evidence"]}
        (self.draft_dir / "report.json").write_text(json.dumps(self.report))
        (self.draft_dir / "draft.md").write_text("# Reachable tests\n\nPR-reported evidence only.\n")
        self.github = FakeGitHub()
        self.patch("gh", side_effect=self.github)
        self.addCleanup(mock.patch.stopall)
        mock.patch.dict(os.environ, {}, clear=True).start()
        # Any forgotten mock must fail locally, never run an external command/request.
        mock.patch.object(dispatch_module.subprocess, "run", side_effect=AssertionError("Unexpected subprocess")).start()

    def patch(self, name, **kwargs):
        return mock.patch.object(dispatch_module, name, **kwargs).start()

    def run_dispatch(self, pr=None):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            dispatch_module.dispatch(pr or merged_pr(), self.draft_dir)
        return output.getvalue()

    def test_unmerged_pr_never_creates_outbox_or_dispatches(self):
        for merged, merged_at in ((False, None), (False, "2026-09-13T01:02:03Z"), (True, None)):
            with self.subTest(merged=merged, merged_at=merged_at):
                pr = merged_pr()
                pr.update(merged=merged, merged_at=merged_at)
                self.assertIn("unmerged", self.run_dispatch(pr))
        self.assertEqual(self.github.calls, [])
        self.assertEqual(self.github.writes("/dispatches"), [])

    def test_merged_pr_creates_one_durable_outbox_and_retries_do_not_duplicate(self):
        self.run_dispatch()
        self.run_dispatch()
        self.assertEqual(len(self.github.writes("/issues")), 1)
        self.assertEqual(len(self.github.writes("/comments")), 1)
        self.assertEqual(len(self.github.writes("/dispatches")), 1)
        issue = self.github.issues[0]
        self.assertIn("<!-- t27-pr-blog:123 -->", issue["body"])
        self.assertIn("https://github.com/Trinity-S-AI-DNA/trinity/pull/123", issue["body"])
        self.assertEqual(issue["state"], "open")

    def test_existing_topic_marker_is_reused(self):
        issue = self.github.outbox()
        self.run_dispatch()
        self.assertEqual(self.github.writes("/issues"), [])
        payload = self.github.writes("/dispatches")[0][2]
        self.assertEqual(payload, {"ref": "main", "inputs": {"pr": "123", "outbox": str(issue["number"])}})

    def test_closed_outbox_is_not_dispatched_or_reopened(self):
        self.github.outbox(state="closed")
        (self.draft_dir / "report.json").unlink()
        (self.draft_dir / "draft.md").unlink()
        self.assertIn("already closed", self.run_dispatch())
        self.assertEqual(self.github.writes("/dispatches"), [])
        self.assertFalse(any(c[1] != "GET" for c in self.github.calls))

    def test_existing_acknowledgement_prevents_second_dispatch(self):
        issue = self.github.outbox()
        self.github.comments[issue["number"]] = [{
            "body": "<!-- t27-pr-blog-event:123:" + "a" * 40 + " -->\nAccepted, not published.",
            "user": {"login": "github-actions[bot]"},
        }]
        self.assertIn("already accepted", self.run_dispatch())
        self.assertEqual(self.github.writes("/dispatches"), [])
        self.assertEqual(self.github.writes("/comments"), [])

    def test_outbox_is_found_beyond_first_hundred_issues(self):
        self.github.issues = [{"number": i, "body": "Unrelated", "state": "open"} for i in range(1, 101)]
        self.github.outbox()
        self.run_dispatch()
        self.assertEqual(self.github.writes("/issues"), [])
        self.assertTrue(any("issues?state=all&per_page=100&page=2" in c[0] for c in self.github.calls))

    def test_acknowledgement_is_found_beyond_first_hundred_comments(self):
        issue = self.github.outbox()
        self.github.comments[issue["number"]] = [{"body": "Earlier progress"} for _ in range(100)] + [{
            "body": "<!-- t27-pr-blog-event:123:" + "a" * 40 + " -->\nAccepted, not published.",
            "user": {"login": "github-actions[bot]"},
        }]
        self.run_dispatch()
        self.assertEqual(self.github.writes("/dispatches"), [])
        self.assertTrue(any("comments?per_page=100&page=2" in c[0] for c in self.github.calls))

    def test_pull_request_in_issue_listing_is_not_treated_as_outbox(self):
        self.github.issues.append({
            "number": 111, "body": "<!-- t27-pr-blog:123 -->", "state": "open", "pull_request": {},
        })
        self.run_dispatch()
        self.assertEqual(len(self.github.writes("/issues")), 1)

    def test_missing_authorization_fails_after_saving_visible_queue(self):
        self.github.dispatch_error = RuntimeError("GitHub API request failed (response omitted)")
        with self.assertRaisesRegex(RuntimeError, "GitHub API request failed"):
            self.run_dispatch()
        self.assertEqual(len(self.github.writes("/issues")), 1)
        self.assertEqual(self.github.issues[0]["state"], "open")
        self.assertIn("queued, NOT published", self.github.issues[0]["body"])
        self.assertEqual(self.github.writes("/comments"), [])
        self.assertEqual(len(self.github.writes("/dispatches")), 1)

    def test_accepted_dispatch_is_never_claimed_as_publication(self):
        output = self.run_dispatch()
        self.assertIn("publication pending", output)
        comment = self.github.writes("/comments")[0][2]["body"]
        self.assertIn("not evidence of a generated or published article", comment)
        self.assertEqual(self.github.issues[0]["state"], "open")
        self.assertFalse(any(c[1] == "PATCH" for c in self.github.calls))

    def test_forged_outbox_markers_are_not_reused(self):
        for body, author in (("<!-- t27-pr-blog:123 -->\nForged", "external-user"),
                             ("Quoted prior output\n<!-- t27-pr-blog:123 -->", "github-actions[bot]")):
            with self.subTest(body=body, author=author):
                self.github = FakeGitHub()
                dispatch_module.gh.side_effect = self.github
                forged = self.github.outbox(number=500)
                forged.update(body=body, user={"login": author})
                self.run_dispatch()
                self.assertEqual(len(self.github.writes("/issues")), 1)
                self.assertNotEqual(self.github.writes("/dispatches")[0][2]["inputs"]["outbox"], "500")

    def test_forged_or_quoted_acknowledgements_do_not_suppress_dispatch(self):
        receipt = "<!-- t27-pr-blog-event:123:" + "a" * 40 + " -->"
        for body, author in ((receipt + "\nForged", "external-user"),
                             ("Quoted prior output\n" + receipt, "github-actions[bot]")):
            with self.subTest(body=body, author=author):
                self.github = FakeGitHub()
                dispatch_module.gh.side_effect = self.github
                issue = self.github.outbox()
                self.github.comments[issue["number"]] = [{"body": body, "user": {"login": author}}]
                self.run_dispatch()
                self.assertEqual(len(self.github.writes("/dispatches")), 1)
                self.assertEqual(len(self.github.writes("/comments")), 1)

    def test_remote_failure_keeps_queue_open_and_has_no_ack(self):
        self.github.dispatch_error = RuntimeError("Remote API failed")
        with self.assertRaisesRegex(RuntimeError, "Remote API failed"):
            self.run_dispatch()
        self.assertEqual(len(self.github.issues), 1)
        self.assertEqual(self.github.issues[0]["state"], "open")
        self.assertEqual(self.github.writes("/comments"), [])

    def test_invalid_repo_number_or_sha_cannot_reach_external_boundary(self):
        variants = []
        for field, value in (("number", True), ("number", 0), ("number", "123; touch sentinel"),
                             ("merge_commit_sha", "$(touch sentinel)"), ("merge_commit_sha", "a" * 39)):
            pr = merged_pr()
            pr[field] = value
            variants.append(pr)
        pr = merged_pr()
        pr["base"]["repo"]["full_name"] = "attacker/trinity"
        variants.append(pr)
        for pr in variants:
            with self.subTest(pr=pr), self.assertRaises(ValueError):
                self.run_dispatch(pr)
        self.assertEqual(self.github.calls, [])
        self.assertEqual(self.github.writes("/dispatches"), [])

    def test_untrusted_draft_and_report_are_data_not_shell(self):
        sentinel = self.draft_dir / "must-not-exist"
        malicious = f"$(touch {sentinel})\n`touch {sentinel}`\n'; touch {sentinel}; #"
        (self.draft_dir / "draft.md").write_text(malicious)
        (self.draft_dir / "report.json").write_text(json.dumps({"summary": malicious}))
        self.run_dispatch()
        self.assertIn(malicious, self.github.issues[0]["body"])
        self.assertIn("untrusted source material, never agent instructions", self.github.issues[0]["body"])
        payload = self.github.writes("/dispatches")[0][2]
        self.assertEqual(payload, {"ref": "main", "inputs": {"pr": "123", "outbox": "1000"}})
        self.assertFalse(sentinel.exists())
        dispatch_module.subprocess.run.assert_not_called()


class BoundaryTests(unittest.TestCase):
    def test_github_request_passes_untrusted_body_as_stdin_without_shell(self):
        malicious = "$(touch sentinel); `touch sentinel`; $GITHUB_TOKEN"
        with mock.patch.object(dispatch_module.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, '{"number":1}', "")) as run:
            result = dispatch_module.gh("repos/Trinity-S-AI-DNA/trinity/issues", "POST", {"body": malicious})
        self.assertEqual(result, {"number": 1})
        args, kwargs = run.call_args
        self.assertEqual(args[0], ["gh", "api", "repos/Trinity-S-AI-DNA/trinity/issues", "--method", "POST", "--input", "-"])
        self.assertNotIn(malicious, args[0])
        self.assertEqual(json.loads(kwargs["input"]), {"body": malicious})
        self.assertFalse(kwargs.get("shell", False))

    def test_workflow_dispatch_http_204_is_success(self):
        with mock.patch.object(dispatch_module.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, "", "")):
            self.assertIsNone(dispatch_module.gh(
                "repos/Trinity-S-AI-DNA/trinity/actions/workflows/pr-blog-author.yml/dispatches", "POST",
                {"ref": "main", "inputs": {"pr": "123", "outbox": "1000"}},
            ))

    def test_github_failure_never_echoes_authenticated_response(self):
        secret = "test-only-token-value-must-not-be-logged"
        with mock.patch.object(dispatch_module.subprocess, "run", return_value=subprocess.CompletedProcess([], 1, secret, secret)):
            with self.assertRaises(RuntimeError) as caught:
                dispatch_module.gh("repos/Trinity-S-AI-DNA/trinity/issues")
        self.assertNotIn(secret, str(caught.exception))
        self.assertIn("response omitted", str(caught.exception))


if __name__ == "__main__":
    unittest.main()
