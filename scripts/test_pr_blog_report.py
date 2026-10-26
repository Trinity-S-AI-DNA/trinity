#!/usr/bin/env python3
"""Contract and untrusted-input regression tests for pr_blog_report.py."""

import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

import pr_blog_report as report


HEAD = "a" * 40
MERGE = "b" * 40


def valid_report():
    return {
        "version": 1,
        "head_sha": HEAD,
        "summary": "The compiler test root now imports the missing parser suite so CI can actually execute its cases.",
        "changes": ["Added the parser suite to the existing compiler test root."],
        "tests": [{"command": "python3 -m unittest discover -s scripts",
                   "result": "All twelve validation cases completed successfully.",
                   "status": "passed", "evidence": "CI run 123, validation job, step 4: 12 tests passed."}],
        "limitations": ["The change was tested locally and has not been deployed to the production runner."],
        "tags": ["Testing", "#CI"],
        "blog": {
            "title": "A test root made the missing cases reachable",
            "summary": "The compiler test graph now includes the parser cases, exposing failures that syntax checks alone did not cover.",
            "outline": [
                "The syntax checker accepted the source while the parser suite remained outside the executable test graph. This prevented CI from evaluating those assertions.",
                "The change imports the suite at its existing root and preserves the original test cases. The report records the exact command and its observed result.",
                "These results apply to the compiler tests only and do not establish production delivery. A separate deployment receipt is still needed before claiming the live runner changed.",
            ],
        },
    }


def valid_event(payload=None, state="open", merged=False):
    return {
        "repository": {"full_name": "Trinity-S-AI-DNA/trinity"},
        "number": 123,
        "pull_request": {
            "number": 123,
            "body": report.START + "\n```json\n" + json.dumps(payload or valid_report()) + "\n```\n" + report.END,
            "state": state,
            "merged": merged,
            "head": {"sha": HEAD},
            "created_at": "2026-09-13T04:00:00Z",
            "merged_at": "2026-09-14T04:00:00Z" if merged else None,
            "merge_commit_sha": MERGE if merged else None,
            "html_url": "https://github.com/Trinity-S-AI-DNA/trinity/pull/123",
            "base": {"repo": {"full_name": "Trinity-S-AI-DNA/trinity"}},
        },
    }


class ValidationTests(unittest.TestCase):
    def assert_invalid(self, event, contains):
        with self.assertRaisesRegex(report.ReportError, contains):
            report.validate_event(event)

    def test_valid_open_report_is_normalized(self):
        normalized = report.validate_event(valid_event())
        self.assertEqual(normalized["tags"], ["Testing", "CI"])
        self.assertEqual(normalized["slug"], "pr-123")
        self.assertEqual(normalized["state"], "open")
        self.assertFalse(normalized["merged"])
        self.assertEqual(normalized["head_sha"], HEAD)

    def test_lifecycle_stays_exact_and_all_artifacts_are_drafts(self):
        for state, merged, phrase, receipts in [
            ("open", False, "Open PR", 2),
            ("closed", False, "Closed without merge", 2),
            ("closed", True, "Merged PR", 3),
        ]:
            with self.subTest(state=state, merged=merged):
                normalized = report.validate_event(valid_event(state=state, merged=merged))
                post = report.make_post(normalized)
                self.assertEqual(normalized["state"], state)
                self.assertEqual(normalized["merged"], merged)
                self.assertFalse(post["published"])
                self.assertEqual(len(post["receipts"]), receipts)
                self.assertIn(phrase, report.make_markdown(normalized, post))
                self.assertIn("not independently rerun", post["body"][-1]["text"])
                self.assertEqual(post["title"], valid_report()["blog"]["title"])

    def test_missing_malformed_and_duplicate_blocks(self):
        for body, error in [
            ("A summary with no work report", "exactly one"),
            (report.START + "\n{}\n" + report.END, "fenced JSON"),
            (report.START + "\n```json\n{]\n```\n" + report.END, "malformed JSON"),
            (valid_event()["pull_request"]["body"] * 2, "exactly one"),
            (report.END + "\n```json\n{}\n```\n" + report.START, "closing marker"),
        ]:
            with self.subTest(body=body):
                event = valid_event()
                event["pull_request"]["body"] = body
                self.assert_invalid(event, error)

    def test_duplicate_json_keys_and_nonfinite_json_are_rejected(self):
        for text, error in [('"version": 1, "version": 1', "duplicate JSON key"),
                            ('"value": NaN', "non-finite JSON")]:
            event = valid_event()
            event["pull_request"]["body"] = f'{report.START}\n```json\n{{{text}}}\n```\n{report.END}'
            self.assert_invalid(event, error)

    def test_stale_head_rejected_even_after_other_validations(self):
        payload = valid_report()
        payload["head_sha"] = "c" * 40
        self.assert_invalid(valid_event(payload), "stale")

    def test_placeholder_and_too_small_data(self):
        for field, value, error in [
            ("summary", "TODO: complete the detailed summary after running all of these tests.", "placeholder"),
            ("summary", "Replace this with a sufficiently detailed explanation of the code changes.", "placeholder"),
            ("summary", "Changed code", "40"),
            ("changes", ["none"], "20"),
            ("limitations", [], "list"),
            ("tests", [], "test records"),
            ("tags", ["Testing"], "2–5"),
            ("tags", ["CI", "ci"], "unique"),
            ("tags", ["Testing", "../../escape"], "topic hashtag"),
        ]:
            with self.subTest(field=field, value=value):
                payload = valid_report()
                payload[field] = value
                self.assert_invalid(valid_event(payload), error)
        payload = valid_report()
        payload["blog"]["outline"] = ["long sentence " * 20] * 3
        self.assert_invalid(valid_event(payload), "meaningful prose")
        payload = valid_report()
        payload["blog"]["outline"] = valid_report()["blog"]["outline"][:2]
        self.assert_invalid(valid_event(payload), "3–20")

    def test_statuses_include_honest_failure_and_not_run(self):
        for status in ["passed", "failed", "not_run"]:
            payload = valid_report()
            payload["tests"][0]["status"] = status
            self.assertEqual(report.validate_event(valid_event(payload))["tests"][0]["status"], status)
        payload["tests"][0]["status"] = "success"
        self.assert_invalid(valid_event(payload), "passed, failed, or not_run")

    def test_unknown_report_fields_rejected(self):
        for where, key in [("root", "slug"), ("blog", "published")]:
            payload = valid_report()
            (payload if where == "root" else payload["blog"])[key] = "../../outside"
            self.assert_invalid(valid_event(payload), "unsupported keys")

    def test_missing_nested_fields_and_wrong_types_rejected(self):
        for name in ("command", "result", "status", "evidence"):
            payload = valid_report()
            del payload["tests"][0][name]
            self.assert_invalid(valid_event(payload), "missing keys")
        for value in (True, "1", 2):
            payload = valid_report()
            payload["version"] = value
            self.assert_invalid(valid_event(payload), "version must be 1")
        payload = valid_report()
        payload["blog"] = []
        self.assert_invalid(valid_event(payload), "must be an object")

    def test_control_characters_and_invalid_unicode_rejected(self):
        for suffix in ("\x1b[2J", "\x7f", "\ud800"):
            payload = valid_report()
            payload["summary"] += suffix
            self.assert_invalid(valid_event(payload), "control character")

    def test_safe_identifiers_and_event_cross_checks(self):
        changes = [
            (("pull_request", "number"), "../../outside", "positive integer"),
            (("pull_request", "number"), True, "positive integer"),
            (("pull_request", "number"), 0, "positive integer"),
            (("number",), 124, "does not match"),
            (("repository", "full_name"), "owner/../../outside", "safe owner"),
            (("repository", "full_name"), "owner/repo?query=evil", "safe owner"),
            (("pull_request", "head", "sha"), "a" * 39, "40-character"),
            (("pull_request", "html_url"), "https://evil.example/pull/123", "does not match"),
            (("pull_request", "base", "repo", "full_name"), "another/repository", "does not match"),
        ]
        for keys, value, error in changes:
            with self.subTest(keys=keys, value=value):
                event = valid_event()
                node = event
                for key in keys[:-1]:
                    node = node[key]
                node[keys[-1]] = value
                self.assert_invalid(event, error)

    def test_invalid_state_and_dates_fail_closed(self):
        self.assert_invalid(valid_event(state="merged", merged=True), "state must")
        self.assert_invalid(valid_event(state="open", merged=True), "state closed")
        event = valid_event()
        event["pull_request"]["merged"] = "false"
        self.assert_invalid(event, "boolean")
        event = valid_event(state="closed", merged=True)
        event["pull_request"]["merge_commit_sha"] = None
        self.assert_invalid(event, "merge_commit_sha")
        event = valid_event()
        event["pull_request"]["created_at"] = "2026-09-13"
        self.assert_invalid(event, "timezone")
        event = valid_event()
        event["pull_request"]["merged_at"] = "2026-09-14T04:00:00Z"
        self.assert_invalid(event, "unmerged PR cannot")

    def test_markdown_html_and_fences_are_data_not_active_content(self):
        payload = valid_report()
        dangerous = '<script>alert(1)</script> ```sh echo boom ``` [click](javascript:alert(1)) ![img](https://evil.example)'
        payload["changes"] = ["Preserved the supplied text safely as a test fixture: " + dangerous]
        normalized = report.validate_event(valid_event(payload))
        post = report.make_post(normalized)
        markdown = report.make_markdown(normalized, post)
        self.assertNotIn("<script>", markdown)
        self.assertNotIn("```sh", markdown)
        self.assertNotIn("[click](", markdown)
        self.assertIn("&lt;script&gt;", markdown)
        self.assertNotIn("<script>", report.encode_json(post))
        self.assertEqual(json.loads(report.encode_json(post)), post)
        self.assertNotIn("figure", {block["kind"] for block in post["body"]})


class TemplateTests(unittest.TestCase):
    """The draft is shaped for readers: result first, evidence after, provenance last."""

    def test_result_leads_and_provenance_closes(self):
        payload = valid_report()
        post = report.make_post(report.validate_event(valid_event(payload)))
        body = post["body"]
        self.assertEqual(body[0], {"kind": "p", "text": payload["summary"]})
        self.assertIn("1 passed", body[1]["text"])
        self.assertIn("did not rerun", body[1]["text"])
        headings = [block["text"] for block in body if block["kind"] == "h"]
        self.assertEqual(headings, ["The problem", "How it works", "What changed", "How we checked",
                                    "What this does not show", "How this post was made"])
        self.assertEqual(body[3]["text"], payload["blog"]["outline"][0])

    def test_checks_are_a_table_that_keeps_failures_visible(self):
        payload = valid_report()
        payload["tests"].append({"command": "npm run build", "status": "not_run",
                                 "result": "Left to CI because the laptop is overloaded.",
                                 "evidence": "Website checks workflow on this PR head."})
        payload["tests"].append({"command": "zig test src/a.zig", "status": "failed",
                                 "result": "Two cases fail | on the new parser.",
                                 "evidence": "Local run log saved as logs/a.txt today."})
        normalized = report.validate_event(valid_event(payload))
        post = report.make_post(normalized)
        table = next(block for block in post["body"] if block["kind"] == "table")
        self.assertEqual(table["head"], ["Check", "Status", "Result", "Evidence"])
        self.assertEqual([row[1] for row in table["rows"]], ["passed", "not run", "FAILED"])
        self.assertEqual(table["rows"][1][0], "`npm run build`")
        self.assertIn("1 passed, 1 FAILED, 1 not run", post["body"][1]["text"])
        markdown = report.make_markdown(normalized, post)
        self.assertIn("Two cases fail \\| on the new parser", markdown)

    def test_optional_cast_and_reproduce(self):
        payload = valid_report()
        payload["blog"]["cast"] = "term/x7-board/session.cast"
        payload["blog"]["reproduce"] = ["tri x7-board --dry-run", "tri cast check x7.cast"]
        normalized = report.validate_event(valid_event(payload))
        post = report.make_post(normalized)
        headings = [block["text"] for block in post["body"] if block["kind"] == "h"]
        self.assertIn("See it run", headings)
        self.assertIn("Try it yourself", headings)
        code = next(block for block in post["body"] if block["kind"] == "code")
        self.assertEqual(code["text"], "tri x7-board --dry-run\ntri cast check x7.cast")
        self.assertEqual(post["receipts"][-1], {"label": "Terminal recording",
                                                "href": "https://t27.ai/term/x7-board/"})
        markdown = report.make_markdown(normalized, post)
        self.assertNotIn("```", markdown)

    def test_optional_keys_are_checked_and_others_still_refused(self):
        for key, value, error in [
            ("cast", "https://evil.example/x.cast", "published recording"),
            ("cast", "term/../secrets/session.cast", "published recording"),
            ("reproduce", [], "reproduce"),
            ("reproduce", ["ls"] * 9, "reproduce"),
            ("hero", "anything at all", "unsupported keys"),
        ]:
            with self.subTest(key=key, value=value):
                payload = valid_report()
                payload["blog"][key] = value
                with self.assertRaisesRegex(report.ReportError, error):
                    report.validate_event(valid_event(payload))


class ArtifactTests(unittest.TestCase):
    def test_idempotent_fixed_artifacts_and_no_outside_writes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            output = root / "artifacts"
            normalized = report.validate_event(valid_event())
            report.write_artifacts(normalized, output)
            files = {path.name: (path.read_bytes(), path.stat().st_mtime_ns) for path in output.iterdir()}
            report.write_artifacts(normalized, output)
            self.assertEqual(set(files), {"post.json", "draft.md", "report.json"})
            self.assertEqual(files, {path.name: (path.read_bytes(), path.stat().st_mtime_ns) for path in output.iterdir()})
            self.assertEqual(list(root.iterdir()), [output])

    def test_symlink_output_and_file_cannot_overwrite_outside(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            outside = root / "outside.txt"
            outside.write_text("preserve me")
            output = root / "artifacts"
            output.mkdir()
            (output / "post.json").symlink_to(outside)
            normalized = report.validate_event(valid_event())
            with self.assertRaisesRegex(report.ReportError, "non-regular"):
                report.write_artifacts(normalized, output)
            self.assertEqual(outside.read_text(), "preserve me")
            link = root / "link"
            link.symlink_to(output, target_is_directory=True)
            with self.assertRaisesRegex(report.ReportError, "symlink"):
                report.write_artifacts(normalized, link)

    def test_cli_does_not_execute_commands_and_fails_without_writes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload = valid_report()
            sentinel = root / "executed"
            payload["tests"][0]["command"] = f"touch {sentinel}; $(touch {sentinel})"
            event_file = root / "event.json"
            event_file.write_text(json.dumps(valid_event(payload)))
            output = root / "out"
            command = [sys.executable, str(Path(report.__file__)), "validate", "--event", str(event_file), "--output", str(output)]
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertFalse(sentinel.exists())
            self.assertFalse(json.loads((output / "post.json").read_text())["published"])
            bad_output = root / "bad-out"
            event_file.write_text('{"pull_request":')
            command[-1] = str(bad_output)
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("malformed JSON", result.stderr)
            self.assertFalse(bad_output.exists())

    def test_oversized_event_is_rejected_before_output_creation(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            event_file = root / "event.json"
            event_file.write_bytes(b" " * (report.MAX_EVENT_BYTES + 1))
            output = root / "out"
            command = [sys.executable, str(Path(report.__file__)), "validate", "--event", str(event_file), "--output", str(output)]
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("2 MiB", result.stderr)
            self.assertFalse(output.exists())


def dependabot_event(body="Bumps lodash from 4.17.20 to 4.17.21."):
    event = valid_event()
    pr = event["pull_request"]
    pr.update({
        "body": body, "title": "deps: bump lodash from 4.17.20 to 4.17.21 in /docs",
        "user": {"login": "dependabot[bot]", "type": "Bot"}, "changed_files": 2, "commits": 1,
        "head": {"sha": HEAD, "ref": "dependabot/npm_and_yarn/docs/lodash-4.17.21",
                 "repo": {"full_name": "Trinity-S-AI-DNA/trinity"}},
    })
    return event


def bump_files():
    return [{"filename": "docs/package.json", "status": "modified"},
            {"filename": "docs/package-lock.json", "status": "modified"}]


def bump_commits():
    return [{"sha": HEAD, "author": "dependabot[bot]", "committer": "web-flow", "verified": True}]


class DependencyBumpTests(unittest.TestCase):
    def refusal(self, event=None, files=None, commits=None):
        return report.dependency_bump_refusal(event or dependabot_event(),
                                              bump_files() if files is None else files,
                                              bump_commits() if commits is None else commits)

    def test_pure_dependabot_manifest_bump_is_its_own_report(self):
        self.assertIsNone(self.refusal())
        bump = report.dependency_bump_report(dependabot_event(), bump_files(), bump_commits())
        self.assertEqual(bump["kind"], "dependency-bump")
        self.assertEqual(bump["head_sha"], HEAD)
        self.assertIn("No tests are claimed", bump["note"])

    def test_humans_and_agents_stay_strict(self):
        event = dependabot_event()
        event["pull_request"]["user"] = {"login": "gHashTag", "type": "User"}
        self.assertIn("not dependabot", self.refusal(event))
        event["pull_request"]["user"] = {"login": "dependabot[bot]", "type": "User"}
        self.assertIn("not dependabot", self.refusal(event))

    def test_non_manifest_file_or_removed_file_needs_a_report(self):
        for files, reason in (
            (bump_files() + [{"filename": "docs/src/index.ts", "status": "modified"}], "not a dependency manifest"),
            ([{"filename": ".github/workflows/ci.yml", "status": "modified"}], "not a dependency manifest"),
            ([{"filename": "docs/package.json", "status": "removed"}], "not a version bump"),
        ):
            event = dependabot_event()
            event["pull_request"]["changed_files"] = len(files)
            self.assertIn(reason, self.refusal(event, files=files))

    def test_incomplete_lists_fail_closed(self):
        self.assertIn("incomplete", self.refusal(files=bump_files()[:1]))
        self.assertIn("incomplete", self.refusal(files=[]))
        self.assertIn("incomplete", self.refusal(commits=[]))

    def test_a_pushed_or_unsigned_commit_needs_a_report(self):
        for commit in ({"author": "gHashTag"}, {"committer": "gHashTag"}, {"verified": False}):
            self.assertIn("not a GitHub-signed Dependabot commit",
                          self.refusal(commits=[{**bump_commits()[0], **commit}]))
        self.assertIn("does not end at the PR head",
                      self.refusal(commits=[{**bump_commits()[0], "sha": MERGE}]))

    def test_fork_or_foreign_branch_is_refused(self):
        event = dependabot_event()
        event["pull_request"]["head"]["repo"] = {"full_name": "someone/trinity"}
        self.assertIn("not in the base repository", self.refusal(event))
        event = dependabot_event()
        event["pull_request"]["head"]["ref"] = "feature/x"
        self.assertIn("not a dependabot/ branch", self.refusal(event))

    def run_cli(self, event, files, commits, directory):
        root = Path(directory)
        (root / "event.json").write_text(json.dumps(event))
        (root / "files.jsonl").write_text("\n".join(json.dumps(item) for item in files) + "\n")
        (root / "commits.jsonl").write_text("\n".join(json.dumps(item) for item in commits) + "\n")
        command = [sys.executable, str(Path(report.__file__)), "validate", "--event", str(root / "event.json"),
                   "--output", str(root / "out"), "--files", str(root / "files.jsonl"),
                   "--commits", str(root / "commits.jsonl")]
        return subprocess.run(command, capture_output=True, text=True)

    def test_cli_writes_only_the_bump_report(self):
        with tempfile.TemporaryDirectory() as directory:
            result = self.run_cli(dependabot_event(), bump_files(), bump_commits(), directory)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(sorted(p.name for p in (Path(directory) / "out").iterdir()), ["report.json"])
            self.assertEqual(json.loads((Path(directory) / "out" / "report.json").read_text())["kind"],
                             "dependency-bump")

    def test_cli_refuses_a_mixed_bump_and_says_why(self):
        files = bump_files() + [{"filename": "docs/build.sh", "status": "modified"}]
        event = dependabot_event()
        event["pull_request"]["changed_files"] = 3
        with tempfile.TemporaryDirectory() as directory:
            result = self.run_cli(event, files, bump_commits(), directory)
            self.assertEqual(result.returncode, 1)
            self.assertIn("exemption does not apply", result.stderr)
            self.assertIn("exactly one", result.stderr)
            self.assertFalse((Path(directory) / "out").exists())

    def test_a_report_block_is_validated_normally_even_from_dependabot(self):
        bad = valid_report()
        bad["head_sha"] = MERGE
        event = dependabot_event(valid_event(bad)["pull_request"]["body"])
        with tempfile.TemporaryDirectory() as directory:
            result = self.run_cli(event, bump_files(), bump_commits(), directory)
            self.assertEqual(result.returncode, 1)
            self.assertIn("stale", result.stderr)


COURSE = "apps/website/specs/course/ai-numbers.t27"
POST = "apps/website/src/data/blog/bodies/two-courses.ts"


class CoursePostTests(unittest.TestCase):
    def refusal(self, files, changed=None):
        event = valid_event()
        event["pull_request"]["changed_files"] = len(files) if changed is None else changed
        return report.course_post_refusal(event, files, report.course_post_policy())

    def test_the_real_policy_spec_is_read(self):
        policy = report.course_post_policy()
        self.assertEqual(policy["course_dir"], "apps/website/specs/course/")
        self.assertEqual(policy["post_dir"], "apps/website/src/data/blog/bodies/")
        self.assertEqual(policy["statuses"], frozenset({"added", "modified"}))
        self.assertIn("in the same PR", policy["rule"])

    def test_a_course_change_without_a_post_is_refused(self):
        refusal, notice = self.refusal([{"filename": COURSE, "status": "modified"},
                                        {"filename": "apps/website/specs/course/courses.t27", "status": "modified"}])
        self.assertIn("carries its blog post", refusal)
        self.assertIn(COURSE, refusal)
        self.assertIn("1 more course file", refusal)
        self.assertIn("(rule in apps/website/specs/policy/course_post.t27)", refusal)
        self.assertTrue((Path(report.__file__).resolve().parent.parent / report.COURSE_POST_REL).is_file())
        self.assertIsNone(notice)

    def test_a_lesson_renamed_out_of_the_course_is_a_course_change(self):
        moved = {"filename": "apps/website/specs/archive/ai-numbers.t27", "status": "renamed",
                 "previous_filename": COURSE}
        refusal, _ = self.refusal([moved])
        self.assertIn("carries its blog post", refusal)
        self.assertEqual(self.refusal([moved, {"filename": POST, "status": "added", "previous_filename": None}]),
                         (None, None))

    def test_a_previous_filename_that_is_not_a_path_is_refused(self):
        refusal, _ = self.refusal([{"filename": COURSE, "status": "renamed", "previous_filename": 7}])
        self.assertIn("without a filename or status", refusal)

    def test_an_incomplete_list_with_a_course_file_and_no_post_is_not_decided(self):
        refusal, notice = self.refusal([{"filename": COURSE, "status": "modified"}], changed=3001)
        self.assertIsNone(refusal)
        self.assertIn("not decided", notice)
        self.assertIn(COURSE, notice)
        self.assertEqual(self.refusal([{"filename": COURSE, "status": "modified"},
                                       {"filename": POST, "status": "modified"}], changed=3001), (None, None))

    def test_an_added_or_modified_post_satisfies_it(self):
        for status in ("added", "modified"):
            self.assertEqual(self.refusal([{"filename": COURSE, "status": "modified"},
                                           {"filename": POST, "status": status}]), (None, None))

    def test_a_removed_or_renamed_post_does_not_count(self):
        for status in ("removed", "renamed"):
            refusal, _ = self.refusal([{"filename": COURSE, "status": "modified"},
                                       {"filename": POST, "status": status}])
            self.assertIn("carries its blog post", refusal)

    def test_other_prs_and_the_policy_itself_are_not_course_changes(self):
        for name in ("apps/website/src/App.tsx", "apps/website/specs/policy/course_post.t27",
                     "apps/website/specs/coursework.t27", "specs/course/x.t27"):
            self.assertEqual(self.refusal([{"filename": name, "status": "modified"}]), (None, None))

    def test_an_incomplete_list_without_a_course_file_is_said_not_passed_silently(self):
        refusal, notice = self.refusal([{"filename": "README.md", "status": "modified"}], changed=3001)
        self.assertIsNone(refusal)
        self.assertIn("not decided", notice)

    def test_malformed_file_entries_are_refused(self):
        refusal, _ = self.refusal([{"filename": COURSE}])
        self.assertIn("without a filename or status", refusal)

    def test_a_policy_spec_that_lost_its_rule_fails_closed(self):
        source = report.COURSE_POST_SPEC.read_text(encoding="utf-8")
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "course_post.t27"
            for broken, reason in (
                (source.replace("pub const RULE :", "pub const RULES :"), "no str constant RULE"),
                (source.replace('= ["added", "modified"]', '= ["added"]'), "declared length"),
                (source.replace('"apps/website/specs/course/"', '"apps/website/specs/course"', 1), "must end with /"),
            ):
                path.write_text(broken, encoding="utf-8")
                with self.assertRaisesRegex(report.ReportError, reason):
                    report.course_post_policy(path)
            with self.assertRaisesRegex(report.ReportError, "unreadable"):
                report.course_post_policy(Path(directory) / "missing.t27")

    def run_cli(self, files, directory):
        root = Path(directory)
        event = valid_event()
        event["pull_request"]["changed_files"] = len(files)
        (root / "event.json").write_text(json.dumps(event))
        (root / "files.jsonl").write_text("\n".join(json.dumps(item) for item in files) + "\n")
        command = [sys.executable, str(Path(report.__file__)), "validate", "--event", str(root / "event.json"),
                   "--output", str(root / "out"), "--files", str(root / "files.jsonl")]
        return subprocess.run(command, capture_output=True, text=True)

    def test_cli_refuses_a_course_pr_without_its_post_and_writes_nothing(self):
        with tempfile.TemporaryDirectory() as directory:
            result = self.run_cli([{"filename": COURSE, "status": "modified"}], directory)
            self.assertEqual(result.returncode, 1)
            self.assertIn("carries its blog post", result.stderr)
            self.assertFalse((Path(directory) / "out").exists())

    def test_cli_accepts_a_course_pr_with_its_post(self):
        with tempfile.TemporaryDirectory() as directory:
            result = self.run_cli([{"filename": COURSE, "status": "modified"},
                                   {"filename": POST, "status": "added"}], directory)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue((Path(directory) / "out" / "report.json").exists())


CAST, TEXT = "{ kind: 'terminal', src: 'term/x/session.cast' }", "{ \"kind\": \"p\", \"text\": \"kind: words\" }"


class PostWidgetTests(unittest.TestCase):
    def refusal(self, bodies, status="added", name="new-post.ts", posts=None):
        with tempfile.TemporaryDirectory() as directory:
            (Path(directory) / name).write_text("".join(f"export const {k}: Block[] = [{v}]\n" for k, v in bodies.items()))
            files = [{"filename": "apps/website/src/data/blog/bodies/" + name, "status": status}]
            return report.post_widget_refusal(files, Path(posts or directory), report.post_widget_policy())

    def test_the_real_policy_spec_is_read_and_a_broken_one_fails_closed(self):
        policy = report.post_widget_policy()
        self.assertEqual((policy["kinds"], len(policy["old"])), (frozenset({"terminal", "figure"}), 72))
        source = (Path(report.__file__).resolve().parent.parent / report.POST_WIDGET_REL).read_text(encoding="utf-8")
        with tempfile.TemporaryDirectory() as directory:
            (Path(directory) / "p.t27").write_text(source.replace("[2]str", "[3]str"), encoding="utf-8")
            with self.assertRaisesRegex(report.ReportError, "declared length"):
                report.post_widget_policy(Path(directory) / "p.t27")

    def test_a_post_needs_a_widget_in_each_language(self):
        self.assertIsNone(self.refusal({"body": CAST, "ruBody": CAST.replace("terminal", "figure")}))
        self.assertIsNone(self.refusal({"body": CAST}, status="modified"))
        self.assertIn("has none in body or ruBody (rule in", self.refusal({"body": TEXT, "ruBody": TEXT}))
        self.assertIn("has none in ruBody (rule in", self.refusal({"ruBody": TEXT, "body": CAST}, status="renamed"))
        self.assertIn("has none in body", self.refusal({}))

    def test_grandfathered_removed_and_unsaved_bodies(self):
        self.assertIsNone(self.refusal({"body": TEXT}, name="nobodys-example.ts"))
        self.assertIsNone(self.refusal({"body": TEXT}, status="removed"))
        self.assertIn("not saved as data", self.refusal({"body": CAST}, posts="/nonexistent"))


if __name__ == "__main__":
    unittest.main()
