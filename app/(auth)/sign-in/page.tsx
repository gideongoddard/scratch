"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/rounds");
    router.refresh();
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoRow}>
          <div className={styles.logoMark}>
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
              <circle cx="8" cy="8" r="2.2" fill="white" />
              <circle cx="8" cy="8" r="5.6" stroke="white" strokeOpacity="0.5" strokeWidth="1.2" fill="none" />
            </svg>
          </div>
          <span className={styles.logoText}>Scratch</span>
        </div>

        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.subtitle}>Track your rounds and see your game trend over time.</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Email</span>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Password</span>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && (
            <div className={styles.errorBanner} role="alert">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
