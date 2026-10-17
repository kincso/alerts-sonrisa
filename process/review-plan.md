# Plan review (before implementation)

_2026-10-17. Reviewer: Claude Code acting as a critical senior engineer. Inputs: `docs/assumptions.md` (source of truth), the plan, and the original brief. Budget assumed: 10h left._

**What was reviewed:** `docs/plan.md` only contains the "Smarter news severity" stretch goal. The full plan is still in `process/plan-v1-ai-draft.md`, so that file is what this review covers.

**Bias warning:** the same AI that wrote the plan is reviewing it. Treat a missing finding as "not checked", not as "fine".

Findings are ranked by severity: 2 Critical, 6 Major, 2 Minor.

---

## Critical

### C1 – The Phase 3 end-to-end check depends on endpoints that are only built in Phase 4
**Problem.** The Phase 3 validation says:
> "Manual end-to-end with curl / a `.http` file: create an email + a Slack connection, create an alert, simulate an event"

But the routes you'd need are only planned in Phase 4:
> "`/me/connections` CRUD + `/test`, `/me/alerts` CRUD"

The only Phase 3 endpoints are `simulate-event` and `connections/:id/test`.

**Why it matters.** The plan's main claim on build order is "pipeline end-to-end before UI". As written, that milestone can't be checked when it is reached. You would either commit Phase 3 without checking it, or quietly pull Phase 4 forward. An evaluator reading the commit history would see the gap.

**Fix.** Pick one:
- Move the `POST` routes for connections and alerts into Phase 3, and shrink Phase 4 to list/update/delete plus admin routes.
- Or add a dev seed that creates one connection of each type and one alert per seeded user, and validate Phase 3 against that seed.

The seed is cheaper, and it also helps with the reviewer demo.

### C2 – The frontend is the least-funded and most underestimated part of a frontend-role take-home
**Problem.** Here is how the ~9h splits:
- API and tooling: Phases 0–4, about 5.25h.
- Angular: Phases 5–6, about 3h.

Phase 5 has 2.25h, minus ~10 min of process work, for all of this:
- the app shell and user switcher
- `CurrentUserService` and the interceptor
- a Connections screen with a dialog and a form built from `GET /channels`, plus "Send test"
- an Alerts list and form (chips, selects, multi-select, toggle)
- the notification history screen
- an accessibility pass
- two component tests

Phase 4 has 0.5h, so about 20 minutes of coding:
> "every endpoint the UI needs, with validation"

That covers about 20 routes plus a `.http` file with 400/401/403/404 cases. Phase 7 has 0.75h for the README, design, decisions, testing results, actual times, screenshots and a fresh-clone run.

**Why it matters.** The estimates that are most likely to be wrong all sit in the second half of the plan, where the buffer has already been used up. In practice the cut list will hit the Angular work, which is the work this role is graded on. (I'm not sure how much evaluators weigh UI polish against process here. But "the frontend engineer spent most of the time on Express" invites the question.)

**Fix.** Re-budget before starting:
- Phase 4: 0.75–1h.
- Phase 5: about 3h, split into 5a (shell, switcher, connections and generated form) and 5b (alerts, history), each with its own commit.
- Phase 7: 1h.

Pay for this from the backend:
- Ship log-only email first and add Ethereal later (cut-list item 4 becomes the default, Ethereal becomes the upgrade).
- Drop the retry from the first version.

Write the new split into the plan, so the trade-off is a recorded decision rather than something that happens by overrun.

---

## Major

### M1 – The plan depends on decisions the source of truth doesn't contain yet
**Problem.** The plan's own section 7 (F7) says:
> "D1/D2 aren't recorded yet … I haven't edited `assumptions.md`"

So in `assumptions.md` right now:
- A19 is still **Open** and still says "JSON file, or SQLite".
- A1 still says "Still open: severity for news".
- F4 (the first-poll baseline) and F5 (any-of keywords) are additions that exist only in the plan.
- F1–F3 point out that A3, A14 and A21 contradict the plan's design.

**Why it matters.** You told me `assumptions.md` is the source of truth. Right now, a reviewer comparing the two files would find the plan contradicting it in five places, and the plan isn't in `docs/plan.md` either. This is exactly the "decisions vs. validation" trail that gets graded.

**Fix.** Before Phase 0, do one docs commit that:
- sets A19 to Confirmed (`node:sqlite`) and adds the news-severity note to A1;
- marks A3 as "Deferred (see A2)";
- updates A14's wording ("min severity", not "threshold");
- records the decision that there is no region filter (A21);
- decides F4 and F5;
- promotes the reviewed plan into `docs/plan.md`;
- adds rows to `review-log.md` for the plan and for this review.

### M2 – Brief coverage: "market movements" is missing, and the stretch order puts polish ahead of it
**Problem.** The brief names three examples. The MVP covers one of them fully (news) and part of another ("natural disasters" means earthquakes only). Markets are missing. That is the accepted A2 trade-off, so it is **not** a contradiction. But the plan then ranks the stretch goals like this:
> "1. **Smarter news severity** … 2. **CoinGecko market source**"

**Why it matters.** If there is spare time, the plan spends it on polishing a feature that already works, not on the requirement from the brief that is missing. An evaluator could read that as weak prioritisation. It's also a little odd that the brief's markets example is cut while a generated channel form (YAGNI with only two channels, as A12's own counter-argument says) stays in.

**Fix.**
- Put CoinGecko first in the stretch order. Its interface risk is already flagged in A2.
- In the README, add a short "Brief coverage" table listing each brief item as covered, partly covered or not covered, with the reason.

I'm not sure the evaluators will penalise the missing markets at all, because the decision is well documented. The table makes it visible either way.

### M3 – "Add more channels later" is claimed, not shown
**Problem.** The extensibility requirement from the brief is only checked by DoD item 9:
> "Read in the README how to add a new channel (one adapter file + register it)"

That is documentation, not evidence. With only two hand-picked channels, a reviewer can't tell whether a third one really needs just one file.

**Why it matters.** This is the brief's only explicit architectural requirement, and A12 spent ~1.5–2h on it. If it isn't shown working, the time was spent without anything to point to.

**Fix.** Add a test that:
1. registers a fake channel with one `text` field;
2. checks that `GET /channels` returns it;
3. checks that the generated Angular form renders the field and requires it.

About 20–30 min. Alternatively, move the generic webhook channel (stretch item 4) into the MVP and say in the commit that it was added to prove the extension point.

### M4 – Dedupe, cooldown and simulate-event fight each other, and nobody has specified how
**Problem.**
- The dispatcher step "per-alert cooldown" doesn't say what happens to an event that matches during the cooldown. As written it is just dropped, and nothing records that.
- DoD item 5 says: "simulate an event … Simulating the same event again sends nothing new." What makes two simulated events "the same" isn't defined; that depends on how `sourceEventId` is assigned.
- A reviewer who simulates two **different** events within the cooldown also gets nothing the second time. That looks like a bug.
- USGS re-publishes the same event ID when it revises the magnitude. "Unique on `sourceId + sourceEventId`" ignores the revision. A quake revised from 5.8 to 6.2 never becomes `high`.

**Why it matters.** Dedupe and cooldown are where "looks small" becomes the demo failing in front of the reviewer, and "nothing happened" is the hardest failure to explain.

**Fix.**
- Decide and log these in `decisions.md`:
  - (a) Events that match during the cooldown get a `Delivery` row with status `suppressed`, so they show up in the history and the admin log.
  - (b) `simulate-event` creates a new `sourceEventId` by default and accepts one optionally, so the dedupe case can be tested on purpose.
  - (c) The cooldown is set by an env var and is short or zero in dev.
  - (d) USGS revisions are ignored in the MVP, listed as a known limit.
- Add a unit test for each of these.

### M5 – Phase 0 doesn't prove the hard part of the monorepo
**Problem.** The Phase 0 check is:
> "`packages/shared`: one exported type, imported by both apps" / "Change the shared type → both apps' type checks pick up the change."

Types are erased at compile time, so this passes even if the shared package can't be loaded at runtime. The first runtime import, such as a `SEVERITY_ORDER` array the matcher and the alert form both need, may only fail in Phase 3 or 5. Whether it fails depends on how `packages/shared` is exposed:
- TS source vs. a built output;
- `exports`/`main` in its `package.json`;
- how the Angular application builder handles a symlinked workspace package that contains `.ts` files.

I'm not certain the Angular builder rejects TS source from a workspace package; I'd expect friction, not a guaranteed failure. This is exactly why Phase 0 should test it.

**Why it matters.** The plan's R1 names this as the riskiest setup, but the check doesn't exercise the risky path.

**Fix.**
- Phase 0 exports a runtime constant from `shared`, imports it in an API route and in an Angular component, and checks the value appears in the browser and in the API response.
- Run the check with `ng build` and with `ng serve`.
- Record which shape worked (source vs. built) in `decisions.md`.

### M6 – Several validation steps can't be run as written
**Problem.**
- Phase 2: "Run the API for two poll cycles". At the proposed "3 min" interval, that is a 6-minute wait for every check.
- Phase 6: "disable BBC → its `lastPollAt` stops changing". This also needs a wait of several minutes, and passing means "nothing happened".
- Phase 5: "Manual run of the matching `testing.md` cases". No phase writes those test cases, and `testing.md` currently has an empty table.
- Phase 0: "In a **fresh clone**". This needs a push first. Pushes need your approval, which the plan doesn't schedule.
- Phase 3: "if you have a test Slack workspace". This makes the only real Slack check optional, so Slack might never be tested outside dry-run.

**Why it matters.** A check that is slow, empty or optional ends up skipped, and then the evaluator sees "validated" in the log with nothing behind it.

**Fix.**
- Add `POLL_INTERVAL_MS` (e.g. 15s in dev) and an admin "poll now" endpoint.
- Write each phase's `testing.md` cases at the start of that phase (expected results first), then fill in the results.
- Use a local `git clone <path>` for the Phase 0 fresh-clone check, so no push is needed.
- Decide now whether you'll create a free Slack workspace for one real webhook test. If not, say in `testing.md` that Slack was only checked in dry-run.

### M7 – The plan has no UI states, which is the first thing a frontend reviewer checks
**Problem.** Phases 5–6 list screens and fields, but not one task covers:
- loading, empty and error states;
- showing server-side `validate` errors (a 400 from the channel's `validate`) on the generated form;
- what the active toggle shows while its request is in flight or after it fails;
- what "Send test" shows while it's waiting;
- what the user switcher does to cached data when the user changes. Stale data from the previous user is a classic bug here.

**Why it matters.** For a frontend role, these states, more than the number of features, are where judgment shows. Their absence from the plan is also why the Phase 5 estimate looks feasible.

**Fix.**
- Add one shared pattern for loading/empty/error (one small component or one convention) as a Phase 5a task.
- Map server field errors onto the generated form.
- On user switch, reload or reset per-user state.
- Add a `testing.md` case for each.
- Budget this inside the larger Phase 5 from C2; don't add it on top.

---

## Minor

### m1 – Delivery and polling details that usually cost an unplanned hour
**Problem.** These one-liners hide several failure modes:
> "Ethereal test account … if Ethereal can't be reached → log-only" and "send, retry once on failure"

- There is no send timeout. Blocked SMTP ports (common on corporate or guest networks) can hang the dispatcher for a minute or more per attempt, and the retry doubles that. "Can't be reached" isn't detected until the timeout.
- The poller uses a fixed interval, but nothing stops two polls from overlapping when a fetch is slow.
- `tsx` watch mode restarts the API on every save. Each restart triggers an immediate poll and, depending on how F4 is implemented, another baseline.
- `GET /me/connections` will return the Slack webhook URL, which is a secret, to the browser. That is acceptable for a local mock, but it should be a known limit.
- A25's default says "cache responses". The plan has no task for that, and nobody has decided whether it is needed.

**Fix.**
- Set explicit timeouts on Nodemailer and on the webhook `fetch` (e.g. 10s).
- Use a "skip if a poll is already running" flag.
- Decide whether the F4 baseline is "first poll ever (empty events table)" rather than "first poll after startup".
- Mask the webhook URL in API responses.
- Mark A25's caching as not needed (the 3-minute polling is the rate-limit respect) in `assumptions.md`.

### m2 – `node:sqlite` stability claims need checking, not assuming
**Problem.** D2 rests on:
> "`node:sqlite` (built into Node, no native build step) … Node ≥ 22.13 (where `node:sqlite` works without a flag)"

I'm fairly confident it runs without a flag from 22.13. I'm **not** certain which Node line stops printing the `ExperimentalWarning`, or how complete the `@types/node` typings are for the version you pin. The plan treats those as settled.

**Why it matters.** It's a small risk to function, but a reviewer seeing an "ExperimentalWarning" on startup may question the choice if the README doesn't address it.

**Fix.**
- In Phase 0, run the pinned version, write down whether the warning appears, and record the result in `decisions.md`.
- If the warning appears, say so in the README with one sentence on why `node:sqlite` was still chosen (no native build, per A19's reasoning).
