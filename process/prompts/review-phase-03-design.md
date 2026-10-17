# Phase 03 – Design review (critical review of design.md, C1 fix)

_Exported Claude Code chat, 2026-10-17. Tool calls are shown as one-line notes; tool output and internal reasoning are omitted. Questions asked through the question pop-up are shown with your answers. The end-of-turn "next step" boxes are shown as notes._

---

## 🧑 User

You are a senior engineer reviewing a take-home system design before implementation starts.
Be critical. Your job is to find problems, not to reassure me.

Files:
* docs/design.md - the design under review (data model, extension points, pipeline, REST API, screens, data sources)
* docs/assumptions.md - product decisions (source of truth, A1–A25, D1–D7)
* docs/decisions.md - technical decisions (DS1–DS11)
* docs/plan-v2.md - slices S0–S5, scope, Stretch, Definition of Done
* CLAUDE.md - project and architecture rules
* The original brief: "We want users to be able to set up alerts so they get notified when something important happens in the world — like breaking news, market movements, natural disasters, that kind of thing. Should work for both email and Slack. Make it flexible enough that we can add more channels later. We need an admin view"

Context: Frontend Software Engineer role, about 9h left. Evaluators grade the process and judgment most.

Rules:
- Rank findings by severity: Critical / Major / Minor.
- For each: the problem, why it matters, a concrete fix. Quote the design text (with section number).
- Max 10 findings. No praise section, no rewritten design.
- Don't propose a default for the known open items (F1–F5 in plan-v2.md, A13). Only flag where the design depends on them.
- If you're unsure whether something is a problem (for example, a feed's format or a library's behaviour), say so instead of guessing.
- Don't edit any file except the review file.

Create process/review-design.md.

## 🤖 Claude

_Tool: read docs/design.md_
_Tool: read docs/assumptions.md, docs/decisions.md, docs/testing.md_
_Tool: read docs/plan-v2.md_
_Tool: read process/review-plan-v3.md and process/review-log.md (to match the existing review format)_
_Tool: write process/review-design.md_

_Next-step note: I wrote process/review-design.md with 10 findings: 2 Critical, 5 Major and 3 Minor. I didn't change any other file and didn't commit anything._

The review is in process/review-design.md. It has 10 findings: 2 Critical, 5 Major and 3 Minor. I didn't change any other file and didn't commit anything.

**Critical**
- **C1, cross-user connection linking:** the 404 rule only covers IDs in the URL. Neither `POST`/`PUT /me/alerts` nor the schema checks that the `connectionIds` in the body belong to the user. That means:
  - user A can link user B's connection to A's alert;
  - B can then never delete that connection;
  - the 409 shows B the names of A's alerts.

  Fix: check ownership in the API (400). Optionally, add composite foreign keys so the database enforces it too.
- **C2, budget:** the plan now totals 9.85h, and you have about 9h left. The design's "~0.15h left" is measured against 10h. My rough estimate for this review's fixes is another ~0.75h, and the cut order has no hour values, so you can't tell if it closes the gap.

**Major**
- **M1, simulate-event severity:** an admin can set the severity directly, which breaks D1 and the CLAUDE.md rule "normalise step only". The alert form's "BBC items are always medium" hint also hard-codes source-specific logic in the web app. I gave 3 options and recommend a `fixedSeverity` declared on the source.
- **M2, preview and Slack URL safety:**
  - Feed and simulate text goes unescaped into preview HTML, served from the app's own origin.
  - The Slack webhook URL isn't checked (SSRF).
  - It's not defined whether that field can be empty, which the Slack dry run needs.
- **M3, disabled channels and sources:**
  - If Slack is disabled, the edit dialog for an existing Slack connection can't build its form.
  - Sends to a disabled channel leave no trace anywhere.
  - "Send test" behaviour on a disabled channel isn't defined.
- **M4, "add a channel":** it actually needs 3–4 edits, not one file and one line. A seed row never reaches an existing database, and it isn't defined when the seed runs or whether it resets the baseline (`enabled_at`).
- **M5, frontend identity lifecycle:** nothing covers:
  - startup before a user is known;
  - reloading the page;
  - switching users while on `/admin`;
  - stale responses from the previous user;
  - open dialogs during a switch;
  - the 6-column `DeliveryTable` at 375px.

**Minor**
- **m1, contract gaps:** no storage for the email preview HTML (this blocks S1). `Notification`, `NewEvent` and the admin alert type are missing, and the delivery lists have no limit.
- **m2, pipeline edge cases:** rows that stay `pending` forever, `last_error` never cleared, overlapping "poll now" requests.
- **m3, doc drift:** CLAUDE.md still lists A13 as open, though D6 closed it and DS4 depends on that.

Where I wasn't sure, the file says so: whether BBC descriptions contain HTML, whether Slack webhooks always use the `hooks.slack.com` host, whether `node:sqlite` is still experimental on Node 22.13, and whether Angular's `resource()` is stable in the version S0 installs. I didn't propose defaults for F1–F5 or A13. m3 only points out where the docs disagree about A13.

---

## 🧑 User

Fix C1

## 🤖 Claude

_Question pop-up:_

1. **How should ownership of the connectionIds in an alert be enforced?**
   - API check only (Recommended): POST/PUT /me/alerts checks that every connectionId belongs to req.user, in one helper, with a test. Matches how every other ownership check works here. ~0.05h.
   - API check + composite FK: same check, plus user_id on alert_connections and composite FKs, so the database rejects a cross-user link even if the check is forgotten. ~0.1h, more schema.

   **Your answer:** API check only (Recommended)

2. **What should the API return when a connectionId is unknown or belongs to another user?**
   - 400 fieldErrors (Recommended): 400 with fieldErrors.connectionIds, the same message for "doesn't exist" and "not yours", so it reveals nothing. The form can show it on the field.
   - 404: treat it like a foreign resource in the URL. Simpler rule, but the URL resource (the alert) does exist, so 404 is misleading.

   **Your answer:** 400 fieldErrors (Recommended)

3. **Which extra AlertInput/ConnectionInput rules should the design record with this fix?** (multi-select)
   - connectionIds non-empty: 400 if an alert has no connections (A14 default: one or more channels).
   - sourceId must exist: 400 if sourceId isn't a registered source.
   - Connection type immutable: PUT /me/connections/:id can't change type (400), so alerts never silently switch channel.

   **Your answer:** Connection type immutable

_Tool: read docs/design.md §4_
_Tool: edit docs/design.md (§4 table rows and a new paragraph under the 404 rule)_
_Tool: check line endings of docs/*.md_
_Tool: append DS12 to docs/decisions.md and show the design.md diff_
_Tool: edit docs/design.md header (DS1–DS11 → DS1–DS12) and add a "Resolved → DS12" note to C1 in process/review-design.md_

_Next-step note: C1 is fixed in the design: the API checks that every connectionId in an alert belongs to the user and returns 400 otherwise, and a connection's type can't be changed. It's recorded as DS12 in decisions.md and marked resolved in the review. Nothing is committed._

C1 is fixed in the design, using your choices. Nothing is implemented yet; this only changes the docs. Nothing is committed.

**docs/design.md**
- **§4:** a new paragraph under the 404 rule says the API also checks IDs in the request body. Every `connectionId` in an alert must belong to the current user. An unknown ID and another user's ID get the same 400 message on the `connectionIds` field, so the response doesn't reveal which it was. The design also notes that the database doesn't enforce this; one API helper does.
- **§4 table:**
  - the `POST` and `PUT /me/alerts` rows list that 400;
  - `PUT /me/connections/:id` returns 400 if the request changes the connection's `type`.
- **Header:** now refers to DS1–DS12.

**docs/decisions.md**
- New row **DS12** records your choice: API check only, 400 instead of 404, and connection type can't change. It lists the other options and why they weren't taken.

**process/review-design.md**
- C1 now has a "Resolved → DS12" note. It also lists what you didn't pick: the database-level check, requiring at least one connection per alert, and requiring `sourceId` to exist.

One thing is still to do: the `testing.md` case ("user A links user B's connection ID → 400, nothing stored"). I left it for when S3 starts, because CLAUDE.md says test cases are written before each slice.

The review file changed on disk after I added the note. I'm treating that as your edit and didn't revert anything.

---

## 🧑 User

Export this chat into process/prompts/review-phase-03-design.md

## 🤖 Claude

_Tool: list process/prompts and read the existing exports' format_
_Tool: write process/prompts/review-phase-03-design.md (this file)_
