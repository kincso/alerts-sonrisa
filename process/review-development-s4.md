# Slice review – S4 (history + admin view + a11y pass) and the F6 fix

_2026-10-18. Review of branch `development-s4` against `origin/main` (fetched; `origin/main..HEAD` = `main..HEAD`). Five commits: `8c427b04` "test: S4 cases", `f914e51f` "feat(web): notification history and admin view", `ef07b7c1` "test: F6 BBC guid cases", `27b04137` "fix(api): BBC sourceEventId without the #n suffix (F6)", `ed8c51ff` "docs: S4 and F6 updates" (63 files, +2198/−53). The review is against [docs/plan-v2.md](../docs/plan-v2.md) §S4, Scope/Stretch, Definition of Done and "Still open" (F6), [decisions.md](../docs/decisions.md) (DS9 revised, S2-4, S4-1–S4-5), [testing.md](../docs/testing.md) S2-3, S2-12, S4-1–S4-15, [assumptions.md](../docs/assumptions.md) (A7, A8, A9, A16, A17, A22, A23, D7), [design.md](../docs/design.md), [CLAUDE.md](../CLAUDE.md), [review-log.md](review-log.md), [review-development-s3.md](review-development-s3.md) and [prompts/development-s4.md](prompts/development-s4.md) (untracked, see m5). The untracked `.claude/launch.json` was ignored._

Gates re-run by the reviewer on Node 24.22.0 / npm 11.19.1:
- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0.
- `npm test`: exit 0 (api 14 files / 103 tests; web 2 files / 7 tests).

Experiments: a mutation run for m3 (make `setSourceEnabled` reset `enabled_at` on every `enabled: true`, run the S4-5 test) was attempted and **not run**: the permission system denied it. m3 is based on reading the code. No repo file was changed by the reviewer. During the review `process/review-log.md` (modified) and `process/prompts/development-s4.md` (untracked) appeared in the working tree. The reviewer did not make those changes.

Test-first check: `8c427b04` holds the S4-1–S4-14 rows with Actual/Status empty, the shared admin types, six route stubs that throw `not implemented` and the route tests (prompt export l.59: "8 failed (all new S4 tests, 500 from the stubs)"). `ef07b7c1` holds S4-15 empty plus the BBC tests (l.162: "3 expected failures"). The S3 review C1 rule was followed for both. No finding.

| # | Severity | Finding | Area |
|---|---|---|---|
| M1 | Major | The admin delivery log is loaded once and kept, so the DoD 5 walkthrough (simulate → see it in the admin log) shows stale data until Refresh | DoD / frontend states |
| M2 | Major | S4-10 and S4-12 are marked Pass although parts of their Expected were not observed (loading, admin empty states, contrast) | Testing / process honesty |
| m1 | Minor | decisions.md S4-1 describes an axe method that was not used. `axe-core` stays as an unused dev dependency, and nothing in the repo can re-run the check | Doc consistency / dependencies |
| m2 | Minor | `/history` shows "Pick a user in "Acting as"" while the user list loads or fails: the `idle` state is used for two cases it doesn't fit | Frontend states |
| m3 | Minor | The S4-5 test can't catch a regression of decisions.md S4-3 when both PATCHes land in the same millisecond | Testing |
| m4 | Minor | `DeliveryRow` in the web repeats `AdminDeliveryView` with a looser shape, and `showUser` isn't tied to the data | Shared types |
| m5 | Minor | Process evidence lags: the S4 prompt export and its review-log update aren't committed, and S2/S3 review minors are still "not decided yet" | Process evidence |

---

## Major

### M1 – The admin delivery log goes stale during the DoD 5 walkthrough

**Text:**
> plan-v2.md DoD 5: "As admin, simulate a matching event → see it in the user's history and the admin delivery log."
> plan-v2.md §S4 Validation: "simulate an event → it appears in the admin log and in the user's history."
> decisions.md S4-5: "the history and the admin delivery log have no paging (A22 scale), load when opened and have a Refresh button; … the admin tabs are a Material tab group whose content loads on first open."
> apps/web/src/app/admin/admin-page/admin-page.html:6: `<mat-tab-group … [preserveContent]="true">`, with "Delivery log" as the first (default) tab.
> apps/web/src/app/admin/admin-deliveries-tab/admin-deliveries-tab.ts:21–24: `rxResource({ params: () => this.currentUser.userId(), stream: () => this.adminApi.deliveries() })`. Nothing else triggers a reload.
> testing.md S4-8 Actual: "The row is first in the admin log (after Refresh)".

**Problem.** Opening `/admin` loads the Delivery log tab right away, because it is the default tab. `preserveContent` keeps that component alive, and its resource reloads only when the user id changes or Refresh is pressed. The DoD 5 sequence is: open Admin, go to "Simulate event", simulate, go back to "Delivery log". The new row is not there. "Poll now" on the Sources tab and the background poller have the same effect. S4-8's own Actual needed a Refresh, so the session hit this and recorded it as a pass.

**Why it matters.** DoD 5 is the evaluator's main demo path (R4: "simulate event is the demo path"). Someone following the README sees no row and may decide the pipeline is broken. They may also decide the dedupe ate the event, since the simulate result for a repeat says "nothing new was sent". The cost is low, but the risk sits on the step that proves the whole S3 pipeline.

**Fix.** Options:
- **A (recommended):** reload the delivery log (and the sources list) when its tab is selected again. Use `(selectedTabChange)` on the tab group, or drop `[preserveContent]` so `matTabContent` re-creates the tab and its resource each time. One line. Update S4-5's wording and re-run S4-8 without Refresh.
- **B:** after a successful simulate, show a link "Open the delivery log" that switches tab and reloads. More UI, but it guides the demo.
- **C:** keep the behaviour and add "press Refresh" to the README walkthrough. No code, but it puts a known stale view in the demo.

### M2 – S4-10 and S4-12 are Pass with parts of their Expected not observed

**Text:**
> CLAUDE.md "How to work with me": "Never claim something works unless you ran it. Say "not run" otherwise."
> testing.md S4-10 Expected: "Loading, empty and error states; the toggle shows pending, then reverts with an error". Actual: "… Loading states not seen separately (local responses are too fast)." Status: "Pass". The Actual records no empty state for any admin tab.
> testing.md S4-12 Actual: "`color-contrast` is "incomplete" on 1–2 floating Material labels (background not measurable, overlapped), so contrast there was not confirmed." Status: "Pass".
> assumptions.md A23: "basic WCAG AA (labels, contrast, keyboard navigation)".
> testing.md S4-11: "**Not run:** Delete by keyboard (native `confirm()` …)" Status: "Partial".

**Problem.** S4-11 uses Partial for a step that wasn't run. S4-10 and S4-12 don't, although each has an unobserved part. S4-10 has no loading state observed and no admin empty state recorded ("No user has an alert yet.", "Nothing has been sent yet.", "No sources are registered." are in the templates but not in the Actual). S4-12 has contrast unconfirmed, and contrast is one of the three things A23 names. The same session applied the rule in one row and not in the next two.

**Why it matters.** The evaluation is about process and judgment. testing.md is the evidence a reviewer reads, and S5 builds the final test results on it. A Pass that hides "not seen" weakens every other Pass in the table, including the honest ones.

**Fix.** Set S4-10 and S4-12 to Partial and name the unrun parts, as S4-11 does. To close them instead:
- S4-10: throttle the network in devtools (or add a `delay()` temporarily) to see each loading state, and use a fresh DB to see the admin empty states.
- S4-12: check the two floating labels by hand (devtools contrast picker) and record the ratio. Material's default theme likely passes, but it was not measured.

---

## Minor

### m1 – decisions.md S4-1 describes an axe method that wasn't used; `axe-core` is a dead dependency

**Text:**
> decisions.md S4-1: "**The axe check uses `axe-core` as a dev dependency of `apps/web`** … The version is pinned in the lockfile, and no outside script is loaded into the page."
> apps/web/package.json:30: `"axe-core": "^4.14.0",` (no file in `apps/web` imports it; `grep -rn axe apps/web` outside `node_modules` finds only this line)
> testing.md S4-12: "copied into `apps/web/public/` for the run, then deleted; the dev server blocks `node_modules`"
> review-log.md S4 row: "the axe loading method was changed during the slice"
> CLAUDE.md "Working efficiently": "No new dependency without a one-line reason".

**Problem.** The method in S4-1 failed (prompt export l.91: "403 from the dev server"). The developer chose a second option (copy to `public/`), but S4-1 was never revised. The dependency it justifies now serves only as a file to copy by hand. The run is not scripted, so nobody can repeat it from the repo.

**Why it matters.** decisions.md is a source of truth. It now records a decision that doesn't match what was done, and it gives a reason ("pinned … no outside script") for a dependency that has no use in the build or tests. In S5 the README has to explain either a dead dependency or a manual copy step.

**Fix.** Options:
- **A (recommended):** revise S4-1 in place, "(revised 2026-10-18)", as DS9 was: the dev dependency is the pinned source for `axe.min.js`, and the one-off run copies it into `public/` and deletes it afterwards. Add the exact steps to testing.md S4-12 so it can be repeated.
- **B:** remove `axe-core` from `apps/web/package.json` and record the run as a one-off with a version number. Smaller repo, but the run can't be repeated with the same version.

### m2 – `/history` shows "Pick a user" while the user list loads or fails

**Text:**
> apps/web/src/app/history/history-page/history-page.ts:22–25: `rxResource({ params: () => this.currentUser.userId(), stream: () => this.deliveriesApi.mine() })`
> apps/web/src/app/core/current-user.ts:40–43: `user` is `undefined` until `/api/users` has loaded (the default value is `[]`).
> apps/web/src/app/history/history-page/history-page.html:19–20: `@if (deliveries.status() === 'idle') { <p>Pick a user in "Acting as" to see their history.</p> }`
> CLAUDE.md "Frontend rules": "Every data view handles loading, empty, and error states."

**Problem.** `CurrentUser.user` always falls back to the first non-admin, so a user is always picked once the list is loaded. The resource is `idle` only (a) while `/api/users` is in flight, for example on a reload of `/history`, and (b) when it failed. In case (a) the page tells the user to pick someone when it should show a loading state. In case (b) it gives the wrong advice next to the shell's "Could not load users". The admin tabs don't have this problem: their `idle` falls through to `!hasValue()` and shows the progress bar.

**Why it matters.** It is a small, visible wrong state on a page S4 added. S4-9 didn't cover a reload, so it wasn't seen.

**Fix.** Treat `idle` as loading while `currentUser.users.isLoading()`, and show nothing in the page body (the shell already shows the error) when `currentUser.users.error()` is set. Or drop the `idle` branch and let it fall through to the progress bar, as the admin tabs do. Add "reload on /history" to S4-9.

### m3 – The S4-5 test can't catch a regression of decisions.md S4-3 within the same millisecond

**Text:**
> decisions.md S4-3: "`PATCH {enabled: true}` on an enabled source leaves it unchanged."
> apps/api/src/routes/admin.routes.test.ts:404–407: `const on = await enable(true); … expect((await enable(true)).enabledAt).toBe(on.enabledAt);`
> apps/api/src/db/database.ts:31–32: `now()` returns `new Date().toISOString()` (millisecond resolution).

**Problem.** Suppose `setSourceEnabled` were changed to reset `enabled_at` on every `enabled: true`. The second PATCH would then write `now()` again. If both requests finish in the same millisecond, that value equals `on.enabledAt` and the test still passes. "Unchanged" can't be told apart from "reset to the same timestamp". I could not run the mutation (see header), so how often this happens on a given machine is unmeasured. Either way, the assertion depends on timing.

**Why it matters.** S4-3 exists to stop the D7 baseline from moving forward without anyone noticing, which would leave events unmatched with no visible sign. Its only automated guard should not depend on the clock.

**Fix.** Between the two `enable(true)` calls, set `enabled_at` to a second fixed value through `api.db` (as the test already does with `OLD`). Then expect the second PATCH to return that value.

### m4 – `DeliveryRow` repeats `AdminDeliveryView` in the web

**Text:**
> packages/shared/src/admin.ts:13–15: `export interface AdminDeliveryView extends DeliveryView { userName: string; }`
> apps/web/src/app/deliveries/delivery-table/delivery-table.ts:7: `export type DeliveryRow = DeliveryView & { userName?: string };`
> delivery-table.ts:28: `readonly showUser = input(false);`
> CLAUDE.md "Architecture rules": "Request/response types are plain TypeScript types in packages/shared; no duplicate types."

**Problem.** The web declares its own looser version of a shared response type. `showUser` is a separate flag, so `[showUser]="true"` with plain `DeliveryView` rows compiles and renders an empty User column. If `userName` is renamed in shared, the web keeps compiling against its own optional copy.

**Why it matters.** It is the duplication the rule forbids, and it removes the type check that would catch a shared/web mismatch.

**Fix.** Use `DeliveryView | AdminDeliveryView` as the input type and work out the User column from `'userName' in row`. Or keep `showUser` but type the input as `readonly AdminDeliveryView[]` when it is set (two inputs, or a discriminated input). Recommended: the union. It is a one-line change and makes `DeliveryRow` unnecessary.

### m5 – Process evidence lags behind the work

**Text:**
> review-log.md at `ed8c51ff`, S4 row: "Prompt export: _to add_."
> `git status` during the review: ` M process/review-log.md`, `?? process/prompts/development-s4.md`
> review-log.md S2 review row: "m1–m5 and the questions: not decided yet." S3 review row: "m1–m5 and the questions: not decided yet."
> apps/api/src/routes/alert-input.ts:19: `if (!Array.isArray(value)) return [];` (S3 review m1, unchanged)

**Problem.** The branch's last commit says the S4 prompt export is still to be added. The export and the log update exist only in the working tree. The S2 and S3 minors are still undecided two slices later. S3 m1 (a non-array `keywords` saved as `[]`, so the alert matches everything) is still in the code, with no recorded decision to accept it.

**Why it matters.** DoD 10 and the evaluation read git, not the working tree. A merge of this branch as it is ships "_to add_". The undecided minors pile up for S5, where the review-log is supposed to be final.

**Fix.** Commit the prompt export and the review-log update on this branch before merging (with your OK). Before S5, write one line per S2/S3 minor: taken, rejected, or deferred, and why. "Rejected: low risk, no time" is a valid outcome. "Not decided" two slices later is not.

---

## Questions for the author

- When the admin switches to Alice while on `/admin`, every admin tab's `rxResource` is keyed on `userId()`. Does it send `/api/admin/*` as Alice (403 plus the interceptor snackbar) before the shell's navigation destroys the tabs? S4-14 doesn't say whether a snackbar appeared.
- In the 640px card layout, `tr { display: block }` and `td { display: grid }` are set on a real `<table>`. Did you check with a screen reader (or the accessibility tree) that the table semantics survive in the browsers you target? Some engines have dropped table roles when `display` is changed.
- The `#n` → `#1` change was seen on 3 of 22 stories with the same `pubDate`. Do you know whether the BBC also reuses an article URL for a different story? If it does, stripping the suffix would silently drop the second story.
