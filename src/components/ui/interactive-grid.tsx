"use client";

import React, { useEffect, useRef } from "react";


export function InteractiveGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    let mouseX = width / 2;
    let mouseY = height / 2;

    const spacing = 40; // Grid spacing
    const lineLength = 8; // Length of each line

    // Setup particles based on screen size
    const cols = Math.floor(width / spacing) + 1;
    const rows = Math.floor(height / spacing) + 1;

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);

    let animationFrameId: number;

    const draw = () => {
      const time = Date.now();
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      const isDark = false;

      // Draw cursor glow/shade
      const glowRadius = 300;
      const gradient = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, glowRadius);
      gradient.addColorStop(0, isDark ? "rgba(147, 51, 234, 0.15)" : "rgba(147, 51, 234, 0.08)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * spacing + (spacing / 2);
          const y = j * spacing + (spacing / 2);

          // Calculate angle to mouse
          const dx = mouseX - x;
          const dy = mouseY - y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Influence of mouse decreases with distance
          const maxDistance = 250; // Spotlight radius
          const influence = Math.max(0, 1 - distance / maxDistance);

          // Calculate base angle (pointing top right) or pointing towards mouse
          const targetAngle = Math.atan2(dy, dx);
          const baseAngle = -Math.PI / 4; // 45 degrees up-right
          
          // Add a subtle wave animation based on time and distance from cursor
          // Modified for larger, slower waves ("mota mota")
          const wavePhase = distance * 0.015 - time * 0.0015;
          const waveAngle = Math.sin(wavePhase) * 1.2 * influence;
          
          // Interpolate angle based on mouse proximity and wave
          const angle = baseAngle + (targetAngle - baseAngle) * influence + waveAngle;

          // Color calculation based on position to create a gradient look
          const r = Math.floor((i / cols) * 255);
          const g = Math.floor(100 + (j / rows) * 100);
          const b = Math.floor(255 - (i / cols) * 150);
          
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(angle);
          
          // Draw the line
          ctx.beginPath();
          ctx.moveTo(-lineLength / 2, 0);
          ctx.lineTo(lineLength / 2, 0);
          
          // Opacity based on distance
          const baseOpacity = 0; // Invisible when far away
          const hoverOpacity = isDark ? 0.9 : 0.8;
          const opacity = baseOpacity + (hoverOpacity - baseOpacity) * influence;
          
          // Draw only if opacity > 0 to save performance
          if (opacity > 0.01) {
            if (influence > 0.1) {
              ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
            } else {
              ctx.strokeStyle = isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`;
            }

            ctx.lineWidth = 2;
            ctx.lineCap = "round";
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
    />
  );
}
