import { useState, useEffect } from "react";
import { WeatherData, WeatherAlert, AIWeatherReport } from "../types.js";
import { Brain, Sparkles, Volume2, VolumeX, Eye, ShieldAlert, Wind, Thermometer, CloudSun } from "lucide-react";

interface AIMeteorologistProps {
  weatherData: WeatherData;
  activeAlerts: WeatherAlert[];
}

export default function AIMeteorologist({ weatherData, activeAlerts }: AIMeteorologistProps) {
  const [report, setReport] = useState<AIWeatherReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [synth, setSynth] = useState<SpeechSynthesis | null>(null);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  // Initialize Speech Synthesis on client side
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setSynth(window.speechSynthesis);
    }
  }, []);

  const generateReport = async () => {
    setLoading(true);
    // Stop any active speech
    if (synth) {
      synth.cancel();
      setSpeaking(false);
    }

    try {
      const res = await fetch("/api/weather/ai-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weatherData, activeAlerts })
      });

      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setReport(data);

          // Pre-create utterance
          if (typeof window !== "undefined" && "SpeechSynthesisUtterance" in window) {
            const speechText = `AI Meteorological Advisory for ${data.city}. Current status is ${data.condition}. Here is the summary: ${data.summary}. Atmospheric Analysis: ${data.atmosphericAnalysis}. Risk level: ${data.riskAssessment}. Recommended clothing: ${data.clothingRecommendation}`;
            const utt = new SpeechSynthesisUtterance(speechText);
            
            // Try to select a natural voice
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v => v.name.includes("Google") && v.lang.startsWith("en")) || voices.find(v => v.lang.startsWith("en"));
            if (preferredVoice) {
              utt.voice = preferredVoice;
            }
            
            utt.rate = 1.0;
            utt.pitch = 1.0;
            utt.onend = () => setSpeaking(false);
            setUtterance(utt);
          }
        } else {
          console.warn("Expected JSON response for AI report, but got: " + contentType);
        }
      }
    } catch (err) {
      console.error("Failed to generate AI weather report:", err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate report when weatherData changes
  useEffect(() => {
    if (weatherData) {
      generateReport();
    }

    return () => {
      if (synth) {
        synth.cancel();
        setSpeaking(false);
      }
    };
  }, [weatherData]);

  // Handle narration
  const toggleSpeech = () => {
    if (!synth || !utterance) return;

    if (speaking) {
      synth.cancel();
      setSpeaking(false);
    } else {
      setSpeaking(true);
      synth.speak(utterance);
    }
  };

  return (
    <div
      id="ai-meteorologist-card"
      className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/45 to-slate-950/70 border border-indigo-500/20 shadow-2xl shadow-indigo-500/5 backdrop-blur-xl text-slate-100 flex flex-col gap-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-mono tracking-widest text-indigo-400 font-semibold uppercase flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-400" /> GEMINI COGNITIVE WEATHER CONSULTANT
          </span>
          <h2 className="text-lg font-bold text-slate-100 font-sans tracking-tight flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-400" /> AI Meteorologist Report
          </h2>
        </div>

        {report && (
          <button
            onClick={toggleSpeech}
            id="read-report-voice-btn"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium border transition ${
              speaking
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20"
            }`}
          >
            {speaking ? (
              <>
                <VolumeX className="w-4 h-4 animate-pulse" /> Stop Voice Broadcast
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" /> Listen to Met-Radio
              </>
            )}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="animate-spin w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full"></span>
          <p className="text-xs font-mono text-indigo-400 animate-pulse">
            GEMINI-AI ANALYSIS ENGINE DEPLOYED. RETRIEVING SATELLITE & SENSOR VECTORS...
          </p>
        </div>
      ) : report ? (
        <div className="space-y-4" id="ai-report-body">
          {/* Main summary bubble */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 leading-relaxed text-slate-200 text-sm">
            <p className="font-semibold text-indigo-300 text-[10px] uppercase font-mono tracking-wider mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" /> Executive Met-Summary
            </p>
            {report.summary}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
            {/* Atmospheric sensor analysis */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-start gap-3">
              <span className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 mt-0.5">
                <Wind className="w-4 h-4" />
              </span>
              <div>
                <h4 className="font-semibold text-slate-100 font-sans text-[11px] uppercase tracking-wider mb-1 text-indigo-300">
                  Atmospheric & Sensor Diagnostics
                </h4>
                <p className="text-slate-300">{report.atmosphericAnalysis}</p>
              </div>
            </div>

            {/* Satellite cloud structure */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-start gap-3">
              <span className="p-2 bg-sky-500/10 rounded-lg text-sky-400 mt-0.5">
                <CloudSun className="w-4 h-4" />
              </span>
              <div>
                <h4 className="font-semibold text-slate-100 font-sans text-[11px] uppercase tracking-wider mb-1 text-sky-300">
                  Doppler & Satellite Column
                </h4>
                <p className="text-slate-300">{report.satelliteSummary}</p>
              </div>
            </div>

            {/* Extreme risk assessment */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-start gap-3">
              <span className="p-2 bg-red-500/10 rounded-lg text-red-400 mt-0.5">
                <ShieldAlert className="w-4 h-4" />
              </span>
              <div>
                <h4 className="font-semibold text-slate-100 font-sans text-[11px] uppercase tracking-wider mb-1 text-red-300">
                  Dangerous Risk Assessment
                </h4>
                <p className="text-slate-300">{report.riskAssessment}</p>
              </div>
            </div>

            {/* Clothing & Hydration advisor */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-start gap-3">
              <span className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 mt-0.5">
                <Thermometer className="w-4 h-4" />
              </span>
              <div>
                <h4 className="font-semibold text-slate-100 font-sans text-[11px] uppercase tracking-wider mb-1 text-emerald-300">
                  SOP Activity & Apparel Advisory
                </h4>
                <p className="text-slate-300">{report.clothingRecommendation}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 border-t border-slate-800/60 pt-3">
            <span>Powered by Gemini 3.5 Flash</span>
            <span className="flex items-center gap-1 text-indigo-400">
              <Eye className="w-3 h-3" /> Double-checked via Grounded Google Weather API
            </span>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-slate-400 text-xs font-sans">
          Click the "AI Meteorological Advisories" tab or search a city to compile current telemetry.
        </div>
      )}
    </div>
  );
}
