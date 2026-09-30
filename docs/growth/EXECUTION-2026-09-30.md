# Problem discovery → proof → own-project trial

First execution, 2026-09-30. This supersedes the old leaderboard-first launch premise as a
recommendation, preserving old launch notes as history. Changes here do not certify market fit.

## First published unit

`/fix-ui-spacing`: one answer to “Why is my AI-generated UI spacing wrong?” including Korean
problem language, a live 64px→12px nested-token regression, exact source, same content, a practical
prompt, install/update steps, and a share link/card. The fixed CSS comes from the canonical engine;
before deliberately recreates the old inheritance behavior. Synthetic example, no customer/model
quality claim. FAQ, home question list, guides, sitemap, and llms answer catalog lead to the unit.

## Distribution experiment

Prepare Korean Threads and English developer-community drafts. Each contains one concrete failure,
one observable repair, a reproducible example, and a request for the reader's real problem. No HN
text is generated; HN writing is reserved to a person. Community/social posting is pending a chosen
channel/account and its actual posting authorization. Site deployment is separately verified.

First hook: “Our spacing rule leaked 64px into a child screen that owned 12px.” Preserve the cause
rather than claiming a prettier UI from shrinking everything. Screenshot/video must show before
and after at the same viewport with the synthetic label visible. Use the page's generated share card.

Second unit only after observation: missing/cyclic token collapses a gap to zero. Third: control
wrap despite no horizontal overflow. Reuse a verified defect, not a new aesthetic pack. Each new
unit needs independent source/renderer evidence and accurate applicability; it is not approved yet.

## Baseline and interpretation

GitHub API read-back 2026-09-30: 968 stars, 89 forks; rolling 14-day views=1017, unique visitors=448;
clones=3815, unique cloners=1196. Clones may include automation and repeated downloads. Do not infer
active users or conversion from these totals or compare overlapping periods as disjoint cohorts.

Named Vercel events on the proof page: `spacing-proof-view`, `spacing-proof-before`,
`spacing-proof-after`, `spacing-proof-share-copy`, `spacing-proof-prompt-copy`,
`spacing-proof-install-copy`. Copy events require clipboard success; blocked copy stays a fallback,
not a conversion. Events contain no screenshot, tokens, copied text, query, or measured CSS values.
Event code and UI behavior are tested; live ingestion/dashboard availability is not established.
Repeated event counts are not unique people. No new analytics account or secret is created.

Over 14 days or the first 100 observed page visits (operational sampling target, not proven demand):
- inspect search questions/landing pages and channel referrers where permission/data exists;
- compare unique sessions for viewing the fixture, switching after, and successful prompt/install
  copies only if the analytics tool supports that grouping;
- retain actual user reports of completed installation + rendered own-project before/after;
- count repeat use on another screen separately from first trial.
No copy event or clone means completed installation. Without tool access, record metrics as unknown.
Do not fabricate dashboards, conversion percentages, citations, or search-volume ranks.

Proposed continuation decision: expand when several independent readers complete a project trial
and can name useful fixes; repair onboarding if proof interaction happens but trials repeatedly
stall; revise the hook/distribution if few qualified people reach the proof. These are hypotheses,
not historical validated thresholds or mandatory user decisions.

## GEO work

Write the question's direct answer in server-rendered body text and keep evidence, canonical URL,
internal links and visible structured data aligned. Use llms.txt for agent guidance, not a promise
of search/AI inclusion. [Google guidance](https://developers.google.com/search/docs/appearance/ai-features)
requires no special AI file/markup and emphasizes readable content, internal links and ordinary
SEO accessibility. [Bing AI Performance](https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c)
can expose cited pages and grounding context; access/data availability must be checked separately.
Search Console/Bing private metrics and consumer-answer citation samples are not measured here.

## Pixelmind ownership and next action

See [Vision Engine recovery and work order](PIXELMIND-NEXT.md). Prioritize the artifact-bound
review contract and preservation counterexamples before a ranking relaunch/paid automatic gate.
Pixelmind is a separate session; no mutable runtime or repository changes occurred in this run.
