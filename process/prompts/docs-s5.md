# Docs S5 – Docs wrap-up + fresh-clone check

_Exported Claude Code chat, 2026-10-18. Tool calls are shown as one-line notes; tool output and internal reasoning are omitted. The end-of-turn "next step" boxes are shown as notes; the user message after one is the button that was picked (or typed). Paths are shown relative to the repo; temporary files as `<scratchpad>`._

---

## 🧑 User

Start S5 of the plan.

Before writing any code:
1. Check what S1–S4 actually delivered (git log, the code, the review log).  If anything S5 depends on is missing or differs from the plan, stop and tell me before continuing.

README requirements — if the plan's S5 section doesn't already cover these,
make sure the README includes them:
1. How to run it: prerequisites (Node version, package manager), install,
   dev server, build, and test commands. Verify every command actually works
   from a clean checkout.
2. Links to the plan, assumptions, decisions and review log, using relative
   paths so they work on GitHub.
3. Known limitations, and what I'd do with another week: honest, specific,
   and prioritized — not a generic wishlist.

## 🤖 Claude

> _Tool: Show git history, branches, docs and plan._

> _Tool: Check HEAD vs main, process files, review log, README._

> _Tool: Compare current branch to origin/main (S4)._

> _Tool: Inspect S4 plan changes, open test rows, root scripts._

> _Next-step box: I've stopped before planning S5. Your docs-s5 branch is missing all of S4. No files were changed. — question: "How should docs-s5 get the S4 work?" (buttons: Fast-forward it / Recreate branch)_

## 🧑 User

A: fast-forward docs-s5 to origin/main, also update local main, then continue the S5 check.

## 🤖 Claude

> _Tool: Fast-forward branch and local main to origin/main._

Both are now at the S4 merge. Next I'll re-read the docs.

> _Tool: Read decisions and testing/design structure._

> _Tool: read a saved tool output._

> _Tool: Read known issues, design limits, S4 review questions._

> _Tool: Check scripts, env example, gitignore, channels, Node._

> _Tool: Check how the API loads .env._

Both branches are now at `c1b61289`, the S4 merge. Here is what I found and what I plan to do for S5.

#### What S1–S4 delivered

All four slices are merged on `main` with their reviews, fix commits, prompt exports and review-log rows. S5 can start: everything it depends on is there. Some differences and loose ends affect S5:

1. **No root `build` script.** Only `apps/web` has `build` (`ng build`). The API has none because it runs with `tsx`. Your README list asks for a build command, and the plan doesn't mention one. This is the question at the end.
2. **The fresh clone may not start.** testing.md "Known issues" says a fresh-clone `npm start` was "probably broken from S1" until the S3-6 fix, and nobody has re-checked it. S5's fresh-clone check covers this. If it fails, the fix needs a failing test first (plan-v2 S5).
3. **`process/screenshots/` only has `.gitkeep`.** I can view the in-app browser, but I can't save its screenshots as PNG files. You'd need to take them, or tell me if you want another way.
4. **Only Node 24 has been tested** (S0-7). Node 22.22.x has not. The README will say "tested on Node 24.22.0, npm 11.19.1".
5. **Open items the README links will expose:**
   - review-log rows marked "_To confirm_" (plan review 3, design review, S0 review, S1 m5);
   - "Questions for the author" that were never answered in the S2–S4 reviews.
   
   I won't change these unless you ask.
6. **Small doc items:**
   - design.md §7 still has the S3-era budget line;
   - S5 Actual is empty in plan-v2;
   - the npm 11 install-script warning is marked "to mention in the README in S5".
7. **`.claude/launch.json` is untracked.** I'll leave it alone.

#### Files I'll change
- `README.md`:
  - prerequisites, install, start, build, test, lint and typecheck commands;
  - a walkthrough of the Definition of Done;
  - "How to add a channel";
  - relative links to plan-v2, assumptions, decisions, design, testing and the review log;
  - known limitations;
  - "With another week".
- `docs/testing.md`: S5 rows and a "Known issues" update.
- `docs/design.md`: finish §7.
- `docs/plan-v2.md`: S5 Actual.
- `process/review-log.md`: S5 rows.
- Possibly `package.json` and `docs/decisions.md`, depending on your build answer.

#### S5 test cases (to add to testing.md)
| ID | Check | Expected |
|---|---|---|
| S5-1 | Clone this repo locally into a temp folder, then `npm install` | Exit 0; only the known npm 11 warnings |
| S5-2 | `npm start` from the clone | API and web start; `:4200/api/health` returns ok; `/alerts` loads (re-checks S3-6) |
| S5-3 | `npm test`, `npm run lint`, `npm run typecheck` in the clone | All exit 0 |
| S5-4 | The build command | Exit 0, output in `dist/` |
| S5-5 | Follow the README word for word through DoD 1–10 | Every step behaves as written |
| S5-6 | README links | Every relative link points to a file that exists |

#### Draft "With another week" priorities
I'll make the final list match what the README says.
1. Real authentication. This would also close DS6 and DS7 (public `/users` and public preview links).
2. Fix deliveries stuck on `pending` after a crash, and add a retry (A16).
3. GitHub Actions running the `npm test`/lint/typecheck gate (D4).
4. One end-to-end test of the DoD walkthrough.
5. Finish the Partial a11y checks:
   - a contrast check;
   - a screen-reader check of the card tables;
   - a keyboard-friendly delete dialog instead of `confirm()`.
6. USGS revisions (DS11) and the region filter (F2).
7. Stretch: CoinGecko and smarter news severity.

> _Next-step box: docs-s5 and main are now at the S4 merge. S5 can start: the S1–S4 work is there, with loose ends listed above. Nothing has been written yet; the S5 plan is waiting for your OK. — question: "How should the README cover the build command?" (buttons: Document web build / Add root build script)_

## 🧑 User

OK, go ahead with the S5 plan.

For the build command in the README:
- List it with the other commands (install, dev, test, build), e.g. `npm run build`.
- Say in one line what it produces and where (e.g. "outputs a production  bundle to dist/").
- Add how to preview or serve that build locally (e.g. `npm run preview`).
- Only document commands you've actually run successfully from a clean checkout. If the build has warnings or a known issue, mention it under Known limitations rather than hiding it.

## 🤖 Claude

> _Tool: Inspect web build config and run production build._

> _Next-step box: The production build works in this checkout, with a bundle-budget warning (624 kB, limit 500 kB). There is no preview command yet; the S5 doc work waits on that choice. — question: "Which preview approach should S5 use?" (buttons: A: scripts only / B: API serves dist)_

## 🧑 User

A: add root build and preview scripts (preview = API + ng serve --configuration production), log it as decisions.md S5-1, then continue S5.

## 🤖 Claude

> _Tool: Check serve configs, proxy and server startup._

Now the script edits.

> _Tool: Add root build/preview and web preview scripts._

> _Tool: Record S5-1 in decisions.md and note it in plan-v2._

> _Tool: Find last test row position._

> _Tool: Add S5 test case rows to testing.md._

> _Tool: Clone repo to scratchpad and apply S5 diff._

> _Tool: Identify processes holding ports 3000 and 4200._

> _Tool: Run npm install in the fresh clone._

> _Tool: Run test, lint, typecheck and build in the clone._

Install, test, lint, typecheck and build all pass in the clone. Next I'll draft the README so the start/preview checks can follow it word for word.

> _Tool: Read channel interface, registry, Slack channel, seed._

> _Tool: Read channel field types and UI labels._

> _Tool: List routes and key button labels._

> _Tool: Read shell nav markup._

> _Tool: Confirm send timeout and simulate occurredAt._

Now writing the README.

> _Tool: wrote `README.md`._

> _Tool: Verify source file, guard behavior, README links._

> _Tool: Check D-answer range and fix walkthrough wording._

> _Tool: Find D-answer IDs in assumptions._

> _Tool: Check D7/D8 and confirm README edits applied._

> _Next-step box: Build/preview scripts, decision S5-1, the S5 test rows and the README are in. In a fresh clone, install, test, lint, typecheck and build pass. Start, preview and the README walkthrough haven't run yet because ports 3000 and 4200 are in use. — question: "Can I stop the two dev servers on ports 3000 and 4200?" (buttons: Yes, stop them / I'll stop them)_

## 🧑 User

Yes, stop processes 15736 and 27008 (the main checkout's API and ng serve), then run the start, preview and walkthrough checks in the clone.

## 🤖 Claude

> _Tool: Stop the two dev servers and confirm ports are free._

> _Tool: Run npm start in the fresh clone._

> _Tool: Wait for dev servers, then check health and /alerts._

> _Tool: loaded the `anthropic-skills:built-in-browser` skill._

The dev servers start from the clone, and health returns ok through the proxy. Next I'm following the README walkthrough in the browser.

> _Browser: started `http://localhost:4200/connections`._

> _Browser: screenshot._

> _Browser: Opens the Add connection dialog; read the page._

> _Browser: Focuses the Label field; Types the connection label; Focuses the Email field; Types an invalid email; Submits the connection form; read the page._

> _Browser: screenshot._

> _Browser: read the network log; Selects the email text; Types a valid email; Saves the email connection; read the page._

The server-side field error works (POST returned 400 and the message showed under the field). Now adding the Slack connection.

> _Browser: Opens the Add connection dialog; read the page._

> _Browser: Opens the Channel select; read the page._

> _Browser: read the page._

> _Browser: Chooses the Slack channel; read the page._

> _Browser: Focuses the Name field; Types the Slack connection name; Saves the Slack connection; read the page._

> _Browser: Sends a test to Work inbox; Sends a test to #alerts; read the page._

> _Tool: Check the email preview link opens._

Send test works for both connections. Now creating the alert (step 4).

> _Browser: opened http://localhost:4200/alerts/new; read the page._

> _Browser: Focuses the alert Name field; Types the alert name; Opens the Source select; read the page._

> _Browser: ran a page script to inspect the page._

> _Browser: Chooses USGS earthquakes; Opens Minimum severity select; ran a page script._

> _Browser: screenshot._

> _Browser: Opens the Send to select; read the page._

Still filling in the alert form: choosing both connections, then saving.

> _Browser: Selects the first connection; Selects the second connection; Closes the select panel; Saves the alert; read the page._

> _Browser: screenshot._

> _Browser: Opens the Send to select; ran a page script._

> _Browser: screenshot._

> _Browser: Selects the #alerts connection; Closes the select panel; Saves the alert; read the page._

> _Browser: read the page._

The alert is created. Next: pause and resume it, then the admin simulate steps.

> _Browser: read the page._

> _Browser: Pauses the Quakes alert; read the page; Resumes the Quakes alert._

> _Browser: Opens the Acting as switcher; read the page._

> _Browser: Switches to the Admin user; opened http://localhost:4200/admin; read the page._

> _Browser: read the page._

> _Browser: Opens the Simulate event tab; read the page._

Now on the admin Simulate event form, filling it in for the USGS match.

> _Browser: Opens the Source select; read the page._

> _Browser: Chooses USGS earthquakes; Focuses the Title field; Types the event title; Focuses the Source event ID field; Types the source event ID; Submits the simulated event; read the page._

> _Browser: read the network log._

> _Browser: read the page; Focuses the Title field; Types the event title; Focuses the Source event ID field; Types the source event ID._

> _Browser: Submits the simulated event; read the page._

> _Browser: Submits the same simulated event again; read the page; ran a page script._

Simulate works and dedupe is confirmed: the second run with `demo-1` sent nothing. Next I'm checking the delivery log, the source and channel switches, and Alice's history.

> _Browser: Opens the Sources tab; read the page._

> _Browser: Turns BBC World News off; Polls BBC World News now; read the page._

Turn BBC back on, then Channels → Slack off.

> _Browser: Turns BBC World News back on; Opens the Channels tab; read the page._

> _Browser: Turns the Slack channel off; read the page; Opens the Simulate event tab._

> _Browser: Selects the source event ID; Types a new source event ID; Submits the simulated event; ran a page script._

Slack-off skip works. Now: turn Slack back on, Delivery log Refresh, then Alice's History and the `/admin` block.

> _Browser: Opens the Channels tab; Turns the Slack channel back on; read the page; Opens the Delivery log tab._

> _Browser: Refreshes the delivery log; ran a page script._

Now switch to Alice and check History plus the `/admin` block.

> _Browser: Opens the Acting as switcher; read the page._

> _Browser: ran a page script to inspect the page._

> _Browser: ran a page script; opened http://localhost:4200/admin; opened http://localhost:4200/history._

> _Tool: Check admin API returns 403 for a user._

The walkthrough passes in the clone, except alert Edit/Delete, which I didn't re-run. Next: stopping `npm start` and checking `npm run preview`.

> _Tool: stopped a background command._

> _Tool: Confirm ports were released._

> _Tool: Identify the processes still holding the ports._

Those two are my own clone's leftover servers (orphaned by the task stop). Stopping them.

> _Tool: Stop the clone's leftover dev servers._

> _Tool: Run npm run preview in the fresh clone._

> _Tool: Wait for preview, check health and served bundle._

> _Browser: opened http://localhost:4200/alerts; read the page._

> _Browser: ran a page script to inspect the page._

> _Browser: opened http://localhost:4200/admin; read the page; ran a page script._

Reproducing the Admin → Alice switch on `/admin` to see whether admin requests go out as Alice.

> _Browser: read the page._

> _Browser: Opens the Acting as switcher; ran a page script; read the network log._

> _Tool: stopped a background command._

> _Tool: Stop any leftover clone servers on the ports._

> _Tool: Get S4 merge time and current time._

> _Tool: Fix README wording and add the admin-switch limitation._

> _Tool: searched for `USGS Earthquakes`._

Correcting README wording to match the real UI labels, then adding the new limitation.

> _Tool: Apply README fixes tolerant of line wraps._

Next: filling in the S5 test results and updating Known issues.

> _Tool: Fill S5 test results and update known issues._

> _Tool: Update design.md §7, plan-v2 S5 actual, review-log row._

> _Tool: Run typecheck, lint and tests in the main checkout._

> _Tool: proposed a separate session: "Fix admin requests sent as user after switch"._

> _Next-step box: The S5 README, docs and root build/preview scripts are done. A fresh clone runs every README command and the walkthrough; gates pass. Nothing is committed; screenshots and the S5 prompt export are still to do. — question: "Shall I commit S5 as "docs: README, design, decisions and test results"?" (buttons: Yes, commit / Review first)_

## 🧑 User

Do this task here: “Fix admin requests sent as user after switch”

## 🤖 Claude

> _Tool: tried to withdraw that proposal (it had already been picked)._

> _Tool: Read current-user, admin tabs, admin api, switcher, shell._

> _Tool: listed linked sessions (none)._

> _Tool: searched for `currentUser`._

> _Tool: searched for `S4-14`._

I've found the cause, and I'm doing the fix in this session (no separate session was started). Here is the proposal; I'll wait for your OK before coding.

#### Cause
All five admin resources use `params: () => this.currentUser.userId()`:
- deliveries, sources and channels tabs, one each;
- the All alerts tab, two (alerts and sources);
- the simulate tab, one.

When you pick Alice, `userId` changes, so every one of these tabs starts a new request right away. That happens in the same change-detection pass, before the shell's `effect` in `app.ts` navigates to `/alerts`. So the requests go out as Alice, get 403, and show the snackbar. The `userId` key does nothing useful for admin data, which is global and the same for any admin.

#### Options
- **A. Remove the `userId` params from the admin resources (recommended).** Each tab loads once when it opens and reloads only on Refresh or after a change. Nothing reloads on a user switch, and the tab is destroyed when the shell navigates away.
  - **For:** removes the cause; about 10 lines deleted across 5 files.
  - **Against:** if a second admin existed, switching between two admins wouldn't refetch. The data would be identical anyway.
- **B. Key on admin only:** `params: () => (this.currentUser.isAdmin() ? this.currentUser.userId() : undefined)`. A resource whose params are `undefined` stays idle, so nothing is sent for a non-admin.
  - **For:** keeps the "reload on switch" pattern of the user pages.
  - **Against:** the same condition copied into 6 resources, or a new helper. More code than A for no behaviour a user would notice.
- **C. Navigate before switching:** the shell leaves `/admin` first, then calls `select()`.
  - **Against:** ties identity to routing and depends on ordering. Rejected.

#### Files (option A)
- `apps/web/src/app/admin/admin-{deliveries,sources,channels,alerts,simulate}-tab/*.ts`: drop `params` and the now-unused `CurrentUser` injection.
- `docs/testing.md`: new row S5-8, and the Known issues entry marked fixed.
- `README.md`: remove limitation 6.
- `docs/design.md` §7: remove the bullet I added.
- `process/review-log.md`: one row.

#### Test case
| ID | Check | Expected |
|---|---|---|
| S5-8 | Browser: as Admin on `/admin`, open every tab, then switch to Alice; watch the network log and the page | No `/api/admin/*` request after the switch; no "Admins only." message; the app ends on `/alerts`; reopening `/admin` as Admin still loads every tab |

There is **no automated test**, because CLAUDE.md allows component tests only for the generated form and the alert form. So the `test: admin switch cases` commit would hold just the testing.md row. If you want a component test anyway, that's an exception to the rule, and I'd ask first.

#### Commit order
The S5 docs changes are still uncommitted, and `testing.md` has S5 hunks in it. I'd commit S5 first, then `test: admin switch cases`, then `fix(web): admin tabs don't reload on a user switch`. Each commit needs your OK.

> _Next-step box: Cause found: the admin tabs reload when the user ID changes, before the app leaves /admin. Nothing is changed yet; the S5 work is still uncommitted. — question: "Which fix should I use?" (buttons: A: drop userId key / B: key on admin)_

## 🧑 User

B: key the admin resources on userId only while the user is admin (undefined otherwise). Browser check only (S5-8).

## 🤖 Claude

> _Tool: Record S5-2 decision and add S5-8 test row._

Recorded. Now the code change: one `adminId` computed in `CurrentUser`, used by the six admin resources.

> _Tool: edited `apps/web/src/app/core/current-user.ts`._

> _Tool: Switch admin resources to the adminId key._

Code change done. Now the browser check: starting this checkout's dev servers.

> _Tool: Check whether dev ports are in use._

> _Browser: started `api`._

> _Browser: started `web`._

> _Tool: Identify what now holds port 3000._

> _Browser: started `api`._

> _Next-step box: The fix is in: admin resources are keyed on CurrentUser.adminId (decisions.md S5-2, test row S5-8). The browser check hasn't run yet: the app thinks another chat still owns port 3000, though nothing is listening there. — question: "How should I start the API for the S5-8 check?" (buttons: Run it from Bash / I'll free it)_

## 🧑 User

stop and restart the port-

## 🤖 Claude

> _Tool: listed running dev servers._

> _Tool: Look for anything using port 3000 or running the API._

> _Tool: List node processes with parents and commands._

> _Tool: Stop leftover API watchers and clone orphans._

> _Browser: started `api`._

The API is running again. Running the S5-8 check.

> _Browser: closed a tab._

> _Browser: opened http://localhost:4200/alerts; ran a page script; opened http://localhost:4200/admin; read the page._

> _Browser: Opens the Sources tab; Opens the Channels tab; Opens the All alerts tab; Opens the Simulate event tab; read the network log._

All tabs load as Admin (requests .1012–.1015). Now switching to Alice.

> _Browser: Opens the Acting as switcher; ran a page script; read the network log._

No `/api/admin/*` request after the switch, no snackbar, and the app is on `/alerts`. Last part: switch back to Admin and reopen `/admin`.

> _Browser: read the page._

> _Browser: Opens the Acting as switcher; ran a page script; read the page; read the network log._

Back as Admin, the Delivery log loads. Clicking all tabs in one script may have skipped the lazy ones, so I'm checking each tab one at a time.

> _Browser: ran a page script to inspect the page._

S5-8 passes. Now updating the docs to match: testing row, Known issues, README, design §7 and the review log.

> _Tool: Record S5-8 result and remove the fixed limitation._

> _Tool: Run typecheck, lint and tests after the fix._

The fix works. Switching from Admin to Alice on `/admin` no longer sends admin requests as Alice: no 403s, no "Admins only." message, and the app lands on `/alerts`. Switching back to Admin, every admin tab still loads. Typecheck, lint and tests pass (107 API and 7 web tests).

**What changed**
- `apps/web/src/app/core/current-user.ts`: a new `adminId` value, which is the user's id while they are an admin and empty otherwise.
- The admin tab files now use `adminId` instead of `userId`, so for a non-admin they stop instead of reloading. That's six resources across the five files: deliveries, sources, channels, alerts and simulate.
  - Putting the check in one place in `CurrentUser`, instead of repeating it in every tab, was my addition to your option B.
- Docs:
  - decisions.md S5-2;
  - testing.md S5-8 (Pass) and the Known issues entry marked fixed;
  - README limitation removed and the list renumbered;
  - design.md §7 bullet removed;
  - the review-log row updated.

**Things to know**
- **No automated test:** CLAUDE.md allows component tests only for the two listed forms, so S5-8 is a browser check only.
- **Where it was checked:** I ran the browser check in your main checkout, not in a fresh clone.
- **Processes I stopped** to free port 3000: the leftover `tsx watch` API watcher in this checkout (27440 and 12032), plus three orphans from my clone run. I didn't touch the processes from the other session's clone (`de002718…`).
- **Still running:** this session's `api` and `web` dev servers.
- **Commit order:** the rule says the `test: admin switch cases` commit must hold the S5-8 row with Actual and Status empty. The row is already filled in, so when committing I'll split the changes into three commits:
  1. S5 docs, using the plan-v2 message `docs: README, design, decisions and test results`;
  2. `test: admin switch cases`, with the empty row;
  3. the fix, with the S5-8 result.

**Still not done:** screenshots, the S5 prompt export, and alert Edit/Delete in the walkthrough (S5-6 is Partial).

> _Next-step box: The admin-switch fix works and passes the browser check (S5-8). Typecheck, lint and tests pass. Nothing is committed; screenshots and the S5 prompt export are still to do. — question: "Shall I make the three commits in that order?" (buttons: Yes, commit all / Review first)_

## 🧑 User

Yes: commit S5 docs, then test: admin switch cases (empty S5-8 row), then fix(web): admin tabs don't reload as a non-admin after a user switch. Leave .claude/launch.json out. Don't push.

## 🤖 Claude

> _Tool: Back up final files and write the S5-docs-only versions._

Building the S5 docs commit now (docs and scripts, without the fix code).

> _Tool: Stage S5 docs and scripts and commit._

> _Tool: Add empty S5-8 row and commit test cases._

> _Tool: Confirm the committed S5-8 row is empty._

The test-first commit holds the empty row (the print error came after the write). Now restoring the final files and committing the fix.

> _Tool: Restore final files and commit the fix._

> _Tool: Verify committed tree matches final state and rerun gates._

> _Next-step box: I made three commits on docs-s5: S5 docs, the admin-switch test row, then the fix. The final tree matches what was verified, and typecheck, lint and tests pass. Nothing is pushed, and .claude/launch.json is still untracked. Screenshots and the S5 prompt export are still to do._

I made the three commits on `docs-s5`, in the order you asked:

1. `f9b87357 docs: README, design, decisions and test results`: the S5 docs and the root `build`/`preview` scripts. This commit still lists the admin-switch bug as open (a README limitation, a design.md bullet, an "open" Known issues entry).
2. `c7fedbce test: admin switch cases`: only the S5-8 row in testing.md, with Actual and Status empty.
3. `01dc1bc3 fix(web): admin tabs don't reload as a non-admin after a user switch`: the `CurrentUser.adminId` change, decision S5-2, the S5-8 result, and the doc updates that mark the bug fixed.

After the third commit the files match exactly what I tested, and typecheck, lint and tests pass (107 API and 7 web tests). Nothing is pushed, and `.claude/launch.json` is still untracked.

Still to do for S5:
- **Screenshots:** `process/screenshots/` is still empty, because I can't save browser screenshots to files.
- **Prompt export:** the S5 prompt export isn't done.
- **S5-6 is Partial:** alert Edit and Delete weren't re-run in the walkthrough.

This session's `api` and `web` dev servers are still running.

## 🧑 User

Export the chat to process/prompts/docs-s5.md and then commit please

## 🤖 Claude

> _Tool: Check prompt export conventions._

> _Tool: exported this chat to `process/prompts/docs-s5.md` (this file) and committed it._
