@AGENTS.md

# CLAUDE.md — Golf Round Analyser

Project context for Claude Code. Read this first every session. The decisions
below are settled — don't re-open them without being asked. Where something is
genuinely open it's marked **TBD**.

## What this is

A personal web app to upload, store and analyse golf round data — spotting
trends over time, comparing rounds, and analysing performance at the hole level.
Single user for now (the owner); multi-user sharing is a deliberate later phase.

## Tech stack

- **Next.js** (App Router)
- **Supabase** — Postgres + Auth (single-user now, RLS from day one)
- **Vercel** for hosting
- **Charts:** Recharts preferred; Chart.js acceptable (owner has used it before).
  Charts must be polished and interactive — this is a priority, not a nice-to-have.
- **Styling:** CSS Modules (no Tailwind). Design tokens as `:root` CSS custom
  properties in `app/globals.css`. Radix UI unstyled primitives for interactive
  components, installed per-component as needed (not `@radix-ui/themes`).
- **Tooling:** Cursor for tight inline edits, Claude Code for agentic multi-file work.

## Foundational principle: holes are the source of truth

The hole is the atom. Everything else is **derived** and never stored as
authoritative:

- Round-level totals (gross, putts, GIR count, vs par) derive **up** by
  aggregating the holes.
- Hole-level trends (same hole over time, par-type and stroke-index analysis)
  derive **across** by regrouping holes from many rounds.

Only ever store raw hole inputs. Compute the rest with pure, tested functions.
Do not persist any stat that can be recomputed — it will drift.

## Data model: courses as templates, rounds as snapshots

Two collections.

**Courses** are reusable templates, defined **per tee**, holding the fixed
layout. They exist to pre-fill round entry (lighter typing) — they are NOT the
authoritative record of how any round played.

**Rounds** reference a course but **snapshot** the layout they played into the
round itself. This is load-bearing: re-rating a stroke index or re-measuring a
tee next season must never rewrite a historical card. The snapshot freezes
par/SI/yards as played.

**Round length:** a round is **9 or 18 holes**. The `holes` array holds only the
holes actually played and its length is authoritative — there is no hardcoded 18
anywhere in the code. A nine may be a standalone 9-hole course or the front/back
nine of an 18-hole template; either way the real card hole numbers are stored
(front nine → 1–9, back nine → 10–18), so the same holes line up across 9- and
18-hole rounds for same-hole comparison.

**A nine played on part of an existing course MUST reuse that course's template
and `course_id`, recording a subset of its holes — never a separate "front 9"
course.** That shared id is the entire mechanism by which a front-nine round pools
with the same holes in your 18-hole rounds; a different id makes the same-hole
comparison silently return nothing, which is the worst kind of bug. (Exception: a
venue that officially rates its nine as a distinct course with its own stroke
indexes 1–9 genuinely *is* a different course entity — separate id is correct
there, and it won't auto-pool, which is the right behaviour.)

```
courses (one row per course+tee)
  id            uuid
  user_id       uuid
  name          text
  tee           text
  course_par    int
  total_yards   int
  slope_rating  numeric  -- nullable, per tee; enables a computed course handicap
  course_rating numeric  -- nullable, per tee
  holes         jsonb    -- [{ hole, par, si, yards }, ...]  (9 or 18 entries)

rounds
  id              uuid
  user_id         uuid
  played_at       date
  course_id       uuid     -- references the template used
  handicap_index            numeric  -- the player's index for this round; course handicap
                            -- is COMPUTED from this + the course's slope/course rating
  course_handicap_override  int?     -- null = compute from index + slope/rating;
                            -- set when a handicap committee issued a specific course handicap
  holes                     jsonb    -- only the holes actually played (9 or 18), each:
                            -- { hole, gross, putts, accuracy, teeClub, sandShots, penalties }
                  -- a 9-hole round may record a subset of an 18-hole template
  course_snapshot jsonb    -- frozen layout for the holes played; freezes the
                  -- slope/course rating used, so net stays reproducible if the
                  -- course is later re-rated
                  -- { name, tee, coursePar, totalYards, slopeRating, courseRating,
                  --   holes: [{ hole, par, si, yards }, ...] }
```

### Hole score fields

Stored per hole in `rounds.holes`:

- `hole` — hole number (1-based)
- `gross` — strokes taken
- `putts` — putts taken
- `accuracy` — tee shot result: `hit | left | right | short | long`
- `teeClub` — club used off the tee: `Driver | 3W | 4W | 5W | Hybrid | 2i–9i | Pw | Sw | Lw | Putter` (nullable — null means not recorded)
- `sandShots` — count of bunker shots on the hole (nullable — `null` = not recorded, `0` = confirmed none played)
- `penalties` — count of penalty strokes (nullable — same null/0 distinction as sandShots)

### Why JSONB holes (not separate hole rows)

A round is a document — its 9 or 18 holes created, read and computed-over
together. JSONB keeps a round atomic (one read/write, no joins), makes
snapshot-on-write trivial, and keeps schema changes in code (add a key with a
default — no migration). The correctness spine lives in app-side validation +
tested derivations, not DB constraints. Hole-level analysis runs in JS over
whole-round reads, so we never need SQL to query individual holes at this scale.

## Stored inputs vs derived

**Stored per hole:** `hole, par, si, yards` (in the snapshot/template) and
`gross, putts, accuracy, teeClub, sandShots, penalties` (in the round).

**Stored at course/round level:** `slope_rating` + `course_rating` per tee (on
the template, snapshotted onto each round) and `handicap_index` per round. These
exist so **course handicap and net are computed**, never hand-stored.

**Derived (never stored):** GIR, course handicap, net, three-putts, scrambles,
fairway %, score vs par, front/back splits, all round totals and aggregates.

## Derivation rules (implement as pure functions, unit-tested)

- `strokesToGreen = gross - putts`
- `GIR = strokesToGreen <= (par - 2)` — derived, never stored.
- `threePutt = putts >= 3`
- `scramble = !GIR && gross <= par`
- **Fairway in regulation (FIR):** `accuracy === 'hit'`, counted only on par ≥ 4
  holes. `fairwayPct = FIR holes / (count of par-4 and par-5 holes)`.
- **Tee-shot direction:** `accuracy` ∈ `hit | left | right | short | long`,
  recorded on all holes. `short` and `long` are misses (not FIR) and count toward
  the miss bucket in fairway accuracy. Direction accuracy can be reported across
  all holes separately from FIR — they answer different questions.
- `vsPar(hole) = gross - par`; round vs par = sum.
- **Course handicap (computed, WHS):**
  `courseHandicap = round( handicapIndex × (slope / 113) + (courseRating − par) )`,
  using the round's snapshotted slope, course rating and par. If ratings are
  absent, net is not computed and not shown.
- **Net:** allocate the round's course handicap by stroke index across the holes
  played — `base = floor(strokes / holeCount)` on every hole, then one extra on
  the lowest stroke-index holes until the strokes are used up.
  `net(hole) = gross - strokesReceived(hole)`. One consistent allocation per round.
- **Historical rounds** (the three seeded rounds) have `handicap_index: null` —
  the 29.8 figure was produced *from* these rounds, not pre-existing. Net is not
  computed for them and not shown.
- **Front/back splits apply to 18-hole rounds only** (front = 1–9, back = 10–18);
  skip them for nines.

## Validation (run on every import and manual entry)

Reject or flag, don't silently accept:

- the round has 9 or 18 holes (`holes.length` ∈ {9, 18})
- stroke indexes are unique and within the template's range
- hole pars sum to the recorded par for the holes played
- `gross >= 1`, `putts >= 0`, `accuracy ∈ {hit, left, right, short, long}`

## Comparison features (first-class)

- **Same-course** rounds group by `course_id`.
- **Same-hole over time** is keyed on `course_id` + hole `number`.
- A **hole-projection layer** — flatten rounds into an annotated flat hole list
  (`hole` + its round's `date`, `course_id`, and snapshot `par/si/yards`) — is
  core infrastructure, built and tested early.
- **Hole count is a first-class filter.** Never plot 9-hole and 18-hole totals on
  the same trend axis. Rules:
  - If only one format exists in the data, show that format with no selector UI.
  - If both 9-hole and 18-hole rounds exist, show a **format selector** (9-hole /
    18-hole / Combined). Default to 18-hole.
  - **Combined** normalises count stats to per-hole rates (e.g. putts/hole,
    GIR/hole) so the formats are comparable. Absolute totals (gross, vs par) are
    not shown in Combined view.
  - The format selector is **deferred** — only one format currently exists in the
    data. Build it when a second format is first logged.
- **Sparklines and round-over-round deltas render only at ≥ 3 rounds.** Two
  points imply a direction they haven't earned.

## Architecture seams

- **Repository interface** is the only thing that touches storage:
  `getRounds() / getRound(id) / saveRound(round) / deleteRound(id) /
  getCourses() / saveCourse(course)`. Charts, derivations and comparison views
  never call Supabase directly — they go through the repository.
- **Derivations** are pure functions over rounds; identical regardless of where
  data is stored. New derivation functions require unit tests in
  `lib/derivations.test.ts` before any UI consumes them.
- This seam exists so the data layer stays swappable and the compute layer stays
  trivially testable.

## Auth & security

- Single user now, but build it properly: every row carries `user_id`, with
  Supabase **Row-Level Security** enforcing `user_id = auth.uid()` from day one.
- Sharing / multi-user is a later phase and extends this foundation — it must
  never require a migration of the ownership model.

## Phase plan

1. **Foundation & data layer** ✅ — Supabase schema, single-user auth, repository
   module, seed data imported, derivation + hole-projection functions with unit
   tests, minimal UI (sign in, list rounds).
2. **Trends dashboard** 🔄 — cross-round charts: gross, vs par, putts, GIR,
   three-putts, fairway %. Dashboard shell + deterministic KPI layer built;
   outstanding: Recharts trend sparklines (vs par, putts, three-putts, fairway).
   Coach (AI) layer deferred to a later phase.
3. **Round-vs-round + same-course / same-hole comparison.**
4. **Hole-level analysis** — stroke-index buckets, par type, front/back,
   blow-up holes.
5. **Manual entry** — define a course template once, then log a round as just
   gross / putts / accuracy / teeClub / sandShots / penalties.
6. **Later** — sharing + multi-user.

## Working conventions

- Proceed **phase by phase**. Explain decisions before writing the code for them.
- Derivation and projection functions are **unit-tested before any UI consumes
  them** — this is how round correctness and accurate comparison are guaranteed.
- One branch/commit per phase.
- Design tokens live in `app/globals.css` as `:root` CSS custom properties
  (short names: `--bg`, `--surface`, `--accent`, `--e1`, `--c1`, etc.). The
  Claude Design handoff files live in `design/`. The authoritative token source
  is `design/handoff_v2/scratch/project/scratch-tokens.css` — our short names
  map to its `--color-*` / `--shadow-*` prefixed names. Note: the IA document's
  own colour scheme (blue accent) is its chrome, not the app's palette; the
  token file is the ground truth.
- **Round identifiers in charts** use `[date] · [course name]` (e.g.
  `"14 Jun · Humberstone Heights"`) for chart rows where space allows (fairway
  accuracy, GIR breakdown), and date alone (`"14 Jun"`) in compact contexts such
  as the score breakdown column. Sequential labels like R1/R2/R3 are not used.

## TBD

_None outstanding._
