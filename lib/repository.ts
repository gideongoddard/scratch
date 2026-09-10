import type { SupabaseClient } from "@supabase/supabase-js";
import type { Course, Round, DraftRound, CourseSnapshot, CourseInput } from "@/lib/types";

function toCourse(row: Record<string, unknown>): Course {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    tee: row.tee as string,
    coursePar: row.course_par as number,
    totalYards: row.total_yards as number,
    slopeRating: row.slope_rating as number | null,
    courseRating: row.course_rating as number | null,
    holes: row.holes as Course["holes"],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function toRound(row: Record<string, unknown>): Round {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    courseId: row.course_id as string | null,
    playedAt: row.played_at as string,
    handicapIndex: row.handicap_index as number | null,
    status: "complete",
    holes: row.holes as Round["holes"],
    courseSnapshot: row.course_snapshot as Round["courseSnapshot"],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function toDraftRound(row: Record<string, unknown>): DraftRound {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    courseId: row.course_id as string | null,
    playedAt: row.played_at as string,
    handicapIndex: row.handicap_index as number | null,
    status: "in_progress",
    holes: row.holes as DraftRound["holes"],
    courseSnapshot: row.course_snapshot as DraftRound["courseSnapshot"],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function createRepository(supabase: SupabaseClient) {
  return {
    async getRounds(): Promise<Round[]> {
      const { data, error } = await supabase
        .from("rounds")
        .select("*")
        .eq("status", "complete")
        .order("played_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(toRound);
    },

    async getRound(id: string): Promise<Round | null> {
      const { data, error } = await supabase
        .from("rounds")
        .select("*")
        .eq("id", id)
        .eq("status", "complete")
        .single();
      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      return toRound(data);
    },

    async getDraftRounds(): Promise<DraftRound[]> {
      const { data, error } = await supabase
        .from("rounds")
        .select("*")
        .eq("status", "in_progress")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(toDraftRound);
    },

    async getDraftRound(id: string): Promise<DraftRound | null> {
      const { data, error } = await supabase
        .from("rounds")
        .select("*")
        .eq("id", id)
        .eq("status", "in_progress")
        .single();
      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      return toDraftRound(data);
    },

    async startDraftRound(input: {
      courseId: string;
      playedAt: string;
      handicapIndex: number | null;
      courseSnapshot: CourseSnapshot;
    }): Promise<DraftRound> {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const holes = input.courseSnapshot.holes.map((h) => ({
        hole: h.hole,
        gross: null,
        putts: null,
        accuracy: null,
        teeClub: null,
        sandShots: null,
        penalties: null,
      }));

      const payload = {
        user_id: user.id,
        course_id: input.courseId,
        played_at: input.playedAt,
        handicap_index: input.handicapIndex,
        status: "in_progress",
        holes,
        course_snapshot: input.courseSnapshot,
      };
      const { data, error } = await supabase
        .from("rounds")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return toDraftRound(data);
    },

    async saveDraftHoles(id: string, holes: DraftRound["holes"]): Promise<DraftRound> {
      const { data, error } = await supabase
        .from("rounds")
        .update({ holes })
        .eq("id", id)
        .eq("status", "in_progress")
        .select()
        .single();
      if (error) throw error;
      return toDraftRound(data);
    },

    async finishDraftRound(
      id: string,
      updates: { holes: Round["holes"]; courseSnapshot: CourseSnapshot }
    ): Promise<Round | null> {
      const { data, error } = await supabase
        .from("rounds")
        .update({
          status: "complete",
          holes: updates.holes,
          course_snapshot: updates.courseSnapshot,
        })
        .eq("id", id)
        .eq("status", "in_progress")
        .select()
        .maybeSingle();
      if (error) throw error;
      return data ? toRound(data) : null;
    },

    async deleteRound(id: string): Promise<void> {
      const { error } = await supabase.from("rounds").delete().eq("id", id);
      if (error) throw error;
    },

    async getCourses(): Promise<Course[]> {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []).map(toCourse);
    },

    async saveCourse(input: CourseInput): Promise<Course> {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        user_id: user.id,
        name: input.name,
        tee: input.tee,
        course_par: input.coursePar,
        total_yards: input.totalYards,
        slope_rating: input.slopeRating,
        course_rating: input.courseRating,
        holes: input.holes,
      };
      const { data, error } = await supabase
        .from("courses")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return toCourse(data);
    },
  };
}
