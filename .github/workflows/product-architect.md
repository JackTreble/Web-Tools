---
name: "Product Architect: Spec-Gen"
description: "Generates a Spec-Kit from an approved issue, opens a PR, and comments the PR link back on the issue."
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
Transform the triggering approved issue into a formal Spec-Kit and route it back to the issue as a PR.

## Instructions

**Activation**: This workflow only runs when the `status:approved` label is added to an issue.

### Workflow Steps

1. **Verify Trigger Context**
  - Confirm the triggering label is `status:approved`.
  - Work from the issue that triggered this workflow.
2. **Read the Issue Description**
  - Fetch the triggering issue via the GitHub tool.
  - Treat the issue title and body/description as the source of truth for the feature request.
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
  - Generate `spec.md` following `specs/templates/spec-template.md`
  - Generate `tasks.md` following `specs/templates/tasks-template.md`
4. **Validate the Output**
  - Ensure the spec and tasks are grounded in the triggering issue rather than invented scope.
  - Ensure the spec adheres to the "No-Backend" rule in `AGENTS.md`:
    - Browser APIs only (Canvas, File System, Crypto, etc.)
    - No server-side logic
    - GitHub Pages compatible
5. **Raise the Pull Request**
  - Use `create-pull-request` to open a PR containing only the generated `specs/**/*` files.
  - Use a PR title/body that clearly references the triggering issue.
  - Capture the created PR URL.
6. **Comment on the Issue with the PR Link**
  - Post a comment on the same triggering issue after the PR is created.
  - The comment must include a direct link to the created PR.
  - The comment must include direct markdown links to the generated `spec.md` and `tasks.md` files.
  - Build file links using the repository URL plus the generated branch or PR head ref so the links open the exact files created by this run.
  - The comment should feel polished and easy to scan.
  - Mention that the spec draft has been generated from the approved issue and is ready for review.
  - Use this format:
    ```
    Spec draft ready for review ✅

    I generated the initial Spec-Kit from this approved issue and opened a PR for review.

    - PR: [pull-request-url]
    - Spec: [specs/[feature-slug]/spec.md]([spec-file-url])
    - Tasks: [specs/[feature-slug]/tasks.md]([tasks-file-url])

    What happens next:
    1. Review the generated spec and task breakdown.
    2. Confirm the scope still matches the approved issue.
    3. Request edits or approve the PR for the next stage.
    ```
7. **Failure Handling**
  - If spec generation or PR creation fails, leave a concise issue comment stating what failed and what needs human follow-up.