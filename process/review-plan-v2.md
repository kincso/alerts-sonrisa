# Plan review – v2

_Critical review of [plan-v1-ai-draft.md](plan-v1-ai-draft.md) against [docs/assumptions.md](../docs/assumptions.md) and the original brief. 2026-10-17, budget: 10h, Frontend Software Engineer role, process and judgment are graded._

Note on inputs: [docs/plan.md](../docs/plan.md) has only a "Stretch goals" stub, so this review covers the draft, which is the only real plan. The existing `process/review-plan.md` was not read, so this review is independent of it.

Severity: **Critical** = fix before writing code · **Major** = fix before the affected phase starts · **Minor** = fix while building.

---

## Critical

### C1. There is no agreed plan yet, and the source of truth disagrees with it

**Problem.** `docs/plan.md` is a stub. The draft still has seven open flags (F1–F7) and two decisions that are recorded only in the draft: "D1/D2 … They are not in `assumptions.md` yet". Examples of the disagreement:
- **Budget:** three different numbers. assumptions.md says "~10–12 developer hours left", the draft says "this plan follows the newer 8–10h figure", and you now say 10h.
- **A19** is still Open in assumptions.md ("JSON file, or SQLite if it needs no native build step"). The plan treats it as closed by D2.
- **A3** (CoinGecko default), **A14** ("keywords and/or threshold") and **A21** (region filter) still describe things the plan has decided not to build (F1–F3).
- The draft is written in the AI's voice to you: "I stop and ask you instead of switching to plain folders on my own", "your newer 8–10h". In this project you are the product owner, so nobody else is there to ask.

**Why it matters.** The project's own rule is that assumptions.md is the source of truth. If an evaluator compares it with the plan, they will see that the plan was built on decisions the source of truth doesn't contain. That reads as "the AI made the plan and the developer didn't take ownership", and process is what's being graded.

**Fix (~20–30 min, before Phase 0):** answer F1–F7 in one pass. Set A3 to Deferred, A14 and A19 to Rejected/Confirmed with what changed, and add the D1 note to A1. Write D1, D2, F4 and F5 into `decisions.md`. Use one budget number (10h). Rewrite R1 as a decision made now ("if Phase 0 goes over 1.5h → switch to tsconfig paths, and log it"). Then promote the result to `docs/plan.md` and add a `review-log.md` row for the draft and this review.

### C2. A frontend take-home that spends its first ~5h without any UI

**Problem.** Phases 0–4 (1.0 + 0.75 + 1.25 + 1.75 + 0.5 = **5.25h**) are backend only. All of the user and admin frontend has to fit into "Phase 5 – Angular user app · 2.25h" and "Phase 6 – Admin view · 0.75h". Phase 5 alone holds the shell, the switcher, the interceptor, the generated channel form with a dialog and a test button, alerts CRUD with chips and a multi-select, history, an a11y pass and component tests. Things that show frontend judgment are missing entirely: loading, empty and error states, what the UI does on 401/403/network errors, the state approach (signals or services), typed reactive forms, and the Angular version and conventions (standalone or zoneless? I'm not sure what the current CLI default is, so check and decide).

**Why it matters.** For an FE role, the frontend is the evidence. When anything overruns (see M1), the time comes out of the phases at the end, and those are exactly the frontend phases. The likely result is a solid Express backend with a hurried Angular UI, which is the opposite of what this role should show.

**Fix:** set a fixed frontend budget of at least 4h and take the time from the backend (M1 lists what to cut). Add one line to Phase 5 tasks: "every list/form has loading, empty and error states; the interceptor maps 401/403/5xx to a snackbar or a redirect". Name the Angular version and the state approach in `decisions.md` during Phase 0.

---

## Major

### M1. The estimates are optimistic in the backend phases, and the 1h buffer won't cover it

**Problem.** The places where estimates are most likely wrong:
- **Phase 3 · 1.75h:** matcher + registry + 2 channels + Ethereal → log-only fallback chain + 2 templates + a dispatcher with dedupe, cooldown and retry + 2 endpoints + unit tests for all of it. Realistically 2.5–3h.
- **Phase 4 · 0.5h:** about 20 routes with input validation, plus "The `.http` file covers every route, including 400 … 401, 403 and 404 cases". Realistically 1–1.5h.
- **Phase 0 · 1.0h:** apart from workspaces + Angular, it also needs a root `npm test` that runs two different test runners (Angular's runner and whatever the API uses). That wiring is a common hidden time cost.
- **Process overhead:** "~10 min for that phase's process work" × 8 phases. Exporting prompts plus review-log rows usually take longer than 10 min once the review log is filled in honestly.

A realistic total is about 11.5–12.5h against 10h.

**Why it matters.** R5 already names the result: docs get squeezed at the end. Here the end is also the frontend (C2).

**Fix:** make the cuts now instead of keeping them as a "what to cut first" list for later. Drop the **cooldown** (it also contradicts A6, see M4), drop the **retry** (A16 allows zero), go straight to **log-only + Ethereal** without a third SMTP tier unless SMTP is free to add, and drop the **channel enable toggle** (keep the source toggle). Re-estimate Phase 3 at 2.25h and Phase 4 at 1h, and record the cuts in `decisions.md` as planned scope decisions. Planned cuts look like judgment. The same cuts made late look like an overrun.

### M2. Build order: Phase 3 can't be checked until Phase 4 exists, and the main frontend risk is proven last

**Problem.**
1. Phase 3's validation says "create an email + a Slack connection, create an alert, simulate an event". The connection and alert CRUD endpoints are only built in Phase 4 ("`/me/connections` CRUD … `/me/alerts` CRUD"). So the "end-to-end" check in Phase 3 can't be done as written, or it quietly depends on seed data or direct DB writes.
2. R3 (the generated form takes longer than planned) is listed as a top risk and the generated form is "Never cut", yet it is first built in Phase 5, around hour 5.5. That breaks the plan's own rule, "riskiest first", for the riskiest frontend piece.

**Why it matters.** (1) is a hidden dependency that will either break Phase 3's check or pull Phase 4 work forward without anyone deciding to. (2) means the risk that hits the graded part of the work is found when there's no time left to react.

**Fix:** build vertical slices, not layers. Reorder to: scaffold → identity + connections (API + `GET /channels` + **the Angular generated form**) → alerts (API + UI) → sources/poller → matcher/dispatcher + simulate → history + admin. Each slice's endpoints are built with the slice, so Phase 4 goes away as a separate phase. This also gives you something to show in the browser by about hour 2.5.

### M3. Brief coverage: markets are missing, and "natural disasters" means earthquakes only

**Problem.** The brief names three examples: "breaking news, market movements, natural disasters". The plan covers news, covers disasters only partly ("USGS covers earthquakes only, not all natural disasters", which A2 itself accepts), and puts markets in stretch item #2. Floods, cyclones, volcanoes and wildfires aren't covered.

**Why it matters.** One of the three examples is gone and another is narrowed. A reviewer reading the brief side by side with the demo will notice. Leaving markets out is defensible, but the plan doesn't give the reviewer anything to see the reason (no README note, nothing visible in the UI).

**Fix (pick one, and log it):**
- **Cheap disaster coverage:** add or swap in **GDACS RSS**. It covers several hazard types, has a native alert level (green/orange/red → low/medium/high, so no band edges to invent), and reuses the RSS parser already planned for BBC. I'd estimate ~30–45 min, but I haven't checked GDACS's current feed format or uptime, so check that first.
- **Markets:** either keep them deferred and add a "Why no markets" section to the README (no reliable free keyless source; the stream → event mapping changes the `Source` interface), or add a tiny CoinGecko adapter that emits one event per (coin, day, severity band) crossing. I can't confirm that CoinGecko's keyless endpoint is still free and unthrottled enough. Check it before committing any time.

### M4. Dedupe, cooldown, retry and simulate are underspecified, and they conflict with each other

**Problem.**
- **The cooldown contradicts A6.** A6 says "one notification per matching event per alert". A per-alert cooldown silently drops matching events. Do dropped matches get a Delivery row (`suppressed`)? If not, neither the admin log nor the user history can show why an alert "didn't fire".
- **The dedupe key isn't consistent.** The plan says to "skip if (alert, sourceEventId) was already delivered", but `Delivery` stores `eventId` and `connectionId`, not `sourceEventId`. It also isn't stated whether a `failed` delivery counts as "already delivered". If it does, a failed send can never be resent. If it doesn't, every poll could retry it.
- **Simulate vs dedupe.** DoD #5 says "Simulating the same event again sends nothing new". That only works if `simulate-event` accepts a caller-supplied `sourceEventId`. If it generates a new ID each time, the check fails. If the ID is fixed, the demo can only run once per DB.
- **Holes in the baseline (F4).** "First poll" is not defined: per server start, per source, or first ever? A source that is **disabled at startup and enabled later**, or that comes back after a long outage, will treat the whole feed as new and send a flood. That is exactly what F4 is meant to stop.
- USGS re-issues the same event ID with a revised magnitude. With "unique on `sourceId + sourceEventId`" the update is ignored, so a quake upgraded from 5.8 to 6.2 never becomes `high`. That may be fine, but it should be decided on purpose.

**Why it matters.** These are the rules that make alerting trustworthy. Undefined rules in this area turn into untestable unit tests and a confusing live demo.

**Fix:** write a short state table in `design.md` before Phase 3: dedupe key = `(alertId, eventId, connectionId)`; `failed` → retried once, then final; cooldown → removed (M1), or kept and writes `suppressed` rows; `simulate-event` takes an optional `sourceEventId`; baseline = "per source, items with `occurredAt` < the time the source was enabled are stored but not matched". Use event time, not "first poll", so restarts and toggles behave the same way. Write down the USGS-update decision too.

### M5. Phase 0's hidden complexity is named but not decided

**Problem.** R1 names the risk, but Phase 0 doesn't say **how** `packages/shared` will be consumed. `tsx` runs TS source directly. As far as I know, Angular's builder doesn't compile raw `.ts` from `node_modules` without a tsconfig `paths` mapping or a build step for the package. I'm not fully sure how the current Angular CLI handles workspace-linked TS packages, so treat this as something to verify, not a certain blocker. On top of that, D2 adds `node:sqlite`, which may still print an ExperimentalWarning and needs `@types/node` for Node 22+ typings (the plan already flags this in R2).

**Why it matters.** This is the one phase where an overrun "blocks everything". The validation step "Change the shared type → both apps' type checks pick up the change" is the right check, but the plan has no ready answer if it fails.

**Fix:** decide up front: `packages/shared` contains `.ts` only, and both apps reference it through tsconfig `paths` (the package entry in workspaces is optional). That is also the R1 fallback, so the fallback costs nothing. Also add "`npm test` at the root runs both runners and fails if either fails" to the Phase 0 validation.

---

## Minor

### m1. Some validations depend on things that don't exist yet, or on waiting

**Problem.**
- Phase 5: "Manual run of the matching `testing.md` cases". But `testing.md` has an empty table, and no phase includes writing the cases.
- Phase 2: "Run the API for two poll cycles", and Phase 6: "disable BBC → its `lastPollAt` stops changing". With a 3-min interval, that's 6+ minutes of waiting per check.
- A23 "basic WCAG AA" is checked only by "Keyboard-only pass … quick check at mobile width". There is no tool-based check.
- DoD #6 ("live USGS and BBC data") depends on the reviewer's network and on the sources being up.

**Fix:** write each phase's `testing.md` cases at the **start** of that phase (they become the acceptance criteria). Use `POLL_INTERVAL_MS=15000` in dev. Run one axe or Lighthouse a11y check on the alerts form and record the score. Rephrase DoD #6 as "source health shows either recent polls or a visible error".

### m2. Two UX traps in the alert form

**Problem.**
- "Note in the form: news items are always `medium` (D1)". A user can still choose BBC + `high`, and that alert will **never fire**, with no error. A note is a weak guard for a frontend role.
- "any keyword found in title + summary (case-insensitive)". Plain substring matching means `war` matches "award" and "Warsaw", and `oil` matches "turmoil".

**Fix:** let each source expose the severities it can produce (`GET /sources` → `severities: ['medium']`), and limit the select to those values. That's a small, nice frontend detail and keeps the matcher generic. Use word-boundary matching (`\b` + escaped keyword) and add one unit test for it.

### m3. Channel config is treated as plain data, but Slack webhook URLs are secrets and outbound targets

**Problem.** "admin routes … `GET /admin/alerts`" and the delivery log will expose `ChannelConnection.config` unless something prevents it, so every user's Slack webhook URL becomes visible to the admin (and to the client, which doesn't need it after saving). The Slack channel also "POST[s] to the Incoming Webhook URL" typed in by the user. Without validation, the server will POST to any URL, including `localhost` services.

**Why it matters.** It's small, but a reviewer who spots it will question the judgment behind the channel abstraction, and that abstraction is the brief's explicit requirement.

**Fix:** add a `secret: true` flag to the channel field descriptor (A12 already has `key, label, type, required`), mask those fields in every API response, and have `validate()` require `https://hooks.slack.com/`. It's about 15 min and also improves the generated form (password-style input).
