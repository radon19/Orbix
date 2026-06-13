"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Trail } from "@react-three/drei";
import * as THREE from "three";
import axios from "axios";

const EARTH_RADIUS_KM = 6371;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;;

function FleetManager({ data, targetId, isTracking, timeScale }: { data: any, targetId: number, isTracking: boolean, timeScale: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const targetRef = useRef<THREE.Mesh>(null);
  
  const prevTracking = useRef(false);
  const transitionTimer = useRef(0);

  const parsedFleet = useMemo(() => {
    if (!data || !data.fleet_positions) return [];
    
    return Object.entries(data.fleet_positions).map(([id, nums]: [string, any]) => {
      const [x, y, z, vx, vy, vz] = nums;
      const posVec = new THREE.Vector3(x, y, z);
      const velVec = new THREE.Vector3(vx, vy, vz);
      
      const axis = new THREE.Vector3().crossVectors(posVec, velVec).normalize();
      const speed = velVec.length() / posVec.length(); 

      return {
        id: Number(id),
        position: new THREE.Vector3(posVec.x / EARTH_RADIUS_KM, posVec.y / EARTH_RADIUS_KM, posVec.z / EARTH_RADIUS_KM),
        axis,
        speed
      };
    });
  }, [data]);

  const targetSatData = useMemo(() => {
    if (!data || !data.target_satellite) return null;
    const [x, y, z, vx, vy, vz] = data.target_satellite.data;
    const posVec = new THREE.Vector3(x, y, z);
    const velVec = new THREE.Vector3(vx, vy, vz);
    
    return {
      position: new THREE.Vector3(posVec.x / EARTH_RADIUS_KM, posVec.y / EARTH_RADIUS_KM, posVec.z / EARTH_RADIUS_KM),
      axis: new THREE.Vector3().crossVectors(posVec, velVec).normalize(),
      speed: velVec.length() / posVec.length(),
      forward: velVec.clone().normalize(), 
      up: posVec.clone().normalize()       
    };
  }, [data]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();

    let instanceIdx = 0;
    for (let i = 0; i < parsedFleet.length; i++) {
      const sat = parsedFleet[i];
      if (sat.id === targetId) continue; 

      sat.position.applyAxisAngle(sat.axis, sat.speed * delta * timeScale);

      dummy.position.copy(sat.position);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(instanceIdx++, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;

    if (targetRef.current && targetSatData) {
      const angleMoved = targetSatData.speed * delta * timeScale;
      
      targetSatData.position.applyAxisAngle(targetSatData.axis, angleMoved);
      targetSatData.forward.applyAxisAngle(targetSatData.axis, angleMoved);
      targetSatData.up.applyAxisAngle(targetSatData.axis, angleMoved);
      
      targetRef.current.position.copy(targetSatData.position);

      if (state.controls) {
        const controls = state.controls as any; 
        
        if (isTracking && !prevTracking.current) {
            transitionTimer.current = 2.0; 
        }
        
        if (isTracking) {
          controls.target.lerp(targetRef.current.position, 0.1);
          state.camera.position.applyAxisAngle(targetSatData.axis, angleMoved);
          
          if (transitionTimer.current > 0) {
              transitionTimer.current -= delta;
              const idealPos = targetSatData.position.clone()
                  .sub(targetSatData.forward.clone().multiplyScalar(0.15)) 
                  .add(targetSatData.up.clone().multiplyScalar(0.05));
                  
              state.camera.position.lerp(idealPos, 0.05);
          }
        } else {
          controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.05);
        }
        
        controls.update(); 
        prevTracking.current = isTracking;
      }
    }
  });

  return (
    <>
      {parsedFleet.length > 0 && (
        <instancedMesh ref={meshRef} args={[undefined, undefined, parsedFleet.length - 1]}>
          <sphereGeometry args={[0.0025, 8, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </instancedMesh>
      )}

      {targetSatData && (
        <Trail width={0.015} length={1000} color="#ff3300" attenuation={(t) => t * t}>
          <mesh ref={targetRef} position={targetSatData.position}>
            <sphereGeometry args={[0.006, 64, 64]} />
            <meshBasicMaterial color="#ff3300" transparent={false} opacity={1} />
          </mesh>
        </Trail>
      )}
    </>
  );
}

export default function SatelliteTracker() {
  const router = useRouter(); 
  const [targetId, setTargetId] = useState<number>(25544);
  const [inputState, setInputState] = useState<string>("25544");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [timeScale, setTimeScale] = useState<number>(1);
  const [isRendered, setIsRendered] = useState<boolean>(false);

  const fetchGlobeData = async (noradId: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/globe?target_norad_id=${noradId}`);
      setData(response.data);
      setTargetId(noradId);
      setInputState(noradId.toString());
      setIsRendered(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Satellite not found.");
    } finally {
      setLoading(false);
    }
  };

  const handleInitialStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputState.trim() === "") return;
    fetchGlobeData(Number(inputState));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputState.trim() === "") return;
    setIsTracking(false); 
    fetchGlobeData(Number(inputState));
  };

  if (!isRendered) {
    return (
      <div style={{ 
        width: "100vw", height: "100vh", backgroundColor: "#050814", color: "white",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}>
        {loading ? (
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <h2 style={{ color: "#60a5fa", margin: "0 0 16px 0" }}>Calculating Orbital Parameters...</h2>
            <div style={{ 
              width: "40px", height: "40px", border: "4px solid rgba(255,255,255,0.1)", 
              borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite",
              margin: "0 auto 24px auto" 
            }} />
            <p style={{ color: "#fbbf24", fontWeight: "bold", fontSize: "1.1rem" }}>⚠️ Please wait.</p>
            <p style={{ color: "#9ca3af", lineHeight: "1.5" }}>Generating 3D instances for thousands of celestial objects. This may take up to 1 minute depending on your hardware.</p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div style={{ 
            background: "rgba(30, 41, 59, 0.5)", padding: "40px", borderRadius: "16px", 
            border: "1px solid rgba(255,255,255,0.1)", textAlign: "center", maxWidth: "400px" 
          }}>
            <h1 style={{ margin: "0 0 10px 0", fontSize: "2rem" }}>Launch Globe</h1>
            <p style={{ color: "#9ca3af", marginBottom: "30px", fontSize: "0.95rem" }}>
              Enter a NORAD ID to target immediately upon loading (e.g., 25544 for the ISS).
            </p>
            <form onSubmit={handleInitialStart} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <input 
                type="number" 
                value={inputState} 
                onChange={(e) => setInputState(e.target.value)} 
                placeholder="NORAD ID"
                style={{ 
                  padding: "12px", borderRadius: "8px", border: "1px solid #3b82f6", 
                  backgroundColor: "rgba(0,0,0,0.5)", color: "white", fontSize: "1.1rem", textAlign: "center"
                }}
              />
              <button type="submit" style={{ 
                padding: "14px", borderRadius: "8px", border: "none", backgroundColor: "#3b82f6", 
                color: "white", fontSize: "1.1rem", fontWeight: "bold", cursor: "pointer" 
              }}>
                Render 3D Environment
              </button>
            </form>
            <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <button type="button" onClick={() => router.push(`/threats?norad_id=${inputState}`)} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ef4444", backgroundColor: "rgba(239,68,68,0.2)", color: "#fca5a5", fontSize: "1rem", fontWeight: "bold", cursor: "pointer", width: "100%", transition: "background 0.2s ease" }}>
                ⚠️ Check Threat Database
              </button>
            </div>
            {error && <p style={{ color: "#ef4444", marginTop: "16px", fontWeight: "bold" }}>{error}</p>}
          </div>
        )}
      </div>
    );
  }

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

  const buttonStyle: React.CSSProperties = {
    padding: "10px 16px",
    borderRadius: "6px",
    border: "none",
    color: "white",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s ease"
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", backgroundColor: "#000", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 24, left: 24, zIndex: 10, ...glassPanelStyle }}>
        <h2 style={{ margin: "0 0 16px 0", fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "1.4rem" }}>🌍</span> Orbix Command
        </h2>
        <form onSubmit={handleSearch} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <input type="number" value={inputState} onChange={(e) => setInputState(e.target.value)} placeholder="NORAD ID" style={{ padding: "10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.2)", backgroundColor: "rgba(0,0,0,0.4)", color: "white", width: "140px", outline: "none" }} />
            <button type="submit" style={{ ...buttonStyle, backgroundColor: "#3b82f6", flexGrow: 1 }}>Lock Target</button>
          </div>
          <button type="button" onClick={() => fetchGlobeData(targetId)} style={{ ...buttonStyle, backgroundColor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.1)" }}>🔄 Sync Telemetry</button>
        </form>
      </div>

      <div style={{ position: "absolute", top: 24, right: 24, zIndex: 10, width: "280px", ...glassPanelStyle }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem", color: "#f87171", display: "flex", alignItems: "center", gap: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>⚠️ Threat Detection</h3>
        <p style={{ margin: "0 0 16px 0", fontSize: "0.85rem", color: "#cbd5e1", lineHeight: "1.5" }}>Run Foster/Chan probability mathematics against the current target.</p>
        <button onClick={() => router.push(`/threats?norad_id=${targetId}`)} style={{ ...buttonStyle, width: "100%", backgroundColor: "rgba(239, 68, 68, 0.2)", border: "1px solid #ef4444", color: "#fca5a5" }}>Analyze Threats</button>
      </div>

      <div style={{ position: "absolute", bottom: 24, right: 24, zIndex: 10, width: "320px", ...glassPanelStyle }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "1rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Flight Controls</h3>
        <button type="button" onClick={() => setIsTracking(!isTracking)} disabled={!data} style={{ ...buttonStyle, width: "100%", padding: "14px", fontSize: "1.05rem", backgroundColor: isTracking ? "#ef4444" : "#10b981", opacity: data ? 1 : 0.5, marginBottom: "20px" }}>{isTracking ? "⏹ Disengage Camera" : "🎯 Engage Chase Camera"}</button>
        <div>
          <label style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "0.9rem" }}><span style={{ color: "#cbd5e1" }}>Simulation Speed</span><strong style={{ color: "#60a5fa" }}>{timeScale}x</strong></label>
          <input type="range" min="1" max="200" value={timeScale} onChange={(e) => setTimeScale(Number(e.target.value))} style={{ width: "100%", cursor: "pointer", accentColor: "#3b82f6" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#64748b", marginTop: "6px" }}><span>Real Time</span><span>Fast Forward</span></div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 24, left: 24, zIndex: 10, display: "flex", flexDirection: "column", gap: "10px", pointerEvents: "none" }}>
        {loading && <div style={{ background: "rgba(245, 158, 11, 0.2)", border: "1px solid rgba(245, 158, 11, 0.4)", color: "#fbbf24", padding: "10px 16px", borderRadius: "8px", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", gap: "8px", fontFamily: "system-ui, sans-serif", fontSize: "0.9rem", fontWeight: "bold" }}><div style={{ width: "12px", height: "12px", border: "2px solid #fbbf24", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />Receiving Data...</div>}
        {error && <div style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#fca5a5", padding: "10px 16px", borderRadius: "8px", backdropFilter: "blur(4px)", fontFamily: "system-ui, sans-serif", fontSize: "0.9rem" }}>⚠️ {error}</div>}
        {data && !loading && <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.1)", color: "#93c5fd", padding: "10px 16px", borderRadius: "8px", backdropFilter: "blur(4px)", fontFamily: "monospace", fontSize: "1rem" }}>Tracking NORAD: <strong style={{ color: "#fff" }}>{targetId}</strong></div>}
      </div>

      <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
        <color attach="background" args={["#000000"]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <OrbitControls makeDefault enablePan={true} enableZoom={true} enableRotate={true} />
        <Sphere args={[1, 64, 64]}>
          <meshStandardMaterial color="#1e88e5" roughness={0.6} />
        </Sphere>
        <FleetManager data={data} targetId={targetId} isTracking={isTracking} timeScale={timeScale} />
      </Canvas>
    </div>
  );
}