import { useEffect, useRef } from "react";
import { WeatherCondition } from "../types.js";

interface WeatherBackgroundProps {
  condition: WeatherCondition;
}

export default function WeatherBackground({ condition }: WeatherBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Weather objects
    interface RainDrop {
      x: number;
      y: number;
      length: number;
      speed: number;
      opacity: number;
    }

    interface SnowFlake {
      x: number;
      y: number;
      radius: number;
      density: number;
      speedY: number;
      speedX: number;
    }

    interface Cloud {
      x: number;
      y: number;
      radius: number;
      speed: number;
      opacity: number;
    }

    interface MistParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
    }

    // Initialize rain
    const rainDrops: RainDrop[] = [];
    for (let i = 0; i < 120; i++) {
      rainDrops.push({
        x: Math.random() * width,
        y: Math.random() * height - height,
        length: 15 + Math.random() * 20,
        speed: 12 + Math.random() * 12,
        opacity: 0.15 + Math.random() * 0.3,
      });
    }

    // Initialize snow
    const snowFlakes: SnowFlake[] = [];
    for (let i = 0; i < 150; i++) {
      snowFlakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 1.5 + Math.random() * 3.5,
        density: Math.random() * 20,
        speedY: 0.8 + Math.random() * 1.5,
        speedX: (Math.random() - 0.5) * 1.2,
      });
    }

    // Initialize clouds
    const clouds: Cloud[] = [];
    for (let i = 0; i < 6; i++) {
      clouds.push({
        x: Math.random() * (width + 400) - 200,
        y: Math.random() * (height * 0.35) + 50,
        radius: 120 + Math.random() * 150,
        speed: 0.15 + Math.random() * 0.25,
        opacity: 0.08 + Math.random() * 0.1,
      });
    }

    // Initialize haze
    const mistParticles: MistParticle[] = [];
    for (let i = 0; i < 100; i++) {
      mistParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.1,
        size: 3 + Math.random() * 6,
        alpha: 0.05 + Math.random() * 0.1,
      });
    }

    // Lightning variables (Stormy)
    let flashOpacity = 0;
    let nextLightningFrame = 60 + Math.random() * 180;
    let lightningBranches: { x1: number; y1: number; x2: number; y2: number }[] = [];

    // Sun angle (Clear)
    let sunAngle = 0;

    // Heat waves rising (Heatwave)
    const heatWaves: { x: number; y: number; speed: number; amplitude: number; length: number }[] = [];
    for (let i = 0; i < 40; i++) {
      heatWaves.push({
        x: Math.random() * width,
        y: height + Math.random() * 200,
        speed: 1.2 + Math.random() * 1.5,
        amplitude: 2 + Math.random() * 4,
        length: 50 + Math.random() * 100,
      });
    }

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw solid background gradient based on conditions
      let bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      switch (condition) {
        case WeatherCondition.CLEAR:
          bgGrad.addColorStop(0, "#0ea5e9"); // Sky blue
          bgGrad.addColorStop(0.5, "#38bdf8"); // Warm blue
          bgGrad.addColorStop(1, "#bae6fd"); // Light morning blue
          break;
        case WeatherCondition.CLOUDY:
          bgGrad.addColorStop(0, "#475569"); // Slate grey
          bgGrad.addColorStop(0.6, "#64748b"); // Medium slate
          bgGrad.addColorStop(1, "#94a3b8"); // Light grey
          break;
        case WeatherCondition.RAINY:
          bgGrad.addColorStop(0, "#1e293b"); // Deep charcoal
          bgGrad.addColorStop(0.6, "#334155"); // Cool dark grey
          bgGrad.addColorStop(1, "#475569"); // Rainy slate
          break;
        case WeatherCondition.STORMY:
          bgGrad.addColorStop(0, "#0f172a"); // Near black
          bgGrad.addColorStop(0.6, "#1e1b4b"); // Deep storm purple-indigo
          bgGrad.addColorStop(1, "#312e81"); // Deep blue-indigo
          break;
        case WeatherCondition.SNOWY:
          bgGrad.addColorStop(0, "#0f172a"); // Polar night
          bgGrad.addColorStop(0.6, "#1e293b"); // Dark winter grey
          bgGrad.addColorStop(1, "#38bdf8"); // Frozen ice blue
          break;
        case WeatherCondition.HAZY:
          bgGrad.addColorStop(0, "#78350f"); // Dust brown/amber top
          bgGrad.addColorStop(0.5, "#b45309"); // Warm ochre
          bgGrad.addColorStop(1, "#fed7aa"); // Warm haze horizon
          break;
        case WeatherCondition.HEATWAVE:
          bgGrad.addColorStop(0, "#7f1d1d"); // Blood red
          bgGrad.addColorStop(0.5, "#b91c1c"); // Crimson sun
          bgGrad.addColorStop(1, "#f97316"); // Burning orange
          break;
        default:
          bgGrad.addColorStop(0, "#0f172a");
          bgGrad.addColorStop(1, "#1e293b");
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Render dynamic weather elements
      if (condition === WeatherCondition.CLEAR) {
        // Glowing sun and light rays
        sunAngle += 0.001;
        const sunX = width * 0.85;
        const sunY = height * 0.15;

        // Radial glow
        const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 300);
        sunGlow.addColorStop(0, "rgba(254, 240, 138, 0.6)"); // Yellow glow
        sunGlow.addColorStop(0.4, "rgba(253, 186, 116, 0.2)"); // Orange halo
        sunGlow.addColorStop(1, "rgba(253, 186, 116, 0)");
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 300, 0, Math.PI * 2);
        ctx.fill();

        // Draw soft rotating light rays
        ctx.save();
        ctx.translate(sunX, sunY);
        ctx.rotate(sunAngle);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
        ctx.lineWidth = 4;
        for (let i = 0; i < 12; i++) {
          ctx.rotate(Math.PI / 6);
          ctx.beginPath();
          ctx.moveTo(40, 0);
          ctx.lineTo(350, 0);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (condition === WeatherCondition.CLOUDY || condition === WeatherCondition.RAINY || condition === WeatherCondition.STORMY) {
        // Render drifting clouds
        ctx.fillStyle = "rgba(255, 255, 255, 1)";
        clouds.forEach((cloud) => {
          cloud.x += cloud.speed;
          if (cloud.x - cloud.radius > width) {
            cloud.x = -cloud.radius;
          }

          const grad = ctx.createRadialGradient(cloud.x, cloud.y, 10, cloud.x, cloud.y, cloud.radius);
          const cAlpha = cloud.opacity;
          if (condition === WeatherCondition.CLOUDY) {
            grad.addColorStop(0, `rgba(241, 245, 249, ${cAlpha})`);
            grad.addColorStop(1, `rgba(241, 245, 249, 0)`);
          } else {
            // Dark stormy clouds
            grad.addColorStop(0, `rgba(100, 116, 139, ${cAlpha * 1.5})`);
            grad.addColorStop(1, `rgba(100, 116, 139, 0)`);
          }

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      if (condition === WeatherCondition.RAINY || condition === WeatherCondition.STORMY) {
        // Draw falling raindrops
        ctx.strokeStyle = "rgba(174, 219, 255, 0.4)";
        ctx.lineWidth = 1.2;
        rainDrops.forEach((drop) => {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(186, 230, 253, ${drop.opacity})`;
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x - drop.speed * 0.12, drop.y + drop.length);
          ctx.stroke();

          // Move
          drop.y += drop.speed;
          drop.x -= drop.speed * 0.12;

          // Reset when hitting bottom or edges
          if (drop.y > height || drop.x < 0) {
            drop.y = Math.random() * -100;
            drop.x = Math.random() * width;
          }
        });
      }

      if (condition === WeatherCondition.STORMY) {
        // Simulate lightning strikes
        nextLightningFrame--;
        if (nextLightningFrame <= 0) {
          flashOpacity = 0.8 + Math.random() * 0.2;
          nextLightningFrame = 120 + Math.random() * 300; // Time to next strike

          // Generate branching paths for lightning
          lightningBranches = [];
          let startX = width * 0.3 + Math.random() * (width * 0.4);
          let startY = 0;
          for (let k = 0; k < 5; k++) {
            let nextX = startX + (Math.random() - 0.5) * 120;
            let nextY = startY + (height * 0.15 + Math.random() * (height * 0.1));
            lightningBranches.push({ x1: startX, y1: startY, x2: nextX, y2: nextY });
            startX = nextX;
            startY = nextY;
          }
        }

        if (flashOpacity > 0) {
          // Draw lightning bolt
          ctx.strokeStyle = `rgba(224, 242, 254, ${flashOpacity})`;
          ctx.lineWidth = 3 + Math.random() * 3;
          ctx.shadowColor = "#38bdf8";
          ctx.shadowBlur = 20;
          ctx.beginPath();
          lightningBranches.forEach((branch) => {
            ctx.moveTo(branch.x1, branch.y1);
            ctx.lineTo(branch.x2, branch.y2);
          });
          ctx.stroke();

          // Reset shadow
          ctx.shadowBlur = 0;

          // Ambient flash
          ctx.fillStyle = `rgba(224, 242, 254, ${flashOpacity * 0.25})`;
          ctx.fillRect(0, 0, width, height);

          flashOpacity -= 0.04; // Fade flash
        }
      }

      if (condition === WeatherCondition.SNOWY) {
        // Draw falling snow
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        snowFlakes.forEach((flake) => {
          ctx.beginPath();
          ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
          ctx.fill();

          // Move flakes using trigonometric drift
          flake.y += flake.speedY;
          flake.x += flake.speedX + Math.sin(flake.density) * 0.3;
          flake.density += 0.01;

          // Reset
          if (flake.y > height) {
            flake.y = -10;
            flake.x = Math.random() * width;
          }
        });
      }

      if (condition === WeatherCondition.HAZY) {
        // Draw hazy dust mist floating
        mistParticles.forEach((p) => {
          ctx.fillStyle = `rgba(254, 215, 170, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
        });
      }

      if (condition === WeatherCondition.HEATWAVE) {
        // Draw rising glowing heat ripples
        ctx.strokeStyle = "rgba(239, 68, 68, 0.04)";
        ctx.lineWidth = 2;
        heatWaves.forEach((wave, idx) => {
          ctx.beginPath();
          ctx.moveTo(wave.x, wave.y);

          // Wave line
          for (let i = 0; i < wave.length; i += 5) {
            const shiftX = Math.sin((wave.y - i) * 0.04 + idx) * wave.amplitude;
            ctx.lineTo(wave.x + shiftX, wave.y - i);
          }
          ctx.stroke();

          // Rise
          wave.y -= wave.speed;
          if (wave.y < -100) {
            wave.y = height + 100;
            wave.x = Math.random() * width;
          }
        });

        // Thermal pulsator vignette
        const pulsate = 0.05 + Math.sin(Date.now() * 0.002) * 0.03;
        const heatRadGrad = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, Math.max(width, height));
        heatRadGrad.addColorStop(0, "rgba(239, 68, 68, 0)");
        heatRadGrad.addColorStop(1, `rgba(127, 29, 29, ${pulsate})`);
        ctx.fillStyle = heatRadGrad;
        ctx.fillRect(0, 0, width, height);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [condition]);

  return (
    <canvas
      ref={canvasRef}
      id="weather-background-canvas"
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000"
    />
  );
}
