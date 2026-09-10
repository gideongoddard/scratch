import { createClient } from "@/lib/supabase/server";
import { createRepository } from "@/lib/repository";
import { StartRoundForm } from "./StartRoundForm";
import styles from "./page.module.css";

export default async function NewRoundPage() {
  const supabase = await createClient();
  const repo = createRepository(supabase);
  const courses = await repo.getCourses();

  if (courses.length === 0) {
    return (
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>No courses yet</h3>
        <p className={styles.cardSubtitle}>
          Add a course template before logging a round — rounds snapshot their
          layout from an existing course.
        </p>
      </div>
    );
  }

  return <StartRoundForm courses={courses} />;
}
