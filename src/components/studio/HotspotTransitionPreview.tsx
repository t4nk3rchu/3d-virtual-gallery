import { useEffect, useRef } from 'react';
import type { HotspotTransition } from '../../types/schema';
import { getHotspotAnimation, interpolateHotspotTransition } from '../../lib/viewer/hotspot-animations';

interface HotspotTransitionPreviewProps {
  transition: HotspotTransition;
}

export function HotspotTransitionPreview({ transition }: HotspotTransitionPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let reqId: number;
    let startTime = performance.now();
    let forward = true;

    // Pin coordinates on a 140 x 64 preview canvas
    const pinA = { x: 32, y: 42, s: 2.2 };
    const pinB = { x: 108, y: 22, s: 2.4 };

    const preset = getHotspotAnimation(transition);
    const flightDur = Math.max(300, preset.durationMs * 0.9);
    const pauseDur = 700;
    const totalCycleHalf = flightDur + pauseDur;

    const render = (now: number) => {
      const elapsed = (now - startTime) % (totalCycleHalf * 2);
      const isSecondHalf = elapsed >= totalCycleHalf;
      const phaseElapsed = elapsed % totalCycleHalf;

      forward = !isSecondHalf;
      const from = forward ? pinA : pinB;
      const to = forward ? pinB : pinA;

      let t = 0;
      if (phaseElapsed < flightDur) {
        t = phaseElapsed / flightDur;
      } else {
        t = 1; // resting at destination
      }

      const state = interpolateHotspotTransition(transition, from, to, t, 0.8);

      const w = canvas.width;
      const h = canvas.height;

      // Clear & Background
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#0f1422';
      ctx.fillRect(0, 0, w, h);

      // Subtle Background Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 10; x < w; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 10; y < h; y += 16) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Trajectory connection line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(pinA.x, pinA.y);
      ctx.lineTo(pinB.x, pinB.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Pin A
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(pinA.x, pinA.y, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Pin B
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(pinB.x, pinB.y, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Camera Viewfinder Box (simulating zoom via box scale)
      const boxSize = Math.max(14, 15 * (state.s / 2.3));
      const halfSize = boxSize / 2;

      ctx.save();
      ctx.translate(state.x, state.y);

      // Viewfinder border glow
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-halfSize, -halfSize, boxSize, boxSize);

      // Center crosshair
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      reqId = requestAnimationFrame(render);
    };

    reqId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(reqId);
  }, [transition]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.2rem',
      }}
      title={`Live preview of ${transition} transition`}
    >
      <canvas
        ref={canvasRef}
        width={140}
        height={64}
        style={{
          borderRadius: '6px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
          cursor: 'pointer',
        }}
        onClick={() => {
          // Restart animation on click
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.style.transform = 'scale(0.96)';
            setTimeout(() => {
              if (canvas) canvas.style.transform = 'scale(1)';
            }, 100);
          }
        }}
      />
      <span style={{ fontSize: '0.68rem', color: '#888', letterSpacing: '0.02em' }}>
        Live Simulation
      </span>
    </div>
  );
}
