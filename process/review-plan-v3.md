# Plan review v3 – plan-v2.md

_2026-10-17. Independent review of [docs/plan-v2.md](../docs/plan-v2.md) (and the pointer file [docs/plan.md](../docs/plan.md)) against [docs/assumptions.md](../docs/assumptions.md) and the original brief. Earlier reviews (`review-plan.md`, `review-plan-v2.md`) were deliberately not read._

Context: 8–10h left, Frontend Software Engineer role, graded mostly on process and judgment.

| # | Severity | Finding | Area |
|---|---|---|---|
| C1 | Critical | The plan is over its own budget, the real overrun is larger, and the cut list can't close it | Feasibility, contradiction (D5) |
| C2 | Critical | The admin view, an explicit brief requirement, is built last, in the slice most likely to be squeezed | Build order, brief coverage |
| M1 | Major | Two of the three brief examples are weakly covered, and a cheap fix is left out | Brief coverage |
| M2 | Major | The email preview link can't work with the identity design, and it serves untrusted content | Hidden complexity |
| M3 | Major | Nothing connects the poller to the dispatcher, and every check uses the simulate path | Hidden complexity, validation |
| M4 | Major | Notification templates (A15, A25) have no task and no estimate | Contradiction, feasibility |
| M5 | Major | `npm test` and the Angular workspace setup hide more work than S0 allows | Hidden complexity |
| M6 | Major | Several checks can't fail, or have no pass bar | Validation |
| m1 | Minor | The dedupe key differs from A7, and the DoD dedupe check tests the wrong layer | Contradiction |
| m2 | Minor | The plan is written to "you" and defers decisions the developer owns | Evaluator's view |

---

## Critical

### C1 – The plan is over its own budget, the real overrun is larger, and the cut list can't close it

**Plan text:**
> "**9.55h → 0.55h over the 9h. Buffer left: 0.45h**"
> "The plan does **not** shrink tasks to hide this. [...] none is applied without your OK."

**Problem.** `assumptions.md` (D5, fixed-constraints line) says "planned to 9h, with 1h kept as buffer". The plan breaks that on day zero and then leaves it unresolved. The 9.55h is also the optimistic case. These are the estimates I expect to be wrong:

| Item | Plan | Realistic | Why |
|---|---|---|---|
| S0 total | 1.25h | 1.75–2h | `ng new` inside a workspace, Material, proxy, a shared runtime import under `ng serve` **and** `ng build`, two test runners wired into a root gate, a temp-clone check. The validation list alone is 20–30 min. |
| S1 BE | 0.75h | 1.5h | Seven items: SQLite schema + seed, middleware, registry + `GET /channels`, Nodemailer + stored preview + preview route, Slack webhook, connections CRUD + test endpoint, timeouts. Two channel adapters alone are about 0.5h. |
| S2 | 0.85h | 1.25h | An RSS/XML parser dependency, `pubDate`/GUID handling, the baseline rule, poll-now, and fixture tests for two adapters. |
| S3 BE | 1.0h | 1.25–1.5h | Templates are missing (M4). The poller → dispatcher wiring is missing (M3). |
| S4 BE | 0.15h | 0.4h | The admin delivery log needs joins across delivery, event, alert, user and connection, plus two PATCH routes. |
| Doc per slice | 0.1h | 0.2–0.3h | Process is what gets graded. Each slice includes `testing.md` cases before and after, prompt exports, review-log rows and screenshots. 6 min isn't enough for that. |

A realistic total is about **11–12h**. The cut order saves roughly 0.4–0.6h in total: an axe run, one component test, a toggle, and a form turned into buttons. That covers the plan's *known* 0.55h overrun and nothing else.

**Why it matters.** Without a decision, the overrun gets absorbed by whatever is built last. That is S4, which includes the admin view (see C2). An evaluator will see a plan that admits it doesn't fit and still doesn't choose.

**Fix.**
- Make the cuts now, as the product owner (A8–A9 triage already makes you the owner).
- Bring the plan to ≤ 9h *with realistic numbers*, using cuts that save real time. Candidates:
  - **One `DeliveriesTable` component** for both the user's history (`/me/deliveries`) and the admin delivery log (`/admin/deliveries`), with a scope input. This saves ~0.4h, and it's a good frontend design signal.
  - **Connections: create + delete + test only**, with no edit (to change one, delete and re-add it). This saves ~0.25h, and the cascade case from A13 already exists.
  - **Simulate event as preset buttons from the start**, not a form. This saves ~0.2h, and A18's behaviour is unchanged.
  - **Drop the admin channel toggle now** and record the A9 revision. It is cut 3 today; just make the decision.
- Add **two time checkpoints** with a pre-decided action. For example: "If S1 isn't committed by hour 4, the generated form uses the same components but skips server-error mapping". "If S3 isn't committed by hour 6.5, S4 goes to the minimum admin view (see C2)".

### C2 – The admin view, an explicit brief requirement, is built last, in the slice most likely to be squeezed

**Plan text:**
> "| S4 | History + admin view + a11y pass | [...] | 9.05 |"
> "Never cut: the pipeline, the generated form (A12), simulate event (A18), the admin delivery log + source health, S5."

**Problem.** "We need an admin view" is one of only four explicit requirements in the brief. In the plan, the admin view starts at hour 7.05 on the plan's own numbers, or about hour 8.5–9 on realistic ones (C1). Calling something "never cut" doesn't protect it when it's scheduled last. The overrun will land on it anyway. S3 also already needs an admin surface: its validation simulates through "curl or `.http`", and the simulate endpoint is admin-only.

**Why it matters.** If time runs out, the most likely outcome is a working pipeline and a thin admin page, which is a missing brief requirement. An evaluator will ask why the riskiest *product* gap was left to the end.

**Fix.** Move a **minimal admin slice into S3**: the `adminGuard` route, the delivery log table (the shared component from C1), and a "Simulate event" button. It becomes the S3 validation surface instead of curl, so the extra cost is close to zero. S4 then adds history (reusing the table), source health + toggles, and the a11y pass, all of which can shrink safely.

---

## Major

### M1 – Two of the three brief examples are weakly covered, and a cheap fix is left out

**Plan text:**
> "Source interface, USGS + BBC | A2"
> "### Stretch (order not decided yet; review v2 M3 suggests CoinGecko first)"

**Problem.** The brief names breaking news, market movements and natural disasters. The MVP covers news, covers disasters only as earthquakes, and leaves markets out. A2 records this trade-off honestly. But the plan doesn't use the cheapest way to make "natural disasters" true. **GDACS RSS** (`gdacs.org/xml/rss.xml`) covers earthquakes, tropical cyclones, floods, volcanoes, droughts and wildfires, with a native Green/Orange/Red alert level. That maps 1:1 to `low/medium/high`, so you don't need the magnitude-band decision. It is RSS, so it reuses the parser you're building for BBC anyway. I estimate ~0.3h. I'm fairly confident about the feed and the alert-level field, but check them in S2 before you commit to this.

The stretch order is also "not decided yet". So the one example the MVP drops has no committed path back.

**Why it matters.** An evaluator reading the brief side by side will notice that "natural disasters" became "earthquakes" and that markets are deferred without a decision. Both are judgment signals.

**Fix.** Either replace USGS with GDACS, or add GDACS as the third adapter, and log the choice. If time is the constraint, replacing is cheaper, because severity then comes from the source and you skip the band debate. Decide the stretch order now: CoinGecko first, or an explicit "markets are not coming back in this take-home" line in the README's known limits.

### M2 – The email preview link can't work with the identity design, and it serves untrusted content

**Plan text:**
> "Email: Nodemailer [...] otherwise **log-only**, with the rendered message stored and served at a preview link (A10)."
> "`X-User-Id` middleware → `req.user` (unknown → 401)"

**Problem.**
1. A preview link opened in a new tab is a plain browser GET, so it can't send `X-User-Id`. If the route sits behind the middleware, it returns 401. If you exempt it and key it by a sequential delivery ID, any user can enumerate other users' emails, which undermines the "`/me/...` only" stance in A8.
2. The preview page renders RSS titles and summaries, which are third-party content, as HTML from your own origin. Without escaping in the template, that's stored XSS on the app's origin.
3. A related point: the Slack connection stores a user-supplied URL that the server then POSTs to. Validation in the plan is only "channel `validate()` + required fields", and nothing restricts the host.

**Why it matters.** The email preview link is DoD step 3 and the main way a reviewer sees email working. It will fail the first time someone clicks it, at a point in the plan (S1) that is already over budget.

**Fix.**
- Preview route outside the identity middleware, keyed by a random UUID token stored on the delivery. Or render the preview in an Angular dialog through `HttpClient` (the header is sent, and it's a better frontend demo), with no new tab.
- Use an escaping template (or a small `escapeHtml` helper) and add one unit test with a `<script>` title.
- Slack `validate()`: require `https://hooks.slack.com/`.
- Add an S1 validation case: "open the preview link in a new tab → it renders, and the HTML in a test title is escaped".

### M3 – Nothing connects the poller to the dispatcher, and every check uses the simulate path

**Plan text:**
> S2: "unique on `sourceId + sourceEventId` (A7)" · S3: "Dispatcher: new events → active alerts on enabled sources → [...]"
> S3 validation: "simulate a matching event (curl or `.http`) → a `Delivery` row for each connection"

**Problem.** S2 stores events. S3 builds a dispatcher that takes "new events". No task says who calls the dispatcher after a poll, or how "new" is defined (the rows just inserted? `dispatchedAt IS NULL`?). Every check in S3 and S4, and DoD step 5, goes through `simulate-event`. If simulate calls the dispatcher directly, the poller → dispatch path, which is the actual product, is never checked. A broken wiring would ship unnoticed. The baseline rule (F4) also applies only on the poll path, so simulate never exercises it either.

A smaller related point: "15s in dev" doesn't say what "dev" means. A reviewer runs `npm start`. Does that use 3 min or 15s? A25 also asks you to respect source rate limits.

**Why it matters.** "Users get notified when something happens in the world" is the core of the brief. The demo path and the real path diverging is a classic take-home failure, and an evaluator can spot it by reading the code.

**Fix.**
- Add a single `ingest(sourceId, events[])` function: insert-or-ignore, return only the rows actually inserted, apply the baseline rule, then dispatch. Make the poller **and** simulate-event both call it. Simulate becomes "a fixture source's events go through `ingest`".
- Add an S3 check that uses the real path: point the USGS adapter at a local fixture URL (env override) with one new item → "poll now" → a delivery row exists.
- Make the interval explicit: `POLL_INTERVAL_MS` comes only from env, defaults to 3 min, and the README documents "poll now".

### M4 – Notification templates (A15, A25) have no task and no estimate

**Plan text:**
> "| Template content, source attribution | A15, A25 |"

That row in "Assumptions used" is the only mention.

**Problem.** A15 says the default is "event title, short summary, source name, link, timestamp, and which alert matched. One simple template per channel (HTML email, Slack blocks/text)". A25 says "Attribute sources in notifications". No slice has a task for this, and no slice has time for it. The S1 "Send test" message is a different template again.

**Why it matters.** The email preview and the Slack message are the most visible outputs of the product. A reviewer will open them. Plain `JSON.stringify` output, or a missing source attribution, would be noticed straight away. This is also hidden time (~0.3–0.5h) on top of C1.

**Fix.** Add a task to S3 BE: `renderEmail(event, alert)` and `renderSlack(event, alert)` as pure functions in each channel adapter, with an estimate and one snapshot unit test each. The test also covers the "channel logic" tests that the out-of-scope line in `assumptions.md` promises (M6).

### M5 – `npm test` and the Angular workspace setup hide more work than S0 allows

**Plan text:**
> "Root `npm test` runs the API and web test runners and fails if either fails."
> "Angular CLI app + Angular Material + dev proxy to `/api`." (FE 0.25h)

**Problem.** The plan never names the test runners. Known traps:
- `ng test` runs in **watch mode** by default, so a root `npm test` can hang instead of exiting.
- If the generated Angular project uses Karma, it needs a local Chrome. DoD step 8 ("Run `npm test` and see it pass") then depends on the reviewer's browser. Newer Angular versions default to Vitest. I'm not certain which runner the version you'll install defaults to, so check it.
- `ng new` inside the repo creates its own git repo and lockfile unless you pass `--skip-git --skip-install`.
- Angular's esbuild builder often refuses to compile raw `.ts` files from a symlinked workspace package. R1 covers this with the `paths` fallback, which is good. Budget for actually needing it.
- I'm unsure whether `npm test --workspaces` stops at the first failing workspace or runs both. Your "failing dummy test in each workspace" check will show it either way.

**Why it matters.** S0 blocks everything. A 30-minute surprise here takes time straight out of S4 (C1, C2).

**Fix.**
- In S0, decide and log: the Angular version; the web runner (prefer a jsdom-based one with no browser needed); `ng test --watch=false` in the workspace script; the API runner (`node:test` via `tsx`, or Vitest).
- Add a validation case: "root `npm test` exits by itself in under 60s with no browser installed".

### M6 – Several checks can't fail, or have no pass bar

**Plan text and problem:**
- S2: "two cycles → events grow, with no duplicates". The live feeds may have no new items within 15s, so "grow" isn't reliable. "No duplicates" is guaranteed by the unique constraint you just added, so the check can't fail. *Fix:* the second poll of the **same fixture** logs `inserted: 0`. The live check becomes "the first poll inserts > 0 and `lastPollAt` updates".
- S1: Slack shows "`sent` or `dry-run`". Accepting dry-run means real Slack delivery, an explicit brief requirement, may never be proven once. *Fix:* send one real message to a free Slack workspace webhook, with a screenshot in `testing.md`. That takes about 10 min.
- S4: "one axe/Lighthouse run [...] with the score recorded" and "a check at mobile width" have no pass bar. *Fix:* "0 serious/critical axe violations on the alert form" and "no horizontal scroll at 375px on the alerts list and the alert form".
- The "add a channel" evidence is frontend-only ("a fake third channel descriptor"). A12 says adding a channel = "one new adapter class + registering it". Nothing proves that on the backend. If `packages/shared` defines `type: 'email' | 'slack'`, adding a channel actually touches three places. *Fix:* register a fake channel in a dispatcher unit test, and keep the channel type a `string` key from the registry.
- The channel adapters have no unit tests, although the out-of-scope line in `assumptions.md` promises "unit tests for matching/channel logic". *Fix:* covered by the template tests in M4, plus one test for "Slack non-2xx → `failed` with the error".

**Why it matters.** Evaluators grade process. A check that can't fail reads as box-ticking.

---

## Minor

### m1 – The dedupe key differs from A7, and the DoD dedupe check tests the wrong layer

**Plan text:**
> "skip if (alert, event, connection) has already been delivered (A7, D3)"
> DoD 5: "Simulating it again with the same `sourceEventId` sends nothing."

**Problem.** A7 says "Dedupe by (alert, source event ID)". The plan adds `connection`. That is probably the right choice, because it allows per-connection status. But it's an unrecorded change to the source of truth. Also, if simulate-event goes through the unique `sourceId + sourceEventId` insert (M3), a repeat is dropped at the **event** layer, so the dispatcher never runs. DoD 5 then proves event uniqueness, not delivery dedupe. It's also unclear whether a `failed` delivery counts as "already delivered". With no retry it doesn't matter today, but it will once the retry stretch goal lands.

**Fix.** Record the (alert, event, connection) key as an A7 revision. Test delivery dedupe directly in the dispatcher unit test by calling `dispatch` twice with the same event. Write down that `failed` counts as delivered until retry exists.

### m2 – The plan is written to "you" and defers decisions the developer owns

**Plan text:**
> "When you approved D5, my rough estimate was 9h."
> "none is applied without your OK"
> "| Target in the instructions | 8h, with 2h as buffer |"

**Problem.** This repository *is* the deliverable. The plan reads as an assistant reporting to the developer, which blurs who made the judgment calls, and the evaluators are grading exactly that. "Without your OK" also turns into self-deferral, because the developer *is* the product owner (Triage section). "The instructions" refers to something that isn't in the repo.

**Fix.** Keep the AI-voiced draft in `process/` (as you did for v1). Rewrite `plan-v2.md` in the first person, with the decisions taken. Replace "the instructions" with a link to the prompt file in `process/prompts/`.
