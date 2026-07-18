"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createRepository } from "@/lib/repository";
import { validateRoundInput } from "@/lib/validateRound";
import type { HoleScore } from "@/lib/types";

export type CreateRoundInput = {
  courseId: string;
  playedAt: string;
  handicapIndex: number | null;
  holeNumbers: number[];
  holes: HoleScore[];
};

export type CreateRoundResult = { error: string };

export async function createRound(
  input: CreateRoundInput
): Promise<CreateRoundResult> {
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

  const errors = validateRoundInput(course.holes.length, courseSnapshot, input.holes);
  if (errors.length > 0) {
    return { error: errors.join(" ") };
  }

  await repo.saveRound({
    courseId: course.id,
    playedAt: input.playedAt,
    handicapIndex: input.handicapIndex,
    holes: input.holes,
    courseSnapshot,
  });

  revalidatePath("/rounds");
  revalidatePath("/dashboard");
  redirect("/rounds");
}
