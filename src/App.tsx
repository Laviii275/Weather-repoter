/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { WeatherData, WeatherCondition, WeatherAlert } from "./types.js";
import { INDIAN_CITIES } from "../server/weatherStore.js";

// Lucide icons
import {
  Search,
  Navigation,
  CloudSun,
  Wind,
  Thermometer,
  Compass,
  Gauge,
  Sun,
  Eye,
  AlertTriangle,
  RefreshCw,
  Clock,
  Radio,
  Zap,
  Globe2,
  Sparkles,
  Newspaper,
  History,
  LayoutDashboard
} from "lucide-react";

// Custom modular components
import WeatherBackground from "./components/WeatherBackground.js";
import GlobeVisualizer from "./components/GlobeVisualizer.js";
import RadarScanner from "./components/RadarScanner.js";
import HistoricalArchive from "./components/HistoricalArchive.js";
import AlertHub from "./components/AlertHub.js";
import WeatherNews from "./components/WeatherNews.js";
import AIMeteorologist from "./components/AIMeteorologist.js";

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCity, setActiveCity] = useState("");
  const [activeCountry, setActiveCountry] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [useAIForSearch, setUseAIForSearch] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<"telemetry" | "ai" | "news">("telemetry");

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);



  // Clock state
  const [currentTime, setCurrentTime] = useState("");

  // Update clock ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const ticker = setInterval(updateTime, 1000);
    return () => clearInterval(ticker);
  }, []);

  // Fetch current weather based on active city/country coordinates
  const fetchWeather = async (cityParam: string, countryParam: string = "India", coords: { lat?: number; lon?: number } | null = null, forceAI = false) => {
    setLoading(true);
    try {
      let url = `/api/weather/current?`;
      if (coords && coords.lat && coords.lon) {
        url += `lat=${coords.lat}&lon=${coords.lon}`;
      } else {
        url += `city=${encodeURIComponent(cityParam)}&country=${encodeURIComponent(countryParam)}`;
      }

      // Check if we should use live Gemini search grounding
      if (useAIForSearch || forceAI) {
        url += `&useAI=true`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setWeather(data);
          setActiveCity(data.city);
          setActiveCountry(data.country);

          // Fetch matching alerts for the loaded city to coordinate warnings
          const alertRes = await fetch(`/api/weather/alerts?city=${encodeURIComponent(data.city)}&condition=${encodeURIComponent(data.condition)}&temp=${data.temperature}&lat=${data.latitude}&lon=${data.longitude}`);
          if (alertRes.ok) {
            const alertContentType = alertRes.headers.get("content-type");
            if (alertContentType && alertContentType.includes("application/json")) {
              const alertData: WeatherAlert[] = await alertRes.json();
              // Filter warnings matching the loaded city
              const cityWarnings = alertData.filter(a => a.city.toLowerCase() === data.city.toLowerCase());
              setAlerts(cityWarnings);
            }
          }
        } else {
          console.warn("Expected JSON response for weather, but got: " + contentType);
        }
      }
    } catch (err) {
      console.error("Failed to load meteorological data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Automatically detect user's location using network IP geolocation on mount (no permission needed)
  useEffect(() => {
    const detectNetworkLocation = async () => {
      try {
        // Try ipwho.is first (reliable HTTPS IP geolocation)
        const response = await fetch("https://ipwho.is/");
        if (!response.ok) {
          throw new Error("ipwho.is lookup failed");
        }
        const data = await response.json();
        if (data && data.success && data.city) {
          fetchWeather(data.city, data.country || "Global");
          return;
        }
      } catch (err) {
        console.warn("ipwho.is failed, trying fallback:", err);
      }

      try {
        // Fallback to ipapi.co (reliable HTTPS IP geolocation fallback)
        const response = await fetch("https://ipapi.co/json/");
        if (response.ok) {
          const data = await response.json();
          if (data && data.city) {
            fetchWeather(data.city, data.country_name || "Global");
            return;
          }
        }
      } catch (err) {
        console.warn("ipapi.co failed, defaulting to Guwahati:", err);
      }

      // If both network requests fail, default to Guwahati
      fetchWeather("Guwahati", "India");
    };

    detectNetworkLocation();
  }, []);





  // Manual city search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Detect if searched city is in India or global, split by comma if present
    const parts = searchQuery.split(",");
    const cityName = parts[0].trim();
    const countryName = parts[1] ? parts[1].trim() : "";

    const isIndiaMatch = INDIAN_CITIES.some(c => c.name.toLowerCase() === cityName.toLowerCase()) || countryName.toLowerCase() === "india";
    const countryParam = isIndiaMatch ? "India" : (countryName || "Global");

    fetchWeather(cityName, countryParam);
    setSearchQuery("");
  };

  // Selector callback for 3D Globe click selection
  const handleGlobeSelectCity = (cityName: string, countryName: string) => {
    fetchWeather(cityName, countryName);
  };

  // Dynamic theme overlay header helper
  const getWeatherBadgeStyle = (cond: WeatherCondition) => {
    switch (cond) {
      case WeatherCondition.CLEAR:
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case WeatherCondition.CLOUDY:
        return "bg-slate-500/15 text-slate-300 border-slate-500/30";
      case WeatherCondition.RAINY:
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case WeatherCondition.STORMY:
        return "bg-indigo-500/15 text-indigo-400 border-indigo-500/30";
      case WeatherCondition.SNOWY:
        return "bg-sky-500/15 text-sky-300 border-sky-500/30";
      case WeatherCondition.HAZY:
        return "bg-yellow-600/15 text-yellow-400 border-yellow-600/30";
      case WeatherCondition.HEATWAVE:
        return "bg-red-500/15 text-red-400 border-red-500/30";
      default:
        return "bg-slate-500/15 text-slate-400 border-slate-500/30";
    }
  };



  if (showSplash) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center font-sans overflow-hidden">
        <motion.div
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: [0.3, 1.15, 1], opacity: 1 }}
          transition={{ duration: 1.8, ease: "easeOut" }}
          className="flex flex-col items-center justify-center text-center px-4"
        >
          <div className="p-6 rounded-3xl bg-gradient-to-tr from-indigo-600 to-sky-500 shadow-[0_0_50px_rgba(99,102,241,0.3)] text-white mb-6">
            <CloudSun className="w-16 h-16" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white uppercase font-sans mb-2 bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
            weathering app
          </h1>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
            next-gen cognitive meteorological grid
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-slate-100 flex flex-col font-sans pb-32 selection:bg-indigo-500/30 selection:text-white">
      {/* Dynamic Animated Canvas Background */}
      {weather && <WeatherBackground condition={weather.condition} />}

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-slate-950/45 pointer-events-none z-0" />

      {/* -------------------------------------------------- */}
      {/* HEADER SECTION */}
      {/* -------------------------------------------------- */}
      <header
        id="app-header"
        className="sticky top-0 z-40 bg-slate-950/65 border-b border-slate-800/80 backdrop-blur-xl px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4"
      >
        {/* Brand logo & tagline */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 shadow-lg shadow-indigo-500/20 text-white animate-pulse">
            <CloudSun className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white uppercase font-sans">
                weathering app
              </h1>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                LIVE MET-GRID
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Next-Gen Cognitive Meteorological Grid Network
            </p>
          </div>
        </div>

        {/* Global state, clock */}
        <div className="flex items-center gap-3.5 flex-wrap">
          {/* Real-time ticker clock */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3.5 py-1.5 rounded-xl font-mono text-xs text-slate-300 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>IST: {currentTime}</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">

        {/* -------------------------------------------------- */}
        {/* SEARCH AND CONTROL TOOLBAR */}
        {/* -------------------------------------------------- */}
        <section id="search-control-panel" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search form bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="md:col-span-2 flex items-center gap-2.5 p-1.5 rounded-2xl bg-slate-950/75 border border-slate-800/90 shadow-xl backdrop-blur-xl"
          >
            <div className="flex-1 flex items-center gap-2.5 pl-3">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                id="search-input-field"
                type="text"
                placeholder="Search any Indian city (e.g. Guwahati) or Global Station (e.g. Tokyo)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none text-sm text-slate-100 outline-none placeholder-slate-500 font-sans"
              />
            </div>

            {/* Toggle Gemini Search Grounding on Web */}
            <label
              htmlFor="ai-grounding-toggle"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 cursor-pointer select-none transition border border-slate-800"
            >
              <input
                id="ai-grounding-toggle"
                type="checkbox"
                checked={useAIForSearch}
                onChange={(e) => setUseAIForSearch(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-8 h-4 rounded-full p-0.5 transition-colors relative flex items-center ${useAIForSearch ? "bg-indigo-500" : "bg-slate-800 border border-slate-700"}`}>
                <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform ${useAIForSearch ? "translate-x-4" : "translate-x-0"}`} />
              </div>
              <span className="text-[10px] font-mono tracking-wider font-bold text-indigo-400 flex items-center gap-1">
                <Radio className="w-3 h-3 text-indigo-400" /> SEARCH WEB VIA GEMINI
              </span>
            </label>

            <button
              id="search-submit-btn"
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 font-semibold text-xs text-white shadow-md shadow-indigo-500/10 transition"
            >
              Scan Station
            </button>
          </form>

          {/* Quick Predefined State shortcut stations */}
          <div className="flex gap-2 items-center overflow-x-auto py-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold flex-shrink-0">Shortcuts:</span>
            {["Mumbai", "Kolkata", "Guwahati", "Srinagar"].map((cityShortcut) => (
              <button
                key={cityShortcut}
                onClick={() => fetchWeather(cityShortcut, "India")}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-sans font-medium transition flex-shrink-0 border ${
                  activeCity.toLowerCase() === cityShortcut.toLowerCase()
                    ? "bg-indigo-600/15 text-indigo-300 border-indigo-500/40"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                }`}
              >
                {cityShortcut}
              </button>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------- */}
        {/* TAB WORKSPACE CONTENT */}
        {/* -------------------------------------------------- */}
        {loading ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 bg-slate-950/70 border border-slate-800 rounded-3xl p-12 shadow-2xl backdrop-blur-xl">
            <span className="animate-spin w-10 h-10 border-2 border-indigo-400 border-t-transparent rounded-full"></span>
            <p className="text-xs font-mono text-indigo-400 animate-pulse uppercase tracking-widest">
              DEPLOYING DOPPLER ARRAYS & SYNCHRONIZING REAL-TIME ATMOSPHERIC SENSORS...
            </p>
          </div>
        ) : weather ? (
          <div className="flex flex-col gap-6">
            
            {/* TAB 1: CURRENT TELEMETRY & RADAR */}
            {activeTab === "telemetry" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                {/* COLUMN 1: CURRENT SECTOR WEATHER ANALYSIS CARD */}
                <div
                  id="current-weather-summary-panel"
                  className="lg:col-span-2 p-6 rounded-3xl bg-slate-950/75 border border-slate-800/90 shadow-2xl backdrop-blur-xl flex flex-col gap-6 text-slate-100 justify-between"
                >
                  {/* Card top details */}
                  <div className="flex justify-between items-start gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          STATION: {weather.country.toUpperCase()}
                        </span>
                        {weather.googleWeatherSynced && (
                          <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                            GOOGLE WEATHER SYNCED
                          </span>
                        )}
                      </div>

                      <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-1 font-sans">
                        {weather.city}
                        <span className="text-xs font-mono text-slate-400 font-medium ml-2">
                          ({weather.latitude.toFixed(2)}°N, {weather.longitude.toFixed(2)}°E)
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-1 font-mono">
                        Diagnostic Telemetry Logged: {new Date(weather.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>

                    {/* Condition Badge */}
                    <div
                      className={`px-4 py-2 rounded-2xl text-sm font-bold border flex items-center gap-2 ${getWeatherBadgeStyle(
                        weather.condition
                      )}`}
                    >
                      <Zap className="w-4 h-4" />
                      {weather.condition}
                    </div>
                  </div>

                  {/* Main Temp display block */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                    <div className="flex items-center gap-4">
                      <div className="text-6xl sm:text-7xl font-black text-white tracking-tighter leading-none flex items-start">
                        {Math.round(weather.temperature)}
                        <span className="text-2xl sm:text-3xl font-light text-slate-400">°C</span>
                      </div>
                      <div>
                        <div className="text-xs font-mono text-slate-400">FEELS LIKE</div>
                        <div className="text-sm font-bold text-slate-100">{Math.round(weather.feelsLike)}°C</div>
                      </div>
                    </div>

                    {/* Fast overview bar */}
                    <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900/60 border border-slate-800 p-4 rounded-2xl font-sans">
                      <div>
                        <p className="text-slate-400 font-medium">Satellite Cloud</p>
                        <p className="text-base font-extrabold text-white">{weather.satelliteCloudCover}%</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">AQI Index</p>
                        <p className="text-base font-extrabold text-emerald-400">{weather.aqi}</p>
                      </div>
                    </div>
                  </div>

                  {/* Grid block of atmospheric sensors */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" id="weather-details-grid">
                    {/* Wind telemetry */}
                    <div className="p-3.5 rounded-xl bg-slate-900/65 border border-slate-800 flex items-center gap-3">
                      <span className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                        <Wind className="w-4 h-4" />
                      </span>
                      <div>
                        <p className="text-[10px] font-mono text-slate-400 uppercase">Wind Velocity</p>
                        <p className="text-xs font-bold font-mono text-slate-200">
                          {weather.windSpeed} km/h ({weather.windDirection})
                        </p>
                      </div>
                    </div>

                    {/* Humidity telemetry */}
                    <div className="p-3.5 rounded-xl bg-slate-900/65 border border-slate-800 flex items-center gap-3">
                      <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                        <Thermometer className="w-4 h-4" />
                      </span>
                      <div>
                        <p className="text-[10px] font-mono text-slate-400 uppercase">Humidity</p>
                        <p className="text-xs font-bold font-mono text-slate-200">{weather.humidity}%</p>
                      </div>
                    </div>

                    {/* UV radiation index */}
                    <div className="p-3.5 rounded-xl bg-slate-900/65 border border-slate-800 flex items-center gap-3">
                      <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                        <Sun className="w-4 h-4" />
                      </span>
                      <div>
                        <p className="text-[10px] font-mono text-slate-400 uppercase">UV Radiation</p>
                        <p className="text-xs font-bold font-mono text-slate-200">Index {weather.uvIndex}</p>
                      </div>
                    </div>

                    {/* Barometric Pressure */}
                    <div className="p-3.5 rounded-xl bg-slate-900/65 border border-slate-800 flex items-center gap-3">
                      <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <Gauge className="w-4 h-4" />
                      </span>
                      <div>
                        <p className="text-[10px] font-mono text-slate-400 uppercase">Barometer</p>
                        <p className="text-xs font-bold font-mono text-slate-200">{weather.pressure} hPa</p>
                      </div>
                    </div>
                  </div>

                  {/* Static Citations display for Grounded Google Search weather */}
                  {(weather as any).citations && (weather as any).citations.length > 0 && (
                    <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-xl flex flex-col gap-1.5 text-xs text-slate-400">
                      <p className="font-mono text-[10px] text-indigo-400 uppercase font-bold flex items-center gap-1">
                        <Radio className="w-3.5 h-3.5" /> Online Grounding References
                      </p>
                      <div className="flex gap-4 flex-wrap text-[11px]">
                        {(weather as any).citations.map((cite: any, i: number) => (
                          <a
                            key={i}
                            href={cite.url}
                            target="_blank"
                            referrerPolicy="no-referrer"
                            className="hover:text-indigo-300 transition underline truncate max-w-[200px]"
                          >
                            [{i + 1}] {cite.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* COLUMN 2: DOPPLER RADAR SCREEN */}
                <div id="radar-scanner-panel">
                  <RadarScanner condition={weather.condition} cloudCover={weather.satelliteCloudCover} />
                </div>
              </motion.div>
            )}

            {/* TAB 3: AI CONSULTANT & ALERTS DESK */}
            {activeTab === "ai" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                {/* AI Weather Consultant Met-Report */}
                <div className="lg:col-span-1" id="ai-meteorologist-section">
                  <AIMeteorologist weatherData={weather} activeAlerts={alerts} />
                </div>

                {/* Extreme Warnings Alert Hub */}
                <div className="lg:col-span-2" id="severe-alerts-panel">
                  <AlertHub activeCity={activeCity} />
                </div>
              </motion.div>
            )}

            {/* TAB 4: CLIMATE ARCHIVES & NEWS */}
            {activeTab === "news" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 gap-6"
              >
                {/* Custom climate charts */}
                <div id="historical-archive-panel">
                  <HistoricalArchive selectedCity={activeCity} lat={weather.latitude} lon={weather.longitude} />
                </div>

                {/* Grounded news report */}
                <div id="global-news-panel">
                  <WeatherNews />
                </div>
              </motion.div>
            )}

          </div>
        ) : (
          <div className="min-h-[450px] flex flex-col items-center justify-center text-center p-8 bg-slate-950/75 border border-slate-800/90 rounded-3xl shadow-2xl backdrop-blur-xl">
            {/* Welcome Screen & Search Standby when no weather data is loaded */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md flex flex-col items-center gap-4"
            >
              <div className="p-4 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Search className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">Weather Scanner Standby</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                The Weathering App Doppler scanners are active and calibrated. Please enter any city or country in the search panel above, or click one of the pre-configured stations below to start analyzing.
              </p>
              <div className="mt-6 w-full">
                <p className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider mb-2.5">Popular Station Grids</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { name: "Delhi", country: "India" },
                    { name: "Mumbai", country: "India" },
                    { name: "Srinagar", country: "India" },
                    { name: "Guwahati", country: "India" },
                    { name: "London", country: "United Kingdom" },
                    { name: "New York", country: "United States" },
                    { name: "Tokyo", country: "Japan" },
                    { name: "Sydney", country: "Australia" }
                  ].map((c) => (
                    <button
                      key={c.name}
                      onClick={() => fetchWeather(c.name, c.country)}
                      className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition flex flex-col items-center"
                    >
                      <span>{c.name}</span>
                      <span className="text-[9px] font-mono text-slate-500">{c.country}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* -------------------------------------------------- */}
        {/* FLOATING BOTTOM TOOLBAR / NAVIGATION DOCK */}
        {/* -------------------------------------------------- */}
        {weather && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 max-w-2xl w-[92%] z-50 rounded-2xl bg-slate-950/85 border border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl px-2.5 py-2.5 flex justify-around items-center gap-1.5">
            <button
              onClick={() => setActiveTab("telemetry")}
              className={`flex-1 py-2 px-1.5 md:px-3 rounded-xl flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-2 transition-all cursor-pointer ${
                activeTab === "telemetry"
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/35 font-bold shadow-lg"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-[10px] md:text-xs font-semibold tracking-tight font-sans">Telemetry</span>
            </button>

            <button
              onClick={() => setActiveTab("ai")}
              className={`flex-1 py-2 px-1.5 md:px-3 rounded-xl flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-2 transition-all cursor-pointer ${
                activeTab === "ai"
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/35 font-bold shadow-lg"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-[10px] md:text-xs font-semibold tracking-tight font-sans">AI & Warnings</span>
            </button>

            <button
              onClick={() => setActiveTab("news")}
              className={`flex-1 py-2 px-1.5 md:px-3 rounded-xl flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-2 transition-all cursor-pointer ${
                activeTab === "news"
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/35 font-bold shadow-lg"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
              }`}
            >
              <Newspaper className="w-4 h-4" />
              <span className="text-[10px] md:text-xs font-semibold tracking-tight font-sans">Climate & News</span>
            </button>
          </div>
        )}

      </main>

      {/* Footer system credit line */}
      <footer className="mt-12 text-center text-[10px] font-mono text-slate-500 max-w-4xl mx-auto px-4 leading-normal">
        <p>Weathering App — National Meteorological Sensor Network Integration.</p>
        <p className="mt-1">
          Grounding queries via Gemini 3.5 Flash & Google Search tools. Satellite Doppler scans are simulated for training and diagnostics.
        </p>
      </footer>
    </div>
  );
}
