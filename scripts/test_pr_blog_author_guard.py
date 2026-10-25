#!/usr/bin/env python3
"""Trust-boundary tests for the PR blog author dispatch guard."""

import copy
import unittest

from pr_blog_author_guard import validate


def source_pr():
    return {
        "number": 123,
        "base": {"repo": {"full_name": "Trinity-S-AI-DNA/trinity"}},
        "state": "closed",
        "merged": True,
        "merged_at": "2026-09-13T04:00:00Z",
        "head": {"sha": "a" * 40},
    }


def outbox_issue():
    return {
        "number": 456,
        "state": "open",
        "user": {"login": "github-actions[bot]"},
        "body": "<!-- t27-pr-blog:123 -->\n\nA draft report awaiting the article author.",
    }


class AuthorGuardTests(unittest.TestCase):
    def test_correct_merged_source_and_workflow_outbox_form_strict_event_wrapper(self):
        pr, issue = source_pr(), outbox_issue()
        original_pr, original_issue = copy.deepcopy(pr), copy.deepcopy(issue)
        event = validate(pr, issue, "123", "456")
        self.assertEqual(event, {
            "repository": {"full_name": "Trinity-S-AI-DNA/trinity"},
            "number": 123,
            "pull_request": pr,
        })
        self.assertEqual(pr, original_pr)
        self.assertEqual(issue, original_issue)

    def test_wrong_source_repository_is_rejected(self):
        for repository in ("attacker/trinity", "gHashTag/another-repo", "Trinity-S-AI-DNA/trinity/../../elsewhere", ""):
            with self.subTest(repository=repository):
                pr = source_pr()
                pr["base"]["repo"]["full_name"] = repository
                with self.assertRaisesRegex(ValueError, "Source PR identity mismatch"):
                    validate(pr, outbox_issue(), "123", "456")

    def test_source_number_must_match_requested_pr(self):
        pr = source_pr()
        pr["number"] = 124
        with self.assertRaisesRegex(ValueError, "Source PR identity mismatch"):
            validate(pr, outbox_issue(), "123", "456")

    def test_outbox_number_must_match_requested_issue(self):
        issue = outbox_issue()
        issue["number"] = 457
        with self.assertRaisesRegex(ValueError, "Outbox is not the expected issue"):
            validate(source_pr(), issue, "123", "456")

    def test_outbox_cannot_itself_be_a_pull_request(self):
        issue = outbox_issue()
        issue["pull_request"] = {"url": "https://api.github.com/repos/Trinity-S-AI-DNA/trinity/pulls/456"}
        with self.assertRaisesRegex(ValueError, "Outbox is not the expected issue"):
            validate(source_pr(), issue, "123", "456")

    def test_non_workflow_author_is_rejected(self):
        for login in ("gHashTag", "another-bot[bot]", "github-actions", "github-actions[bot] ", None):
            with self.subTest(login=login):
                issue = outbox_issue()
                issue["user"] = {} if login is None else {"login": login}
                with self.assertRaisesRegex(ValueError, "not created by the workflow"):
                    validate(source_pr(), issue, "123", "456")

    def test_closed_outbox_is_not_republished(self):
        issue = outbox_issue()
        issue["state"] = "closed"
        with self.assertRaisesRegex(ValueError, "already closed"):
            validate(source_pr(), issue, "123", "456")

    def test_unmerged_or_inconsistent_source_cannot_start_author(self):
        for overrides in (
            {"state": "open", "merged": False, "merged_at": None},
            {"state": "closed", "merged": False, "merged_at": None},
            {"state": "open", "merged": True},
            {"merged": True, "merged_at": None},
            {"merged": None},
        ):
            with self.subTest(overrides=overrides):
                pr = source_pr()
                pr.update(overrides)
                with self.assertRaisesRegex(ValueError, "Source PR is not merged"):
                    validate(pr, outbox_issue(), "123", "456")

    def test_marker_must_be_exactly_the_first_line_for_this_source(self):
        marker = "<!-- t27-pr-blog:123 -->"
        for body in (
            None,
            "",
            "\n" + marker,
            " " + marker,
            marker + " ",
            "prefix " + marker,
            marker + " suffix",
            "<!-- t27-pr-blog:124 -->",
            "<!-- t27-pr-blog:0123 -->",
            "<!-- T27-PR-BLOG:123 -->",
            "A normal issue description\n" + marker,
        ):
            with self.subTest(body=body):
                issue = outbox_issue()
                issue["body"] = body
                with self.assertRaisesRegex(ValueError, "belongs to another source PR"):
                    validate(source_pr(), issue, "123", "456")

    def test_shell_path_and_nonpositive_numeric_inputs_are_rejected(self):
        invalid_values = (
            "", "0", "-1", "+123", "123.0", " 123", "123 ",
            "../123", "123/../../456", "123?query=456", "123; touch /tmp/injected",
            "$(id)", "`id`", "123\n456", "123\x00", "1e3",
        )
        for value in invalid_values:
            for argument in ("source", "outbox"):
                with self.subTest(value=value, argument=argument):
                    with self.assertRaisesRegex(ValueError, "Expected positive PR and outbox numbers"):
                        validate(source_pr(), outbox_issue(),
                                 value if argument == "source" else "123",
                                 value if argument == "outbox" else "456")


if __name__ == "__main__":
    unittest.main()
