
"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@prisma/client";
import Confetti from "@/components/Confetti";
// ⚠️ Assumes Confetti accepts an `active: boolean` prop, same pattern as src/app/raffle/page.tsx.
// If the actual prop name differs, update the single usage below (<Confetti active={showConfetti} />).
import styles from "./multidraw.module.css";

type WinnerRecord = {
  id: number;
  timestamp: string;
  name: string;
  email: string;
  group: string | null;
  position: string | null;
  prize: string | null;
  batchNumber: number | null;
};

/** Fisher–Yates shuffle — unbiased sampling without replacement. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function GiftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 7h-2.17A3 3 0 0 0 18 5a3 3 0 0 0-5-2.24A3 3 0 0 0 8 5a3 3 0 0 0 .17 2H6a2 2 0 0 0-2 2v2a1 1 0 0 0 1 1h1v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8h1a1 1 0 0 0 1-1V9a2 2 0 0 0-2-2Zm-7 0h-2a1 1 0 0 1 0-2 1 1 0 0 1 1-1 1 1 0 0 1 1 1Zm4 0h-2V5a1 1 0 0 1 1-1 1 1 0 0 1 1 1 1 1 0 0 1 0 2Z"
        fill="currentColor"
      />
    </svg>
  );
}
function DiceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" opacity="0.15" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" />
      <circle cx="16" cy="8" r="1.4" fill="currentColor" />
      <circle cx="8" cy="16" r="1.4" fill="currentColor" />
      <circle cx="16" cy="16" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}
function TrophyIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4ZM7 5H4a3 3 0 0 0 3 5M17 5h3a3 3 0 0 1-3 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 8 12 3 3 8l9 5 9-5ZM3 8v9l9 5M21 8v9l-9 5M12 13v9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 11a3 3 0 1 0 0-6M21 20c0-2.7-2-5-5-5.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function MultiDrawPage() {
  const [pool, setPool] = useState<User[]>([]);
  const [loadingPool, setLoadingPool] = useState(true);
  const [poolError, setPoolError] = useState<string | null>(null);

  const [numWinners, setNumWinners] = useState(1);
  const [prize, setPrize] = useState("");

  const [drawing, setDrawing] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [currentWinners, setCurrentWinners] = useState<User[]>([]);
  const [currentBatch, setCurrentBatch] = useState<number | null>(null);
  const [currentPrize, setCurrentPrize] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);

  const [previousWinners, setPreviousWinners] = useState<WinnerRecord[]>([]);

  const loadPool = useCallback(async () => {
    try {
      setLoadingPool(true);
      const res = await fetch("/api/users?raffle=true");
      if (!res.ok) throw new Error("Failed to fetch participants");
      const data: User[] = await res.json();
      setPool(data);
      console.log(data)
      setPoolError(null);
    } catch (err) {
      console.error(err);
      setPoolError("Failed to load participants.");
    } finally {
      setLoadingPool(false);
    }
  }, []);

  const loadPreviousWinners = useCallback(async () => {
    try {
      const res = await fetch("/api/multi-draw");
      if (!res.ok) throw new Error("Failed to fetch winners");
      const data: WinnerRecord[] = await res.json();
      setPreviousWinners(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadPool();
    loadPreviousWinners();
  }, [loadPool, loadPreviousWinners]);

  const handleNumWinnersChange = (value: number) => {
    if (Number.isNaN(value)) return;
    const clamped = Math.min(Math.max(value, 1), Math.max(pool.length, 1));
    setNumWinners(clamped);
  };

  const pickWinners = useCallback(async () => {
    setDrawError(null);

    if (pool.length === 0) {
      setDrawError("No participants left to draw from.");
      return;
    }
    if (!prize.trim()) {
      setDrawError("Please enter a prize before drawing.");
      return;
    }
    if (numWinners < 1 || numWinners > pool.length) {
      setDrawError(`Number of winners must be between 1 and ${pool.length}.`);
      return;
    }

    setDrawing(true);
    setShowConfetti(false);

    // Unbiased sampling without replacement
    const selected = shuffle(pool).slice(0, numWinners);

    try {
      const res = await fetch("/api/multi-draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winnerIds: selected.map((u) => u.id),
          prize: prize.trim(),
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error ?? "Failed to save winners");
      }

      const data = await res.json();

      setCurrentWinners(selected);
      setCurrentBatch(data.batchNumber);
      setCurrentPrize(prize.trim());
      // setShowConfetti(true);

      // Remove winners from pool so they can't be drawn again
      const remaining = pool.filter((u) => !selected.some((w) => w.id === u.id));
      setPool(remaining);

      await loadPreviousWinners();
    } catch (err) {
      console.error("Failed to draw winners:", err);
      setDrawError(err instanceof Error ? err.message : "Failed to draw winners.");
    } finally {
      setDrawing(false);
    }
  }, [pool, prize, numWinners, loadPreviousWinners]);

  return (
    <div className={styles.page}>
      {/* <Confetti active={showConfetti} /> */}

      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>E-Raffle</h1>
            <p className={styles.subtitle}>Randomly pick winners from your participants.</p>
          </div>
          <div className={styles.participantsBadge}>
            <UsersIcon />
            <span>
              {loadingPool
                ? "Loading…"
                : `${pool.length} participant${pool.length === 1 ? "" : "s"}`}
            </span>
          </div>
        </header>

        <section className={styles.drawCard}>
          <div className={styles.drawCardHeader}>
            <div className={styles.iconBox}>
              <GiftIcon />
            </div>
            <div>
              <h2 className={styles.drawCardTitle}>Draw a Winner</h2>
              <p className={styles.drawCardSubtitle}>
                Set how many winners to pick and specify the prize, then click the button to draw.
              </p>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="numWinners">
                Number of winners
              </label>
              <input
                id="numWinners"
                type="number"
                min={1}
                max={Math.max(pool.length, 1)}
                value={numWinners}
                onChange={(e) => handleNumWinnersChange(parseInt(e.target.value, 10))}
                className={styles.numberInput}
                disabled={drawing || pool.length === 0}
              />
              <p className={styles.hint}>How many participants will win?</p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="prize">
                Prize
              </label>
              <input
                id="prize"
                type="text"
                placeholder="e.g. Gift Card, T-Shirt, Laptop, etc."
                value={prize}
                onChange={(e) => setPrize(e.target.value)}
                className={styles.textInput}
                disabled={drawing}
              />
              <p className={styles.hint}>What prize will they receive?</p>
            </div>

            <button
              type="button"
              className={styles.pickButton}
              onClick={pickWinners}
              disabled={drawing || loadingPool || pool.length === 0}
            >
              <DiceIcon />
              {drawing ? "Drawing…" : "Pick Winner"}
            </button>
          </div>

          {(poolError || drawError) && (
            <p className={styles.errorText}>{poolError ?? drawError}</p>
          )}
        </section>

        <section className={styles.grid}>
          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>Winner</h3>

            {currentWinners.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIconCircle}>
                  <TrophyIcon />
                </div>
                <p className={styles.emptyTitle}>No winner yet</p>
                <p className={styles.emptyText}>
                  Set the number of winners and prize, then click &quot;Pick Winner&quot; to get
                  started.
                </p>
              </div>
            ) : (
              <div className={styles.winnerResult}>
                <div className={styles.winnerMeta}>
                  <span className={styles.winnerPrize}>🏆 {currentPrize}</span>
                  {currentBatch !== null && (
                    <span className={styles.winnerBatch}>Batch #{currentBatch}</span>
                  )}
                </div>
                <ul className={styles.winnerList}>
                  {currentWinners.map((w) => (
                    <li key={w.id} className={styles.winnerListItem}>
                      <span className={styles.winnerName}>{w.name}</span>
                      <span className={styles.winnerEmail}>{w.email}</span>
                      {w.group && <span className={styles.winnerGroup}>{w.group}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeaderRow}>
              <h3 className={styles.panelTitle}>Previous Winners</h3>
              <span className={styles.totalBadge}>{previousWinners.length} total</span>
            </div>

            {previousWinners.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIconCircle}>
                  <BoxIcon />
                </div>
                <p className={styles.emptyTitle}>No winners yet</p>
                <p className={styles.emptyText}>Winners will appear here after each draw.</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Prize</th>
                      <th>Batch #</th>
                      <th>Drawn At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previousWinners.map((w, i) => (
                      <tr key={w.id}>
                        <td>{i + 1}</td>
                        <td>{w.name}</td>
                        <td>{w.email}</td>
                        <td>{w.prize ?? "—"}</td>
                        <td>{w.batchNumber ?? "—"}</td>
                        <td>{new Date(w.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className={styles.tipsBox}>
          <div className={styles.tipsHeader}>
            <InfoIcon />
            <span>Tips</span>
          </div>
          <ul className={styles.tipsList}>
            <li>You can draw multiple winners at once by setting a higher number.</li>
            <li>Each draw will select unique participants (no duplicates).</li>
            <li>Make sure you have participants added before drawing.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}


