"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createRepository } from "@/lib/repository";
import { validateDraftHoles, validateRoundInput } from "@/lib/validateRound";
import { finishOption } from "@/lib/roundProgress";
import type { CourseSnapshot, DraftHoleScore, HoleScore } from "@/lib/types";

export type SaveHoleScoreResult = { error?: string };

export async function saveHoleScore(
  roundId: string,
  holes: DraftHoleScore[]
): Promise<SaveHoleScoreResult> {
  const errors = validateDraftHoles(holes);
  if (errors.length > 0) {
    return { error: errors.join(" ") };
  }

  const supabase = await createClient();
  const repo = createRepository(supabase);
  await repo.saveDraftHoles(roundId, holes);
  revalidatePath("/rounds");
  return {};
}

function toHoleScore(h: DraftHoleScore): HoleScore {
  if (h.gross === null || h.putts === null) {
    throw new Error(`Hole ${h.hole} is missing a score.`);
  }
  return {
    hole: h.hole,
    gross: h.gross,
    putts: h.putts,
    accuracy: h.accuracy ?? "hit",
    teeClub: h.teeClub,
    sandShots: h.sandShots,
    penalties: h.penalties,
  };
}

function subsetSnapshot(snapshot: CourseSnapshot, holeNumbers: Set<number>): CourseSnapshot {
  const holes = snapshot.holes.filter((h) => holeNumbers.has(h.hole));
  return {
    ...snapshot,
    coursePar: holes.reduce((sum, h) => sum + h.par, 0),
    totalYards: holes.reduce((sum, h) => sum + h.yards, 0),
    holes,
  };
}

export type FinishRoundResult = { error: string };

export async function finishRound(roundId: string): Promise<FinishRoundResult> {
  const supabase = await createClient();
  const repo = createRepository(supabase);

  const draft = await repo.getDraftRound(roundId);
  if (!draft) {
    return { error: "This round is no longer in progress." };
  }

  const option = finishOption(draft.courseSnapshot, draft.holes);
  if (option.kind === "none") {
    return { error: "Finish the front 9, back 9, or full round before saving." };
  }

  const courses = await repo.getCourses();
  const course = draft.courseId ? courses.find((c) => c.id === draft.courseId) : undefined;
  const courseHoleCount = course ? course.holes.length : draft.courseSnapshot.holes.length;

  const holeNumbers =
    option.kind === "full"
      ? new Set(draft.courseSnapshot.holes.map((h) => h.hole))
      : new Set(
          draft.courseSnapshot.holes
            .filter((h) => (option.side === "front" ? h.hole <= 9 : h.hole >= 10))
            .map((h) => h.hole)
        );

  const snapshot = subsetSnapshot(draft.courseSnapshot, holeNumbers);
  const holes = draft.holes.filter((h) => holeNumbers.has(h.hole)).map(toHoleScore);

  const errors = validateRoundInput(courseHoleCount, snapshot, holes);
  if (errors.length > 0) {
    return { error: errors.join(" ") };
  }

  await repo.finishDraftRound(roundId, { holes, courseSnapshot: snapshot });

  revalidatePath("/rounds");
  revalidatePath("/dashboard");
  redirect("/rounds");
}

export async function discardDraft(roundId: string): Promise<void> {
  const supabase = await createClient();
  const repo = createRepository(supabase);
  await repo.deleteRound(roundId);
  revalidatePath("/rounds");
  redirect("/rounds");
}
