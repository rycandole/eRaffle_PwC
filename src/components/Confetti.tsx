

"use client";

import { useEffect, useRef } from "react";

export default function Confetti({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const NUM_CONFETTI = 350;
    const COLORS = [
      [85, 71, 106],
      [174, 61, 99],
      [219, 56, 83],
      [244, 92, 68],
      [248, 182, 70],
    ];
    const PI_2 = 2 * Math.PI;

    let w = 0;
    let h = 0;
    let xpos = 0.5;
    let animationId: number;

    const range = (a: number, b: number) => (b - a) * Math.random() + a;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };

    const drawCircle = (x: number, y: number, r: number, style: string) => {
      context.beginPath();
      context.arc(x, y, r, 0, PI_2, false);
      context.fillStyle = style;
      context.fill();
    };

    class Particle {
      style: number[];
      rgb: string;
      r: number;
      r2: number;
      opacity = 0;
      dop = 0;
      x = 0;
      y = 0;
      xmax = 0;
      ymax = 0;
      vx = 0;
      vy = 0;

      constructor() {
        this.style = COLORS[~~range(0, 5)];
        this.rgb = `rgba(${this.style[0]},${this.style[1]},${this.style[2]}`;
        this.r = ~~range(2, 6);
        this.r2 = 2 * this.r;
        this.replace();
      }

      replace() {
        this.opacity = 0;
        this.dop = 0.03 * range(1, 4);
        this.x = range(-this.r2, w - this.r2);
        this.y = range(-20, h - this.r2);
        this.xmax = w - this.r;
        this.ymax = h - this.r;
        this.vx = range(0, 2) + 8 * xpos - 5;
        this.vy = 0.7 * this.r + range(-1, 1);
      }

      draw() {
        this.x += this.vx;
        this.y += this.vy;
        this.opacity += this.dop;
        if (this.opacity > 1) {
          this.opacity = 1;
          this.dop *= -1;
        }
        if (this.opacity < 0 || this.y > this.ymax) this.replace();
        if (!(this.x > 0 && this.x < this.xmax)) this.x = (this.x + this.xmax) % this.xmax;
        drawCircle(~~this.x, ~~this.y, this.r, `${this.rgb},${this.opacity})`);
      }
    }

    const particles = Array.from({ length: NUM_CONFETTI }, () => new Particle());

    const handleMouseMove = (e: MouseEvent) => {
      xpos = e.pageX / w;
    };

    const step = () => {
      animationId = requestAnimationFrame(step);
      context.clearRect(0, 0, w, h);
      particles.forEach((p) => p.draw());
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("mousemove", handleMouseMove);
    step();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return <canvas ref={canvasRef} className={active ? "open" : ""} />;
}

