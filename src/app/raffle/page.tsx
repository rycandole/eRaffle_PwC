





"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@prisma/client";
import Confetti from "@/components/Confetti";
import styles from "./raffle.module.css";
import Image from "next/image";
import Logo from "@/utilities/image/logo_pwc.png";

const CYCLE_INTERVAL_MS = 100;
const SUSPENSE_MS = 0; // "Drawing…" hold before group is revealed
const GROUP_HOLD_MS = 3000; // group shown before full winner overlay opens

type Phase = "idle" | "cycling" | "suspense" | "group" | "reveal";

/** Gold laurel branch drawn along a bezier curve (leaves on both sides). */
function Laurel({ flip = false }: { flip?: boolean }) {
  const P = [
    [38, 96],
    [4, 70],
    [4, 32],
    [36, 4],
  ];
  const bez = (t: number) => {
    const u = 1 - t;
    const x =
      u ** 3 * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t ** 3 * P[3][0];
    const y =
      u ** 3 * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t ** 3 * P[3][1];
    const dx =
      3 * u * u * (P[1][0] - P[0][0]) +
      6 * u * t * (P[2][0] - P[1][0]) +
      3 * t * t * (P[3][0] - P[2][0]);
    const dy =
      3 * u * u * (P[1][1] - P[0][1]) +
      6 * u * t * (P[2][1] - P[1][1]) +
      3 * t * t * (P[3][1] - P[2][1]);
    // Rounded to avoid server/client floating-point drift causing hydration mismatches.
    const rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const angle = Math.round(rawAngle * 1000) / 1000;
    return { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000, angle };
  };

  const leaves = Array.from({ length: 8 }, (_, i) => bez(0.1 + i * 0.115));

  return (
    <svg
      className={`${styles.laurel} ${flip ? styles.laurelFlip : ""}`}
      viewBox="0 0 50 100"
      aria-hidden="true"
    >
      <path
        d={`M${P[0]} C${P[1]} ${P[2]} ${P[3]}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {leaves.map((l, i) => (
        <g key={i} transform={`translate(${l.x} ${l.y})`} fill="currentColor">
          <ellipse cx="8" cy="0" rx="8" ry="3" transform={`rotate(${l.angle - 38})`} />
          <ellipse cx="8" cy="0" rx="8" ry="3" transform={`rotate(${l.angle + 38})`} />
        </g>
      ))}
    </svg>
  );
}

export default function RafflePage() {
  const [pool, setPool] = useState<User[]>([]);
  const [headerText, setHeaderText] = useState("Start the draw.");
  const [winner, setWinner] = useState<User | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cyclingRef = useRef(false);
  const selectingRef = useRef(false);
  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const poolRef = useRef<User[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    poolRef.current = pool;
  }, [pool]);

  const clearTimers = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const after = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timeoutsRef.current.push(t);
  }, []);

  const stopCycling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    cyclingRef.current = false;
  }, []);

  const startCycling = useCallback(() => {
    setOverlayOpen(false);
    setWinner(null);
    setPhase("cycling");
    cyclingRef.current = true;
    selectingRef.current = false;

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const names = poolRef.current;
      if (!cyclingRef.current || names.length === 0) return;
      // indexRef.current = (indexRef.current + 1) % names.length;
      let next = Math.floor(Math.random() * names.length);
    // avoid flashing the exact same name twice in a row when pool has >1 person
      if (names.length > 1 && next === indexRef.current) {
        next = (next + 1) % names.length;
      }
      indexRef.current = next;
      setHeaderText(names[indexRef.current].name);
    }, CYCLE_INTERVAL_MS);
  }, []);

  const pickWinner = useCallback(() => {
    if (!cyclingRef.current || selectingRef.current) return;
    if (poolRef.current.length === 0) return;

    selectingRef.current = true;
    

    const names = poolRef.current;
    const winnerIndex = Math.floor(Math.random() * names.length);
    const winningUser = names[winnerIndex];

    // Step 1 — flip to the "Drawing…" suspense face.
    
    setWinner(winningUser);
    // setPhase("suspense");
    after(() => {
      // Step 2 — reveal the department/group first.
      setPhase("group");

      after(async () => {
        // Step 3 — open the full winner overlay with the name.
        setPhase("reveal");
        setOverlayOpen(true);
        stopCycling();

        try {
          await fetch("/api/winners", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: winningUser.id }),
          });
        } catch (err) {
          console.error("Failed to save winner:", err);
        }

        const remaining = names.filter((_, i) => i !== winnerIndex);
        setPool(remaining);
        poolRef.current = remaining;
        indexRef.current = 0;
        selectingRef.current = false;
      }, GROUP_HOLD_MS);
    }, SUSPENSE_MS);
  }, [stopCycling, after]);

  const closeOverlay = useCallback(() => {
    setOverlayOpen(false);
    if (poolRef.current.length > 0) {
      startCycling();
    } else {
      setPhase("idle");
      setWinner(null);
      setHeaderText("No participants left.");
    }
  }, [startCycling]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const res = await fetch("/api/users?raffle=true");
        if (!res.ok) throw new Error("Failed to fetch users");
        const data: User[] = await res.json();
        if (!isMounted) return;

        setPool(data);
        poolRef.current = data;
        setLoading(false);

        if (data.length > 0) {
          startCycling();
        } else {
          setPhase("idle");
          setHeaderText("No participants left.");
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError("Failed to load participants.");
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
      stopCycling();
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") pickWinner();
      if (event.key.toLowerCase() === "p" && !cyclingRef.current && !selectingRef.current) {
        setOverlayOpen(false);
        startCycling();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pickWinner, startCycling]);

  const isFlipped = phase === "suspense" || phase === "group";

  return (
    <>
      {/* Winner overlay */}
      <div className={`${styles.overlay} ${overlayOpen ? styles.open : ""}`}>
        <Confetti active={overlayOpen} />
        <div className={`${styles.overlayBody} ${overlayOpen ? styles.open : ""}`}>
          <Image src={Logo} alt="PwC" className={styles.overlayLogo} />
          <h3 className={styles.congrats}>Congratulations</h3>
          <div className={styles.overlayNameBox}>
            <Laurel />
            <h1 className={styles.winnerName}>{winner?.name}</h1>
            <Laurel flip />
          </div>
        </div>

        <p className={styles.overlayTagline}>People. Possibilities. A Brighter Tomorrow.</p>

        <svg
          onClick={closeOverlay}
          className={`${styles.close} ${overlayOpen ? styles.open : ""}`}
          viewBox="0 0 320 512"
        >
          <path
            fill="currentColor"
            d="M207.6 256l107.72-107.72c6.23-6.23 6.23-16.34 0-22.58l-25.03-25.03c-6.23-6.23-16.34-6.23-22.58 0L160 208.4 52.28 100.68c-6.23-6.23-16.34-6.23-22.58 0L4.68 125.7c-6.23 6.23-6.23 16.34 0 22.58L112.4 256 4.68 363.72c-6.23 6.23-6.23 16.34 0 22.58l25.03 25.03c6.23 6.23 16.34 6.23 22.58 0L160 303.6l107.72 107.72c6.23 6.23 16.34 6.23 22.58 0l25.03-25.03c6.23-6.23 6.23-16.34 0-22.58L207.6 256z"
          />
        </svg>
      </div>

      {/* Main stage */}
      <div className={styles.contents}>
        <div className={styles.elementsContainer}>
          <Image src={Logo} alt="PwC" className={styles.logo} />

          <header className={styles.title}>
            <h1 className={styles.stellar}>The Next Horizon</h1>
            <p className={styles.subtitle}>PwC Christmas Celebration</p>
          </header>

          <div className={styles.divider} aria-hidden="true">
            <span />
            <i />
            <span />
          </div>
          <div className={styles.headerNamesWrapper}>
            <div className={styles.headerNamesBox} onClick={pickWinner}>
              <Laurel />

              <div className={styles.headerNamesContainer}>
                <div className={styles.flipCard}>
                  <div className={`${styles.flipCardInner} ${isFlipped ? styles.flipped : ""}`}>
                    {/* Front face — idle / cycling names */}
                    <div className={styles.flipFace}>
                      <h1 className={styles.headerNames}>
                        {loading ? "Loading participants..." : error ?? headerText}
                      </h1>
                    </div>

                    {/* Back face — suspense, then department/group reveal */}
                    <div className={`${styles.flipFace} ${styles.flipFaceBack}`}>
                      {phase === "group" && winner && (
                        <>
                          <p className={styles.groupReveal}>{winner.group ?? "—"}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Laurel flip />
            </div>
          </div>
        </div>

        <p className={styles.tagline}>People. Possibilities. A Brighter Tomorrow.</p>
      </div>
    </>
  );
}
