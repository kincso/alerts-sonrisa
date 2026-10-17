# Phase 01 – Planning (brief review, triage, Group A decisions)

_Exported Claude Code chat, 2026-10-17. Tool calls are shown as one-line notes; tool output and internal reasoning are omitted._

---

## 🧑 User

I am working on a homework for a frontend role. The evaluators care mostly about the process. I have a 20 hours time frame to finish the job. This means I am as a developer mostly available for around 10-12 more hours.

The product brief, as given:
"We want users to be able to set up alerts so they get notified when something
important happens in the world — like breaking news, market movements, natural
disasters, that kind of thing. Should work for both email and Slack. Make it
flexible enough that we can add more channels later. We need an admin view too."

Take these into account:
-backend should be as simple as possible
-free, public data sources only, no paid APIs
-must run locally with minimal setup for a reviewer
-use typescript throughout, and Angular for frontend

Do not write code and create any plans yet, just review the brief.
Lets list out everything that is not clear or undefined.
For each list item propose a question for the PM and a default assumption.
Flag anything that is out of our time frame.

Format the answer as a table: Ambiguity | Question for PM | Default assumption |
Reasoning. Then a short "out of scope" list. For documentation use assumptions.md

## 🤖 Assistant

> _Tool: Bash – List repo files and show markdown contents_

> _Tool: Write – docs/assumptions.md_

I wrote the review into [docs/assumptions.md](docs/assumptions.md). I added two columns beyond the ones you asked for: a `#` ID so you can refer to rows in later docs and prompts, and a **Status** column (Open / Confirmed / Rejected), because the file's header says it tracks whether assumptions get confirmed. ⏱ marks items where the full version won't fit your time, so the default is a smaller version.

| # | Ambiguity | Question for PM | Default assumption | Reasoning |
|---|---|---|---|---|
| A1 | What "something important" means ⏱ | Who decides importance: the user, us, or something automatic? | The user sets rules: source + keywords + optional threshold | Testable and explainable; automatic scoring needs ML |
| A2 | Which categories and sources | Are news/markets/disasters the full list or examples? | USGS earthquakes / GDACS, news RSS (e.g. BBC), CoinGecko, all behind one source interface | Free, no API key, works for a reviewer out of the box |
| A3 | Market data from free sources only ⏱ | Which instruments? Is delayed data OK? | Crypto watchlist, alert on 24h % change; no stocks | Free stock APIs that need no key are unreliable or have terms-of-service risk |
| A4 | What "breaking" news means ⏱ | Truly breaking, or just new? | A new RSS item matching keywords since the last poll | Real breaking-news detection needs grouping the same story across outlets |
| A5 | How events are detected | What latency is acceptable? | Poll each source every 2–5 min; no push, no queue | Simplest backend |
| A6 | When notifications go out ⏱ | Immediate only, or digests / quiet hours? | Immediate, one per matching event | Digests roughly double the delivery logic |
| A7 | Duplicates and floods | How should repeats be handled? | Dedupe by alert + event ID; per-alert cap | Otherwise the first poll floods users with old items |
| A8 | Users and login ⏱ | Is real login needed? | Seeded users + an "acting as" switcher; roles user/admin | Login costs many hours and isn't what's being evaluated |
| A9 | What the admin view does | What can an admin see and do? | All alerts, delivery log, source health, turn sources/channels on and off | Mostly read-only screens, enough for monitoring |
| A10 | Real email sending | Must emails reach real inboxes? | Nodemailer; with no SMTP config, falls back to Ethereal or log-only with a preview link | Reviewer needs no SMTP account |
| A11 | Real Slack sending ⏱ | Slack app with sign-in, or incoming webhooks? | Webhook URL; dry-run mode if none is set | Free; a full Slack app is too much for the time |
| A12 | "Add channels later" | Which channels come next? Must adding one be code-free? | A channel interface + registry; settings form built from channel metadata | Shows the extension point without over-engineering |
| A13 | Where channel targets are stored | Per user or per alert? | Per user; each alert picks from the user's channels | No re-entering on every alert |
| A14 | What an alert contains | Which fields can a user set? | Name, source, conditions, channels, active/paused toggle; full create/edit/delete | Smallest useful set |
| A15 | Notification content | Any required format or branding? | Title, summary, source, link, time, matched alert; one template per channel | Consistent and easy to extend |
| A16 | Failed sends ⏱ | What happens when a send fails? | Logged and shown in the UI, at most one retry | Visible failures matter more than guaranteed delivery here |
| A17 | User-facing history | Can users see what they were sent? | Yes, a notification history list | Lets the reviewer check without an inbox |
| A18 | How to demo it | How will the reviewer see it working? | "Send test" per channel + a "simulate event" action | Real events may not happen during review |
| A19 | Data storage | Any database requirement? | A local JSON or SQLite file behind a data-access layer | Minimal setup; SQLite modules that need compiling can fail on Windows |
| A20 | Backend stack | Preferred framework? | Node + TS (Express or Fastify), shared types, one start command | TypeScript throughout, frontend and backend types can't drift |
| A21 | Geography and language ⏱ | Regions? Location filters? Languages? | Global, English; simple region filter only where the source supports it | A map-based UI costs too much time |
| A22 | Scale | How many users and alerts? | One local instance, tens of users | It's local-only homework |
| A23 | UI and accessibility | Design system? Mobile? Accessibility level? | Angular Material, responsive, basic WCAG AA | Fast and accessible by default |
| A24 | Privacy and compliance ⏱ | GDPR, unsubscribe, data retention? | Pause/delete only | Doesn't fit the time; noted for production |
| A25 | Source terms and rate limits | Are we allowed to poll these sources? | Respect rate limits, cache responses, credit sources | Avoids getting blocked during the review |

**Out of scope**
- Real login: passwords, SSO, password reset.
- Production email delivery (own domain, SPF/DKIM, bounce handling, unsubscribe links).
- A full Slack app with sign-in, direct messages, or interactive messages.
- Channels beyond email + Slack (only the extension point; maybe a generic webhook if time allows).
- Digests, scheduled delivery, quiet hours.
- ML/NLP importance scoring, real "breaking" detection, grouping the same story across outlets.
- Stock/FX data and real-time market data.
- Message queues, retry with backoff, scaling.
- Map-based location UI.
- Multiple organizations, teams, shared alerts, detailed admin permissions.
- Languages other than English.
- GDPR features, audit trails, data retention policies.
- Cloud deployment, CI/CD, monitoring.
- A full end-to-end test suite (unit tests for matching and channel logic plus a few component tests instead).

Before you send these to the PM, the ones that most change the build are **A2/A3** (which sources), **A8** (login) and **A18** (how to demo).

---

## 🧑 User

I have no access to the PM, so I'll act as product owner and decide these myself.

Before I decide anything, help me triage. Sort every item into one of three groups:
A) Blocking —  Getting it wrong or not able to finish means rework.
B) Shaping — affects a feature's behaviour but is cheap to change later.
C) Cosmetic/deferrable - default would work fine or can be removed from scope.

Modify the table with a new column marking which group it belongs.
Don't make the decisions for me. Keep group A as small as possible.

## 🤖 Assistant

> _Tool: Bash – Insert triage group column into the assumptions table_

Now the group legend and the reasons behind each group.

> _Tool: Edit – docs/assumptions.md_

I sorted all 25 items and added a **Group** column to [assumptions.md](docs/assumptions.md), plus a legend and a short reason for each group. I didn't make any decisions; every status is still **Open**.

**A – Blocking (6): decide these before writing code**
| # | Why it's blocking |
|---|---|
| A1 Alert rule shape | It's the core entity: matching logic, the API and the alert form all depend on it. |
| A2 Event categories / sources | Sets the shape of the shared event model that every source has to fit. |
| A8 Users and roles | Who the user is, and whether they're an admin, touches every endpoint and route guard. |
| A12 Channel abstraction | The brief asks for this directly; adding it later means rewriting delivery. |
| A13 Where channel targets live | Decides the data model and two forms. |
| A20 Backend stack and repo layout | Can't be swapped cheaply once code exists. |

**B – Shaping (13): decide when you build that feature**
A3, A4, A5, A7, A9, A10, A11, A14, A16, A17, A18, A19, A23. Each one only affects a single source, channel, matching rule, screen or storage module.

**C – Cosmetic / deferrable (6)**
A6, A15, A21, A22, A24, A25. The default works as it is, or the item is already on the out-of-scope list.

Three calls you might disagree with:
- **A20** is a technical choice, not a product one. It's in A because swapping frameworks later costs real time. It's also a natural first entry for `decisions.md`.
- **A23** (component library) could go in A or B. The look is cosmetic, but swapping the library late would touch every screen.
- **A3** (market data) is in B even though it's a scope risk. As long as A2 gives you a common source interface, swapping crypto for anything else is limited to one module.

---

## 🧑 User

Let's go through the Group A items in assumptions.md, one at a time.

For the current item:
1. Suggest 3–4 realistic options. For each: how it works, effort in my budget, main risk.
2. Tell me which option you'd pick and the strongest argument against your own choice.
3. Do not decide for me. Stop and wait for my answer.

After I answer:
- Update assumptions.md: add/fill these columns for that row:
  "AI recommendation" | "My decision"
- Don't change any other rows or files.
- Show me the updated row, then move to the next Group A item.

Start with the first Group A item.

## 🤖 Assistant

**A1: What counts as "something important" (the alert rule shape)**

This is the core entity: matching logic, the API and the alert form all depend on it.

### Options

| | How it works | Effort | Main risk |
|---|---|---|---|
| **1. Typed rule per category** | Each category gets its own rule type in shared TypeScript (a discriminated union): `news` → keywords; `earthquake` → min magnitude + optional region text; `market` → coin + min % change. One small matcher per category. The form shows different fields based on the category picked. | ~2h (model, 3 matchers, one form that changes with the category) | Each new category means a code change in 3 places: type, matcher, form. Not "flexible" for sources. |
| **2. Generic condition builder** | A rule is a list of `{field, operator, value}` conditions joined with AND. Each source publishes which fields it has (`magnitude: number`, `title: string`…). One generic matcher, and the form is built from that field list. | ~3.5–4h (field metadata, operator handling, form built from metadata, validation) | Uses about a third of your remaining budget. Users get a clumsy "query builder" screen, and typing values from config is easy to get wrong. |
| **3. Keywords + the source's own severity** | A rule = source + keywords + "minimum severity" (low/medium/high). Each source maps its native signal to that scale (GDACS green/orange/red, USGS magnitude bands, market % bands). One matcher, one simple form. | ~1–1.5h | The severity mapping hides detail ("high" for crypto is a number you picked, not the user). "Notify me when BTC moves 3%" is hard to express. |
| **4. Admin-defined templates** | Alert types live in config as templates with parameters, e.g. "Earthquake above {magnitude}" or "{coin} moves more than {pct}%". The user picks a template and fills in the values. The matcher is still code, one per template. | ~2.5h (template config, parameter form, matchers) | You're building a small template system. It's flexible on paper, but each new template still needs a matcher written in code, so it adds a layer without saving work. |

### My pick: Option 1, typed rule per category

TypeScript checks the whole flow from the form to the API to the matcher, because the types are shared. Each matcher is a small pure function that's easy to unit-test, so evaluators can follow the logic. The UX is also clear for users. 2h is a reasonable share of 10–12h for the core entity.

**Strongest argument against it:** the brief says "flexible", and option 1 is deliberately not flexible on the source side. Adding a fourth category means editing the shared type, writing a matcher and adding form fields. If an evaluator reads "flexible" as covering everything, option 1 looks like hard-coding. Strictly, the brief asks for flexibility on *channels*, not sources, but that is an interpretation you would need to defend.

There's also a dependency: options 1 and 4 assume the categories from **A2**. If you plan to change the category list there, you may want to keep that in mind here.

Which option do you choose? Tell me your decision and any changes, and I'll update the A1 row.

---

## 🧑 User

Explain the 3rd option more since its the least "expensive" in time

## 🤖 Assistant

**Option 3 in detail: keywords + source severity**

All sources share one scale (`low` / `medium` / `high`). Each source adapter translates its own data onto that scale when it fetches events. A rule then only needs to say *which source*, *which words* and *how serious*.

### Data model

```ts
type Severity = 'low' | 'medium' | 'high';

interface Event {          // what every source adapter produces
  id: string;              // source's own ID, used for dedupe (A7)
  sourceId: string;        // 'usgs' | 'gdacs' | 'bbc-rss' | 'coingecko'
  title: string;
  summary: string;
  url: string;
  occurredAt: string;
  severity: Severity;      // set by the adapter
}

interface AlertRule {
  id: string;
  userId: string;
  name: string;
  sourceId: string;
  keywords: string[];      // empty = match everything
  minSeverity: Severity;
  channelIds: string[];
  active: boolean;
}
```

Matching is one rule for every source: same source, event severity ≥ the rule's minimum, and (no keywords, or any keyword appears in the title or summary). That's about 15 lines and easy to unit-test.

### How each source maps to severity

| Source | Native signal | low | medium | high | How well it fits |
|---|---|---|---|---|---|
| GDACS (disasters) | Alert level | Green | Orange | Red | Clean, the source already has the scale |
| USGS (earthquakes) | Magnitude | < 4.5 | 4.5–6 | ≥ 6 | Good, but the band edges are your choice |
| CoinGecko (crypto) | abs(24h % change) | < 3% | 3–7% | ≥ 7% | Works, but needs extra logic (see below) |
| News RSS | *nothing* | – | – | – | Weak, RSS has no severity |

### Keywords cover more than you'd expect

Adapters write descriptive titles, so keywords also handle selection:
- **Region:** USGS titles look like `M 6.1 – 20 km SW of Hualien, Taiwan`, so keyword `Taiwan` acts as a region filter.
- **Coin:** if the adapter writes `Bitcoin up 8.2% in 24h`, keyword `bitcoin` picks the coin.
- **Disaster type:** GDACS titles name the type (flood, cyclone…).

This takes over much of what option 1 needed extra fields for.

### Where the time goes

| Piece | Effort |
|---|---|
| Shared types | ~15 min |
| Matcher + unit tests | ~30 min |
| Alert form (source dropdown, keyword chips, severity select) | ~30–45 min |
| Severity mapping | ~10 min per adapter, but it lives in the A2 adapters you write anyway |

Most of the saving comes from having one form and one matcher instead of three of each.

### Weaknesses

1. **News has no severity.** You need to pick one approach: give all news items one fixed level and let keywords do the filtering, or hide the severity field for news. Either way, severity means nothing for news.
2. **Users can't set exact thresholds.** "Notify me at magnitude 5.2" or "BTC drops 4%" can't be expressed, and up vs down can't be separated without an extra field.
3. **The band edges are product decisions you're making for users.** They should go in a table in `decisions.md` so evaluators can see they were chosen on purpose.
4. **Markets need an event-generation rule.** Earthquakes and news are naturally separate events, but a price is a stream. The CoinGecko adapter has to decide when a move counts as an event (e.g. "crossed into the medium band, at most once per coin per day"). That's about 30–45 min of hidden work in A2, though option 1 has the same problem.

### Upgrading later

This option isn't a dead end. If you later want exact thresholds, you add an **optional** field like `minValue?: number` that overrides the severity band for numeric sources. The matcher is the only place that changes, plus one extra form field. Going from option 3 to option 1 is an addition, not a rewrite. That makes this lower risk than my first summary suggested.

### Revised view

Option 1 still gives users more control. Option 3 costs about half as much and can be extended without rework. The main thing to settle if you pick it is weakness 1, how news is handled.

What's your decision for A1, and if it's option 3, how should news severity work?

---

## 🧑 User

Let me check my understanding of this option (3rd):
In the first version, users can't choose or customise what they get alerted about —
the system decides. Later, we could add user-level control (e.g. picking sources,
keywords, or thresholds).

1. Is that correct? If not, what am I missing?
2. If we start this way, what would it take to add user control later?
3. Is there anything small I should build into the design NOW so that adding user control later stays cheap?

Keep the answer short. Don't decide for me.

## 🤖 Assistant

**1. Not quite.** In option 3 users *do* choose what they're alerted about. Each rule picks a **source**, its **keywords** and a **minimum severity**. What the system decides is only what "low / medium / high" means for each source: the band edges, e.g. "high = magnitude ≥ 6" or "high = crypto move ≥ 7%".

So the missing piece is user control over **exact thresholds**, not over sources or keywords. A user can say "high-severity earthquakes in Japan" but not "earthquakes above 5.2" or "BTC *drops* 4%".

**2. Adding threshold control later** means adding optional fields to the rule, e.g. `minValue?: number` and `direction?: 'up' | 'down' | 'any'`. Then:
- the matcher gets one extra check: if `minValue` is set, it overrides the severity band;
- the form shows a number field for numeric sources only.

About 1h, and existing rules keep working because the new fields are optional.

**3. Small things to build in now (~15 min in total):**
- **Keep the raw value on the event**, e.g. `metric?: { name: 'magnitude', value: 6.1, unit: 'M' }`, next to `severity`. Without it, thresholds can't be added later without changing every adapter.
- **Keep band edges in one config object per adapter**, not hard-coded in the mapping logic. Then changing them, or exposing them later, touches one place.
- **Give each source a small descriptor**, e.g. `{ id, label, hasMetric, metricName }`. The form reads it to decide which fields to show, so a threshold field later is just "show if `hasMetric`".
- **Write the matcher as a list of separate checks** (source, severity, keywords), so adding a threshold check is one more item in the list rather than a rewrite.

What's your decision for A1, including how news severity should work?

---

## 🧑 User

Lets keep the original option 3 since it is the most cost effective and can be expanded

## 🤖 Assistant

> _Tool: Grep – ^\| (#|A1 )|^\|---_

> _Tool: Bash – Add decision columns and fill the A1 row_

I added the two new columns, but filled them in only for the A1 row. Markdown shows the missing cells in other rows as empty, so I didn't need to edit them. I also set A1's Status to *Rejected (replaced by decision)*, because option 3 differs from the original default.

**Updated A1 row**

| # | Group | Ambiguity | … | Status | AI recommendation | My decision |
|---|---|---|---|---|---|---|
| A1 | A | What counts as "something important" | … | Rejected (replaced by decision) | Option 1, a typed rule per category (~2h). Argument against: categories are hard-coded, so each new source needs changes in three places. After the deep dive: option 3 is close, at about half the effort and extendable without rework. | **Option 3: keywords + source severity.** Rule = source + keywords + minimum severity (low/medium/high). Each source adapter translates its own data to severity. One matcher, one form. Lowest cost (~1–1.5h), and optional thresholds can be added later (~1h). **Still open:** severity for news, and the band edges (to go in `decisions.md`). |

Two things I didn't add, since you said "original option 3": the future-proofing hooks (keeping the raw value on the event, a source descriptor) and a decision on news severity. News severity comes up again below.

---

**A2: Which event categories and sources**

Now that A1 is decided, the event model is fixed. Every source has to produce `{id, sourceId, title, summary, url, occurredAt, severity}`. A2 decides which adapters you build.

| | How it works | Effort | Main risk |
|---|---|---|---|
| **1. Three categories, one source each** | USGS earthquakes (GeoJSON), BBC World RSS (news), CoinGecko (crypto). Covers every example in the brief. | ~2.5–3h (USGS ~30 min, RSS ~45 min, CoinGecko ~1h+ because a price stream has to be turned into events) | CoinGecko is the weakest link: low keyless rate limits, and it has been pushing free "demo" API keys, so keyless access should be checked first. |
| **2. Disasters + news only, no markets** | USGS + GDACS (floods, cyclones, volcanoes… with native green/orange/red levels) + BBC RSS. | ~2h | The brief names "market movements" directly. Leaving it out is a visible gap that you'd have to justify. |
| **3. Four sources** | Option 1 + GDACS. | ~3.5–4h | About a third of your remaining budget goes into data fetching rather than the alerting and admin features the brief is about. |
| **4. Generic RSS adapter only** | One adapter for any RSS/Atom feed (USGS and GDACS both publish feeds), with sources added by URL in config or the admin view. | ~1.5–2h | Each feed still needs its own severity mapping, so the "one adapter" saving is partly an illusion. Markets don't fit, since there's no good free market RSS. |

**My pick: Option 1.** It's the smallest set that covers all three examples in the brief. USGS also produces events every hour, including small quakes, so the live pipeline is visible during a review, not just through "simulate event".

**Strongest argument against it:** a third of the sources is also the riskiest one. CoinGecko needs extra logic to turn prices into events and may need a key. Also, USGS covers only earthquakes, while the brief says "natural disasters". GDACS would match the brief better and gives severity directly, but produces far fewer events.

**Linked open question from A1:** news severity. Since news is in every option, you may want to decide it together with A2. The choices are a fixed level for all news, hiding the severity field for news, or deriving it from words like "breaking" in the title.

What's your decision for A2, and for news severity if you want to settle it now?

---

## 🧑 User

About Option 2: my understanding is that it would let us add new event sources
later without reworking the existing system.

1. Is that correct? If only partly, what are the limits?
2. How does Option 2 compare to the other options on this specific point? Would any of them make adding sources just as easy?

Keep the answer short. Don't decide for me.

## 🤖 Assistant

**1. Only partly.** The ability to add sources later doesn't come from option 2. It comes from the **source adapter interface** that all four options share: every source turns its data into the same `Event` with a `severity`, so the matcher, channels and UI never need to know which source produced it. Adding a source = writing one new adapter and registering it.

Limits that apply to every option:
- A new source is still **code**: a fetch, a mapping to `Event`, and a severity mapping (~30–60 min each).
- A source that doesn't fit the existing pattern can force **interface changes**. Markets are the example: prices are a stream, so the adapter has to remember the previous state between polls to decide when something counts as an event.

**2. Compared with the others:**
- **Options 1 and 3:** just as easy to extend, since it's the same interface. They're actually *safer* on this point, because building CoinGecko now tests the interface against the hardest case (state kept between polls). With **option 2**, the interface is shaped only by "one feed item = one event" sources, so adding markets later is the most likely point where it would need rework.
- **Option 4:** the only one where adding *some* sources needs no code. Another RSS/Atom feed is just a config entry plus a severity mapping. That only holds for feed-shaped sources, and anything else still needs an adapter.

So option 2 makes the *first version* cheaper, not later additions easier.

What's your decision for A2?

---

## 🧑 User

Lets do option 1, but without CoinGecko for now. It keeps the MVP scope small.

## 🤖 Assistant

> _Tool: Bash – Fill AI recommendation and decision for the A2 row_

**Updated A2 row**

| # | Group | Ambiguity | … | Status | AI recommendation | My decision |
|---|---|---|---|---|---|---|
| A2 | A | Which event categories and sources | … | Rejected (replaced by decision) | Option 1: USGS + BBC RSS + CoinGecko (~2.5–3h). Covers every example in the brief, and USGS gives a steady stream of live events. Argument against: CoinGecko is the riskiest adapter, and USGS covers earthquakes only. | **Option 1 without CoinGecko: USGS earthquakes + BBC World RSS news.** Markets left out of the MVP to keep scope small. Accepted trade-offs: markets, one of the brief's examples, aren't covered; adding a stream-type source later may need interface changes. **Still open:** news severity (from A1). |

I wrote the two trade-offs into your decision cell because they follow directly from it. Edit them if you'd word them differently.

---

**A8: Users and roles**

This is how a request knows *who* is calling and whether they're an *admin*. It touches every endpoint, every route guard and the admin view.

| | How it works | Effort | Main risk |
|---|---|---|---|
| **1. User switcher (no auth)** | Seeded users with a `role` field. A dropdown in the header ("Acting as: Anna (user) / Admin") stores the chosen ID, an Angular interceptor sends it as a header, and backend middleware turns it into `req.user`. Admin routes check the role. | ~45 min–1h | It's openly fake: anyone can switch to admin. It must be labelled as a mock in the UI and the docs. |
| **2. Simple local login** | Email + password, hashed with bcrypt in the file store, JWT or session cookie. Login page, interceptor, route guards, logout, expired-session handling. | ~3–4h | About a third of the budget goes to something the brief doesn't ask for, and hand-written auth is easy to get subtly wrong. |
| **3. Passwordless magic link** | Enter an email, receive a sign-in link through your own email channel (Ethereal preview), get a token. | ~3h | Depends on the email channel being finished first. The reviewer flow is clunky: open the preview URL, click the link. |
| **4. Demo login buttons** | A login page with "Sign in as user" / "Sign in as admin". The backend issues a signed token for a seeded account, and real guards and an interceptor check it. No passwords. | ~1.5h | A middle ground: it shows the real frontend auth pieces (guards, interceptor, 401 handling) while still being a demo. Costs more than option 1 without making anything more secure. |

**My pick: Option 1.** Put all identity logic into exactly two pieces: a `CurrentUserService` in Angular and one middleware in the backend that sets `req.user`. Everything else reads from those, so real auth later replaces two pieces rather than going through the whole app.

**Strongest argument against it:** this is a **frontend** role. Route guards, an auth interceptor, a login flow and handling expired or unauthorized sessions are standard Angular skills an evaluator may look for, and option 1 shows almost none of them. The admin view would also be "protected" only by a dropdown. Option 4 costs about 45 min more and shows those skills.

What's your decision for A8?

---

## 🧑 User

Can option 1 replaced with real authetication later?

Confirm whether that's realistic with Option 1. If there are limits, name them.

Keep the answer short. Don't decide for me.

## 🤖 Assistant

**Yes, it's realistic, if the two-piece rule is followed from the start.** Real auth then mostly adds new pieces (login page, token handling, password storage) and swaps the two identity pieces. Very little existing code has to be rewritten.

**Limits:**
- **Endpoints must not take the user ID from the caller.** Use `/me/alerts`, not `/users/:id/alerts`, and never accept `userId` in a request body or query. Otherwise every endpoint has to change later, and in the meantime any user can read anyone's data.
- **The admin check must live in one place**: one `requireAdmin` middleware and one Angular route guard. If role checks are spread around components and handlers, swapping them is real rework.
- **Login flow UX is all new work**, not a swap: login page, logout, redirect after login, handling expired sessions and 401 responses. That's roughly the 3–4h of option 2, just postponed.
- **Small data change:** seeded users would need password hashes (or a link to an identity provider) and unique emails added later.
- **Tests and demo scripts** that set the "acting as" header would need updating.

What's your decision for A8?

---

## 🧑 User

Lets do option 1 then.

## 🤖 Assistant

> _Tool: Bash – Fill AI recommendation and decision for the A8 row_

**Updated A8 row**

| # | Group | Ambiguity | … | Status | AI recommendation | My decision |
|---|---|---|---|---|---|---|
| A8 | A | Users and authentication | … | Confirmed | Option 1: user switcher, ~45 min–1h, with identity in two pieces only. Argument against: shows almost no frontend auth skills, and the admin view is "protected" only by a dropdown. Option 4 (~1.5h) would show them. | **Option 1: user switcher (no auth).** Seeded users with a role, an "acting as" dropdown, an interceptor and one backend middleware, clearly labelled as a mock. Kept swappable by: identity only in `CurrentUserService` + one middleware; `/me/...` endpoints; admin check in one place. Accepted trade-off: login UX is postponed, not saved. |

Status is **Confirmed** because the original default was already the switcher. I included the swappability rules from my last answer as conditions. Remove them if you don't want to commit to them.

---

**A12: Channel abstraction ("flexible enough to add channels")**

The brief asks for this directly. It decides how email, Slack and future channels plug into delivery, and how their settings appear in the UI. The actual email and Slack sending is A10/A11 (Group B).

| | How it works | Effort | Main risk |
|---|---|---|---|
| **1. Interface + registry + generated form** | Backend: `NotificationChannel { type, label, fields, validate(config), send(notification, config) }`, registered in a map. `GET /channels` returns each channel's fields (`key, label, type: text/email/url, required`). Angular builds the settings form from that list. A new channel = one backend file. | ~1.5–2h (excluding the email/Slack sending itself) | Generating forms from metadata in Angular costs more than hand-written forms and gives a plainer UX. |
| **2. Interface + registry + hand-written forms** | Same backend. Angular has one small settings component per channel type, picked by `type`. A new channel = one backend file + one component. | ~1–1.5h | "Add a channel" also needs frontend work, so the flexibility is less visible to evaluators. |
| **3. Everything is a webhook** | One generic channel: an HTTP POST with a URL and a payload template. Slack is just a preset. | ~1.5h | Email isn't HTTP locally (SMTP/Ethereal), so email remains a special case. The abstraction leaks right away. |
| **4. Event bus** | Delivery publishes a "notification ready" event, and each channel subscribes as a listener. Ready for a queue later. | ~2h | Indirection with no benefit at this scale, and per-channel delivery status (A16, A17, admin log) is harder to collect. |

**My pick: Option 1**, with a deliberately tiny field format (a plain list of fields, no JSON Schema library). It shows the brief's requirement working end to end: drop in one backend file and the new channel appears in the UI with a working settings form. That is the most convincing proof of "flexible" an evaluator can see.

**Strongest argument against it:** with only two channels, a form generator is speculative. You build a general mechanism for two cases (YAGNI, "you aren't gonna need it"), spend extra time on it, and get a less polished UX than hand-written forms. Option 2 keeps the same backend extension point, which is the part the brief actually asks for, at less cost.

What's your decision for A12?

---

## 🧑 User

Go with Option 1

## 🤖 Assistant

> _Tool: Bash – Fill AI recommendation and decision for the A12 row_

**Updated A12 row**

| # | Group | Ambiguity | … | Status | AI recommendation | My decision |
|---|---|---|---|---|---|---|
| A12 | A | "Flexible enough to add channels" | … | Confirmed | Option 1: interface + registry + generated form, ~1.5–2h, with a tiny field list. Argument against: with two channels a form generator is speculative (YAGNI). Option 2 keeps the same extension point for less. | **Option 1: interface + registry + generated form.** A new channel = one backend adapter file, which the UI picks up from `GET /channels`. Minimal field format. |

---

**A13: Where channel targets are stored**

This decides where "send to anna@example.com" or "this Slack webhook" is saved: on the user, or on each alert. It shapes the data model, the alert form and the channel settings screen.

| | How it works | Effort | Main risk |
|---|---|---|---|
| **1. Per-user channel connections** | Each user has a list of `ChannelConnection { id, type, label, config }`, e.g. "Work email" or "#alerts Slack". The config is the A12 generated form. Alerts pick one or more connection IDs. | ~1–1.5h (connections screen + picker in the alert form) | One more screen with full create/edit/delete. You also have to decide what happens when a connection that alerts use is deleted. |
| **2. Per alert, inline** | Each alert stores `channels: [{ type, config }]` directly. The generated form is embedded in the alert form. | ~45 min | Users re-enter the same email or webhook on every alert, and changing a webhook means editing every alert. There's no single place for "send test" (A18). |
| **3. One target per channel type per user** | The user profile holds `channelConfig: { email: {...}, slack: {...} }`. Alerts just tick checkboxes for channel types. | ~45 min–1h | Only one target per type, so different alerts can't go to different Slack channels or email addresses. |
| **4. Hybrid** | Per-user connections (option 1) plus an optional per-alert override. | ~2h | The most flexible, but also the most edge cases. Too much for the MVP. |

**My pick: Option 1.** It fits the A12 decision: a connection is just "a channel type + its generated config". It also gives one clear place for "send test notification" (A18), and gives the delivery log (A16, A17, admin) a clear target to report against ("sent to *Work email*").

**Strongest argument against it:** in the MVP, most users will have exactly one email and one Slack webhook. Option 3 covers that with less UI, no screen with full create/edit/delete, and no deleted-connection edge case. It could later be extended to multiple connections by turning each type's single config into a list.

What's your decision for A13?

---

## 🧑 User

Let go with option1, I had a similar idea.

## 🤖 Assistant

> _Tool: Bash – Fill AI recommendation and decision for the A13 row_

**Updated A13 row**

| # | Group | Ambiguity | … | Status | AI recommendation | My decision |
|---|---|---|---|---|---|---|
| A13 | A | Where channel targets are stored | … | Confirmed | Option 1: per-user channel connections, ~1–1.5h. Fits A12 and gives one place for "send test" and the delivery log. Argument against: most MVP users have one email + one webhook, so option 3 needs less UI and has no deleted-connection edge case. | **Option 1: per-user channel connections.** One screen to manage connections, and each alert picks one or more. **Still open (Group B):** what happens to alerts when a connection they use is deleted. |

---

**A20: Backend stack and repo layout (last Group A item)**

This is a technical decision rather than a product one. Once code exists it can't be swapped cheaply, and it decides the reviewer's setup ("one install, one start command").

| | How it works | Effort | Main risk |
|---|---|---|---|
| **1. npm workspaces monorepo** | `apps/web` (Angular CLI), `apps/api` (Express + TS run with `tsx`, no build step), `packages/shared` (types). Root `npm install` then `npm start` runs both with `concurrently`; the Angular dev server proxies `/api` to the backend. | ~1h | Small friction between Angular CLI and workspaces, e.g. resolving the shared package (path mapping or a build step) and hoisted dependencies. |
| **2. Nx monorepo** | Nx generators for the Angular and Node apps plus a shared lib, with build caching and dependency-graph tooling. | ~1–1.5h, more if Nx is new to you | Heavy tooling for a small project: big `node_modules`, Nx-specific config, and reviewers have to understand Nx to navigate the repo. |
| **3. Two plain folders + shared folder** | `web/`, `api/`, `shared/` with no workspace tooling. Shared types are imported through a tsconfig path. A root script installs and starts both. | ~30–45 min | Importing TS from outside the Angular project needs tsconfig and Angular config tweaks. Two `node_modules` folders and a hand-written root script are a weaker "minimal setup" story. |
| **4. One Angular full-stack server** | Use the Express server that ships with `@angular/ssr` (or AnalogJS API routes) to host the API too. | ~1h | Mixes SSR with the API, and the polling scheduler running inside an SSR server is an odd fit. AnalogJS is less familiar to reviewers. |

**Smaller sub-choice: Express vs Fastify.** Express is more familiar and simpler. Fastify has built-in request validation. Either works with any layout above.

**My pick: Option 1 with Express.** It's the standard TypeScript full-stack layout. It gives a real shared types package (which A1, A12 and A13 all rely on), one install and one start command, and no extra framework for reviewers to learn. Running TS with `tsx` avoids a backend build step.

**Strongest argument against it:** npm workspaces + Angular CLI is the setup most likely to cost an unplanned hour, if shared-package resolution or dependency hoisting misbehaves (on Windows especially). Option 3 avoids workspace tooling altogether, and with only one shared folder of types, a tsconfig path may be all you really need.

**Whichever you pick:** recent Angular versions need a recent Node version. Pin it in `.nvmrc` / `engines` so the reviewer gets a clear error rather than a confusing build failure.

What's your decision for A20?

---

## 🧑 User

lets go with option 1

## 🤖 Assistant

> _Tool: Bash – Fill AI recommendation and decision for the A20 row_

I recorded your A20 decision in [assumptions.md](docs/assumptions.md). That was the last Group A item, so all six now have a recommendation and your decision.

**Updated A20 row**

| # | Group | Ambiguity | … | Status | AI recommendation | My decision |
|---|---|---|---|---|---|---|
| A20 | A | Backend/runtime stack | … | Confirmed | Option 1: npm workspaces monorepo with Express, ~1h. Argument against: workspaces + Angular CLI is the setup most likely to cost an unplanned hour; option 3 avoids that tooling. Also advised: pin the Node version. | **Option 1: npm workspaces monorepo with Express.** `apps/web`, `apps/api`, `packages/shared`; one install, one start command. |

The Node version pin is in the AI recommendation column only, since you didn't explicitly adopt it.

**Group A decisions**

| # | Decision |
|---|---|
| A1 | Keywords + source severity (low/medium/high) |
| A2 | USGS earthquakes + BBC World RSS news, no markets in the MVP |
| A8 | User switcher, built so real auth can replace it later |
| A12 | Channel interface + registry + generated settings form |
| A13 | Per-user channel connections, picked by each alert |
| A20 | npm workspaces monorepo with Express |

**Still open, recorded in the rows**
- **News severity (A1/A2):** RSS has no severity. This directly affects the matcher and the news adapter, so it's worth deciding before coding.
- **Severity band edges (A1):** the USGS magnitude bands, to be written up in `decisions.md`.
- **Deleted connections (A13):** what happens to alerts whose connection is deleted. This is Group B and can wait until you build that screen.

Nothing is committed. Next, I'd settle news severity, then decide whether to go through Group B the same way or start the plan.

---

## 🧑 User

Export this chat to process/prompts/phase-01-planning.md
