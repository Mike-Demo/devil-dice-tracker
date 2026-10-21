# Custom design system (TanStack Start)

A deliberately bare [TanStack Start](https://tanstack.com/start) + React starter
for building a design system from scratch. No CSS framework, no component
library, no theme tokens — just a router, a blank page, and a plain-CSS reset.
Bring your own styling approach.

## What's (intentionally) not here

- No Tailwind, no PostCSS, no `components.json`
- No shadcn/ui or Radix primitives
- No theme tokens or design system — `src/styles.css` is a minimal reset

## Stack

- TanStack Start + TanStack Router (file-based routing under `src/routes/`)
- React 19 + TypeScript
- TanStack Query, Zod, Recharts, date-fns

## Develop

```sh
bun install
bun run dev
```

## Security audit triage — 2026-10-21

Parent: [Mike-Demo/devil-dice-tracker#1](https://github.com/Mike-Demo/devil-dice-tracker/issues/1).
Issue creation is unavailable in this session; the four title/body blocks below
are ready to file in this repository. No child issues have been created.
This is a documentation-only backlog, not an implementation of the fixes.

### Scope and priority

The parent reports three confirmed medium findings from static inspection.
Its game-overwrite evidence explicitly references audit revision
`1410cd1dd44f7f4f5821282eb4002f932793ad15`. The checkout reviewed for this
triage is `22031c6feb9e48c18a7c33282b93dff0f943e36d`, which already contains
mitigations. Historical audit evidence below is attributed to the parent,
not represented as unchanged current behavior. No application code was executed
and no deployed endpoint was probed for this triage; deployment and regression
verification are still required before closing the remediation issues.

| Order | Confirmed audit finding | Risk, reachability, and fix scope |
| --- | --- | --- |
| 1 | **Medium:** Unauthenticated game-state overwrite | A holder of the shared game code could replace the entire saved game, including status and roster linkage. This is the broadest write primitive and can undermine the saved-state trust needed by result recording. Separate edit authority and real state validation must precede treating stored results as trustworthy. |
| 2 | **Medium:** Roster membership tampering | A holder of the widely shared roster code could add or delete roster members. Direct destructive access to a shared roster needs no game lifecycle precondition. A separate admin secret is the smallest, most localized authorization fix. |
| 3 | **Medium:** Forged results poison career statistics | A caller with a game code could submit arbitrary names and statistics, including for unfinished games; roster poisoning additionally depends on the game being roster-linked. Server-side derivation and a finished-state check are focused fixes, but their integrity depends on protecting the stored game in priority 1. |

All three have the same reported severity. The order reflects reachable impact
and prerequisites first, then fix size/safety; the small roster authorization fix
can proceed independently. They share a theme—lower-trust input reaching
service-role writes—but are **not one root cause**: game edit authorization/state
validation, roster administration authorization, and result derivation/lifecycle
checks require separate controls and acceptance tests. Keep one issue per finding.
The two leads below are unconfirmed and receive no severity or confirmed-risk rank.

### Ready-to-file remediation issue 1

**Title:** `[security][medium] Restrict game-state overwrites to authorized editors`

**Body:**

Parent audit: https://github.com/Mike-Demo/devil-dice-tracker/issues/1

Fingerprint: `unauthenticated-game-state-overwrite-by-share-code`

Priority: 1 of 3 confirmed findings. Severity: medium (audit classification).

**Evidence and impact (audit snapshot):** The parent records `upsertGame`
lines 60–95 at `1410cd1dd44f7f4f5821282eb4002f932793ad15`: POST accepted
`stateSchema` containing an optional code and arbitrary `z.record(z.unknown())`
state, then updated state/status/island/roster linkage using only the shared
six-character game code. A TypeScript cast to `Game` provided no runtime
validation. The service-role client bypasses RLS; the audit found no attached
authentication or ownership check. Any share-code holder could replace the
entire saved game without editor authority.

**Root cause:** A read/share identifier doubled as write authority, and arbitrary
caller state was treated as a valid engine state.

**Smallest fix:** Issue a separate random per-game edit secret at creation, keep it
in the creator's local storage, and require it alongside the share code for
updates. Validate state on both insert and update against a runtime schema
matching the real `Game`/engine invariants; derive persisted status/island from
validated fields. Preserve roster linkage only with separate roster authority.
Never include private secrets in shareable state or read responses.

**Current-source status:** [Current handler and schema](https://github.com/Mike-Demo/devil-dice-tracker/blob/22031c6feb9e48c18a7c33282b93dff0f943e36d/src/lib/cloud.functions.ts#L27-L151)
already generate/check edit keys and require roster authority for linkage.
However, state remains `z.record(z.unknown())` and is cast to `Game`.
`checkKey` also allows first-key claiming of legacy rows with null keys.
Finish state validation and verify the existing authorization and legacy-row
policy rather than reimplementing the mitigations or claiming this is resolved.

**Acceptance checklist:**
- [ ] Direct update calls with only a share code, a missing key, or a wrong key cannot change any game field; valid editor updates still work.
- [ ] Malformed state is rejected on insert and update before persistence; status/island match validated engine fields.
- [ ] Read/share responses expose no edit or roster secret; a read-only recipient cannot acquire editor authority.
- [ ] Legacy null-key rows have an explicit safe migration/recovery policy; share-code holders cannot silently claim ownership.
- [ ] Unauthorized roster reassignment is rejected or leaves the existing linkage unchanged; authorized linkage and normal create/load/sync still work.
- [ ] Confirm the required migration and handler changes are deployed, then verify the above with isolated test data.

### Ready-to-file remediation issue 2

**Title:** `[security][medium] Separate roster administration from shared roster codes`

**Body:**

Parent audit: https://github.com/Mike-Demo/devil-dice-tracker/issues/1

Fingerprint: `roster-membership-tampering-by-roster-code`

Priority: 2 of 3 confirmed findings. Severity: medium (audit classification).

**Evidence and impact (audit snapshot):** The parent records `addRosterPlayer`
lines 174–190 and `removeRosterPlayer` lines 191–201 resolving `rosterCode` via
`rosterIdForCode`, then upserting/deleting `public.players` through the
service-role client without another credential, role, or confirmation.
The roster UI exposed those same operations to anyone loading the roster;
UI availability was not an authorization boundary. Anyone holding the shared
read/join code could alter roster membership.

**Root cause:** A widely shared read credential silently conferred destructive
roster administration privileges.

**Smallest fix:** Generate a separate roster admin secret in `createRoster`, keep
it only in the creator's local storage, and verify it server-side for both
`addRosterPlayer` and `removeRosterPlayer`. Keep roster codes read-only for
`getRosterStats` and joining; do not disclose the secret to readers.

**Current-source status:** [Current roster handlers](https://github.com/Mike-Demo/devil-dice-tracker/blob/22031c6feb9e48c18a7c33282b93dff0f943e36d/src/lib/cloud.functions.ts#L242-L304)
already issue keys and call `ownedRosterId` for membership changes.
Verify these controls and deployment rather than duplicating them.
The shared [key-check helper](https://github.com/Mike-Demo/devil-dice-tracker/blob/22031c6feb9e48c18a7c33282b93dff0f943e36d/src/lib/cloud.functions.ts#L39-L59)
allows first-key claiming of null-key legacy rows; a safe migration/recovery
policy is part of verifying that a roster code is genuinely read-only.

**Acceptance checklist:**
- [ ] Direct add/remove requests with only the roster code, or with an incorrect admin secret, cannot modify membership.
- [ ] A creator with the valid secret can add/remove players; read-only clients can still view statistics and join without gaining administration rights.
- [ ] Creation stores the secret locally for the creator; shared reads/exports do not reveal it.
- [ ] Legacy null-key rosters cannot be claimed by arbitrary share-code holders; document a safe migration/recovery policy.
- [ ] Confirm migration and handler deployment, and verify authorization independently of UI controls with isolated test data.

### Ready-to-file remediation issue 3

**Title:** `[security][medium] Derive finished-game results from trusted saved state`

**Body:**

Parent audit: https://github.com/Mike-Demo/devil-dice-tracker/issues/1

Fingerprint: `forged-game-results-poison-roster-stats`

Priority: 3 of 3 confirmed findings. Severity: medium (audit classification).
Dependency: coordinate with “Restrict game-state overwrites to authorized editors”
above; deriving statistics from attacker-overwritable state is not sufficient.

**Evidence and impact (audit snapshot):** The parent records `resultsSchema`
lines 32–45 accepting integer points without minimum/maximum (including negative
points) and `longestRoad` with only a zero minimum. `recordResults` lines 117–160
selected only game id, roster id, and island, without checking finished status,
reading saved state, or verifying participants. Submitted names were upserted
into the roster and submitted results persisted through the service-role client.
The honesty check in `cloudSync.pushResults` was client-side and bypassable by
direct requests. A game-code holder could falsify career statistics and inject
names into the linked roster without actually finishing a game.

**Root cause:** The privileged result handler trusted caller-provided names,
points, longest road, and winner flags instead of authoritative game lifecycle
and engine-derived standings.

**Smallest fix:** Require the saved game's status to be `finished`; load its
validated state and compute names, points, road values, and winners server-side
using the engine functions formerly used by `cloudSync.pushResults`.
Do not accept result overrides or names absent from the saved game's sheets.
Protect and validate that saved state as covered by priority 1.

**Current-source status:** [Current result handler](https://github.com/Mike-Demo/devil-dice-tracker/blob/22031c6feb9e48c18a7c33282b93dff0f943e36d/src/lib/cloud.functions.ts#L172-L239)
already reads saved state/status, checks finished status, and derives standings
with engine functions; [its input schema](https://github.com/Mike-Demo/devil-dice-tracker/blob/22031c6feb9e48c18a7c33282b93dff0f943e36d/src/lib/cloud.functions.ts#L69)
accepts only a code. Verify these mitigations and deployment. Saved state is still
cast to `Game` with only a shallow sheets/status check here, so coordinate runtime
state validation rather than declaring all saved values trustworthy.

**Acceptance checklist:**
- [ ] Direct requests cannot record results for unfinished or missing games.
- [ ] Submitted names/points/road/winner overrides cannot affect persisted results; only participants in the saved sheets contribute results.
- [ ] Both island scoring modes, winner/tie handling, and AI exclusion match engine behavior.
- [ ] Malformed saved state fails safely without player/result writes, and unauthorized callers cannot forge it through game updates.
- [ ] Repeated recording remains idempotent per game/name; legitimate finished-game statistics remain correct.
- [ ] Confirm deployment and verify the result path together with game-state authorization/validation using isolated test data.

### Ready-to-file needs-validation checklist issue

**Title:** `[security][needs-validation] Audit leads to validate`

**Body:**

Parent audit: https://github.com/Mike-Demo/devil-dice-tracker/issues/1

These are unconfirmed leads, not findings. No severity is assigned.
Deployment facts outside this repository are needed; static inspection alone
does not establish exploitability. Obtain operator configuration evidence first;
any runtime checks require authorization and isolated, quota-safe test data.

- [ ] **Captcha not enforced on cloud writes; edge rate-limiting unknown**
  - Fingerprint: `captcha-not-enforced-on-cloud-writes`
  - Audit lead: captcha verification was only consumed client-side before local
    game creation; cloud writes, including input-free `createRoster`, had no
    captcha/auth/rate-limit control in source. Scripted creation spam may be
    possible without edge controls. Current write keys do not establish creation
    rate limits.
  - **Exact missing fact:** Whether the deployed Cloudflare Worker / edge in front of the TanStack server functions enforces any per-IP rate limiting, WAF rule, or request quota on the createRoster/upsertGame endpoints (deployment configuration outside this repository; wrangler.jsonc declares none).
  - Collect the deployed rules, endpoint coverage, thresholds, and enforcement
    evidence from the operator; record whether creation requests are actually
    protected and reject, close, or promote the lead based on that evidence.

- [ ] **Unbounded game-state JSONB storage with unknown deployed body-size limit**
  - Fingerprint: `unbounded-game-state-jsonb-storage`
  - Audit lead: `stateSchema` accepts arbitrary records without serialized-size,
    depth, or shape bounds, and `upsertGame` persists the cast state as JSONB on
    insert/update. Oversized storage depends on what the deployed stack accepts.
  - **Exact missing fact:** The deployed maximum accepted request-body size for the server functions (Cloudflare Worker/TanStack limit, plus any Supabase jsonb/row limit in the deployed project) — i.e. whether a payload materially larger than a legitimate game state can actually be persisted via upsertGame.
  - Obtain effective limits across all layers and compare with legitimate game
    sizes; if authorized, use a bounded isolated persistence check rather than a
    production stress test. Record accept/reject and persistence evidence, then
    reject, close, or promote the lead accordingly.

For each lead, record the configuration/deployment revision, evidence date,
missing-fact answer, and disposition in this checklist issue. If promoted, file
a separate evidence-backed finding and link it to this issue and the parent.

The rejected candidate `preview-postmessage-props-no-origin-check` is excluded
from the backlog and must not be reopened without new evidence.
