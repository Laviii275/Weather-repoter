import React, { useEffect, useRef, useState } from "react";
import { INDIAN_CITIES, GLOBAL_CITIES } from "../../server/weatherStore.js";
import { ZoomIn, ZoomOut, Play, Pause, ExternalLink, RotateCcw } from "lucide-react";

interface GlobeVisualizerProps {
  onSelectCity: (cityName: string, countryName: string) => void;
  activeCityName: string;
  size?: number;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
  color?: string;
}

export default function GlobeVisualizer({ onSelectCity, activeCityName, size }: GlobeVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Rotation angles
  const [phi, setPhi] = useState(0); // Horizontal rotation
  const [theta, setTheta] = useState(0.1); // Vertical tilt

  // Interaction & zoom state
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const [hoveredCity, setHoveredCity] = useState<{ name: string; country: string; x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [isRotating, setIsRotating] = useState(true);

  // Combine Indian and global cities for plotting
  const allCities = [
    ...INDIAN_CITIES.map(c => ({ name: c.name, country: "India", lat: c.lat, lon: c.lon, isIndia: true })),
    ...GLOBAL_CITIES.map(c => ({ name: c.name, country: c.country, lat: c.lat, lon: c.lon, isIndia: false }))
  ];

  // Pre-generate continent landmass dots
  const landPoints = useRef<Point3D[]>([]);

  useEffect(() => {
    if (landPoints.current.length > 0) return;

    // Generate continent coordinates mathematically
    const points: Point3D[] = [];

    const continents = [
      // India landmass core
      { lat: 20, lon: 78, latRadius: 10, lonRadius: 10, density: 40 },
      // Asia core
      { lat: 45, lon: 100, latRadius: 20, lonRadius: 35, density: 120 },
      // Europe
      { lat: 50, lon: 15, latRadius: 12, lonRadius: 18, density: 60 },
      // Africa
      { lat: 5, lon: 20, latRadius: 25, lonRadius: 15, density: 100 },
      // North America
      { lat: 45, lon: -100, latRadius: 18, lonRadius: 25, density: 100 },
      // South America
      { lat: -15, lon: -60, latRadius: 20, lonRadius: 12, density: 70 },
      // Australia
      { lat: -25, lon: 135, latRadius: 10, lonRadius: 15, density: 45 },
      // Greenland
      { lat: 75, lon: -40, latRadius: 8, lonRadius: 12, density: 25 },
      // Antarctica
      { lat: -85, lon: 0, latRadius: 5, lonRadius: 180, density: 100 }
    ];

    continents.forEach(cont => {
      for (let i = 0; i < cont.density; i++) {
        // Random Gaussian clustering
        const u1 = Math.random();
        const u2 = Math.random();
        const randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

        const lat = cont.lat + (Math.random() - 0.5) * cont.latRadius * 2 + randStdNormal * 2;
        const lon = cont.lon + (Math.random() - 0.5) * cont.lonRadius * 2;

        if (lat > -90 && lat < 90) {
          const latRad = (lat * Math.PI) / 180;
          const lonRad = (lon * Math.PI) / 180;

          // Unit sphere projection
          points.push({
            x: Math.cos(latRad) * Math.sin(lonRad),
            y: -Math.sin(latRad),
            z: Math.cos(latRad) * Math.cos(lonRad),
            color: cont.lat === 20 && cont.lon === 78 ? "#10b981" : "#38bdf8" // India is green!
          });
        }
      }
    });

    landPoints.current = points;
  }, []);

  // Frame animation & render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const currentSize = size || 380;
    let rWidth = (canvas.width = currentSize);
    let rHeight = (canvas.height = currentSize);
    const R = currentSize * 0.355; // Base globe radius (around 135px for 380px size)
    const centerX = rWidth / 2;
    const centerY = rHeight / 2;

    const currentR = R * zoom;

    // Auto rotate slowly if not dragging and isRotating is active
    let autoRotateAngle = phi;

    const renderGlobe = () => {
      ctx.clearRect(0, 0, rWidth, rHeight);

      const currentPhi = isDragging.current ? phi : autoRotateAngle;
      if (!isDragging.current && isRotating) {
        autoRotateAngle += 0.003; // rotate slowly
      }

      // Draw Atmospheric Glow Ring
      const ringGlow = ctx.createRadialGradient(centerX, centerY, currentR - 10, centerX, centerY, currentR + 25);
      ringGlow.addColorStop(0, "rgba(56, 189, 248, 0.15)");
      ringGlow.addColorStop(0.5, "rgba(56, 189, 248, 0.08)");
      ringGlow.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.fillStyle = ringGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentR + 25, 0, Math.PI * 2);
      ctx.fill();

      // Draw Globe Base Sphere
      const spaceGrad = ctx.createRadialGradient(centerX - 40, centerY - 40, 10, centerX, centerY, currentR);
      spaceGrad.addColorStop(0, "#0b1329");
      spaceGrad.addColorStop(1, "#030712");
      ctx.fillStyle = spaceGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentR, 0, Math.PI * 2);
      ctx.fill();

      // Draw latitude/longitude grid (Wireframe)
      ctx.strokeStyle = "rgba(56, 189, 248, 0.05)";
      ctx.lineWidth = 1;

      // Draw Latitudes
      for (let latAng = -60; latAng <= 60; latAng += 20) {
        const rad = (latAng * Math.PI) / 180;
        const r = currentR * Math.cos(rad);
        const yOffset = -currentR * Math.sin(rad);

        // Transform vertical rotation tilt
        const rotatedY = yOffset * Math.cos(theta);
        const squishRadiusY = r * Math.sin(theta);

        ctx.beginPath();
        ctx.ellipse(centerX, centerY + rotatedY, r, squishRadiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 1. Draw Land Points
      landPoints.current.forEach(pt => {
        // Horizontal rotation (Y axis)
        const x1 = pt.x * Math.cos(currentPhi) - pt.z * Math.sin(currentPhi);
        const z1 = pt.x * Math.sin(currentPhi) + pt.z * Math.cos(currentPhi);

        // Vertical tilt (X axis)
        const y2 = pt.y * Math.cos(theta) - z1 * Math.sin(theta);
        const z2 = pt.y * Math.sin(theta) + z1 * Math.cos(theta);

        const scrX = centerX + currentR * x1;
        const scrY = centerY + currentR * y2;

        // Depth fog / transparency
        const isFront = z2 > 0;
        const opacity = isFront ? 0.65 : 0.12;
        const dotSize = isFront ? 1.8 : 1.0;

        ctx.fillStyle = pt.color === "#10b981"
          ? `rgba(16, 185, 129, ${opacity * 1.5})` // Green for India
          : `rgba(56, 189, 248, ${opacity})`;

        ctx.beginPath();
        ctx.arc(scrX, scrY, dotSize, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Plot Cities Pins
      const activePins: { name: string; country: string; sx: number; sy: number; isIndia: boolean }[] = [];

      allCities.forEach(city => {
        const latRad = (city.lat * Math.PI) / 180;
        const lonRad = (city.lon * Math.PI) / 180;

        // Base coordinate calculation
        const x0 = Math.cos(latRad) * Math.sin(lonRad);
        const y0 = -Math.sin(latRad);
        const z0 = Math.cos(latRad) * Math.cos(lonRad);

        // Rotation around Y (phi)
        const x1 = x0 * Math.cos(currentPhi) - z0 * Math.sin(currentPhi);
        const z1 = x0 * Math.sin(currentPhi) + z0 * Math.cos(currentPhi);

        // Rotation around X (theta)
        const y2 = y0 * Math.cos(theta) - z1 * Math.sin(theta);
        const z2 = y0 * Math.sin(theta) + z1 * Math.cos(theta);

        if (z2 > -0.1) { // Render on front hemisphere
          const scrX = centerX + currentR * x1;
          const scrY = centerY + currentR * y2;

          const isActive = city.name.toLowerCase() === activeCityName.toLowerCase();
          const pColor = city.isIndia ? "rgb(52, 211, 153)" : "rgb(56, 189, 248)";

          // Draw neon pulse ring around active pin
          if (isActive) {
            const pulseRadius = (5 + Math.sin(Date.now() * 0.01) * 3) * Math.sqrt(zoom);
            ctx.strokeStyle = "rgba(239, 68, 68, 0.8)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(scrX, scrY, pulseRadius, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Main node circle
          ctx.fillStyle = isActive ? "#ef4444" : pColor;
          ctx.beginPath();
          ctx.arc(scrX, scrY, (isActive ? 4.5 : 3) * Math.sqrt(zoom), 0, Math.PI * 2);
          ctx.fill();

          // Render names next to pins when zoomed in, or if it is the active/hovered city
          const isHovered = hoveredCity && hoveredCity.name === city.name;
          const shouldRenderName = zoom > 1.25 || isActive || isHovered;

          if (shouldRenderName) {
            ctx.fillStyle = isActive ? "#f87171" : "rgba(255, 255, 255, 0.9)";
            ctx.font = isActive 
              ? `bold ${Math.max(9, Math.round(10 * Math.sqrt(zoom)))}px font-sans`
              : `500 ${Math.max(8, Math.round(8.5 * Math.sqrt(zoom)))}px font-sans`;
            
            // Subtly shadow text for readability
            ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
            ctx.shadowBlur = 4;
            ctx.fillText(city.name, scrX + 6 * Math.sqrt(zoom), scrY + 3);
            ctx.shadowBlur = 0; // reset
          }

          // Add to hover check array
          activePins.push({ name: city.name, country: city.country, sx: scrX, sy: scrY, isIndia: city.isIndia });
        }
      });

      // Store active pins on canvas element for custom event checking
      (canvas as any).activePins = activePins;

      // Draw subtle boundary borders
      ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentR, 0, Math.PI * 2);
      ctx.stroke();

      // Atmospheric limb glow overlay (shading)
      const shading = ctx.createRadialGradient(centerX - 10, centerY - 10, currentR * 0.6, centerX, centerY, currentR);
      shading.addColorStop(0, "rgba(0, 0, 0, 0)");
      shading.addColorStop(0.85, "rgba(3, 7, 18, 0.4)");
      shading.addColorStop(1, "rgba(3, 7, 18, 0.95)");
      ctx.fillStyle = shading;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentR, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(renderGlobe);
    };

    renderGlobe();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [phi, theta, activeCityName, zoom, size, isRotating, hoveredCity]);

  // Handle Mouse / Drag events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDragging.current) {
      const deltaX = e.clientX - previousMousePosition.current.x;
      const deltaY = e.clientY - previousMousePosition.current.y;

      setPhi(prev => prev + deltaX * 0.007);
      setTheta(prev => Math.max(-1.1, Math.min(1.1, prev - deltaY * 0.007)));

      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    } else {
      // Hover pin detection
      const activePins = (canvas as any).activePins || [];
      const found = activePins.find((p: any) => {
        const dx = p.sx - mouseX;
        const dy = p.sy - mouseY;
        return Math.sqrt(dx * dx + dy * dy) < 8;
      });

      if (found) {
        setHoveredCity({ name: found.name, country: found.country, x: found.sx, y: found.sy });
        canvas.style.cursor = "pointer";
      } else {
        setHoveredCity(null);
        canvas.style.cursor = "grab";
      }
    }
  };

  const handleMouseUpOrLeave = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging.current) {
      isDragging.current = false;
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const activePins = (canvas as any).activePins || [];
    const found = activePins.find((p: any) => {
      const dx = p.sx - mouseX;
      const dy = p.sy - mouseY;
      return Math.sqrt(dx * dx + dy * dy) < 8;
    });

    if (found) {
      onSelectCity(found.name, found.country);
    }
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      isDragging.current = true;
      previousMousePosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isDragging.current && e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - previousMousePosition.current.x;
      const deltaY = e.touches[0].clientY - previousMousePosition.current.y;

      setPhi(prev => prev + deltaX * 0.007);
      setTheta(prev => Math.max(-1.1, Math.min(1.1, prev - deltaY * 0.007)));

      previousMousePosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  // Safe zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(4.0, prev + 0.2));
  const handleZoomOut = () => setZoom(prev => Math.max(0.5, prev - 0.2));
  const handleZoomReset = () => setZoom(1.0);

  return (
    <div
      ref={containerRef}
      id="globe-container"
      className="relative flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 backdrop-blur-xl"
    >
      <div className="flex justify-between items-center w-full mb-3">
        <div>
          <span className="text-xs font-mono tracking-widest text-emerald-400 font-semibold uppercase">3D Visualizer</span>
          <h3 className="text-sm font-semibold text-slate-100 font-sans tracking-tight">Meteorological Hologram Globe</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom Up Standalone tab trigger */}
          <a
            href="/?view=globe"
            target="_blank"
            rel="noopener noreferrer"
            title="Zoom up in a new tab"
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition"
          >
            <ExternalLink className="w-3 h-3" />
            ZOOM UP
          </a>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
            Scroll to Zoom
          </span>
        </div>
      </div>

      <div className="relative w-full aspect-square flex items-center justify-center">
        <canvas
          ref={canvasRef}
          id="globe-visualizer-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onClick={handleCanvasClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => { isDragging.current = false; }}
          onWheel={(e) => {
            e.preventDefault();
            setZoom(prev => Math.max(0.5, Math.min(4.0, prev - e.deltaY * 0.001)));
          }}
          className="rounded-full shadow-2xl shadow-sky-500/10 cursor-grab"
        />

        {/* Floating Controls HUD */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl shadow-2xl z-10 select-none">
          <button
            onClick={handleZoomIn}
            className="p-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white transition"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomReset}
            className="px-1 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-[9px] font-mono font-bold text-slate-400 hover:text-white transition"
            title="Reset Zoom (1x)"
          >
            1x
          </button>
          <button
            onClick={() => setIsRotating(prev => !prev)}
            className="p-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white transition"
            title={isRotating ? "Pause Auto-Rotation" : "Resume Auto-Rotation"}
          >
            {isRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Hover info tooltip box */}
        {hoveredCity && (
          <div
            id="globe-tooltip"
            className="absolute z-50 pointer-events-none p-2 bg-slate-900/95 text-slate-100 border border-slate-700 text-xs rounded-lg shadow-xl font-sans"
            style={{
              left: `${hoveredCity.x + 10}px`,
              top: `${hoveredCity.y - 45}px`
            }}
          >
            <p className="font-semibold text-sky-400">{hoveredCity.name}</p>
            <p className="text-[10px] text-slate-400">{hoveredCity.country}</p>
            <p className="text-[9px] font-mono mt-0.5 text-slate-500">Click to search report</p>
          </div>
        )}
      </div>

      <div className="w-full flex justify-between items-center px-2 mt-2">
        <div className="flex gap-3 text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span>Indian Cities</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-400 inline-block"></span>
            <span>Global Stations</span>
          </div>
        </div>
        <span className="text-[9px] font-mono text-slate-500">Active Station: <strong className="text-red-400">{activeCityName}</strong></span>
      </div>
    </div>
  );
}
