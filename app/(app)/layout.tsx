import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createRepository } from "@/lib/repository";
import { NavLinks } from "./NavLinks";
import styles from "./layout.module.css";

async function getCurrentHandicap(): Promise<string> {
  try {
    const supabase = await createClient();
    const repo = createRepository(supabase);
    const rounds = await repo.getRounds();
    const withHandicap = rounds.find((r) => r.handicapIndex !== null);
    return withHandicap?.handicapIndex?.toString() ?? "—";
  } catch {
    return "—";
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const handicap = await getCurrentHandicap();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.logoRow}>
          <div className={styles.logoMark}>
            <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden>
              <circle cx="8" cy="8" r="2.2" fill="white" />
              <circle cx="8" cy="8" r="5.6" stroke="white" strokeOpacity="0.5" strokeWidth="1.2" fill="none" />
            </svg>
          </div>
          <span className={styles.logoText}>Scratch</span>
        </div>

        <NavLinks />

        <div className={styles.spacer} />

        <div className={styles.handicapRow}>
          <span className={styles.handicapLabel}>Handicap</span>
          <span className={styles.handicapValue}>{handicap}</span>
        </div>

        <Link href="/rounds/new" className={styles.logRoundBtn} aria-label="Log a round">
          <svg width="14" height="14" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
          <span className={styles.logRoundLabel}>Log a round</span>
        </Link>

        <form action="/auth/sign-out" method="post">
          <button type="submit" className={styles.signOutBtn} aria-label="Sign out">
            <svg width="13" height="13" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5" fill="none" aria-hidden>
              <path d="M6 2 H3.5 A1 1 0 0 0 2.5 3 V13 A1 1 0 0 0 3.5 14 H6" />
              <line x1="6.5" y1="8" x2="14" y2="8" />
              <path d="M11 5 L14 8 L11 11" />
            </svg>
            <span className={styles.signOutLabel}>Sign out</span>
          </button>
        </form>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
