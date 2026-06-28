import { useState, useEffect } from "react";
import { WeatherNewsItem } from "../types.js";
import { Globe, ExternalLink, RefreshCw, Rss } from "lucide-react";

export default function WeatherNews() {
  const [news, setNews] = useState<WeatherNewsItem[]>([]);
  const [country, setCountry] = useState("India");
  const [loading, setLoading] = useState(false);

  const countries = ["India", "United States", "United Kingdom", "Japan", "Australia", "Brazil", "Russia", "Egypt"];

  const fetchNews = async (targetCountry: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/weather/news?country=${encodeURIComponent(targetCountry)}`);
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setNews(data);
        } else {
          console.warn("Expected JSON response for news, but got: " + contentType);
        }
      }
    } catch (err) {
      console.error("Failed to fetch grounded weather news:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(country);
  }, [country]);

  return (
    <div
      id="weather-news-card"
      className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 backdrop-blur-xl text-slate-100 flex flex-col gap-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-mono tracking-widest text-emerald-400 font-semibold uppercase">Global Broadcast</span>
          <h2 className="text-lg font-bold text-slate-100 font-sans tracking-tight flex items-center gap-2">
            <Rss className="w-5 h-5 text-emerald-400" /> Live Weather News
          </h2>
        </div>

        {/* Country toggles */}
        <div className="flex gap-1.5 flex-wrap">
          <select
            id="news-country-select"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 outline-none focus:border-emerald-500 font-sans"
          >
            {countries.map((c) => (
              <option key={c} value={c}>
                {c} News
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchNews(country)}
            id="refresh-news-btn"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            title="Refresh news feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed max-w-2xl font-sans">
        This news portal is synchronized online. Utilizing <strong className="text-emerald-400">Gemini Google Search Grounding</strong>, we scan global meteorological networks, IMD databases, and satellite agency feeds in real-time to bring you verified updates.
      </p>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <span className="animate-spin w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full"></span>
          <p className="text-xs font-mono text-emerald-400 animate-pulse">
            GROUNDING LIVE METEOROLOGICAL TELEPRINTERS FOR {country.toUpperCase()}...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="news-grid">
          {news.length === 0 ? (
            <div className="col-span-2 py-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-slate-400 text-xs font-mono">
              Unable to sync news feeds. Please check network connectivity.
            </div>
          ) : (
            news.map((item, idx) => (
              <div
                key={idx}
                id={`news-item-${idx}`}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between gap-3 hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mb-2">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3 text-emerald-500" /> {item.source}
                    </span>
                    <span>{item.date}</span>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-100 hover:text-emerald-400 transition leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {item.snippet}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5">
                  <span className="text-[10px] font-mono text-slate-500">
                    Territory: <strong className="text-slate-300">{item.country}</strong>
                  </span>

                  <a
                    href={item.url}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="text-emerald-400 hover:text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1.5"
                  >
                    View Citation <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
