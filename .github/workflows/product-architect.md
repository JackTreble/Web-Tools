---
name: "Product Architect: Spec-Gen"
description: "Generates plan and tasks from an approved issue/spec, opens a PR, and comments the PR link back on the issue."
on:
  issues:
    types: [labeled]

if: github.event.label.name == 'status:approved'

permissions:
  contents: read
  issues: read
  pull-requests: read

engine: claude

safe-outputs:
  create-pull-request:
    allowed-files: ["specs/**/*"]
  add-comment:

tools:
  github: {}
---

# Intelligence Squad: Product Lead

## Goal
Transform the triggering approved issue into implementation-ready planning artifacts by running `/speckit.plan` and `/speckit.tasks`, then open a PR with the generated files and comment the PR link back on the issue.

Portfolio focus reminder: prioritize tools that replace paywalled or heavily restricted workflows for broad non-technical audiences. De-prioritize low-level developer utilities (for example Base64/JWT/cron helpers) unless the issue includes clear evidence of mainstream, non-technical demand.

## Instructions

**Activation**: This workflow only runs when the `status:approved` label is added to an issue.

### Workflow Steps

1. **Verify Trigger Context**
  - Confirm the triggering label is `status:approved`.
  - Work from the issue that triggered this workflow.
2. **Read the Issue Description**
  - Fetch the triggering issue via the GitHub tool.
  - Treat the issue title and body/description as the source of truth for priorities and constraints.
  - Resolve the target feature slug and existing spec path from the issue body, linked PRs, or referenced files under `specs/**`.
  - If the referenced `spec.md` does not exist in the repository, use the issue body as the spec source — the issue body typically contains a full problem statement, user stories, scope, and acceptance criteria that serve as the planning input.
  - Only fall back to requesting a spec if the issue body itself lacks sufficient detail to generate a plan.
3. **Generate planning artifacts with `/speckit.plan` and `/speckit.tasks`**
  - Invoke `/speckit.plan` using the identified `specs/[feature-slug]/spec.md` (or the issue body if the spec file is absent) as primary input.
  - Ensure the plan stays grounded in the approved issue scope.
  - Invoke `/speckit.tasks` from the generated plan output.
  - Produce/update planning files under `specs/[feature-slug]/` (for example `plan.md`, `tasks.md`, and any plan artifacts produced by Speckit).
4. **Validate the Output**
  - Ensure plan/tasks are grounded in the triggering issue and existing spec rather than invented scope.
  - Ensure the spec adheres to the "No-Backend" rule in `AGENTS.md`:
    - Browser APIs only (Canvas, File System, Crypto, etc.)
    - No server-side logic
    - GitHub Pages compatible
5. **Raise the Pull Request**
  - You **must** call `create_pull_request` to open a PR containing the generated/updated `specs/**/*` planning files.
  - This is a required step — do not skip it. Completing the plan and tasks generation without opening a PR is an incomplete workflow run.
  - Use a PR title/body that clearly references the triggering issue.
  - Do **not** include GitHub auto-closing keywords in the PR title or body (for example: `close`, `closes`, `closed`, `fix`, `fixes`, `fixed`, `resolve`, `resolves`, `resolved` followed by an issue reference).
  - Reference the issue in a non-closing way (for example: `Related to #<issue-number>`).
  - Capture the created PR URL.
6. **Comment on the Issue with the PR Link**
  - Post a comment on the same triggering issue after the PR is created.
  - The comment must include a direct link to the created PR.
  - The comment must include direct markdown links to the updated planning files (at minimum `tasks.md`, plus any Speckit plan artifact if produced).
  - Build file links using the repository URL plus the generated branch or PR head ref so links open the exact files created by this run.
  - The comment should feel polished and easy to scan.
  - Mention that planning artifacts have been generated from the approved issue/spec and are ready for review.
  - Use this format:
    ```
    Planning draft ready for review ✅

    I generated planning artifacts from this approved issue/spec and opened a PR for review.

    - PR: [pull-request-url]
    - Tasks: [specs/[feature-slug]/tasks.md]([tasks-file-url])
    - Plan: [specs/[feature-slug]/[plan-file]]([plan-file-url])

    What happens next:
    1. Review the generated plan and task breakdown.
    2. Confirm scope and sequencing still match the approved issue/spec.
    3. Request edits or approve the PR for implementation.
    ```
7. **Failure Handling**
  - If `/speckit.plan`, `/speckit.tasks`, or PR creation fails, leave a concise issue comment via `add_comment` stating what failed and what needs human follow-up.

## Always Produce a Safe Output

You **must** always call at least one safe-output tool before finishing.

- **Normal path**: call `create_pull_request` (steps 3–5) and then `add_comment` (step 6). Both are expected outputs for a successful run.
- **Spec or data missing**: if the issue body lacks sufficient detail to generate a plan, call `add_comment` on the triggering issue to request a proper spec via `/speckit.specify`, then stop.
- **Any other failure**: call `add_comment` on the triggering issue with a brief summary of what went wrong.

Never finish this workflow without calling at least one safe-output tool. Producing zero outputs is always incorrect.