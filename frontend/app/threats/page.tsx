"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

interface Threat {
  norad_id: number;
  name: string;
  miss_distance_km: number;
  tca_utc: string;
  collision_probability: number;
  risk_level: string;
}

interface ThreatReport {
  target_norad_id: number;
  threats_found: number;
  threats: Threat[];
}

const API_BASE_URL = "http://127.0.0.1:8000";

export default function ThreatsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlId = searchParams.get("norad_id");
  
  const [inputState, setInputState] = useState<string>(urlId || "25544");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ThreatReport | null>(null);

  const fetchThreats = async (noradId: number) => {
    setLoading(true);
    setError(null);
    setReport(null);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/threats`, { norad_id: noradId });
      setReport(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to analyze threats.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputState.trim() === "") return;
    fetchThreats(Number(inputState));
  };

  const glassPanelStyle: React.CSSProperties = {
    background: "rgba(15, 23, 42, 0.7)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 4px 30px rgba(0, 0, 0, 0.3)",
    color: "white",
    fontFamily: "system-ui, -apple-system, sans-serif"
  };

  const getRiskColor = (risk: string) => {
    if (risk.includes("CRITICAL")) return "#ef4444";
    if (risk.includes("HIGH")) return "#f97316";
    if (risk.includes("MEDIUM")) return "#eab308";
    return "#10b981";
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      backgroundColor: "#050814", 
      color: "white",
      fontFamily: "system-ui, -apple-system, sans-serif",
      position: "relative",
      padding: "80px 20px"
    }}>
      
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0,
        backgroundImage: "radial-gradient(1px 1px at 20px 30px, #ffffff, rgba(0,0,0,0)), radial-gradient(1px 1px at 40px 70px, #ffffff, rgba(0,0,0,0)), radial-gradient(1px 1px at 50px 160px, #ffffff, rgba(0,0,0,0)), radial-gradient(1px 1px at 90px 40px, #ffffff, rgba(0,0,0,0)), radial-gradient(1px 1px at 130px 80px, #ffffff, rgba(0,0,0,0))",
        backgroundRepeat: "repeat",
        backgroundSize: "200px 200px",
        opacity: 0.3
      }} />

      <div style={{ position: "fixed", top: 24, left: 24, zIndex: 10, ...glassPanelStyle, display: "flex", gap: "20px" }}>
        <button onClick={() => router.push("/")} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "white", cursor: "pointer" }}>🏠 Home</button>
        <button onClick={() => router.push("/globe")} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "white", cursor: "pointer" }}>🌍 3D Globe</button>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: "1000px", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
        
        {!report && !loading && (
          <div style={{ ...glassPanelStyle, maxWidth: "500px", width: "100%", textAlign: "center", marginTop: "10vh" }}>
            <h1 style={{ margin: "0 0 10px 0", fontSize: "2rem", color: "#f87171" }}>⚠️ Threat Analysis</h1>
            <p style={{ color: "#9ca3af", marginBottom: "30px", fontSize: "0.95rem", lineHeight: "1.5" }}>
              Enter a NORAD ID to scan the global catalog for potential conjunctions within the next 24 hours using the Foster/Chan probability algorithm.
            </p>
            <form onSubmit={handleSearch} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <input type="number" value={inputState} onChange={(e) => setInputState(e.target.value)} placeholder="NORAD ID" style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ef4444", backgroundColor: "rgba(0,0,0,0.5)", color: "white", fontSize: "1.1rem", textAlign: "center" }} />
              <button type="submit" style={{ padding: "14px", borderRadius: "8px", border: "none", backgroundColor: "#ef4444", color: "white", fontSize: "1.1rem", fontWeight: "bold", cursor: "pointer" }}>Execute Scan</button>
            </form>
            {error && <p style={{ color: "#fca5a5", marginTop: "16px", fontWeight: "bold" }}>{error}</p>}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", maxWidth: "500px", marginTop: "10vh" }}>
            <h2 style={{ color: "#f87171", margin: "0 0 16px 0", fontSize: "2rem" }}>Running Conjunction Math...</h2>
            <div style={{ position: "relative", width: "120px", height: "120px", margin: "0 auto 30px auto", borderRadius: "50%", border: "2px solid rgba(239, 68, 68, 0.3)", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: "50%", left: "0", right: "0", height: "1px", background: "rgba(239, 68, 68, 0.5)" }} />
              <div style={{ position: "absolute", left: "50%", top: "0", bottom: "0", width: "1px", background: "rgba(239, 68, 68, 0.5)" }} />
              <div style={{ position: "absolute", top: "50%", left: "50%", width: "50%", height: "50%", background: "linear-gradient(45deg, transparent 0%, rgba(239,68,68,0.8) 100%)", transformOrigin: "top left", animation: "radar 2s linear infinite" }} />
            </div>
            <style>{`@keyframes radar { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            <p style={{ color: "#fbbf24", fontWeight: "bold", fontSize: "1.1rem" }}>⚠️ Heavy Computation in Progress.</p>
            <p style={{ color: "#9ca3af", lineHeight: "1.6" }}>The backend is propagating thousands of orbital paths and calculating distances. <strong>Do not refresh this page. This process may take up to 5-10 minutes.</strong></p>
          </div>
        )}

        {report && !loading && (
          <div style={{ width: "100%" }}>
            <div style={{ ...glassPanelStyle, marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ margin: "0 0 8px 0", color: "#60a5fa" }}>Target NORAD ID: {report.target_norad_id}</h2>
                <p style={{ margin: 0, color: "#9ca3af" }}>Analysis complete. Found <strong>{report.threats_found}</strong> potential conjunction(s).</p>
              </div>
              <button onClick={() => setReport(null)} style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #3b82f6", backgroundColor: "rgba(59,130,246,0.2)", color: "#93c5fd", cursor: "pointer", fontWeight: "bold" }}>Scan Another ID</button>
            </div>
            {report.threats_found === 0 ? (
              <div style={{ ...glassPanelStyle, textAlign: "center", padding: "60px 20px" }}><h3 style={{ color: "#10b981", fontSize: "1.5rem" }}>✅ Skies are Clear</h3></div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {report.threats.map((threat, index) => (
                  <div key={index} style={{ ...glassPanelStyle, borderLeft: `6px solid ${getRiskColor(threat.risk_level)}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                      <div><h3 style={{ margin: "0" }}>{threat.name}</h3><span style={{ color: "#64748b", fontFamily: "monospace" }}>NORAD: {threat.norad_id}</span></div>
                      <div style={{ padding: "6px 12px", borderRadius: "20px", backgroundColor: `${getRiskColor(threat.risk_level)}20`, color: getRiskColor(threat.risk_level), fontWeight: "bold", fontSize: "0.85rem" }}>{threat.risk_level}</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                      <div style={{ background: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: "8px" }}><div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>MISS DISTANCE</div><div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{threat.miss_distance_km.toFixed(4)} <span style={{ fontSize: "0.9rem" }}>km</span></div></div>
                      <div style={{ background: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: "8px" }}><div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>COLLISION PROBABILITY</div><div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{threat.collision_probability.toExponential(2)}</div></div>
                      <div style={{ background: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: "8px" }}><div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>TCA (UTC)</div><div style={{ fontSize: "1rem", paddingTop: "4px" }}>{threat.tca_utc}</div></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}