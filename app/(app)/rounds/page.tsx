import { createClient } from "@/lib/supabase/server";
import { createRepository } from "@/lib/repository";
import { projectHole, grossTotal, netTotal, girCount, totalPutts, courseHandicap } from "@/lib/derivations";
import type { Round } from "@/lib/types";

function roundSummary(round: Round) {
  const { courseSnapshot, holes, handicapIndex } = round;

  const ch =
    handicapIndex !== null &&
    courseSnapshot.slopeRating !== null &&
    courseSnapshot.courseRating !== null
      ? courseHandicap(
          handicapIndex,
          courseSnapshot.slopeRating,
          courseSnapshot.courseRating,
          courseSnapshot.coursePar
        )
      : null;

  const projected = holes.map((score) => {
    const template = courseSnapshot.holes.find((h) => h.hole === score.hole)!;
    return projectHole(template, score, ch);
  });

  return {
    gross: grossTotal(projected),
    net: netTotal(projected),
    gir: girCount(projected),
    putts: totalPutts(projected),
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function RoundsPage() {
  const supabase = await createClient();
  const repo = createRepository(supabase);
  const rounds = await repo.getRounds();

  return (
    <div>
      <header>
        <h1>Rounds</h1>
        <form action="/auth/sign-out" method="post">
          <button type="submit">Sign out</button>
        </form>
      </header>

      <main>
        {rounds.length === 0 ? (
          <p>No rounds recorded yet.</p>
        ) : (
          <ul>
            {rounds.map((round) => {
              const { gross, net, gir, putts } = roundSummary(round);
              return (
                <li key={round.id}>
                  <div>
                    <p>
                      {round.courseSnapshot.name}
                      <span>{round.courseSnapshot.tee} tees</span>
                    </p>
                    <p>{formatDate(round.playedAt)}</p>
                  </div>
                  <div>
                    <p>{gross}</p>
                    <p>gross</p>
                  </div>
                  <dl>
                    <dt>Net</dt>
                    <dd>{net !== null ? net : "—"}</dd>
                    <dt>GIR</dt>
                    <dd>{gir}/18</dd>
                    <dt>Putts</dt>
                    <dd>{putts}</dd>
                    {round.handicapIndex !== null && (
                      <>
                        <dt>HCP</dt>
                        <dd>{round.handicapIndex}</dd>
                      </>
                    )}
                  </dl>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
