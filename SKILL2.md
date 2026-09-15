---
name: it-helpdesk
description: "Use when designing, implementing, reviewing, or extending an IT Helpdesk system for reporting and managing repairs of equipment, IT systems, and other assets with a side navigation interface, ticket tracking, assignment, history, asset tags, and serial numbers. Includes PostgreSQL-backed data persistence and a Warp-Terminal-style operator console for the local startup script."
---

# IT Helpdesk Repair System Skill

## Purpose

This skill defines the complete requirements and working process for creating an IT Helpdesk system for reporting and managing repairs of equipment and IT systems. Follow all requirements in this file when designing, implementing, reviewing, or extending the system. Do not remove or summarize requirements from the original specification.

## Original Reference

Reference website and requested visual structure:

`https://toolfolio.com/`

ฉันต้องการโครงสร้างเว็ปแบบ `Side Navigasion` ดั่งลิงค์เว็บไซค์ตัวอย่างนี้ แล้วสร้างระบบแจ้งซ่อมอุปกรณ์ครุภัณฑ์

**จุดประสงค์ของระบบ Helpdesk สำหรับแจ้งซ่อม**

1. เพื่อพัฒนาระบบสำหรับรับแจ้งปัญหาและแจ้งซ่อมอุปกรณ์หรือระบบ IT อย่างเป็นระบบ
2. เพื่อให้ผู้ใช้งานสามารถแจ้งปัญหาและติดตามสถานะการซ่อมได้สะดวก
3. เพื่อช่วยให้เจ้าหน้าที่สามารถรับ มอบหมาย และจัดการงานซ่อมได้อย่างมีประสิทธิภาพ
4. เพื่อลดปัญหาการแจ้งซ่อมตกหล่นและลดการใช้เอกสารในการจัดเก็บข้อมูล
5. เพื่อจัดเก็บประวัติการแจ้งซ่อมและการดำเนินงาน สามารถตรวจสอบย้อนหลังได้
6. เพื่อรวบรวมข้อมูลการซ่อมสำหรับนำไปวิเคราะห์และจัดทำรายงานเพื่อปรับปรุงการให้บริการด้าน IT
7. เก็บข้อมูลเลขทรัพย์สินของครุภัณฑ์อื่น ๆ เช่น tags, Serial number

---

**กำหนดขอบข่าย**
ก่อนเริ่มงานให้กำ

## Interpretation of the Incomplete Original Scope

The original text ends at `ก่อนเริ่มงานให้กำ`. Preserve that original text exactly as shown above, and use the following completion as the working interpretation unless the requester provides a different scope:

ก่อนเริ่มงานให้กำหนดขอบเขต ผู้ใช้งาน บทบาท ข้อมูล กระบวนการทำงาน สถานะการซ่อม สิทธิ์การเข้าถึง และเกณฑ์การตรวจรับให้ชัดเจน โดยต้องไม่เริ่มพัฒนาฟังก์ชันที่อยู่นอกขอบเขตโดยไม่มีการยืนยันจากผู้ร้องขอ

## Required Product Shape

Build a working IT Helpdesk repair-management system with a persistent side navigation layout. The primary experience must be the usable application, not a marketing landing page.

The interface must include:

- A persistent left side navigation on desktop.
- A responsive navigation treatment on smaller screens that remains usable without hiding core workflows.
- A clear page title and current navigation state.
- A dashboard for work overview.
- A repair-request list with search, filtering, sorting, and status visibility.
- A repair-request creation form.
- A repair-request detail view.
- Asset information connected to each request.
- Assignment and work-management controls for authorized staff.
- Repair history and an auditable activity timeline.
- Reporting and analysis views.
- Settings or administration views appropriate to the selected roles.

Use the visual reference at `https://toolfolio.com/` only as a structural reference for the side-navigation pattern. Do not copy protected branding, text, images, or implementation code from the reference website.

## Visual and Interaction Design Direction ("Modern Technology")

The requester has asked for a "Modern Technology" look for the web application, distinct from a generic templated admin panel. Apply this direction on top of the side-navigation structure above:

- Establish one small design-token system (color palette, one or two type families, spacing scale, radius scale) and reuse it everywhere instead of ad-hoc per-screen styling. Document the tokens in the codebase (e.g., CSS variables or a theme file) so they stay a single source of truth.
- Choose a palette and type pairing that fits an IT operations tool — do not default to generic SaaS defaults (identical rounded cards with the same soft shadow, an unexplained gradient hero, tracked-out all-caps labels everywhere) unless the requester specifically asks for that look.
- Status, priority, and role information must never rely on color alone — pair color with an icon, label, or text so the interface stays usable for color-blind users and in monochrome printouts/exports.
- Use motion sparingly and only to communicate a state change (a row updating, a panel opening, a save confirming) — avoid decorative animation on every hover or on page load.
- Keep dense operational data (ticket lists, asset registers, reports) legible first: clear column alignment, readable row height, and a table treatment that degrades gracefully on mobile (horizontal scroll or a card/list fallback), consistent with the existing Accessibility and Responsive Behavior requirements below.
- The in-app web UI and the local **Operator Console** described below (the Warp-Terminal-style startup screen) should share the same token system — same accent colors for "ok / warning / error", same monospace face for technical/log content — so the developer-facing console and the end-user product feel like one coherent system rather than two unrelated visual styles.
- Any image or file preview (asset photos, attachment thumbnails — see Technology Stack and Data Persistence below) must have a defined empty/placeholder state and a defined broken-image/failed-load state; do not let missing media break page layout.

## Core Objectives

The implementation must satisfy all seven objectives from the original request:

1. รับแจ้งปัญหาและแจ้งซ่อมอุปกรณ์หรือระบบ IT อย่างเป็นระบบ.
2. ให้ผู้ใช้งานแจ้งปัญหาและติดตามสถานะการซ่อมได้สะดวก.
3. ให้เจ้าหน้าที่รับ มอบหมาย และจัดการงานซ่อมได้อย่างมีประสิทธิภาพ.
4. ลดปัญหาการแจ้งซ่อมตกหล่นและลดการใช้เอกสารในการจัดเก็บข้อมูล.
5. จัดเก็บประวัติการแจ้งซ่อมและการดำเนินงานเพื่อตรวจสอบย้อนหลัง.
6. รวบรวมข้อมูลการซ่อมเพื่อวิเคราะห์และจัดทำรายงานปรับปรุงบริการ IT.
7. จัดเก็บเลขทรัพย์สินของครุภัณฑ์ เช่น tags และ Serial number.

## Roles and Permissions

At minimum, model these roles:

### Requester

- Create a repair request.
- View requests created by the requester.
- View the current status and activity history of those requests.
- Add relevant information or follow-up messages when allowed.
- Confirm completion or report that the issue remains unresolved when the workflow supports it.

### Technician

- View repair requests assigned to the technician or available to the technician according to policy.
- Accept work.
- Update diagnosis, work notes, status, time, parts, and resolution.
- Link and inspect asset information.
- Upload or view supporting files when file support exists.
- Return a request for clarification when required.

### Administrator (includes Helpdesk/Supervisor duties)

By decision, this system uses three roles rather than four: Requester, Technician, and Administrator. Administrator absorbs all triage/supervisor responsibilities in addition to system configuration — there is no separate Supervisor role or account type.

- View all requests within the authorized scope. Triage and prioritize requests.
- Assign or reassign technicians. Change statuses according to workflow permissions.
- Manage escalation and due dates.
- Review history, workload, service levels, and reports.
- Correct data only through an auditable action.
- Manage users, roles, departments, locations, categories, priorities, statuses, assets, and system configuration.
- Configure notification and retention behavior where supported.
- Access system-wide reports and audit information.

If day-to-day triage volume later shows that folding Supervisor into Administrator over-grants system-configuration access to people who should only triage, revisit this decision and reintroduce a separate Supervisor role rather than quietly working around the limitation.

Enforce authorization on the server or service layer where applicable. Do not rely only on hiding controls in the user interface.

## Repair Request Data

A repair request should support these fields where applicable:

- Unique request number.
- Subject or short title.
- Detailed problem description.
- Requester.
- Department or organizational unit.
- Contact information.
- Location.
- Category and subcategory.
- Priority.
- Impact and urgency when used for priority calculation.
- Related asset.
- Asset tag.
- Serial number.
- Asset type or equipment type.
- Manufacturer and model when available.
- Current status.
- Assigned technician or team.
- Created date and time.
- Accepted date and time.
- Due date or service-level target when used.
- Started date and time.
- Resolved date and time.
- Closed date and time.
- Diagnosis.
- Work performed.
- Parts or materials used.
- Resolution summary.
- Requester confirmation.
- Attachments or evidence when supported.
- Internal notes that are not visible to requesters, if the permission model supports them.
- Activity history.

Do not discard asset identifiers when an asset is not yet fully registered. Permit a request to store manually entered `tags` and `Serial number` values, then allow authorized staff to link the request to a registered asset later.

## Asset Data

Support an asset register for equipment and other relevant assets. At minimum, an asset can include:

- Asset tag.
- Serial number.
- Asset name.
- Asset type.
- Brand or manufacturer.
- Model.
- Department or owner.
- Location.
- Purchase or received date when available.
- Warranty information when available.
- Asset lifecycle status.
- Current user or responsible person.
- Notes.
- Related repair history.

Asset tag and serial number must be searchable and must be displayed clearly in request details. Define uniqueness rules appropriate to the data source and report duplicate conflicts instead of silently overwriting records.

## Repair Status Workflow

Use an explicit, visible status workflow. The exact labels may be localized, but the meaning must remain clear. A default workflow is:

1. New: the request has been submitted and has not yet been triaged.
2. Triaged: the request has been reviewed and prioritized.
3. Assigned: a technician or team has been assigned.
4. In progress: diagnosis or repair work is underway.
5. Waiting for requester: more information or action is required from the requester.
6. Waiting for parts or external service: work is blocked by a dependency.
7. Resolved: the technician has recorded a resolution.
8. Closed: the requester or authorized staff has completed closure.
9. Reopened: a closed or resolved request has returned because the issue persists.
10. Cancelled: the request was cancelled with a recorded reason.

Every status change must record the actor, timestamp, previous status, new status, and an optional or required reason according to the transition. Do not silently mutate status without an activity entry.

## Main Screens

### Dashboard

Show useful operational information, such as:

- Total open requests.
- New requests requiring triage.
- Requests assigned to the current user.
- Requests overdue or approaching their due date.
- Requests by status.
- Requests by priority.
- Recent activity.
- Workload by technician or team when authorized.
- Summary trends for reporting periods.

Do not use decorative metrics that are not backed by real data. Empty states must explain what is empty and provide an appropriate next action.

### Repair Request List

Provide:

- Search by request number, subject, requester, asset tag, and serial number.
- Filters for status, priority, category, department, location, technician, and date range where data exists.
- Sort options that make operational sense.
- Pagination or another scalable loading strategy for large data sets.
- Clear status, priority, assignee, asset tag, and updated-time indicators.
- A direct path to create a request.
- A clear empty state and error state.

### Create Repair Request

The form must:

- Clearly distinguish required and optional fields.
- Validate data before submission.
- Support asset search by asset tag and serial number.
- Allow a requester to submit a problem without knowing the internal technician.
- Preserve entered data when validation fails.
- Show a confirmation containing the created request number.
- Prevent accidental duplicate submissions where practical.
- Handle attachment validation and upload errors when attachments are supported.

### Repair Request Detail

Show:

- Request identity and current status.
- Problem description.
- Requester and organizational information.
- Location.
- Related asset, including `tags` and `Serial number`.
- Priority and category.
- Assignment.
- Important timestamps and due date.
- Diagnosis, work notes, parts, and resolution.
- Activity timeline.
- Attachments when supported.
- Role-appropriate actions.

Separate requester-visible communication from internal notes. Make the visibility of each field clear.

### Asset Register

Provide asset search, filtering, detail, and repair-history access for authorized users. Prevent accidental duplicate assets and make identifier conflicts visible.

### Reports

Support reports useful for service improvement, such as:

- Requests by time period.
- Requests by status.
- Requests by category and equipment type.
- Requests by department and location.
- Requests by technician or team.
- Average response time.
- Average resolution time.
- Overdue and reopened requests.
- Recurring problems.
- Repair history by asset tag or serial number.
- Parts or external-service usage when those fields exist.

Reports must state the time range, filters, and data scope used to produce the result. Export functionality may be included where appropriate, but exports must respect authorization.

## Navigation

Use clear navigation labels appropriate to the product. A default structure is:

- Dashboard
- Repair requests
- My requests
- Assigned to me
- Assets
- Reports
- Users and teams
- Settings

Highlight the current location and preserve navigation context when opening a detail page. The navigation must not make users guess where to create, track, assign, or report on work.

## Validation and Error Handling

- Validate required fields at the point of entry and at submission.
- Use specific, actionable error messages.
- Never report success when persistence or an external operation failed.
- Show loading, empty, success, and failure states for asynchronous operations.
- Keep the request number and entered information available after recoverable errors.
- Confirm destructive actions such as cancellation, deletion, reassignment, or closure where appropriate.
- Prefer archival or status-based deactivation over destructive deletion for records that affect audit history.
- Handle missing, partial, and legacy asset data without crashing.

## Auditability and History

The system must retain a usable history of operations, including:

- Creation.
- Assignment and reassignment.
- Priority changes.
- Status changes.
- Important field changes.
- Comments and work notes.
- Attachments added or removed according to retention policy.
- Resolution and closure.
- Reopening.

History entries should include who performed the action and when it happened. Keep internal information protected from unauthorized users.

## Accessibility and Responsive Behavior

- Use semantic structure and meaningful labels.
- Make all essential actions usable by keyboard.
- Maintain visible focus states.
- Provide sufficient color contrast.
- Do not communicate status using color alone.
- Ensure form errors are associated with their fields.
- Keep tables and dense data usable on small screens through responsive layout, horizontal scrolling, or an appropriate alternate presentation.
- Ensure the side navigation remains accessible on mobile.
- Avoid content overlap and controls that change size when labels or status text change.

## Data and Security Expectations

- Apply least-privilege access to requests, assets, users, reports, attachments, and internal notes.
- Store user credentials as salted hashes using a modern algorithm (bcrypt or argon2) — never store or log plaintext or reversibly-encrypted passwords. This applies from the first PostgreSQL migration onward; do not carry forward a plaintext credential store.
- Validate all input at trusted boundaries.
- Protect uploaded files and restrict access according to request permissions.
- Avoid exposing personal or internal information in unauthorized views or exports.
- Record audit events for privileged operations.
- Use stable identifiers for records.
- Handle concurrent updates without silently losing changes where the platform supports concurrency control.
- Do not include secrets, tokens, or credentials in source code, sample data, or logs.

## Technology Stack and Data Persistence (PostgreSQL)

PostgreSQL is the system of record for this application. All entities defined in this specification — users, roles, departments, locations, categories, priorities, statuses, repair requests, assets, assignments, activity history, and attachment metadata — must be persisted in PostgreSQL, not kept only in memory, in browser storage, or in a separate ad-hoc store.

- Use a schema-migration tool already present in the repository (e.g., Prisma Migrate, Knex, node-pg-migrate, or an equivalent already in use) to version every schema change. Do not hand-edit the production schema or ship a change without a migration file.
- Give every persisted record a stable identifier (UUID or database-generated serial) that does not change across edits, and use it — not a display label — as the relationship key between requests, assets, users, and history entries.
- Enforce relationships with real foreign keys (request → asset, request → requester, request → assigned technician, history entry → request) rather than relying only on application-level checks.
- Add indexes for every field this specification requires to be searchable or filterable: request number, asset tag, serial number, status, priority, department, location, category, technician/assignee, and created/updated timestamps.
- Wrap multi-step writes in a database transaction so related data can never diverge — for example, a status change and its corresponding activity-history entry must commit together or not at all (this is a concrete implementation of the "Do not silently mutate status without an activity entry" rule above).
- Store all timestamps in UTC and convert to local display time in the UI layer only.
- **Images and attachments**: store attachment/photo *metadata* (filename, content type, size, owner request or asset, uploaded-by, uploaded-at, storage reference) as rows in PostgreSQL. Store the binary file content itself in object/file storage (or a dedicated files volume) referenced by that metadata row, rather than embedding large binaries directly in application tables, unless the project's existing conventions already use a `bytea` column — if so, follow that existing convention instead of introducing a second pattern. Either way, attachment access must still go through the same authorization rules as the parent request or asset.
- Define read paths (dashboard aggregates, list/filter/search queries, request detail, asset detail, reports) and write paths (create request, update request/status/assignment, create/update asset, add history/notes, upload attachment) explicitly, and validate every write at the API/service layer even when the UI already validates — never trust client-side validation alone.
- Handle concurrent edits to the same request (e.g., two staff updating status at once) using the database's concurrency controls: add an explicit `version` (integer) or `updated_at`-based optimistic-locking column on mutable tables (requests, assets at minimum) and reject/report a write whose base version is stale, rather than silently overwriting, consistent with the Data and Security Expectations above.
- Do not commit database credentials, connection strings, or `.env` files containing secrets to source control.

## Operator Console and Startup Script (Warp-Terminal-Style)

The local startup script (the `.bat` file used to launch the development server, e.g. `run-4502.bat` / `start.bat`) must present an operator console styled like a modern terminal (Warp Terminal reference), instead of a bare `npm run dev` log dump. This console is a developer/operator tool, not an end-user screen, but should share the token system defined in Visual and Interaction Design Direction above.

> **SUPERSEDED 2026-09-14 — decision recorded:** the startup-`.bat` console approach is cancelled per requester order (`run-4502.bat` deleted). Standard local run is Docker (`docker-compose.yml` Postgres 17) + `npm run dev:4502`; prod runs on Vercel (`DEPLOY_VERCEL.md`). Do not reintroduce a `.bat` console without a new explicit requester decision.
>
> **SUPERSEDED 2026-09-15 — decision recorded:** the in-app `/terminal` page (ADMIN-only read-only view) is removed per requester order (`src/app/terminal/` deleted, nav entry removed from `AppShell.tsx`). Health/overview/tickets/logs remain available via their API routes and the `/admin` screens. Do not reintroduce a `/terminal` page without a new explicit requester decision.

The console must surface, at startup and/or on demand:

- **Status** — connectivity checks for the required services before or while the dev server boots: PostgreSQL connection, required environment variables present, pending/unapplied migrations, and the web server itself once it is listening. Each check shows an explicit ok / warning / down state — never leave a check ambiguous or silently skipped.
- **Overview** — a quick operational snapshot on boot (e.g., open/in-progress/closed request counts) sourced from a real query against PostgreSQL, not placeholder numbers, once the schema exists. Before the schema exists, mark these values clearly as fixtures.
- **DB data** — a small recent-records preview (e.g., latest repair requests) to confirm the database connection is actually returning real rows, not just that the socket connected.
- **Errors** — a tail of recent application/server errors and warnings, so a failed migration, a failed DB connection, or an unhandled exception is visible immediately in the same console instead of buried in a scrolling log.

Behavioral requirements:

- If the PostgreSQL connection or a required migration check fails, the console must fail loudly with a clearly marked error block and a non-zero exit path — never fall through to "server started" messaging when a dependency actually failed.
- Keep the `.bat` script's own responsibility narrow: verify environment, run/check migrations if configured to, then hand off to the existing `npm run dev:<port>` process; do not duplicate application logic inside the batch script.
- If an interactive HTML/CLI dashboard is used to render this console (as prototyped separately), keep it a local developer convenience — it must not become a second, undocumented source of truth for data that PostgreSQL already owns.

## Implementation Workflow

When using this skill to implement the system:

1. Inspect the existing repository structure, framework, package configuration, and design conventions.
2. Preserve existing user changes and avoid unrelated refactors.
3. Define the data model and authorization boundaries before building dependent screens.
4. Define the PostgreSQL schema and migrations for that data model (see Technology Stack and Data Persistence) before wiring screens to real data.
5. Implement the core request workflow first: create, list, detail, assign, update status, resolve, and close, backed by real PostgreSQL reads/writes.
6. Add asset tags and serial-number support as first-class searchable data, including attachment/image metadata storage.
7. Add history and audit behavior for every meaningful workflow mutation, written in the same transaction as the mutation it records.
8. Add dashboard and reports using real persisted data or clearly identified fixtures during development.
9. Update the startup script to run the Operator Console checks (status, overview, DB data, errors) against the real PostgreSQL connection.
10. Add responsive behavior, accessibility, loading states, empty states, and error states, following the Visual and Interaction Design Direction.
11. Run the narrowest relevant tests, type checks, lint checks, or build checks after each focused change.
12. Review the final workflow as each role: requester, technician, and administrator (covering supervisor/triage duties).

## Definition of Done

The system is not complete until:

- A requester can submit a repair request.
- The request receives a unique identifier.
- A requester can find and track the request.
- An authorized staff member can triage, assign, and update the request.
- Status transitions are visible and recorded in history.
- The request can include and display asset `tags` and `Serial number`.
- A technician can record diagnosis and resolution.
- The request can be resolved and closed according to the workflow.
- A request can be reopened when the problem persists, subject to permissions.
- Authorized users can review repair history and operational reports.
- Unauthorized users cannot access protected requests, internal notes, assets, or reports.
- Validation, loading, empty, success, and failure states are handled.
- The side navigation and core workflows work on desktop and mobile.
- All read and write operations for requests, assets, users, and history go through PostgreSQL with versioned migrations — no core entity is left in memory-only or placeholder storage.
- The startup script presents the Warp-Terminal-style Operator Console (status, overview, DB data, errors) and fails visibly, rather than proceeding silently, when the database connection or migrations are not healthy.
- The web application UI and the Operator Console share one consistent visual token system (color, type, ok/warning/error semantics).
- The relevant automated checks pass, or any existing unrelated failures are documented clearly.

## Known Gaps Between Current Implementation and This Spec (Close Before Claiming DoD)

An implementation review found the current application diverges from this specification. Do not mark Definition of Done met until every item below is closed.

### Resolved — decision recorded

1. **Roles** — RESOLVED: three roles (Requester, Technician, Administrator). Administrator absorbs Supervisor duties; see Roles and Permissions above. No separate Supervisor account type should be built.
2. **Status workflow** — RESOLVED: expand the current six-status app to the full ten-status workflow defined in Repair Status Workflow (adds Triaged, Waiting for requester, Waiting for parts/external service, and Reopened as distinct states).
   - Before cutting over the new status enum, enumerate the current six status values exactly as they exist in the running system (labels and any internal codes) and produce an explicit old → new mapping table as a migration artifact — this document does not have visibility into the current app's exact status codes, so the implementer must supply that mapping.
   - Every existing record must land on a valid new status after migration; none may be left null or on a retired value.
   - Pay particular attention to **Reopened**, since reopen support is required by Definition of Done and did not exist as a distinct state before.
   - Run the migration against a copy of production data first and diff row counts per status before/after to confirm no records were dropped or miscategorized.

3. **`/knowledge` page** — RESOLVED: the implementer added a static "คู่มือ/บทความ" (Knowledge) page not listed in the original Main Screens. The requester reviewed it and wants to **keep** it as a permanent part of Main Screens (accessible to all roles, static content, no API calls required). Treat it as in-scope going forward; do not remove it in a future cleanup pass.

### Required — implementation tasks, not open decisions

4. **Visual and Interaction Design Direction compliance** — the current implementation uses pervasive decorative motion (fade-in and staggered slide-up animation on nearly every page load, hover-lift on most cards/buttons) and a generic-SaaS visual pattern (uniform rounded `.glass-card` with soft shadow on every surface, gradient-text page headings, gradient buttons) that the Visual and Interaction Design Direction section above explicitly asks to avoid ("avoid decorative animation on every hover or on page load"; "do not default to generic SaaS defaults ... an unexplained gradient hero"). The requester confirmed on review: **rework required**, not a kept exception.
   - Remove or gate animation that does not communicate a state change (e.g. drop blanket page-load fade-in/stagger; keep motion only for things like a row updating after a save, a panel opening, or a status transition).
   - Reduce reliance on the identical glass-card-with-shadow treatment as the default for every surface; differentiate surfaces intentionally (e.g. not every block needs the same blur/shadow/gradient treatment) per the "Modern Technology, not generic SaaS" direction.
   - Keep the existing token approach (CSS variables in `globals.css`) as the base to edit — this is a token/styling pass, not a rebuild. Do not touch data layer, routes, or auth while doing this.
   - Add the missing pieces of the token system called for above and not yet present: a documented spacing scale, and explicit success/warning/danger color tokens (currently hardcoded ad hoc per screen instead of tokenized).

5. **Operator Console must live in the startup script, not only behind a web login** — the current `/terminal` route is an ADMIN-only authenticated web page inside the Next.js app; the Operator Console requirement above calls for a console that appears **at startup of the `.bat` script itself** (status/overview/DB data/errors), usable by whoever runs the script, independent of the web app's login. The requester confirmed on review: **rework required**.
   - The `.bat` script (`run-4502.bat`) itself must render the Warp-Terminal-style status/overview/DB data/errors console (or launch a local CLI process that does) before or while starting the dev server — this must work even if no one has logged into the web app.
   - Decide whether the existing `/terminal` web page is kept as an additional in-app convenience view for ADMIN (sharing the same token system, read-only, same data source) or retired now that the real console lives in the startup script — do not leave it as the *only* place the console appears.
   - Whichever data-fetching logic already exists for `/terminal` (health/overview/tickets/logs) may be reused/exposed for the script-based console rather than rewritten from scratch — this is a wiring change, not new business logic.
    - **SUPERSEDED 2026-09-14:** per requester order the script-based console is cancelled (see the supersede note under § Operator Console and Startup Script).
    - **SUPERSEDED 2026-09-15:** per requester order the `/terminal` web page itself is removed (`src/app/terminal/` deleted, nav entry removed); no `.bat` or `/terminal` console work remains. Health/overview/tickets/logs stay available via API routes and `/admin` screens.

6. **Internal notes visibility** — work notes and resolution content are currently visible to all roles; this spec requires requester-visible content to be separated from staff-only internal notes (see Repair Request Detail and Auditability and History). Add an `is_internal` flag (or equivalent) to notes/history entries and enforce it at the query layer, not just in the UI.
7. **Password storage** — see the hashing requirement under Data and Security Expectations above; migrate any existing plaintext credentials as part of the PostgreSQL migration, forcing a password reset rather than hashing unknown legacy values blindly if they cannot be confirmed as plaintext with confidence.
8. **Optimistic locking** — add the `version`/`updated_at` concurrency column described under Data and Security Expectations to every mutable table before enabling multi-user concurrent editing in production.

### Deferred — must resolve before Phase 2 cutover

9. **PostgreSQL hosting target** — not yet decided. Do not hard-code a host, port, or credential anywhere in application code or committed config. All connection details (host, port, database name, credentials, SSL mode) must be read from environment variables (e.g., a single `DATABASE_URL`) with no default that points at a real environment, so the eventual choice — local Docker, a managed provider, or an existing on-prem instance — is a configuration change, not a code change. Connection pooling limits, backup/retention policy, and secrets management still depend on this choice and must be revisited once it is made; record the final decision here once set.

## Scope (Locked Baseline)

> หมายเหตุ: section นี้เป็นการ**สรุปขอบเขตที่มีอยู่แล้ว**จากทุก section ด้านบนในไฟล์นี้ ไม่ใช่ requirement ใหม่ ไม่เพิ่ม/ลด Definition of Done หรืองานที่ต้องทำ ใช้เป็นจุดอ้างอิงเร็วๆ ว่าอะไรอยู่ใน/นอกขอบเขต เมื่อมีคนขอฟีเจอร์เพิ่มระหว่างทาง งานที่ต้องปิดก่อนเสร็จยังคงอ้างอิงตาม § Known Gaps Between Current Implementation and This Spec เท่านั้น

### In Scope

- **Roles:** Requester, Technician, Administrator (3 roles — Supervisor ถูกรวมเข้า Administrator แล้ว ตาม § Roles and Permissions)
- **ข้อมูลหลัก:** Repair Request (ทุกฟิลด์ตาม § Repair Request Data) และ Asset Register (ทุกฟิลด์ตาม § Asset Data)
- **Workflow:** 10 สถานะตาม § Repair Status Workflow พร้อม audit trail ทุกการเปลี่ยนสถานะ
- **หน้าจอ:** Dashboard, Repair Request List, Create Repair Request, Repair Request Detail, Asset Register, Reports, Knowledge/คู่มือ (เพิ่มและอนุมัติแล้ว — ดู § Known Gaps ข้อ 3), Side Navigation ตาม § Main Screens และ § Navigation
- **Data layer:** PostgreSQL เป็น system of record ทั้งหมด, migration tool, foreign key จริง, transaction, optimistic locking ตาม § Technology Stack and Data Persistence
- **Security:** bcrypt/argon2 hash, least-privilege, server-side authorization ตาม § Data and Security Expectations
- **Operator Console:** Warp-Terminal-style ใน startup script ตาม § Operator Console and Startup Script
- **Accessibility/Responsive:** ตาม § Accessibility and Responsive Behavior
- **Auditability/History:** ตาม § Auditability and History

### Out of Scope (จนกว่าจะมีการยืนยันเพิ่มจากผู้ร้องขอ)

- Supervisor role แยกต่างหาก — ปิดประเด็นนี้แล้ว (RESOLVED ตาม § Known Gaps ข้อ 1)
- การเชื่อมต่อระบบภายนอก เช่น Active Directory/SSO, ระบบแจ้งเตือนอัตโนมัติผ่าน LINE/Email/SMS — ไม่มีการระบุไว้ในสเปกนี้
- Native mobile application — มีเฉพาะ responsive web ตาม § Accessibility and Responsive Behavior
- การเลือก PostgreSQL hosting (local/cloud/on-prem) — ยังไม่ตัดสินใจ ตาม § Known Gaps ข้อ 6
- Multi-language (i18n) นอกเหนือจากภาษาที่แอปใช้งานอยู่ปัจจุบัน — ไม่มีการระบุไว้ในสเปกนี้
- SLA auto-escalation ตามเวลา (นอกเหนือจากการแสดง due date) — สเปกระบุแค่การแสดงผล ไม่ได้ระบุว่าต้อง escalate อัตโนมัติ

หากมีการร้องขอฟีเจอร์ที่อยู่ในหมวด Out of Scope ระหว่างทาง ให้หยุดและถามผู้ร้องขอก่อนเริ่มพัฒนา ไม่ตัดสินใจเพิ่มขอบเขตเอง

## Change Discipline

กติกานี้มีไว้เพื่อป้องกันปัญหาที่พบบ่อย: การแก้โค้ดที่ทำให้ไฟล์ดูเปลี่ยนไป (rewrite) แต่พฤติกรรมจริงของระบบไม่เปลี่ยน หรือการอ้างว่า "แก้แล้ว/เสร็จแล้ว" โดยไม่มีการพิสูจน์จริง

### Verify-before-claim

- ก่อนแก้บั๊กหรือปัญหาใดๆ ต้องระบุ repro steps ของปัญหาเดิมให้ชัดเจนก่อน (คลิกตรงไหน คาดว่าจะเห็นอะไร เห็นอะไรผิดจริง)
- หลังแก้ ต้องตรวจสอบซ้ำตาม repro steps เดิม แล้วรายงานผลจริงที่ตรวจสอบได้ ห้ามรายงานว่า "แก้แล้ว/น่าจะได้แล้ว" โดยไม่มีการตรวจสอบ
- ถ้าไม่สามารถตรวจสอบเองได้ (ต้องอาศัยการคลิก/ดูผลด้วยตาจริง) ให้ระบุตรงๆ ว่า "ยังไม่ได้ verify ต้องให้ผู้ใช้ตรวจสอบเอง" ห้ามพูดคลุมเครือว่าเสร็จแล้ว

### Minimal diff, no ghost rewrite

- แก้เฉพาะส่วน (บรรทัด/ฟังก์ชัน/component) ที่เกี่ยวข้องกับปัญหาหรือฟีเจอร์นั้นจริงๆ ห้ามเขียนไฟล์ใหม่ทั้งไฟล์ถ้าแก้จุดเดียวพอ
- ถ้าจำเป็นต้อง refactor ขนาดใหญ่ ให้แยกเป็นคนละรอบ/คนละงานจากการแก้บั๊กหรือเพิ่มฟีเจอร์ อย่ารวมกัน
- ทุกครั้งที่แก้ ต้องรายงานว่าไฟล์ใดเปลี่ยน เปลี่ยนตรงจุดไหน เปลี่ยนอะไร ไม่ใช่แค่ "อัปเดตไฟล์ X"

### Freeze list — ห้ามแตะโดยไม่ขอก่อน

- Database schema/โครงสร้างที่ migrate ไปแล้ว ห้ามแก้โดยไม่มี migration file ใหม่
- Design token/theme ที่ล็อกไว้แล้วตาม § Visual and Interaction Design Direction ห้ามเปลี่ยนสีพื้นฐาน/สเกลระยะห่าง/font โดยไม่มีการขอ
- Route structure และ URL pattern ที่ใช้งานจริงอยู่แล้ว ห้ามเปลี่ยนโดยไม่แจ้งก่อน

### Task log ทุกรอบ

- ก่อนเริ่มงาน: สรุปสั้นๆ ว่าจะแก้อะไร คาดว่าไฟล์ใดจะเปลี่ยน
- หลังจบงาน: สรุปว่าไฟล์ใดเปลี่ยนจริง ผลลัพธ์ที่ verify ได้คืออะไร
- บันทึกสรุปนี้ไว้ (เช่นใน `CHANGELOG.md` หรือท้ายไฟล์นี้) เพื่อให้ session ถัดไปอ่านต่อได้ทันทีโดยไม่ต้องถามซ้ำว่ารอบก่อนทำอะไรไปแล้วบ้าง

## Working Principles

- Keep the original seven objectives intact.
- Do not shorten or omit requirements when converting this specification into implementation tasks.
- Prefer the existing project conventions over introducing unnecessary dependencies.
- Make the smallest coherent change that satisfies the requested behavior.
- Keep user-facing language clear and consistent with the application's chosen language.
- Do not claim a feature is implemented unless it is connected to the actual workflow or clearly marked as a fixture.
- Ask for clarification only when an unresolved requirement would materially change data ownership, authorization, or the implementation path.