"use client";

import { useEffect, useRef } from "react";

export function ParticlesNetworkBackground({ persona = "non-coding" }: { persona?: "coding" | "non-coding" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    if (persona === "coding") {
      // ── Matrix rain ──────────────────────────────────────────────────────────
      const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789{}[]()=>!;:<>/\\|#$%&*+-";
      const FS = 16;   // font size
      const COL_W = FS; // no gap — columns packed tight
      let drops: number[] = [];
      let frame = 0;
      const SKIP = 9; // advance head every N frames = slow speed

      const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const count = Math.floor(canvas.width / COL_W);
        drops = Array.from({ length: count }, () =>
          Math.random() < 0.35
            ? Math.floor(Math.random() * -(canvas.height / FS))
            : -9999
        );
      };

      const draw = () => {
        frame++;

        // Very slow fade — this IS the trail (natural, readable)
        ctx.fillStyle = "rgba(2, 8, 23, 0.055)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (frame % SKIP === 0) {
          ctx.font = `${FS}px monospace`;
          for (let i = 0; i < drops.length; i++) {
            if (drops[i] === -9999) continue;
            const x = i * COL_W;
            const y = drops[i] * FS;

            // Head — bright white-green, clearly readable
            ctx.fillStyle = "rgba(204, 255, 230, 0.95)";
            ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], x, y);

            drops[i]++;
            if (y > canvas.height && Math.random() > 0.97) drops[i] = 0;
          }
        }

        animId = requestAnimationFrame(draw);
      };

      window.addEventListener("resize", resize);
      resize();
      draw();

      return () => {
        window.removeEventListener("resize", resize);
        cancelAnimationFrame(animId);
      };

    } else {
      // ── Neural network particles (non-coding) ─────────────────────────────────
      let particlesArray: Particle[] = [];
      const mouse = { x: null as number | null, y: null as number | null, radius: 150 };

      const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; init(); };
      const handleMouseMove = (e: MouseEvent) => { mouse.x = e.x; mouse.y = e.y; };
      const handleMouseOut = () => { mouse.x = null; mouse.y = null; };

      window.addEventListener("resize", handleResize);
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseout", handleMouseOut);

      class Particle {
        x: number; y: number; directionX: number; directionY: number; size: number; color: string;
        constructor(x: number, y: number, dX: number, dY: number, size: number, color: string) {
          this.x = x; this.y = y; this.directionX = dX; this.directionY = dY; this.size = size; this.color = color;
        }
        draw() {
          if (!ctx) return;
          ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
          ctx.fillStyle = this.color; ctx.fill();
        }
        update() {
          if (!canvas) return;
          if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
          if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;
          if (mouse.x !== null && mouse.y !== null) {
            const dx = mouse.x - this.x, dy = mouse.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < mouse.radius + this.size) {
              if (mouse.x < this.x && this.x < canvas.width - this.size * 10) this.x += 1;
              if (mouse.x > this.x && this.x > this.size * 10) this.x -= 1;
              if (mouse.y < this.y && this.y < canvas.height - this.size * 10) this.y += 1;
              if (mouse.y > this.y && this.y > this.size * 10) this.y -= 1;
            }
          }
          this.x += this.directionX; this.y += this.directionY; this.draw();
        }
      }

      function init() {
        if (!canvas) return;
        particlesArray = [];
        const n = (canvas.height * canvas.width) / 9000;
        for (let i = 0; i < n; i++) {
          const size = Math.random() * 2 + 1;
          particlesArray.push(new Particle(
            Math.random() * (innerWidth - size * 4) + size * 2,
            Math.random() * (innerHeight - size * 4) + size * 2,
            Math.random() * 0.15 - 0.075,
            Math.random() * 0.15 - 0.075,
            size, "rgba(250, 143, 12, 0.4)"
          ));
        }
      }

      function connect() {
        for (let a = 0; a < particlesArray.length; a++) {
          for (let b = a; b < particlesArray.length; b++) {
            const dist = (particlesArray[a].x - particlesArray[b].x) ** 2 + (particlesArray[a].y - particlesArray[b].y) ** 2;
            if (dist < (canvas!.width / 7) * (canvas!.height / 7)) {
              if (!ctx) return;
              ctx.strokeStyle = `rgba(250, 143, 12, ${(1 - dist / 20000) * 0.15})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
              ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
              ctx.stroke();
            }
          }
        }
      }

      function animate() {
        if (!ctx || !canvas) return;
        animId = requestAnimationFrame(animate);
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        particlesArray.forEach(p => p.update());
        connect();
      }

      handleResize();
      animate();

      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseout", handleMouseOut);
        cancelAnimationFrame(animId);
      };
    }
  }, [persona]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-auto"
      style={{ zIndex: 0, background: "transparent" }}
    />
  );
}
