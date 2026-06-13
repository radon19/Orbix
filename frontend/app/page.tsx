"use client";

import Link from "next/link";
import { useState } from "react";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function LandingPage() {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<{text: string, type: 'info' | 'success' | 'error'} | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage({ text: "Downloading latest telemetry from Celestrak...", type: 'info' });

    try {
      await axios.post(`${API_BASE_URL}/trigger-update`);
      setSyncMessage({ text: "✅ Database synchronized successfully!", type: 'success' });
      setTimeout(() => setSyncMessage(null), 5000);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || "❌ Error: Ensure your FastAPI backend is running.";
      setSyncMessage({ text: errorMessage, type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <main style={{ 
      minHeight: "100vh", 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      fontFamily: "system-ui, -apple-system, sans-serif",
      backgroundColor: "#050814",
      backgroundImage: "radial-gradient(circle at 50% 0%, #1a2340 0%, #050814 70%)",
      padding: "30px 20px",
      position: "relative",
      overflowX: "hidden"
    }}>
      
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0,
        backgroundImage: "radial-gradient(1px 1px at 20px 30px, #ffffff, rgba(0,0,0,0)), radial-gradient(1px 1px at 40px 70px, #ffffff, rgba(0,0,0,0)), radial-gradient(1px 1px at 50px 160px, #ffffff, rgba(0,0,0,0)), radial-gradient(1px 1px at 90px 40px, #ffffff, rgba(0,0,0,0)), radial-gradient(1px 1px at 130px 80px, #ffffff, rgba(0,0,0,0))",
        backgroundRepeat: "repeat",
        backgroundSize: "200px 200px",
        opacity: 0.3
      }} />

      <style>{`
        @keyframes orbit {
          0% { transform: rotate(-15deg) rotate(0deg); }
          100% { transform: rotate(-15deg) rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        .sat-container {
          transform-origin: 150px 150px;
          animation: orbit 10s linear infinite;
        }
        .hero-graphic {
          animation: float 6s ease-in-out infinite;
        }
        
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr 1fr;
          gap: 24px;
          width: 100%;
          max-width: 1200px;
          margin-top: 30px;
          z-index: 1;
        }
        
        .glass-card {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 24px;
          backdrop-filter: blur(10px);
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
        }

        .center-highlight {
          background: linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%);
          border: 1px solid rgba(59, 130, 246, 0.3);
          box-shadow: 0 10px 40px -10px rgba(59, 130, 246, 0.2);
          justify-content: center;
          align-items: center;
          text-align: center;
        }

        @media (max-width: 960px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
            max-width: 500px;
          }
        }
      `}</style>

      <div style={{ zIndex: 1, textAlign: "center", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        
        <div className="hero-graphic" style={{ width: "180px", height: "180px", marginBottom: "15px" }}>
          <svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
            <circle cx="150" cy="150" r="95" fill="#4facfe" opacity="0.3" filter="blur(10px)" />
            <circle cx="150" cy="150" r="85" fill="#1e88e5" />
            <path d="M 100 80 Q 130 60 160 80 T 180 120 Q 150 140 120 130 T 100 80 Z" fill="#4caf50" />
            <path d="M 180 170 Q 210 160 220 190 T 190 220 Q 160 210 180 170 Z" fill="#4caf50" />
            <path d="M 80 160 Q 100 150 110 180 T 80 200 Z" fill="#4caf50" />
            <path d="M 100 100 Q 110 90 130 100" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6" />
            <path d="M 160 180 Q 180 170 200 180" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6" />
            <ellipse cx="150" cy="150" rx="140" ry="40" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="6,6" transform="rotate(-15 150 150)" opacity="0.4" />
            <g className="sat-container">
              <g transform="translate(270, 140)">
                <rect x="-10" y="-15" width="8" height="30" fill="#64b5f6" rx="1" />
                <rect x="12" y="-15" width="8" height="30" fill="#64b5f6" rx="1" />
                <rect x="0" y="-5" width="10" height="10" fill="#e0e0e0" rx="2" />
              </g>
            </g>
          </svg>
        </div>

        <h1 style={{ fontSize: "3.5rem", margin: "0 0 5px 0", letterSpacing: "3px", color: "#ffffff", fontWeight: "800", textShadow: "0 4px 20px rgba(79, 172, 254, 0.4)" }}>
          ORBIX
        </h1>
        <h2 style={{ fontSize: "1.1rem", fontWeight: "400", color: "#93c5fd", margin: "0" }}>
          Live Orbital Mechanics & Threat Detection
        </h2>
      </div>

      <div className="dashboard-grid">
        
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="glass-card">
            <h3 style={{ margin: "0 0 10px 0", color: "#fff", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🛰️</span> What We Do
            </h3>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.9rem", lineHeight: "1.6" }}>
              We monitor the skies. Orbix tracks thousands of active satellites and space debris fragments to calculate mathematical collision probabilities in real-time.
            </p>
          </div>

          <div className="glass-card">
            <h3 style={{ margin: "0 0 10px 0", color: "#fff", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>📡</span> Our Data
            </h3>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.9rem", lineHeight: "1.6" }}>
              Powered by live Two-Line Element (TLE) sets sourced directly from the <strong>18th Space Defense Squadron</strong> via Celestrak.
            </p>
          </div>
        </div>

        <div className="glass-card center-highlight">
          <div style={{ background: "rgba(59, 130, 246, 0.1)", borderRadius: "50%", width: "64px", height: "64px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", marginBottom: "20px" }}>
            🌍
          </div>
          <h3 style={{ margin: "0 0 12px 0", color: "#fff", fontSize: "1.5rem" }}>Live 3D Tracker</h3>
          <p style={{ margin: "0 0 30px 0", color: "#cbd5e1", fontSize: "0.95rem", lineHeight: "1.6", maxWidth: "90%" }}>
            Enter the interactive 3D environment. Visually inspect orbital planes, track assets in real-time, and analyze potential collision threats directly on the globe.
          </p>
          <Link href="/globe" style={{ textDecoration: "none", width: "100%", maxWidth: "300px" }}>
            <button style={{
              width: "100%",
              padding: "16px 32px",
              fontSize: "1.1rem",
              fontWeight: "bold",
              color: "#ffffff",
              background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
              border: "1px solid #60a5fa",
              borderRadius: "50px",
              cursor: "pointer",
              boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.5)",
              transition: "transform 0.2s ease",
            }}>
              Launch 3D Globe
            </button>
          </Link>
        </div>

        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div className="glass-card" style={{ flexGrow: 1, justifyContent: "center", alignItems: "center", textAlign: "center" }}>
             <h3 style={{ margin: "0 0 12px 0", color: "#fff", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🔄</span> Database Management
            </h3>
            <p style={{ margin: "0 0 25px 0", color: "#94a3b8", fontSize: "0.9rem", lineHeight: "1.6" }}>
              Ensure collision mathematics are perfectly accurate by synchronizing the system with the absolute latest orbital parameters.
            </p>
            
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              style={{
                width: "100%",
                padding: "14px 24px",
                fontSize: "1rem",
                fontWeight: "bold",
                color: "#ffffff",
                background: isSyncing ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "50px",
                cursor: isSyncing ? "not-allowed" : "pointer",
                backdropFilter: "blur(5px)",
                transition: "background 0.2s ease",
              }}
            >
              {isSyncing ? "Syncing..." : "Sync Database"}
            </button>

            <div style={{ minHeight: "40px", marginTop: "16px", width: "100%" }}>
              {syncMessage ? (
                <div style={{ 
                  fontSize: "0.85rem", 
                  fontWeight: "bold",
                  color: syncMessage.type === 'error' ? "#ef4444" : syncMessage.type === 'success' ? "#10b981" : "#60a5fa",
                  animation: "fadeIn 0.3s ease-in"
                }}>
                  {syncMessage.text}
                </div>
              ) : (
                <div style={{ fontSize: "0.75rem", color: "#64748b", fontStyle: "italic" }}>
                  Action manually triggers a backend memory reload from Celestrak telemetry.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}