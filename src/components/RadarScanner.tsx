import { useEffect, useRef } from "react";
import { WeatherCondition } from "../types.js";

interface RadarScannerProps {
  condition: WeatherCondition;
  cloudCover: number;
}

export default function RadarScanner({ condition, cloudCover }: RadarScannerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const size = (canvas.width = canvas.height = 220);
    const center = size / 2;
    const maxRadius = size / 2 - 10;
    let angle = 0;

    // Generate static rain echoes based on the active condition
    const echoes: { x: number; y: number; r: number; intensity: number }[] = [];
    if (condition === WeatherCondition.RAINY || condition === WeatherCondition.STORMY || cloudCover > 40) {
      const numBlobs = condition === WeatherCondition.STORMY ? 5 : 3;
      for (let i = 0; i < numBlobs; i++) {
        const rad = 20 + Math.random() * (maxRadius - 40);
        const ang = Math.random() * Math.PI * 2;
        echoes.push({
          x: center + Math.cos(ang) * rad,
          y: center + Math.sin(ang) * rad,
          r: 15 + Math.random() * 25,
          intensity: 0.3 + Math.random() * 0.5,
        });
      }
    }

    const drawRadar = () => {
      // Dark radar backdrop
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, size, size);

      // Radial rings grid
      ctx.strokeStyle = "rgba(16, 185, 129, 0.15)";
      ctx.lineWidth = 1;
      for (let r = 30; r <= maxRadius; r += 30) {
        ctx.beginPath();
        ctx.arc(center, center, r, 0, Math.PI * 2);
        ctx.stroke();

        // Distance indicators in km
        ctx.fillStyle = "rgba(16, 185, 129, 0.4)";
        ctx.font = "8px monospace";
        ctx.fillText(`${r * 2}km`, center + r - 12, center - 4);
      }

      // Crosshairs axes
      ctx.beginPath();
      ctx.moveTo(10, center);
      ctx.lineTo(size - 10, center);
      ctx.moveTo(center, 10);
      ctx.lineTo(center, size - 10);
      ctx.stroke();

      // Draw reflectivity weather echoes (Rain/Storm patches)
      echoes.forEach((echo) => {
        const dist = Math.sqrt((echo.x - center) ** 2 + (echo.y - center) ** 2);
        const angleToEcho = Math.atan2(echo.y - center, echo.x - center);

        // Normalize angle difference to fade echo in/out when sweep sweeps over it
        let normAngDiff = Math.abs(angle - angleToEcho);
        if (normAngDiff > Math.PI) normAngDiff = Math.PI * 2 - normAngDiff;

        let sweepFactor = 0;
        if (normAngDiff < 0.4) {
          sweepFactor = (0.4 - normAngDiff) / 0.4;
        }

        // Draw glowing blur
        const echoGrad = ctx.createRadialGradient(echo.x, echo.y, 2, echo.x, echo.y, echo.r);
        const echoColor = condition === WeatherCondition.STORMY ? "220, 38, 38" : "16, 185, 129"; // Red for storm, green for rain

        echoGrad.addColorStop(0, `rgba(${echoColor}, ${echo.intensity * (0.25 + sweepFactor * 0.75)})`);
        echoGrad.addColorStop(0.5, `rgba(${echoColor}, ${echo.intensity * 0.15 * (0.1 + sweepFactor * 0.9)})`);
        echoGrad.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = echoGrad;
        ctx.beginPath();
        ctx.arc(echo.x, echo.y, echo.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Sweeping Line Beam with trailing fade gradient
      const gradient = ctx.createRadialGradient(center, center, 0, center, center, maxRadius);
      gradient.addColorStop(0, "rgba(16, 185, 129, 0.05)");
      gradient.addColorStop(1, "rgba(16, 185, 129, 0)");

      // Sweeper cone
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(angle);

      // Draw sweeping ray line
      ctx.strokeStyle = "rgba(52, 211, 153, 0.85)";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#10b981";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(maxRadius, 0);
      ctx.stroke();

      // Reset shadows
      ctx.shadowBlur = 0;

      // Cone trail
      const trailWidth = 0.4; // radian cone size
      ctx.fillStyle = "rgba(16, 185, 129, 0.12)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, maxRadius, -trailWidth, 0, false);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // Advance scanner sweep speed
      angle += 0.022;
      if (angle > Math.PI * 2) {
        angle -= Math.PI * 2;
      }

      // Outer radar dial border
      ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(center, center, maxRadius + 3, 0, Math.PI * 2);
      ctx.stroke();

      animId = requestAnimationFrame(drawRadar);
    };

    drawRadar();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [condition, cloudCover]);

  return (
    <div
      id="radar-scanner-container"
      className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-950/70 border border-slate-800 backdrop-blur-xl"
    >
      <div className="flex justify-between items-center w-full mb-2">
        <div>
          <span className="text-xs font-mono tracking-widest text-emerald-400 font-semibold uppercase">Doppler Micro-Scanner</span>
          <h3 className="text-sm font-semibold text-slate-100 font-sans tracking-tight">Active Doppler Reflectivity</h3>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 px-2 py-0.5 rounded-full animate-pulse">
          SWEEPING
        </span>
      </div>

      <div className="relative flex items-center justify-center p-2 bg-slate-900 rounded-xl border border-slate-800">
        <canvas
          ref={canvasRef}
          id="doppler-radar-canvas"
          className="rounded-full overflow-hidden"
        />
        <div className="absolute inset-0 border border-slate-950 rounded-full pointer-events-none" />
      </div>

      <div className="w-full flex justify-between items-center px-1 mt-2 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
          <span>Heavy Cell</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
          <span>Light Rain</span>
        </div>
        <span>Gain: Auto (45dBz)</span>
      </div>
    </div>
  );
}
