"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createRepository } from "@/lib/repository";

export type StartRoundInput = {
  courseId: string;
  playedAt: string;
  handicapIndex: number | null;
  holeNumbers: number[];
};

export type StartRoundResult = { error: string };

export async function startRound(
  input: StartRoundInput
): Promise<StartRoundResult> {
  const supabase = await createClient();
  const repo = createRepository(supabase);

  const courses = await repo.getCourses();
  const course = courses.find((c) => c.id === input.courseId);
  if (!course) {
    return { error: "Course not found." };
  }

  const playedHoleNumbers = new Set(input.holeNumbers);
  const templateHoles = course.holes
    .filter((h) => playedHoleNumbers.has(h.hole))
    .sort((a, b) => a.hole - b.hole);

  const courseSnapshot = {
    name: course.name,
    tee: course.tee,
    coursePar: templateHoles.reduce((sum, h) => sum + h.par, 0),
    totalYards: templateHoles.reduce((sum, h) => sum + h.yards, 0),
    slopeRating: course.slopeRating,
    courseRating: course.courseRating,
    holes: templateHoles,
  };

  const draft = await repo.startDraftRound({
    courseId: course.id,
    playedAt: input.playedAt,
    handicapIndex: input.handicapIndex,
    courseSnapshot,
  });

  revalidatePath("/rounds");
  redirect(`/rounds/${draft.id}/enter`);
}
