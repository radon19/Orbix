"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere } from "@react-three/drei";
import * as THREE from "three";

const EARTH_RADIUS_KM = 6371;
const TIME_SCALE = 100;

function FleetManager({ data, targetId, isTracking }: { data: any, targetId: number, isTracking: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const targetRef = useRef<THREE.Mesh>(null);

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
      speed: velVec.length() / posVec.length()
    };
  }, [data]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();

    let instanceIdx = 0;
    for (let i = 0; i < parsedFleet.length; i++) {
      const sat = parsedFleet[i];
      if (sat.id === targetId) continue; 

      sat.position.applyAxisAngle(sat.axis, sat.speed * delta * TIME_SCALE);

      dummy.position.copy(sat.position);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(instanceIdx++, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;

    // --- UPDATED: Target Satellite & Camera Animation ---
    if (targetRef.current && targetSatData) {
      // Calculate exactly how far the satellite moves this frame
      const angleMoved = targetSatData.speed * delta * TIME_SCALE;
      
      // Move the satellite
      targetSatData.position.applyAxisAngle(targetSatData.axis, angleMoved);
      targetRef.current.position.copy(targetSatData.position);

      if (state.controls) {
        const controls = state.controls as any; 
        
        if (isTracking) {
          // 1. Look at the satellite (Focus)
          controls.target.lerp(targetRef.current.position, 0.05);
          
          // 2. FOLLOW the satellite (Move the camera)
          // We apply the exact same orbital math to the camera itself!
          state.camera.position.applyAxisAngle(targetSatData.axis, angleMoved);
        } else {
          // Stop following and glide the focus back to Earth
          controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.05);
        }
        controls.update(); 
      }
    }
  });

  return (
    <>
      {parsedFleet.length > 0 && (
        <instancedMesh ref={meshRef} args={[undefined, undefined, parsedFleet.length - 1]}>
          <sphereGeometry args={[0.0025, 8, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
        </instancedMesh>
      )}

      {targetSatData && (
        <mesh ref={targetRef} position={targetSatData.position}>
          <sphereGeometry args={[0.0075, 16, 16]} />
          <meshBasicMaterial color="#ff3300" />
        </mesh>
      )}
    </>
  );
}

export default function SatelliteTracker() {
  const [targetId, setTargetId] = useState<number>(902);
  const [inputState, setInputState] = useState<string>("902");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState<boolean>(false);

  const fetchGlobeData = async (noradId: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://127.0.0.1:8000/globe?target_norad_id=${noradId}`);
      if (!response.ok) throw new Error("Satellite not found in database.");
      
      const result = await response.json();
      setData(result);
      setTargetId(noradId);
      setInputState(noradId.toString());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobeData(902);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputState.trim() === "") return;
    setIsTracking(false); 
    fetchGlobeData(Number(inputState));
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", backgroundColor: "#000" }}>
      
      <div style={{ position: "absolute", top: 20, left: 20, zIndex: 10, color: "white", fontFamily: "sans-serif" }}>
        <h2>Live Satellite Tracker</h2>
        <form onSubmit={handleSearch} style={{ marginBottom: "10px", display: "flex", gap: "8px" }}>
          <input 
            type="number" 
            value={inputState} 
            onChange={(e) => setInputState(e.target.value)} 
            placeholder="Enter NORAD ID"
            style={{ padding: "8px", borderRadius: "4px", border: "none", width: "150px" }}
          />
          <button type="submit" style={{ padding: "8px 16px", cursor: "pointer", borderRadius: "4px", backgroundColor: "#333", color: "white", border: "1px solid #555" }}>
            Search
          </button>
          <button type="button" onClick={() => fetchGlobeData(targetId)} style={{ padding: "8px 16px", cursor: "pointer", borderRadius: "4px", backgroundColor: "#1e88e5", color: "white", border: "none" }}>
            Refresh Data
          </button>
          <button 
            type="button" 
            onClick={() => setIsTracking(!isTracking)} 
            disabled={!data}
            style={{ 
              padding: "8px 16px", 
              cursor: data ? "pointer" : "not-allowed", 
              borderRadius: "4px", 
              backgroundColor: isTracking ? "#ff3300" : "#4caf50",
              color: "white", 
              border: "none",
              opacity: data ? 1 : 0.5
            }}
          >
            {isTracking ? "Stop Tracking" : "Track Target"}
          </button>
        </form>
        {loading && <p>Loading coordinates...</p>}
        {error && <p style={{ color: "#ff4444" }}>{error}</p>}
        {data && !loading && <p style={{ color: "#88ccff" }}>Tracking ID: {targetId}</p>}
      </div>

      <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
        <color attach="background" args={["#000000"]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        
        <OrbitControls makeDefault enablePan={true} enableZoom={true} enableRotate={true} />

        <Sphere args={[1, 64, 64]}>
          <meshStandardMaterial color="#1e88e5" roughness={0.6} />
        </Sphere>

        <FleetManager data={data} targetId={targetId} isTracking={isTracking} />
      </Canvas>
    </div>
  );
}