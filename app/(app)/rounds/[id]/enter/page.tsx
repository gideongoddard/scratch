import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createRepository } from "@/lib/repository";
import { HoleEntry } from "./HoleEntry";

export default async function EnterRoundPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const repo = createRepository(supabase);
  const draft = await repo.getDraftRound(id);

  if (!draft) {
    notFound();
  }

  return <HoleEntry draft={draft} />;
}
