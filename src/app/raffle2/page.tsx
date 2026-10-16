"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@prisma/client";
import Confetti from "@/components/Confetti";
import styles from "./raffle.module.css";

type Phase = "idle" | "spinning" | "landing" | "suspense" | "group" | "reveal";

const REEL_VISIBLE = 5; // odd number — center slot = highlighted slot
const SPIN_MS = 60; // constant speed while waiting for ENTER
const STOP_STEPS = 16; // steps used to decelerate after ENTER
const SUSPENSE_MS = 900;
const GROUP_HOLD_MS = 1400;
const BULB_COUNT = 20;

export default function RafflePage() {
  const [pool, setPool] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [reelNames, setReelNames] = useState<string[]>([]);
  const [winner, setWinner] = useState<User | null>(null);

  const poolRef = useRef<User[]>([]);
  const busyRef = useRef(false);
  const stopRef = useRef(false); // set to true when ENTER is pressed
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    poolRef.current = pool;
  }, [pool]);

  const clearTimers = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };
  const after = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timeoutsRef.current.push(t);
  };

  // Load eligible participants
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/users?raffle=true");
        if (!res.ok) throw new Error("Failed to fetch users");
        const data: User[] = await res.json();
        if (!mounted) return;
        setPool(data);
        poolRef.current = data;
        setLoading(false);
      } catch (err) {
        console.error(err);
        if (mounted) {
          setError("Failed to load participants.");
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
      clearTimers();
    };
  }, []);

  // Builds the 5 visible reel rows centered on a given index
  const buildReelWindow = useCallback((names: string[], centerIndex: number) => {
    const half = Math.floor(REEL_VISIBLE / 2);
    const window: string[] = [];
    for (let offset = -half; offset <= half; offset++) {
      const idx = ((centerIndex + offset) % names.length + names.length) % names.length;
      window.push(names[idx]);
    }
    return window;
  }, []);

  const beginReveal = useCallback(async (winningUser: User) => {
    setPhase("suspense");

    after(() => {
      setWinner(winningUser);
      setPhase("group");

      after(async () => {
        setPhase("reveal");

        // Persist to tblUserWinner
        try {
          await fetch("/api/winners", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: winningUser.id }),
          });
        } catch (err) {
          console.error("Failed to save winner:", err);
        }

        // Remove winner from local pool for next round
        const remaining = poolRef.current.filter((u) => u.id !== winningUser.id);
        setPool(remaining);
        poolRef.current = remaining;
        busyRef.current = false;
      }, GROUP_HOLD_MS);
    }, SUSPENSE_MS);
  }, []);

  // "P" — start the spin. Spins until ENTER is pressed.
  const runSpin = useCallback(() => {
    const current = poolRef.current;
    if (busyRef.current || current.length === 0) return;
    busyRef.current = true;
    stopRef.current = false;

    // Winner is drawn now, but is kept OUT of the reel so the name is never shown early
    const winnerIndex = Math.floor(Math.random() * current.length);
    const winningUser = current[winnerIndex];
    const decoys = current.filter((u) => u.id !== winningUser.id).map((u) => u.name);
    const names = decoys.length > 0 ? decoys : ["• • •"];

    setPhase("spinning");

    let cursor = 0;
    let stopStep = 0;

    const tick = () => {
      cursor = (cursor + 1) % names.length;
      setReelNames(buildReelWindow(names, cursor));

      // Still waiting for ENTER — keep spinning at constant speed
      if (!stopRef.current) {
        after(tick, SPIN_MS);
        return;
      }

      // ENTER pressed — decelerate, then land
      stopStep++;
      if (stopStep < STOP_STEPS) {
        const delay = SPIN_MS + Math.pow(stopStep / STOP_STEPS, 3) * 320;
        after(tick, delay);
      } else {
        after(() => beginReveal(winningUser), 300);
      }
    };

    tick();
  }, [buildReelWindow]);



  const resetForNextRound = useCallback(() => {
    clearTimers();
    busyRef.current = false;
    stopRef.current = false;
    setWinner(null);
    setPhase("idle");
    setReelNames([]);
  }, []);

  // "ENTER" — pick the winner (stop the reel)
  const pickWinner = useCallback(() => {
    stopRef.current = true;
    setPhase("landing");
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "p" && phase === "idle") {
        runSpin();
      }
      if (key === "p" && phase === "reveal") {
        resetForNextRound();
        runSpin();
      }
      if (event.key === "Enter" && phase === "spinning") {
        pickWinner();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [phase, runSpin, resetForNextRound, pickWinner]);

  const handleReelClick = () => {
    if (phase === "idle") runSpin();
    else if (phase === "spinning") pickWinner();
    else if (phase === "reveal") {
      resetForNextRound();
      runSpin();
    }
  };

  const showReel = phase !== "idle";
  const showGroup = (phase === "group" || phase === "reveal") && winner;
  const center = Math.floor(REEL_VISIBLE / 2);

  return (
    <div className={styles.page}>
      <Confetti active={phase === "reveal"} />

      <div className={styles.rays} />
      <div className={styles.sparkleLayer} />
      <div className={styles.stageGlow} />

      <header className={styles.title}>
        <h1>Stellar and One</h1>
        <p>E-Raffle Christmas Celebration</p>
      </header>

      <div className={styles.stage} onClick={handleReelClick}>
        {/* Wheel */}
        <div className={styles.wheel}>
          <div className={styles.pointer} />

          <div className={styles.bulbs} aria-hidden>
            {Array.from({ length: BULB_COUNT }, (_, i) => (
              <span
                key={i}
                className={`${styles.bulb} ${phase === "spinning" || phase === "landing" ? styles.bulbChase : ""}`}
                style={{ ["--i" as string]: i }}
              />
            ))}
          </div>

          <div className={styles.ring}>
            {!showReel && (
              <div className={styles.idlePrompt}>
                {loading ? "Loading participants..." : error ?? "Press P to play"}
              </div>
            )}

            {showReel && (
              <ul className={`${styles.reel} ${phase === "suspense" ? styles.reelHold : ""}`}>
                {reelNames.map((n, i) => {
                  if (i !== center) {
                    return (
                      <li key={i} className={styles.reelRow}>
                        {n}
                      </li>
                    );
                  }
                  return (
                    <li
                      key={i}
                      className={`${styles.reelCenter} ${showGroup ? styles.reelGroup : ""} ${
                        phase === "suspense" ? styles.reelMystery : ""
                      }`}
                    >
                      {showGroup ? `Group ${winner!.group ?? "—"}` : phase === "suspense" ? "?" : n}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Banner (overlaps bottom of wheel) — flips on its horizontal axis */}
        <div className={styles.banner}>
          <div className={`${styles.flipInner} ${phase === "reveal" ? styles.flipped : ""}`}>
            <div className={styles.face}>
              {phase === "idle" && <span className={styles.bannerIdle}>Who&apos;s next?</span>}
              {(phase === "spinning" || phase === "landing") && (
                <span className={styles.bannerIdle}>Drawing…</span>
              )}
              {(phase === "suspense" || phase === "group" || phase === "reveal") && (
                <div className={styles.suspense}>
                  <span /><span /><span />
                </div>
              )}
            </div>
            <div className={`${styles.face} ${styles.faceBack}`}>
              <span className={styles.winnerBadge}>🎉 WINNER! 🎉</span>
              <span className={styles.winnerName}>{winner?.name}</span>
            </div>
          </div>
        </div>
      </div>

      {phase === "spinning" && <p className={styles.hint}>Press ENTER to pick the winner</p>}
      {phase === "reveal" && <p className={styles.hint}>Press &quot;P&quot; for next draw</p>}


    </div>
  );
}
