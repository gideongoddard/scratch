import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createRepository } from "@/lib/repository";
import { courseRecords } from "@/lib/derivations";
import { TeeBadge } from "@/components/TeeBadge";
import { Chip } from "@/components/Chip";
import styles from "./page.module.css";

export default async function CoursesPage() {
  const supabase = await createClient();
  const repo = createRepository(supabase);
  const rounds = await repo.getRounds();
  const records = courseRecords(rounds);

  return (
    <div>
      <h1 className={styles.headerTitle}>Courses</h1>
      <div className={styles.headerMeta}>
        <Chip>{records.length} logged</Chip>
      </div>

      <main>
        {records.length === 0 ? (
          <div className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>No courses yet</h2>
            <p className={styles.emptyBody}>
              Log your first round to start building course records.
            </p>
            <Link href="/rounds/new" className={styles.logRoundLink}>
              Log a round
            </Link>
          </div>
        ) : (
          <ul className={styles.list}>
            {records.map((record) => (
              <li key={record.courseId} className={styles.courseCard}>
                <div className={styles.courseRow}>
                  <span className={styles.courseName}>{record.courseName}</span>
                  <TeeBadge tee={record.tee} />
                </div>
                <div className={styles.courseMeta}>
                  <Chip>Par {record.coursePar}</Chip>
                  <Chip>{record.totalYards.toLocaleString()} yds</Chip>
                  <Chip>{record.holeCount} holes</Chip>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
