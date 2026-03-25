# Web-Tools Constitution

## Core Principles

### I. Zero-Latency Privacy
All user data MUST be processed entirely inside the client browser using local browser capabilities such as RAM, the File API, and IndexedDB. External API calls, server round-trips, cloud functions, or any other network-based data transformation are strictly forbidden. A tool that cannot complete its core function without sending user data off-device is out of scope for this repository.

Rationale: privacy is not a feature toggle. It is the primary product guarantee.

### II. No-Build Simplicity
Vanilla HTML, CSS, and JavaScript are the default implementation stack. Build tools, bundlers, or package-managed pipelines MAY be used only to improve local development ergonomics, but they MUST NOT become a runtime requirement. The delivered artifact MUST remain a portable static asset set that functions when opened or hosted as ordinary static files.

Rationale: users must be able to inspect, copy, host, and preserve these tools without a specialized toolchain.

### III. The Local-First Preference
A user SHOULD be able to clone or download this repository and use shipped tools with minimal setup as ordinary static files. Core functionality MUST NOT depend on remote configuration, remote storage, remote licensing checks, or server-side processing. Browser libraries and stylesheets used at runtime MUST be shipped from checked-in local files within the repository.

Rationale: simple static delivery remains important, and committed local assets improve reproducibility, offline behaviour, and long-term preservation.

### IV. Security by Isolation
This repository MUST NOT include third-party tracking, analytics, telemetry beacons, fingerprinting code, ad scripts, or runtime calls that send user-provided content to external services. Third-party libraries are permitted when they are necessary, auditable, and committed locally in the repository. Network access from tools MUST be treated as prohibited by default for data processing and feature execution.

Rationale: privacy leakage and integrity risk come primarily from transmitting user data or executing uncontrolled third-party behavior.

### V. Agentic Interoperability
Repository structure MUST remain legible and writable to automated agents. The `.agents/` and `.specify/` directories, along with their expected conventions for squads, memory, templates, and workflow artifacts, MUST be preserved and updated consistently. Changes that break gh-aw, squads, or related agent workflows are not allowed unless accompanied by a documented migration plan and synchronized updates to all affected agent-readable files.

Rationale: automation only works when project conventions are stable, explicit, and machine-operable.

## Implementation Constraints

1. Web-Tools is a static, browser-executed project. Backends, serverless handlers, remote databases, and data-processing services are prohibited.
2. Single-file tools are preferred when practical. When separation is justified, use plain static assets with minimal folder complexity.
3. New tools SHOULD expose a simple tool page named `/tools/[feature-slug-no-number].html`.
4. Tool-specific scripts and assets SHOULD live under `/tools/[feature-slug-no-number]/`, while reusable cross-tool code and styling SHOULD live under `/scripts/` and `/styles/`.
5. Tool HTML pages under `/tools/` SHOULD include page metadata and a `<script type="application/ld+json">` block with structured data appropriate to the tool.
6. Shipped runtime assets MUST be stored locally in the repository. A shared `/vendor/` directory SHOULD be used for reusable third-party browser dependencies.
7. Dev-only package managers MAY be used to download, pin, audit, and refresh third-party browser packages, but the final runtime files used by shipped pages MUST be copied into the repository and committed.
8. User files and derived content MUST remain local to the browser unless the user explicitly downloads or saves them.
9. New dependencies require a written justification covering necessity, delivery approach, license acceptability, and privacy impact.
10. Features that introduce subscriptions, gating, watermarking, account requirements, or artificial usage limits are forbidden.

## Development Workflow and Review Gates

1. Every change MUST be reviewed against all five Core Principles before merge.
2. Every new tool or major feature MUST document how it satisfies local-only processing and zero external transfer of user data.
3. Reviewers MUST verify that shipped pages load third-party runtime assets only from committed local files, not external CDNs or package-manager paths.
4. If a development-only sync or build step exists, the checked-in artifact MUST be the one used by production pages.
5. If a development-only build step exists, reviewers MUST verify that the final committed output is static, portable, and independent of that build step.
6. Any proposal that introduces remote data processing, hidden telemetry, runtime CDN dependence, or agent-breaking directory changes MUST be rejected as non-compliant.
7. README, instructions, specifications, and agent guidance MUST remain aligned with this constitution when relevant changes are made.

## Governance

This constitution is the highest authority for repository architecture and delivery rules. If another document conflicts with this file, this file prevails.

Amendments require all of the following:
1. A written rationale describing the operational need.
2. An explicit impact statement covering privacy, offline behavior, static portability, and agent interoperability.
3. Updates to any affected guidance or template files in `.agents/`, `.specify/`, or root documentation.
4. A version update using semantic versioning:
   - MAJOR: removes or weakens a core guarantee.
   - MINOR: adds a new principle or materially expands enforcement.
   - PATCH: clarifies wording without changing meaning.

Compliance is mandatory. Pull requests, agent runs, and maintenance updates MUST treat violations of these rules as blocking defects, not optional follow-up work.

**Version**: 2.1.0 | **Ratified**: 2026-03-24 | **Last Amended**: 2026-03-25
