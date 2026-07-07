/**
 * Seed script — imports rounds.json into Supabase.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (bypasses RLS).
 * Requires SEED_USER_ID — the auth.users UUID of your account.
 *
 * Run with:
 *   npx tsx scripts/seed.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import ws from "ws";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID = process.env.SEED_USER_ID!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !USER_ID) {
  console.error(
    "Missing env vars. Add SUPABASE_SERVICE_ROLE_KEY and SEED_USER_ID to .env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws as unknown as typeof WebSocket },
});

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
function assertString(val: unknown, path: string): string {
  if (typeof val !== "string" || val.trim() === "")
    throw new Error(`${path} must be a non-empty string`);
  return val;
}
function assertNumber(val: unknown, path: string): number {
  if (typeof val !== "number" || !isFinite(val))
    throw new Error(`${path} must be a finite number`);
  return val;
}
function assertAccuracy(val: unknown, path: string): "hit" | "left" | "right" | "short" | "long" {
  if (val !== "hit" && val !== "left" && val !== "right" && val !== "short" && val !== "long")
    throw new Error(`${path} must be 'hit', 'left', 'right', 'short', or 'long'`);
  return val;
}

// ---------------------------------------------------------------------------
// Course + round definitions
// ---------------------------------------------------------------------------
const COURSES = [
  {
    name: "Humberstone Heights",
    tee: "Yellow",
    coursePar: 70,
    totalYards: 5980,
    slopeRating: 123.0,
    courseRating: 68.8,
  },
  {
    name: "Waterstock Golf Club",
    tee: "Yellow",
    coursePar: 72,
    totalYards: 6346,
    slopeRating: 124.0,
    courseRating: 70.1,
  },
];

const ROUND_COURSE_MAP: Record<number, string> = {
  1: "Humberstone Heights",
  2: "Humberstone Heights",
  3: "Waterstock Golf Club",
};

const ROUND_DATES: Record<number, string> = {
  1: "2026-06-14",
  2: "2026-06-21",
  3: "2026-06-27",
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function seed() {
  const raw = JSON.parse(
    readFileSync(resolve(process.cwd(), "data/rounds.json"), "utf-8")
  );

  // 1. Insert courses and collect their IDs
  console.log("Inserting courses…");
  const courseIdByName: Record<string, string> = {};

  for (const round of raw.rounds as any[]) {
    const courseName = ROUND_COURSE_MAP[round.round_id as number];
    if (courseIdByName[courseName]) continue;

    const courseDef = COURSES.find((c) => c.name === courseName)!;

    // Derive hole templates from this round's hole data
    const holes = (round.holes as any[]).map((h: any) => ({
      hole: assertNumber(h.hole, `hole.hole`),
      si: assertNumber(h.si, `hole.si`),
      par: assertNumber(h.par, `hole.par`),
      yards: assertNumber(h.yards, `hole.yards`),
    }));

    const { data, error } = await supabase
      .from("courses")
      .insert({
        user_id: USER_ID,
        name: courseDef.name,
        tee: courseDef.tee,
        course_par: courseDef.coursePar,
        total_yards: courseDef.totalYards,
        slope_rating: courseDef.slopeRating,
        course_rating: courseDef.courseRating,
        holes,
      })
      .select("id")
      .single();

    if (error) throw new Error(`Failed to insert course ${courseName}: ${error.message}`);
    courseIdByName[courseName] = data.id;
    console.log(`  ✓ ${courseName} → ${data.id}`);
  }

  // 2. Insert rounds
  console.log("Inserting rounds…");
  for (const round of raw.rounds as any[]) {
    const roundId = assertNumber(round.round_id, "round_id");
    const courseName = ROUND_COURSE_MAP[roundId];
    const courseId = courseIdByName[courseName];
    const courseDef = COURSES.find((c) => c.name === courseName)!;

    const holeScores = (round.holes as any[]).map((h: any) => ({
      hole: assertNumber(h.hole, `r${roundId}.hole`),
      gross: assertNumber(h.gross, `r${roundId}.h${h.hole}.gross`),
      putts: assertNumber(h.putts, `r${roundId}.h${h.hole}.putts`),
      accuracy: assertAccuracy(h.accuracy, `r${roundId}.h${h.hole}.accuracy`),
      teeClub: null,
      sandShots: null,
      penalties: null,
    }));

    const holeTemplates = (round.holes as any[]).map((h: any) => ({
      hole: assertNumber(h.hole, `hole`),
      si: assertNumber(h.si, `hole.si`),
      par: assertNumber(h.par, `hole.par`),
      yards: assertNumber(h.yards, `hole.yards`),
    }));

    const courseSnapshot = {
      name: courseDef.name,
      tee: courseDef.tee,
      coursePar: courseDef.coursePar,
      totalYards: courseDef.totalYards,
      slopeRating: courseDef.slopeRating,
      courseRating: courseDef.courseRating,
      holes: holeTemplates,
    };

    const { error } = await supabase.from("rounds").insert({
      user_id: USER_ID,
      course_id: courseId,
      played_at: ROUND_DATES[roundId],
      handicap_index: null, // no handicap at time of play
      holes: holeScores,
      course_snapshot: courseSnapshot,
    });

    if (error) throw new Error(`Failed to insert round ${roundId}: ${error.message}`);
    console.log(`  ✓ Round ${roundId} (${courseName}, ${ROUND_DATES[roundId]})`);
  }

  console.log("\nSeed complete.");
}

seed().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
