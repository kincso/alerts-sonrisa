# Project rules

## Context
Take-home for a Frontend Software Engineer role: a world-event alerting app
(users set alert rules; notifications go to email or Slack; admin view).
Evaluation focuses on process and judgment. Code must be readable and defensible.

## Source of truth
- docs/assumptions.md: product decisions (A1–A25, answers D1–D5).
- docs/plan-v2.md: slices S0–S5, scope, Stretch, Definition of Done.
  (docs/plan.md is only a pointer to it.)
- docs/decisions.md: technical decisions (stack, versions, conventions,
  severity bands). docs/testing.md: test cases, written before each slice.
- If a request conflicts with these, STOP and point out the conflict. Never
  work around a decision silently.
- Never implement anything listed as Stretch or Out of scope unless I ask.
- Known open items: F1–F5 in plan-v2.md "Still open", and A13 (what happens
  to alerts when a connection is deleted). When you hit one, STOP and ask;
  don't pick a default.

## Stack
- npm workspaces: apps/web (Angular; version recorded in decisions.md in S0),
  apps/api (Express + TypeScript, run with tsx), packages/shared (types plus
  small runtime constants such as `SEVERITIES`; no logic)
- Node ≥ 22.13, pinned via .nvmrc and `engines`
- SQLite via `node:sqlite` (built-in, no native modules); schema in
  apps/api/src/db/schema.sql
- Angular Material + SCSS
- Tests: runners for api and web are decided and logged in decisions.md in S0.
  The web runner must not need a real browser.
- Lint/format: ESLint (typescript-eslint, angular-eslint) + Prettier, set up
  in S0 (decided 2026-10-17; not yet in plan-v2.md, log it in decisions.md).
- Commands: `npm install`, `npm start`, `npm test` (root gate; fails if either
  workspace fails), `npm run lint`, `npm run typecheck`

## Architecture rules
- All events are normalized into the shared `Event` type before matching.
  Source-specific logic lives only in that source's adapter.
- Every source implements `Source`; every channel implements
  `NotificationChannel` and is registered in the channel registry. The
  matcher, poller and dispatcher must not know specific sources or channels.
- News items get fixed severity "medium" (set in the news adapter's
  normalise step only).
- Users have saved connections (`ChannelConnection`: type + label + config).
  An alert references one or more connections.
- Events are deduplicated by (sourceId, sourceEventId) with a UNIQUE
  constraint. Deliveries are deduplicated by (alert, event, connection):
  never send twice. No cooldown and no retry (both are Stretch).
- Mock auth: the current user is resolved ONLY in the auth middleware
  (X-User-Id header; unknown → 401) and read from req.user. User endpoints
  live under /me/...; never trust a userId from body or URL.
- Admin access is enforced ONLY by requireAdmin middleware on the server.
  The web `adminGuard` only hides the route; it is never the security check.
- Request/response types are plain TypeScript types in packages/shared; no
  duplicate types. No schema library (Zod etc.): the API validates required
  fields, and channel config is validated only by that channel's
  `validate()` (plan-v2 cut; decided again 2026-10-17).

## Modern Angular (stable APIs only)
- Check the installed version in apps/web/package.json; don't use patterns
  from older versions.
- Standalone components only (no NgModules), ChangeDetectionStrategy.OnPush
  everywhere.
- Signal APIs: input(), output(), model(), computed(), signal(). No
  @Input/@Output decorators, no manual subscribe() where a signal or the
  async pipe works.
- Built-in control flow: @if, @for (with track), @switch. No *ngIf/*ngFor.
- inject() instead of constructor injection.
- Functional guards, resolvers and interceptors.
- Lazy-loaded routes with loadComponent; @defer for heavy, non-critical UI.
- Typed reactive forms with FormBuilder.nonNullable. The generated connection
  form (from GET /channels) is a typed `FormGroup` of string controls, not `any`.
- Do NOT use experimental or developer-preview APIs (this includes test
  tooling). If you think one would help, suggest it and explain the risk;
  don't use it unprompted.

## Frontend rules
- Separate display components (inputs/outputs only, no services) from page
  components (load data, handle state).
- Semantic HTML: real <form>, <label>, <button>, <table>, <nav>. Every form
  control has a label. Everything must work with the keyboard.
- Every data view handles loading, empty, and error states.
- Responsive down to 375px width.
- `CurrentUserService` is the only place identity lives. One HTTP
  interceptor attaches X-User-Id and maps 401/403/5xx errors.

## Code rules
- Strict TypeScript. No `any`, no `@ts-ignore`, no non-null `!` without a comment.
- No disabled lint rules without a comment explaining why.
- No secrets in code; use .env (gitignored) + .env.example.
- Handle errors explicitly; a failing source or channel must not crash the poller.
- Keep functions small.

## Testing
- Pure logic (rule matcher, normalizers, dedupe check) is written as pure
  functions with unit tests. Write the test cases first (in testing.md and
  as tests), then the implementation.
- Tests check behaviour, not implementation details. Don't mock the unit
  being tested.
- Component tests only where plan-v2 lists them (generated form, alert form).

## Quality gates (run them yourself)
- After every change, run typecheck, lint and tests for the affected app,
  and report the results. Fix failures before saying you're done.
- If the same thing fails twice, stop and explain the problem instead of
  trying random fixes.

## Working efficiently
- Use the Angular CLI (ng generate) for scaffolding instead of hand-writing
  boilerplate. Set `skipTests` in the angular.json schematics so it doesn't
  create spec files nobody maintains.
- Smallest change that meets the current slice; no refactoring of unrelated code.
- No new dependency without a one-line reason; prefer what's already installed.

## How to work with me
- Work on ONE slice (S0–S5) at a time, only the one I name.
- Before coding: list the files you'll create or change, the testing.md cases
  for the slice, and any decision the docs don't cover. Wait for my OK.
- After coding: list changed files, the gate results, how to verify it works,
  and anything you're unsure about (API fields, library options, versions).
  Don't guess; say so.
- When a question or open decision comes up, propose 2–3 options (with
  trade-offs and your recommendation), then STOP. Don't continue until I
  answer. After I answer, record the decision in the matching doc
  (assumptions.md for product, decisions.md for technical, plan-v2.md
  "Still open" for F1–F5) before continuing. This counts as asked under
  the docs rule below; show the edit in your report.
- Never claim something works unless you ran it. Say "not run" otherwise.
- Don't edit docs/ or process/ unless I ask. The Doc tasks of the current
  slice count as asked, but propose the edits first.
- Never commit or push without asking me first. Use the commit message
  given for the slice in plan-v2.md.

## Reviewing documentation
When I ask you to review a doc, always follow these rules:
- Write the review to its own file in process/, following the existing
  naming (e.g. process/review-plan-v3.md). Don't edit any other file.
- Rank findings by severity: Critical / Major / Minor.
- For each finding: the problem, why it matters, and a concrete fix. Quote
  the doc text, with its section number.
- Max 10 findings. No praise section, no rewritten design.
- If you're unsure whether something is a problem (e.g. a feed's format or a
  library's behaviour), ask me instead of guessing.
