# Slice review – S1 (identity + channel connections + Send test)

_2026-10-17. Review of branch `development-s1` against `origin/main` (`04d60c1a`): commits `30064bf8` "Create reviewer agent" and `ea22deb8` "feat: mock identity, channel registry and connections with generated form". The review is against [docs/plan-v2.md](../docs/plan-v2.md) §S1 and the Definition of Done, plus [decisions.md](../docs/decisions.md) (DS1–DS12, S0-x, S1-1–S1-5), [testing.md](../docs/testing.md) S1-1–S1-13, [assumptions.md](../docs/assumptions.md), [design.md](../docs/design.md), [CLAUDE.md](../CLAUDE.md), [review-log.md](review-log.md) and [review-s0.md](review-s0.md). The untracked `.claude/launch.json` was ignored._

Gates re-run by the reviewer on Node 24.22.0 / npm 11.19.1:
- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0.
- `npm test`: exit 0 (api 6 files / 28 tests; web 1 file / 3 tests).

Experiments, all undone (`git status` shows only the ignored `.claude/launch.json`):
- A template typo in `connections-page.html` passed all three gates. `ngc` caught it (see M3).
- A throw-away spec that renders `ConnectionsPage` with `/api/channels` → 500 crashed with `ResourceValueError` (see M2).

| # | Severity | Finding | Area |
|---|---|---|---|
| M1 | Major | testing.md is corrupted: every S1 result is jammed into line 1 in place of the `# Testing` heading, and the S1 rows are still empty | Process evidence / testing |
| M2 | Major | The Connections page crashes when `GET /channels` fails: `channels.value()` throws in the error state, and nothing handles it | Frontend rules (error states) |
| M3 | Major | S0 review M1 is still open: no gate compiles the S1 templates. Proven with a typo that passes typecheck, lint and test | Quality gate |
| M4 | Major | S0 review M4/M5/m1 are still open after S1: no actual times, no review-log rows, and a broken `ng lint` script | Process evidence / budget |
| m1 | Minor | Nothing shows the S1 test cases came before the code (S0 review m4 repeated) | Testing rules |
| m2 | Minor | The Slack text isn't escaped, so a connection label (and later event titles) can inject mentions and links | Channel adapter |
| m3 | Minor | "Send test" ignores the admin channel switch, while create and edit respect it | API consistency |
| m4 | Minor | testing.md S1-6 and S1-9 describe checks that the tests don't run | Testing |
| m5 | Minor | `CurrentUserService` (CLAUDE.md, plan-v2) is implemented as `CurrentUser`, and the docs weren't updated | Doc consistency |

---

## Major

### M1 – testing.md is corrupted, and the S1 results are not in the table

**Text:**
> docs/testing.md:1 (committed in `ea22deb8`): `| Browser: add connection by keyboard only (… ) | Partial || Browser: Bob → empty state … | Pass || … No SMTP configured, so log-only. | Pass |# Testing`
> docs/testing.md:22–34: `| S1-1 | Email connection + Send test (A10, A18) | … | Result \`sent\`, … | | |` (and the same for S1-2 … S1-13: the Actual and Status columns are empty)

**Problem.** The diff replaces the `# Testing` heading with a single line of 27 `|`-separated cells. It holds the 13 S1 results in reverse order (S1-13 first, S1-1 last), and the heading text is pushed to the end of that line. The table rows S1-1 … S1-13 have no result and no status. On GitHub the file now starts with a run of broken text and has no title. The S1 table reads as "not run".

**Why it matters.** plan-v2 "Deliverables" lists `testing.md` as "cases written at the start of each slice, results filled in at the end". This file is the slice's evidence, and evaluators grade process. A reader can't tell which result belongs to which case without reverse-engineering the line. Two results that matter are hidden there: S1-13 "Partial" (Edit and Delete by keyboard were not run) and S1-2 "real send not run". The S0 rows were filled in correctly, so this was a broken edit, not a format choice.

**Fix.** Restore line 1 to `# Testing`. Move each result into the Actual and Status columns of its own row (the order is S1-13 → S1-1 as written). Keep "Partial" for S1-13 and "Pass (dry run); real send not run" for S1-2. Do this as a separate `docs:` commit and ask first, per CLAUDE.md.

### M2 – The Connections page crashes when `GET /channels` fails

**Text:**
> apps/web/src/app/connections/connections-page/connections-page.ts:39–43: `protected readonly channels = rxResource({ params: () => this.currentUser.userId(), stream: () => this.api.channels(), defaultValue: [] });`
> connections-page.html:11, :43: `[disabled]="channels.value().length === 0"`; :52 `[channels]="channels.value()"`; connections-page.ts:55 `channels: this.channels.value()`
> node_modules/@angular/core/types/_api-chunk.d.ts:161: "The current value of the `Resource`, or throws an error if the resource is in an error state."

**Problem.** `defaultValue` does not protect `value()` in the error state. In Angular 22.2.3, `value()` throws `ResourceValueError` once the stream has errored. The template reads `channels.value()` in three places and never checks `channels.status()` or `channels.error()`. I checked this with a throw-away spec: `/api/users` OK, `/api/channels` → 500, `/api/me/connections` → one row. Rendering fails with `Error: Resource is currently in an error state … Http failure response for /api/channels: 500`. The `@switch` only follows `connections.status()`, so the "API stopped" check in testing.md S1-12 passed only because both requests failed and the error branch never reads `channels`.

**Why it matters.** CLAUDE.md "Frontend rules": "Every data view handles loading, empty, and error states." The channel list is half of this view, and it's the A12 data source the generated form depends on. One failed request (a DB error or a transient 5xx) leaves the user with a broken page instead of a retry. S3's alert form will load connections and sources the same way, so the pattern will be copied.

**Fix.** Options:
- (a) **Recommended:** treat the page as failed if either resource fails. Switch on a `computed` status that combines both resources: error if either errors, loading if either loads. Read `channels.value()` only inside the ready branch, and make "Try again" reload both. This is a small change and keeps one error UI.
- (b) Guard each read with `channels.hasValue() ? channels.value() : []`, and show a separate inline "Could not load channel types" message with a retry next to the Add button. Finer-grained, but adds a second error UI.

Either way, add a testing.md row under S1-12 for "channels fail, connections OK".

### M3 – S0 review M1 is still open: no gate compiles the S1 templates

**Text:**
> apps/web/package.json:10: `"typecheck": "tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.spec.json --noEmit"`
> review-s0.md M1: "Change the web script to `ngc -p tsconfig.app.json --noEmit && …`"
> CLAUDE.md "Component tests only where plan-v2 lists them (generated form, alert form)."

**Problem.** S1 adds 6 components, but only `GeneratedChannelForm` has a spec. I changed `[testStates]="testStates()"` to `testStatez()` in `connections-page.html`. Results: `npm run typecheck -w @alerts/web` exit 0, `npm test -w @alerts/web` exit 0, `npm run lint` exit 0. `npx ngc -p tsconfig.app.json --noEmit` exit 1 with `TS2551: Property 'testStatez' does not exist on type 'ConnectionsPage'`. The S0 review gave the fix, and it wasn't applied or rejected anywhere.

**Why it matters.** CLAUDE.md "Quality gates" says to run typecheck after every change and report the result. In this slice "typecheck: pass" was reported for templates that no gate compiles: the shell, switcher, list, dialog, page and send-test button. S3 and S4 add more components without specs. A template error will first show up in the S5 fresh-clone run (DoD 1), which is the worst time to find it.

**Fix.** Apply S0 review M1: replace the first `tsc` in the web `typecheck` script with `ngc -p tsconfig.app.json --noEmit`. Update the note in testing.md S0-6. If you decide not to, log that in decisions.md with the reason.

### M4 – S0 review M4/M5/m1 are still open after S1

**Text:**
> docs/plan-v2.md:75–76: `| S0 | … | 1.25 | | 1.25 |` / `| S1 | … | 2.6 | | 3.85 |` (Actual empty for both)
> process/review-log.md: the last row is `| 2026-10-17 | Phase 2 – re-plan | docs/plan-v2.md | Checked | … |`
> apps/web/package.json:11: `"lint": "ng lint"`
> design.md §7: "Budget: … leaves ~0.15h."

**Problem.**
- Two slices are done, and neither has an Actual time.
- review-log.md has no row for the design phase, plan review v3, S0, the S0 review, or S1. S1 was the biggest AI output so far: about 2,400 changed lines, with the decisions S1-1 to S1-5.
- The `ng lint` script that review-s0 m1 flagged still fails.
- No S1 prompt export exists in `process/prompts/` yet. The S0 export came in a later commit, so this one may still be coming.
- None of the S0 findings is marked as addressed or rejected anywhere.

**Why it matters.** The buffer was ~0.15h before S0 started (design.md §7). S1 took on extra work beyond its estimate: the full schema (S1-1), a previews table (S1-2), `.env` loading and nodemailer. Without actual times nobody can tell whether cut order step 1 or 2 is already due before S2 (plan-v2 "Risks and cut order", R5). The review log is the main evidence that AI output was checked rather than accepted, and it stops before any code exists.

**Fix.**
- Fill in the S0 and S1 Actual times, recompute the cumulative column, and record any cut that now applies.
- Add review-log rows for: design, design review, plan review v3, S0, review-s0 (which findings were taken), S1, and this review.
- Delete the web `lint` script, or point it at the root ESLint config.
- Export the S1 prompt following the existing numbering.

---

## Minor

### m1 – Nothing shows the S1 test cases came before the code

**Text:** CLAUDE.md "Testing": "Write the test cases first (in testing.md and as tests), then the implementation." plan-v2 §S1: "Validation (write these cases in `testing.md` first)". review-s0.md m4 Fix: "commit the slice's testing.md cases on their own first".

**Problem.** The S1-1 to S1-13 cases, all the tests and all the implementation arrived in the single commit `ea22deb8`. The S0 review's suggestion wasn't followed, and there's no record that it was declined.

**Why it matters.** S2 and S3 bring the pure logic that CLAUDE.md explicitly wants written test-first (normalisers, matcher, dedupe). The git history is the only evidence an evaluator can check.

**Fix.** For S2, commit the testing.md cases and the fixture tests (failing) before the adapters. Ask before adding that commit. If you won't do this, record in review-log.md why S0 m4 was declined.

### m2 – The Slack text isn't escaped

**Text:**
> apps/api/src/channels/slack.channel.ts:16–21: `const lines = [\`*${n.title}*\`, n.summary]; … lines.push(\`_Source: ${n.sourceLabel} · ${n.occurredAt}_\`);`
> apps/api/src/channels/send-test.ts:11: ``summary: `If you can read this, your "${connection.label}" connection works.` ``

**Problem.** The email renderer escapes every value (`escapeHtml`, and there's a test for it). The Slack renderer passes user and feed text straight into mrkdwn, where `<`, `>` and `&` are control characters. A connection label like `<!channel>` is already reachable in S1 through "Send test", and it would ping the whole channel. From S3 on, BBC titles and summaries go through the same function. `renderSlackText` has no test.

**Why it matters.** A15/A25 expect a clean notification template. Unescaped `<…>` either breaks the message or turns into mentions and links that the user never wrote, and it reaches a real Slack channel.

**Fix.** Escape `&`, `<` and `>` in `title`, `summary`, `alertName` and `sourceLabel` before building the lines. The `<url|Read more>` link stays as it is. Add one unit test next to the email escaping test.

### m3 – "Send test" ignores the admin channel switch

**Text:**
> apps/api/src/routes/connections.routes.ts:38–39: `const findEnabledChannel = (type) => enabledChannelTypes(db).has(type) ? channels.get(type) : undefined;` (used by POST and PUT)
> connections.routes.ts:85: `const channel = channels.get(connection.type);` (used by `/test`)
> plan-v2 DoD 6: "Disabling a source or a channel takes effect."

**Problem.** The same router uses two rules for one question. Create and edit refuse a disabled channel type. Edit refuses it with the misleading `type: 'Choose an available channel.'`, so the user can't even rename an existing connection. "Send test" still sends a real Slack or SMTP message for a type the admin disabled.

**Why it matters.** The toggle arrives in S4, and the S4 validation only checks the simulated-match path. This mismatch will ship unless S1 decides it now.

**Fix.** Options:
- (a) **Recommended:** `/test` uses `findEnabledChannel` and returns `{ status: 'failed', error: 'Channel disabled by admin' }`. PUT checks only that the type is registered, so existing connections stay editable.
- (b) Keep the current code, but write down in decisions.md that "Send test" bypasses the admin toggle, and give the reason.

### m4 – testing.md S1-6 and S1-9 describe checks that the tests don't run

**Text:**
> testing.md:27 S1-6: "Automated: as B, GET/PUT/DELETE/test on A's connection | 404 every time"
> testing.md:30 S1-9: "the required one blocks submit until filled"
> generated-channel-form.spec.ts:42 `expect(form.invalid).toBe(true);`

**Problem.**
- There is no `GET /me/connections/:id` route. The test (connections.routes.test.ts:86–88) covers PUT, DELETE and test only, so the GET part of the case can't pass as written.
- S1-9 promises "blocks submit". The spec checks the model's validity. It never renders `ConnectionFormDialog` or calls `submit()`. The result text in line 1 concedes this: "the dialog's Save checks validity, so this is what blocks submit".

**Why it matters.** DoD 9 rests on this test ("backed by the fake-channel component test"). If the case text claims more than the test checks, that's the first thing an evaluator who compares testing.md with the specs will find.

**Fix.** Reword S1-6 to "PUT/DELETE/test", or add a list check that Bob's `GET /me/connections` doesn't contain Alice's connection. Reword S1-9's expected result to "the form is invalid until the required field is filled; the dialog's Save checks this". Adding a dialog spec isn't an option: plan-v2 allows only two component tests.

### m5 – `CurrentUserService` is implemented as `CurrentUser`

**Text:** CLAUDE.md:84 "`CurrentUserService` is the only place identity lives."; plan-v2.md:124 "`CurrentUserService` (signals) as the only place identity lives."; apps/web/src/app/core/current-user.ts:29 `export class CurrentUser {`

**Problem.** The class follows the Angular 22 suffix-free naming (`@Service()`). The two source-of-truth docs still name `CurrentUserService`, and decisions.md S0-3 doesn't record the naming convention.

**Why it matters.** It's small, but CLAUDE.md says "Never work around a decision silently". Anyone who searches the code for the documented name finds nothing.

**Fix.** Add one line to decisions.md S0-3 ("class names follow Angular 22 style without a `Service` suffix, e.g. `CurrentUser`"), and update CLAUDE.md:84 and plan-v2.md:124/331. The other option is to rename the class.

---

## Questions for the author

- Email in log-only mode is recorded as `status: 'sent'`, and Slack without a URL as `dry-run` (email.channel.ts:77). Is it intended that the admin log (A9) shows "sent" for an email that never left the machine? plan-v2 S1 validation says `sent`, but `DeliveryStatus` already has `dry-run`.
- `withTimeout` aborts the signal, but the email `send` ignores it (email.channel.ts:69). With SMTP, can nodemailer still deliver after the 10s timeout has marked the row `failed`? I haven't verified nodemailer's behaviour.
- `process.loadEnvFile` (server.ts:12): what is its stability level on Node 24.22 and on 22.22.3, the two lines `engines` allows? CLAUDE.md's "no experimental APIs" rule is written for Angular, so does it also apply to Node APIs?
- Was the Slack real-webhook path (S1-2 "real send not run") ever exercised, or will it stay unverified until S5?
