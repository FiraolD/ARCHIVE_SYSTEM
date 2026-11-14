# INSUREARCH Production Readiness Plan

## Objective
Harden the existing React/TypeScript + Express + PostgreSQL application in small, testable increments. Preserve existing business workflows and avoid a rewrite unless measurements demonstrate a need.

## Confirmed project profile and open decisions
- Intended deployment is a central on-premises web application serving branch offices.
- Working sizing assumption, pending confirmation: 80 branches, 1,000 users, 50 concurrent users, 100,000 documents, and 12% annual growth.
- In-scope record classes are claims, legal, policy, finance, and general records.
- Required file-format families include PDF, JPEG/PNG, ZIP, audio/video, Excel, and Word. Each format still needs explicit validation, safe handling, access, and preservation rules.
- The organization identified Ethiopia's Personal Data Protection Proclamation No. 1321/2024, NBE Financial Consumer Protection Directive No. FCP/01/2020, NBE insurance governance/IT risk directives including SIB/56/2022, and Computer Crimes Proclamation No. 958/2016 as relevant. Applicability and current obligations must be confirmed by the organization's compliance/legal owner; this plan is not a legal-compliance determination.
- Recovery objectives (RPO/RTO), approved retention triggers and periods, legal-hold/disposition authority, average file size/storage growth, and offline-branch needs remain open decisions and must not be guessed in implementation.

## Current repository findings
- The default branch is `full`; implementation work is isolated on `hardening/production-readiness-phase-1`.
- Root and backend environment files were tracked in the public repository and have been removed from this hardening branch. This does not erase their contents from Git history; rotate any credentials that were ever stored there.
- The repository tree includes dependency installation artifacts under `backend/node_modules`. Remove tracked generated dependencies in a dedicated, reviewed cleanup and retain lockfiles.
- Backend controllers contain business logic, SQL, audit behavior, and HTTP response handling in large files. Refactor gradually into route/controller/service/repository boundaries.
- Authentication queries the database on each request; establish measurements before considering safe caching or session changes.
- Upload filtering currently relies on client-provided MIME type in the document route; add content-signature validation, strict size/type limits, safe storage, and malware-scanning integration where operationally available.
- Archive reference and box sequence generation use aggregate/count patterns that can race under concurrent writes; replace with database-backed sequences or locked transactional allocation and unique constraints.
- File-request approval/return workflows need atomic state transitions that verify current state and prevent double checkout/return.
- Search endpoints should have bounded pagination, query plans, indexes, and tests for wildcard-heavy searches. Avoid unbounded result sets.
- Reports and data migration scripts need resource limits, predictable error handling, and operational safeguards.
- Frontend contains both JavaScript and TypeScript variants for some shared files, which can drift. Establish a single source of truth and enforce typecheck/lint/build in CI.
- Tests, CI, structured logging, readiness checks, and measurable performance baselines need to be verified/introduced before production claims are made.

## Phased implementation

### Phase 1 — Repository and secret hygiene
1. Keep all hardening work on this branch until reviewed.
2. Remove tracked environment files from the branch and strengthen ignore rules.
3. Rotate credentials that may have appeared in any public commit; deletion from the current tree is not history erasure.
4. Remove committed `node_modules` and other generated artifacts in a reviewed cleanup; retain package manifests and lockfiles.
5. Review the large legacy SQL export before deciding whether it contains production/customer data or is required for reproducible migration. Do not publish sensitive data.

### Phase 2 — Establish a verified baseline
1. [In progress] Add GitHub Actions checks on `hardening/**` pushes and pull requests targeting `full`.
2. [In progress] Run frontend lint, TypeScript typecheck, and production build in a clean Node.js 22 environment; use CI failures to establish the real baseline before fixing issues.
3. [In progress] Run backend dependency installation and JavaScript syntax checks. Add automated backend smoke tests and database migration tests next.
4. Document supported Node.js and PostgreSQL versions and environment variables.
5. Extend CI with automated tests, dependency audit, and migration checks after the initial baseline is known.

### Phase 3 — Security and access control
1. [Implemented] Validate production JWT secret length and reject missing, short, or example placeholder values at startup. Deployments must still provision a unique random secret; this check cannot prove entropy.
2. Define explicit CORS origins per environment and validate proxy/trust-proxy settings.
3. Add schema validation for every mutating endpoint and consistent error handling.
4. Verify route-level authorization, including branch/department scope and ownership checks.
5. [Partially implemented] Persist ingest files using the canonical document columns; clean up files after validation or persistence failures; restrict extension/MIME pairs; verify file signatures; generate storage names; enforce a configurable size limit; store new files outside the static uploads directory; and provide authenticated record-ID downloads with storage-path containment checks. Still required: storage quotas, malware scanning where available, branch/department download authorization, and operational storage monitoring.
6. Add password policy, login abuse controls, token expiry/revocation strategy, and session security.
7. Make audit events reliable for security-sensitive state changes and avoid leaking internal errors.

### Phase 4 — Data integrity and workflow correctness
1. [Partially implemented] The setup upgrade adds canonical document file metadata columns and copies legacy `file_url`/`created_by` values into `file_path`/`owner_id`. Adopt reviewed, versioned migrations rather than relying only on an evolving setup script.
2. Enforce foreign keys, check constraints, unique constraints, and indexes for actual invariants.
3. Make archive/box reference allocation concurrency-safe.
4. Implement state-transition updates with transactional row locks or conditional updates.
5. Prevent duplicate active checkouts and ensure return/approval actions are idempotent.
6. Preserve immutable audit history for critical document and physical-location changes.

### Phase 5 — Performance and scale
1. Capture query plans for document search, dashboard, reports, box listings, and request queues.
2. Add indexes based on measured query plans, including appropriate trigram indexes for substring search if the extension is available.
3. Ensure every list endpoint has bounded pagination and deterministic ordering.
4. Reduce redundant database round trips and avoid N+1 query patterns.
5. Move large report generation and data imports to bounded/background jobs when latency or memory warrants it.
6. Configure pool size against total application instances and PostgreSQL connection limits; add query timeouts and graceful shutdown.

### Phase 6 — Reliability, observability, and recovery
1. Add structured logs with request/correlation IDs and redaction of tokens, credentials, and sensitive policy/claim data.
2. Add liveness and readiness endpoints; readiness must check dependencies without exposing internal error details.
3. Add graceful shutdown for HTTP, Socket.IO, and PostgreSQL pools.
4. Implement automated backups, retention, off-host copies, and scheduled restore drills.
5. Add metrics for latency, errors, database pool saturation, upload failures, and report durations.
6. Define recovery objectives (RPO/RTO) and operational runbooks.

### Phase 7 — Frontend quality and user experience
1. Consolidate duplicate JS/TS implementations and remove dead scripts only after reference checks.
2. Standardize API error handling, loading states, retry behavior, and auth-expiry handling.
3. Prevent stale search responses from overwriting newer results; debounce and cancel requests.
4. Improve accessibility, keyboard navigation, form validation, and responsive behavior.
5. Add end-to-end tests for login, ingest/search, requests, physical assignment, approvals, and returns.

### Phase 8 — Release readiness
1. Run unit, integration, end-to-end, security, migration, backup-restore, and load tests.
2. Test realistic datasets and concurrent users; set measurable latency/error-rate targets before tuning.
3. Deploy to staging with production-like configuration, then use a controlled rollout and rollback plan.
4. Require reviewed pull requests and green CI before merging to the default branch.

## Acceptance principles
- No credentials or customer data in source control.
- No authorization decisions made only in the frontend.
- No critical workflow mutation without server-side validation and database consistency.
- No claim of performance improvement without repeatable measurements.
- No production-ready declaration until tests, security review, restore drill, and deployment runbook are complete.
