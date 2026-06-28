import { useState, useEffect } from "react";
import { HistoricalRecord } from "../types.js";
import { INDIAN_CITIES, GLOBAL_CITIES } from "../../server/weatherStore.js";
import { Calendar, Thermometer, CloudRain, Droplets, Wind, Sun } from "lucide-react";

interface HistoricalArchiveProps {
  selectedCity: string;
  lat?: number;
  lon?: number;
}

export default function HistoricalArchive({ selectedCity, lat, lon }: HistoricalArchiveProps) {
  const [city, setCity] = useState(selectedCity);
  const [year, setYear] = useState(2025);
  const [historicalData, setHistoricalData] = useState<HistoricalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"temp" | "rainfall" | "humidity" | "wind" | "uv">("temp");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    setCity(selectedCity);
  }, [selectedCity]);

  useEffect(() => {
    const fetchHistorical = async () => {
      setLoading(true);
      try {
        let url = `/api/weather/historical?city=${encodeURIComponent(city)}`;
        
        if (city.toLowerCase() === selectedCity.toLowerCase() && lat !== undefined && lon !== undefined) {
          url += `&lat=${lat}&lon=${lon}`;
        } else {
          const match = INDIAN_CITIES.concat(GLOBAL_CITIES as any).find(c => c.name.toLowerCase() === city.toLowerCase());
          if (match) {
            url += `&lat=${match.lat}&lon=${match.lon}`;
          }
        }

        const res = await fetch(url);
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            setHistoricalData(data);
          } else {
            console.warn("Expected JSON response for historical data, but got: " + contentType);
          }
        }
      } catch (err) {
        console.error("Failed to fetch historical data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistorical();
  }, [city]);

  // Dimensions for SVG charts
  const width = 500;
  const height = 180;
  const padding = 35;

  const maxTemp = Math.max(...historicalData.map(d => d.avgTemp), 10);
  const minTemp = Math.min(...historicalData.map(d => d.avgTemp), 0);
  const tempRange = maxTemp - minTemp;

  const maxRain = Math.max(...historicalData.map(d => d.rainfall), 50);

  const maxWind = Math.max(...historicalData.map(d => d.windSpeed ?? 15), 15);
  const minWind = Math.min(...historicalData.map(d => d.windSpeed ?? 5), 0);
  const windRange = maxWind - minWind;

  const maxUV = Math.max(...historicalData.map(d => d.uvIndex ?? 10), 10);

  // Helper to convert index and value to SVG coordinates
  const getTempCoords = (index: number, val: number) => {
    const x = padding + (index / 11) * (width - padding * 2);
    // Inverse scale for SVG Y axis
    const y = height - padding - ((val - minTemp) / (tempRange || 1)) * (height - padding * 2);
    return { x, y };
  };

  const getRainCoords = (index: number, val: number) => {
    const x = padding + (index / 11) * (width - padding * 2);
    const barHeight = (val / maxRain) * (height - padding * 2);
    const y = height - padding - barHeight;
    return { x, y, barHeight };
  };

  const getWindCoords = (index: number, val: number) => {
    const x = padding + (index / 11) * (width - padding * 2);
    const y = height - padding - ((val - minWind) / (windRange || 1)) * (height - padding * 2);
    return { x, y };
  };

  const getUVCoords = (index: number, val: number) => {
    const x = padding + (index / 11) * (width - padding * 2);
    const y = height - padding - (val / (maxUV || 1)) * (height - padding * 2);
    return { x, y };
  };

  // Generate SVG paths
  const linePath = historicalData
    .map((d, i) => {
      const { x, y } = getTempCoords(i, d.avgTemp);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  // Gradient fill area path
  const areaPath = historicalData.length > 0
    ? `${linePath} L ${getTempCoords(historicalData.length - 1, minTemp).x} ${height - padding} L ${getTempCoords(0, minTemp).x} ${height - padding} Z`
    : "";

  const windLinePath = historicalData
    .map((d, i) => {
      const { x, y } = getWindCoords(i, d.windSpeed ?? 10);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const windAreaPath = historicalData.length > 0
    ? `${windLinePath} L ${getWindCoords(historicalData.length - 1, minWind).x} ${height - padding} L ${getWindCoords(0, minWind).x} ${height - padding} Z`
    : "";

  const uvLinePath = historicalData
    .map((d, i) => {
      const { x, y } = getUVCoords(i, d.uvIndex ?? 5);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const uvAreaPath = historicalData.length > 0
    ? `${uvLinePath} L ${getUVCoords(historicalData.length - 1, 0).x} ${height - padding} L ${getUVCoords(0, 0).x} ${height - padding} Z`
    : "";

  return (
    <div
      id="historical-archive-card"
      className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 backdrop-blur-xl flex flex-col gap-4 text-slate-100"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-mono tracking-widest text-sky-400 font-semibold uppercase">Historical Database</span>
          <h2 className="text-lg font-bold text-slate-100 font-sans tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-400" /> Climate Archive & Trends
          </h2>
        </div>

        {/* Station Selectors */}
        <div className="flex gap-2 text-xs font-sans">
          <select
            id="historical-city-select"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 outline-none focus:border-sky-500"
          >
            <optgroup label="India Cities">
              {INDIAN_CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} (IN)
                </option>
              ))}
            </optgroup>
            <optgroup label="Global Cities">
              {GLOBAL_CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.country})
                </option>
              ))}
            </optgroup>
          </select>

          <select
            id="historical-year-select"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 outline-none focus:border-sky-500"
          >
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
            <option value={2023}>2023</option>
          </select>
        </div>
      </div>

      {/* Metric toggle tabs */}
      <div className="flex gap-1.5 border-b border-slate-800/80 pb-3 overflow-x-auto scrollbar-none" id="historical-tabs">
        <button
          onClick={() => setActiveTab("temp")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
            activeTab === "temp"
              ? "bg-red-500/10 text-red-400 border border-red-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
          }`}
        >
          <Thermometer className="w-4 h-4" /> Avg Temperature
        </button>

        <button
          onClick={() => setActiveTab("rainfall")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
            activeTab === "rainfall"
              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
          }`}
        >
          <CloudRain className="w-4 h-4" /> Precipitation (Rain)
        </button>

        <button
          onClick={() => setActiveTab("humidity")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
            activeTab === "humidity"
              ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
          }`}
        >
          <Droplets className="w-4 h-4" /> Humidity
        </button>

        <button
          onClick={() => setActiveTab("wind")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
            activeTab === "wind"
              ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
          }`}
        >
          <Wind className="w-4 h-4" /> Wind Velocity
        </button>

        <button
          onClick={() => setActiveTab("uv")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
            activeTab === "uv"
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
          }`}
        >
          <Sun className="w-4 h-4" /> UV Index
        </button>
      </div>

      {loading ? (
        <div className="h-[180px] flex items-center justify-center text-slate-400 text-xs font-mono">
          <span className="animate-spin w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full mr-2"></span>
          ACCESSING SEISMOLOGICAL & MET CLIMATE LOGS...
        </div>
      ) : (
        <div className="relative w-full overflow-x-auto select-none">
          <div className="min-w-[480px]">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
              {/* Grid Lines */}
              <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
              <line x1={padding} y1={(height - padding * 2) / 2 + padding} x2={width - padding} y2={(height - padding * 2) / 2 + padding} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
              <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />

              {/* Define gradients */}
              <defs>
                <linearGradient id="tempAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="rainBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.4" />
                </linearGradient>
                <linearGradient id="humidityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="windAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="uvAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Chart Types rendering */}
              {activeTab === "temp" && (
                <>
                  {/* Under line glow area */}
                  <path d={areaPath} fill="url(#tempAreaGrad)" />
                  {/* Neon line */}
                  <path d={linePath} fill="none" stroke="#ef4444" strokeWidth={2.5} strokeLinecap="round" />

                  {/* Data Dots */}
                  {historicalData.map((d, i) => {
                    const { x, y } = getTempCoords(i, d.avgTemp);
                    const isHovered = hoveredIndex === i;
                    return (
                      <g key={i} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
                        <circle
                          cx={x}
                          cy={y}
                          r={isHovered ? 6 : 4}
                          fill="#ef4444"
                          stroke="#1e293b"
                          strokeWidth={1.5}
                          className="cursor-pointer transition-all duration-150"
                        />
                      </g>
                    );
                  })}
                </>
              )}

              {activeTab === "rainfall" && (
                <g>
                  {historicalData.map((d, i) => {
                    const { x, y, barHeight } = getRainCoords(i, d.rainfall);
                    const barWidth = 14;
                    const isHovered = hoveredIndex === i;

                    return (
                      <rect
                        key={i}
                        x={x - barWidth / 2}
                        y={y}
                        width={barWidth}
                        height={Math.max(barHeight, 2)}
                        rx={3}
                        fill="url(#rainBarGrad)"
                        stroke={isHovered ? "#38bdf8" : "none"}
                        strokeWidth={1}
                        className="cursor-pointer transition-colors duration-150"
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      />
                    );
                  })}
                </g>
              )}

              {activeTab === "humidity" && (
                <>
                  {/* Area fill */}
                  <path
                    d={historicalData
                      .map((d, i) => {
                        const x = padding + (i / 11) * (width - padding * 2);
                        const y = height - padding - (d.humidity / 100) * (height - padding * 2);
                        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                      })
                      .concat(`L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`)
                      .join(" ")}
                    fill="url(#humidityGrad)"
                  />
                  {/* Line */}
                  <path
                    d={historicalData
                      .map((d, i) => {
                        const x = padding + (i / 11) * (width - padding * 2);
                        const y = height - padding - (d.humidity / 100) * (height - padding * 2);
                        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth={2}
                  />
                  {/* Points */}
                  {historicalData.map((d, i) => {
                    const x = padding + (i / 11) * (width - padding * 2);
                    const y = height - padding - (d.humidity / 100) * (height - padding * 2);
                    const isHovered = hoveredIndex === i;

                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r={isHovered ? 5.5 : 3.5}
                        fill="#14b8a6"
                        stroke="#0f172a"
                        strokeWidth={1}
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        className="cursor-pointer transition-all duration-150"
                      />
                    );
                  })}
                </>
              )}

              {activeTab === "wind" && (
                <>
                  {/* Area fill */}
                  <path
                    d={historicalData
                      .map((d, i) => {
                        const { x, y } = getWindCoords(i, d.windSpeed ?? 10);
                        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                      })
                      .concat(`L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`)
                      .join(" ")}
                    fill="url(#windAreaGrad)"
                  />
                  {/* Line */}
                  <path
                    d={windLinePath}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth={2}
                  />
                  {/* Points */}
                  {historicalData.map((d, i) => {
                    const { x, y } = getWindCoords(i, d.windSpeed ?? 10);
                    const isHovered = hoveredIndex === i;

                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r={isHovered ? 5.5 : 3.5}
                        fill="#38bdf8"
                        stroke="#0f172a"
                        strokeWidth={1}
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        className="cursor-pointer transition-all duration-150"
                      />
                    );
                  })}
                </>
              )}

              {activeTab === "uv" && (
                <>
                  {/* Area fill */}
                  <path
                    d={historicalData
                      .map((d, i) => {
                        const { x, y } = getUVCoords(i, d.uvIndex ?? 5);
                        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                      })
                      .concat(`L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`)
                      .join(" ")}
                    fill="url(#uvAreaGrad)"
                  />
                  {/* Line */}
                  <path
                    d={uvLinePath}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={2}
                  />
                  {/* Points */}
                  {historicalData.map((d, i) => {
                    const { x, y } = getUVCoords(i, d.uvIndex ?? 5);
                    const isHovered = hoveredIndex === i;

                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r={isHovered ? 5.5 : 3.5}
                        fill="#f59e0b"
                        stroke="#0f172a"
                        strokeWidth={1}
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        className="cursor-pointer transition-all duration-150"
                      />
                    );
                  })}
                </>
              )}

              {/* X Axis Labels (Months) */}
              {historicalData.map((d, i) => {
                const x = padding + (i / 11) * (width - padding * 2);
                return (
                  <text
                    key={i}
                    x={x}
                    y={height - 12}
                    fill="#64748b"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {d.month}
                  </text>
                );
              })}

              {/* Y Axis Bounds */}
              {activeTab === "temp" && (
                <>
                  <text x={10} y={padding + 4} fill="#64748b" fontSize="8" fontFamily="monospace">{Math.round(maxTemp)}°C</text>
                  <text x={10} y={height - padding + 2} fill="#64748b" fontSize="8" fontFamily="monospace">{Math.round(minTemp)}°C</text>
                </>
              )}
              {activeTab === "rainfall" && (
                <>
                  <text x={10} y={padding + 4} fill="#3b82f6" fontSize="8" fontFamily="monospace">{Math.round(maxRain)}mm</text>
                  <text x={10} y={height - padding + 2} fill="#64748b" fontSize="8" fontFamily="monospace">0mm</text>
                </>
              )}
              {activeTab === "humidity" && (
                <>
                  <text x={10} y={padding + 4} fill="#14b8a6" fontSize="8" fontFamily="monospace">100%</text>
                  <text x={10} y={height - padding + 2} fill="#64748b" fontSize="8" fontFamily="monospace">0%</text>
                </>
              )}
              {activeTab === "wind" && (
                <>
                  <text x={10} y={padding + 4} fill="#38bdf8" fontSize="8" fontFamily="monospace">{Math.round(maxWind)}km/h</text>
                  <text x={10} y={height - padding + 2} fill="#64748b" fontSize="8" fontFamily="monospace">{Math.round(minWind)}km/h</text>
                </>
              )}
              {activeTab === "uv" && (
                <>
                  <text x={10} y={padding + 4} fill="#f59e0b" fontSize="8" fontFamily="monospace">Index {Math.round(maxUV)}</text>
                  <text x={10} y={height - padding + 2} fill="#64748b" fontSize="8" fontFamily="monospace">0</text>
                </>
              )}
            </svg>

            {/* Hover tooltip value render */}
            {hoveredIndex !== null && historicalData[hoveredIndex] && (
              <div
                id="chart-floating-tooltip"
                className="absolute z-10 p-2.5 bg-slate-900 border border-slate-700 rounded-lg shadow-xl text-xs font-sans left-1/2 -translate-x-1/2 -top-1"
              >
                <p className="font-semibold text-sky-400 mb-0.5">{historicalData[hoveredIndex].month} Climate Averages:</p>
                <div className="flex flex-col gap-0.5 text-slate-300 font-mono text-[11px]">
                  <p>🌡️ Avg Temp: <span className="text-red-400">{historicalData[hoveredIndex].avgTemp}°C</span></p>
                  <p>🌧️ Rainfall: <span className="text-blue-400">{historicalData[hoveredIndex].rainfall} mm</span></p>
                  <p>💧 Humidity: <span className="text-teal-400">{historicalData[hoveredIndex].humidity}%</span></p>
                  {historicalData[hoveredIndex].windSpeed !== undefined && (
                    <p>💨 Wind Speed: <span className="text-sky-400">{historicalData[hoveredIndex].windSpeed} km/h</span></p>
                  )}
                  {historicalData[hoveredIndex].uvIndex !== undefined && (
                    <p>☀️ UV Index: <span className="text-amber-400">{historicalData[hoveredIndex].uvIndex}</span></p>
                  )}
                  {historicalData[hoveredIndex].extremeEventsCount > 0 && (
                    <p className="text-amber-400 font-sans mt-1">⚡ {historicalData[hoveredIndex].extremeEventsCount} Extreme Events logged</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary insights under chart */}
      <div className="text-xs bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl flex items-start gap-2.5 leading-relaxed text-slate-300">
        <span className="p-1 rounded bg-slate-800 text-sky-400 font-mono text-[10px] mt-0.5">MET-NOTE</span>
        <p>
          Historical observations indicate that <strong className="text-white">{city}</strong> shows a seasonal range of{" "}
          <span className="text-red-400 font-semibold">{minTemp}°C to {maxTemp}°C</span> with an annual cumulative monsoon peak in precipitation. This data compiles decadal reading trends across local sensors.
        </p>
      </div>
    </div>
  );
}
