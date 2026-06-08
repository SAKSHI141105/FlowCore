"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Dynamically import Spline to prevent SSR errors
const Spline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
  loading: () => <SplineLoadingPlaceholder />,
});

interface SplineSceneLoaderProps {
  sceneUrl: string;
}

export default function SplineSceneLoader({ sceneUrl }: SplineSceneLoaderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    // 5 second timeout to show fallback if Spline canvas is slow or blocked
    const timer = setTimeout(() => {
      if (!isLoaded) {
        setUseFallback(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [isLoaded]);

  return (
    <div className="relative w-full h-full min-h-[400px] bg-bgDark/40 border border-gray-800 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl group flex flex-col justify-between">
      
      {/* Fallback panel during loading or if load times out */}
      {(!isLoaded || useFallback) && (
        <div className={`absolute inset-0 p-5 font-mono text-xs text-white flex flex-col gap-3 bg-cardBg/95 z-10 transition-opacity duration-700 ${isLoaded ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <div className="flex gap-2">
              <span className="w-3 h-3 rounded-full bg-pinkAccent/50 animate-pulse"></span>
              <span className="w-3 h-3 rounded-full bg-goldAccent/50 animate-pulse" style={{ animationDelay: "0.2s" }}></span>
              <span className="w-3 h-3 rounded-full bg-greenAccent/50 animate-pulse" style={{ animationDelay: "0.4s" }}></span>
            </div>
            <span className="text-[10px] text-mutedGray">flowcore_cognitive_core.exe</span>
          </div>
          <div className="flex-grow flex flex-col gap-1.5 justify-center py-4">
            <p className="text-cyanAccent glow-text"># Initialize cognitive layer modules...</p>
            <p className="text-mutedGray">[OK] Markov Auto-Predict Engine</p>
            <p className="text-mutedGray">[OK] DBSCAN Behavior Mining</p>
            <p className="text-mutedGray">[OK] SQLite Error Indexer</p>
            <div className="mt-4 p-3 border border-purpleAccent/20 rounded bg-purpleAccent/5 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-purpleAccent font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-purpleAccent animate-ping"></span>
                <span>SYSTEM READY</span>
              </div>
              <p className="text-[11px] text-mutedGray">PowerShell interceptor is active on port 8000. Sourcing ns.ps1 will bind command loops.</p>
            </div>
          </div>
        </div>
      )}
      
      <div className={`w-full h-full absolute inset-0 transition-opacity duration-1000 ${isLoaded && !useFallback ? "opacity-100" : "opacity-0"}`}>
        <Spline 
          scene={sceneUrl} 
          onLoad={() => setIsLoaded(true)}
        />
      </div>

      {/* Overlay HUD stats */}
      <div className="absolute bottom-4 left-4 right-4 bg-cardBg/85 border border-gray-800/80 rounded-lg p-3 backdrop-blur-md font-mono text-xs text-white z-20 flex justify-between items-center opacity-85 group-hover:opacity-100 transition duration-300">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyanAccent animate-pulse"></span>
          <span className="text-gray-200">
            {isLoaded && !useFallback ? "ACTIVE 3D COGNITIVE CORE" : "COGNITIVE CONSOLE (OFFLINE)"}
          </span>
        </div>
        <span className="text-[10px] text-mutedGray">
          {isLoaded && !useFallback ? "Drag to rotate / Scroll to zoom" : "Local telemetry active"}
        </span>
      </div>
    </div>
  );
}

function SplineLoadingPlaceholder() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-bgDark/90 z-20">
      <div className="w-10 h-10 border-4 border-cyanAccent border-t-transparent rounded-full animate-spin"></div>
      <span className="text-xs font-mono text-cyanAccent glow-text uppercase tracking-widest mt-3">
        Loading 3D Engine...
      </span>
    </div>
  );
}
