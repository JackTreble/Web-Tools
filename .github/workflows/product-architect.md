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
  add-comment: {}

tools:
  github: {}
---

# Intelligence Squad: Product Lead

## Goal
Transform the triggering approved issue into implementation-ready planning artifacts by running `/speckit.plan` and `/speckit.tasks`, then open a PR with the generated files and comment the PR link back on the issue.

Portfolio focus reminder: prioritize tools that replace paywalled or heavily restricted workflows for broad non-technical audiences. De-prioritize low-level developer utilities (for example Base64/JWT/cron helpers) unless the issue includes clear evidence of mainstream, non-technical demand.

## Instructions

**Activation**: This workflow only runs when the `status:approved` label is added to an issue.

**Scope and Outputs**: This workflow generates planning artifacts only in the `/specs/[feature-slug]/` directory. It reads `instructions.md` as reference input but does not modify it.

### Workflow Steps

1. **Verify Trigger Context**
  - Confirm the triggering label is `status:approved`.
  - Work from the issue that triggered this workflow.


2. **Read the Issue Description**
  - Fetch the triggering issue via the GitHub tool.
  - Treat the issue title and body/description as the source of truth for the feature request, priorities and constraints.
  - Extract the problem statement, user goals, constraints, acceptance details, and any implementation hints from the issue body.
  - If the issue body is sparse, still proceed using the title, body, and any clearly relevant issue metadata instead of blocking.
3. **Generate the Spec-Kit with `/speckit.specify`**
  - Invoke `/speckit.specify` using the triggering issue content as input.
  - Pass a compact but complete prompt that includes:
    - Issue title
    - Issue number and URL
    - Full issue description/body
    - Any relevant labels or acceptance notes from the issue
  - Create a feature directory in `specs/[feature-slug]/`
  - Generate `spec.md` following `.specify/templates/spec-template.md`
4. **Generate planning artifacts with `/speckit.plan` and `/speckit.tasks`**
  - Invoke `/speckit.plan` using the `The Tech` section of the triggering issues content as input.
  - Ensure the plan stays grounded in the approved issue scope.
  - Invoke `/speckit.tasks` from the generated plan output.
  - Produce planning files only under `specs/[feature-slug]/`
  - Create a feature directory in `specs/[feature-slug]/` if it does not exist
  - Generate `plan.md` following `.specify/templates/plan-template.md`
  - Generate `tasks.md` following `.specify/templates/tasks-template.md`
  - Do not modify `instructions.md` or any files outside the `/specs` directory.
5. **Validate the Output**
  - Ensure plan/tasks are grounded in the triggering issue and existing spec rather than invented scope.
  - Ensure the spec adheres to the "No-Backend" rule in `AGENTS.md`:
    - Browser APIs only (Canvas, File System, Crypto, etc.)
    - No server-side logic
    - GitHub Pages compatible
6. **Raise the Pull Request**
  - You **must** call `create_pull_request` to open a PR containing the generated/updated `specs/**/*` planning files.
  - This is a required step — do not skip it. Completing the plan and tasks generation without opening a PR is an incomplete workflow run.
  - Use a PR title/body that clearly references the triggering issue.
  - Do **not** include GitHub auto-closing keywords in the PR title or body (for example: `close`, `closes`, `closed`, `fix`, `fixes`, `fixed`, `resolve`, `resolves`, `resolved` followed by an issue reference).
  - Reference the issue in a non-closing way (for example: `Related to #<issue-number>`).
  - Capture the created PR URL.
7. **Comment on the Issue with the PR Link**
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

    What happens next:
    1. Review the generated plan and task breakdown.
    2. Confirm scope and sequencing still match the approved issue/spec.
    3. Request edits or approve the PR for implementation.
    ```
7. **Failure Handling**
  - If `/speckit.specify`, `/speckit.plan`, `/speckit.tasks`, or PR creation fails, leave a concise issue comment via `add_comment` stating what failed and what needs human follow-up.

## Always Produce a Safe Output

You **must** always call at least one safe-output tool before finishing.

- **Normal path**: call `create_pull_request` (steps 3–5) and then `add_comment` (step 6). Both are expected outputs for a successful run.
- **Spec or data missing**: if the issue body lacks sufficient detail to generate a plan, call `add_comment` on the triggering issue to request a proper spec via `/speckit.specify`, then stop.
- **Any other failure**: call `add_comment` on the triggering issue with a brief summary of what went wrong.

Never finish this workflow without calling at least one safe-output tool. Producing zero outputs is always incorrect.
