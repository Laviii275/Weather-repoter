import { useState, useEffect } from "react";
import { WeatherAlert } from "../types.js";
import { AlertTriangle, Bell, BellOff, ShieldAlert, Navigation, Eye } from "lucide-react";

interface AlertHubProps {
  activeCity: string;
}

export default function AlertHub({ activeCity }: AlertHubProps) {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>("default");
  const [monitoringState, setMonitoringState] = useState<"active" | "standby">("active");
  const [scannedAlertsCount, setScannedAlertsCount] = useState(0);
  const [viewingAlert, setViewingAlert] = useState<WeatherAlert | null>(null);

  // Sync notification permission status on load
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationStatus(Notification.permission);
    }
  }, []);

  // Fetch alerts from backend
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        let url = "/api/weather/alerts";
        const res = await fetch(url);
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            setAlerts(data);
            setScannedAlertsCount(data.length);
          } else {
            console.warn("Expected JSON response for alerts, but got: " + contentType);
          }
        }
      } catch (err) {
        console.error("Failed to load meteorological alerts:", err);
      }
    };

    fetchAlerts();

    // Background interval to simulate severe real-time alert changes (monitoring in background)
    const interval = setInterval(() => {
      if (monitoringState === "active") {
        fetchAlerts();
      }
    }, 12000); // Check every 12 seconds to mimic real-time background processing

    return () => clearInterval(interval);
  }, [monitoringState]);

  // Request HTML5 desktop notifications permission
  const requestPushPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("This browser/container does not support desktop push notifications.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);

      if (permission === "granted") {
        new Notification("AI Weather Reporter Enabled", {
          body: "Background monitoring active. You will receive alerts when severe storms or heatwaves are detected nearby.",
          icon: "/favicon.ico"
        });
      }
    } catch (err) {
      console.error("Error requesting notifications permission:", err);
    }
  };

  // Push notifications dispatcher
  useEffect(() => {
    if (alerts.length > 0 && notificationStatus === "granted") {
      // Find the most severe active alert
      const extremeAlert = alerts.find(a => a.severity === "extreme" || a.severity === "severe");
      if (extremeAlert) {
        // Simple deduplicator to prevent spamming notifications on every interval
        const lastNotifiedId = localStorage.getItem("last_notified_alert_id");
        if (lastNotifiedId !== extremeAlert.id) {
          try {
            new Notification(`⚠️ SEVERE WEATHER ALERT: ${extremeAlert.city}`, {
              body: `${extremeAlert.title} is active nearby: ${extremeAlert.description}`,
              tag: extremeAlert.id,
              requireInteraction: true
            });
            localStorage.setItem("last_notified_alert_id", extremeAlert.id);
          } catch (err) {
            console.error("Failed to fire browser push notification:", err);
          }
        }
      }
    }
  }, [alerts, notificationStatus]);

  return (
    <div
      id="alerts-hub-card"
      className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 backdrop-blur-xl text-slate-100 flex flex-col gap-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-mono tracking-widest text-red-400 font-semibold uppercase">Severe Warnings Desk</span>
          <h2 className="text-lg font-bold text-slate-100 font-sans tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" /> Real-Time Extreme Alerts
          </h2>
        </div>

        {/* Push notifications permission button */}
        <button
          onClick={requestPushPermission}
          id="toggle-push-btn"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
            notificationStatus === "granted"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : notificationStatus === "denied"
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/20"
          }`}
        >
          {notificationStatus === "granted" ? (
            <>
              <Bell className="w-3.5 h-3.5 animate-bounce" /> Alerts: ON (Push Enabled)
            </>
          ) : notificationStatus === "denied" ? (
            <>
              <BellOff className="w-3.5 h-3.5" /> Push Blocked (Using Toasts)
            </>
          ) : (
            <>
              <Bell className="w-3.5 h-3.5" /> Enable Desktop Notifications
            </>
          )}
        </button>
      </div>

      {/* Background worker simulation telemetry bar */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono">
        <div className="flex items-center gap-2 text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>BACKGROUND MET-ENGINE MONITORING ACTIVE</span>
        </div>
        <div className="flex gap-4 text-slate-400">
          <span>Proximity: <strong className="text-sky-400">400km Radius</strong></span>
          <span>Logs: <strong className="text-white">{scannedAlertsCount} warnings</strong></span>
        </div>
      </div>



      {/* Alerts list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3" id="active-alerts-grid">
        {alerts.length === 0 ? (
          <div className="col-span-2 p-8 text-center bg-slate-900/50 border border-slate-800 rounded-xl text-slate-400 text-xs font-sans">
            No dangerous meteorological alerts reported near your active station. Condition is stable.
          </div>
        ) : (
          alerts.map((alert) => {
            const isExtreme = alert.severity === "extreme";
            const isSevere = alert.severity === "severe";
            const isActiveInCity = alert.city.toLowerCase() === activeCity.toLowerCase();

            return (
              <div
                key={alert.id}
                id={`alert-card-${alert.id}`}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition hover:border-slate-700 ${
                  isActiveInCity
                    ? "bg-red-950/30 border-red-500/50 shadow-lg shadow-red-500/5"
                    : "bg-slate-900/85 border-slate-800"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-full uppercase font-bold ${
                        isExtreme
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : isSevere
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      }`}
                    >
                      {alert.severity} Risk
                    </span>
                    {alert.distance !== undefined && (
                      <span className="text-[10px] font-mono text-slate-400">
                        📍 {alert.distance} km away
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5 leading-tight">
                    <AlertTriangle className={`w-4 h-4 ${isExtreme ? "text-red-500" : "text-amber-500"}`} />
                    {alert.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                    {alert.description}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 text-[11px]">
                  <span className="text-slate-400 font-sans font-medium">
                    Station: <strong className="text-white">{alert.city}</strong>
                  </span>
                  <button
                    onClick={() => setViewingAlert(alert)}
                    className="text-sky-400 hover:text-sky-300 font-mono text-[10px] flex items-center gap-1 font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5" /> Read SOP Guidelines
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* SOP Guidelines modal/overlay when clicked */}
      {viewingAlert && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div
            id="alert-sop-modal"
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 text-slate-100"
          >
            <div className="flex justify-between items-start gap-2 mb-4">
              <div>
                <span className="text-[10px] font-mono text-red-400 font-bold bg-red-500/10 px-2.5 py-0.5 rounded-full uppercase">
                  {viewingAlert.severity} protocol
                </span>
                <h3 className="text-base font-bold text-white mt-1.5 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                  {viewingAlert.title}
                </h3>
              </div>
            </div>

            <div className="space-y-4 text-xs leading-relaxed">
              <div>
                <p className="font-mono text-[10px] text-slate-500 uppercase font-semibold">Area Location</p>
                <p className="text-slate-200 text-sm font-medium">{viewingAlert.city}, {viewingAlert.state}</p>
              </div>

              <div>
                <p className="font-mono text-[10px] text-slate-500 uppercase font-semibold">Diagnostic Summary</p>
                <p className="text-slate-300">{viewingAlert.description}</p>
              </div>

              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="font-semibold text-red-400 mb-1 flex items-center gap-1">
                  🛡️ Critical SOP Safety Guidelines:
                </p>
                <p className="text-red-300 leading-normal">{viewingAlert.instructions}</p>
              </div>

              <div className="flex justify-between text-[10px] font-mono text-slate-500 border-t border-slate-850 pt-3">
                <span>Active since: {new Date(viewingAlert.activeSince).toLocaleTimeString()}</span>
                <span>Expiry: {new Date(viewingAlert.expires).toLocaleDateString()}</span>
              </div>
            </div>

            <button
              onClick={() => setViewingAlert(null)}
              className="mt-5 w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-white transition border border-slate-700"
            >
              Acknowledge Warning
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
