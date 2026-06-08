"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Terminal, Lock, Mail, ShieldCheck, Zap } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = isRegistering ? "/api/auth/register" : "/api/auth/login";
    
    try {
      const res = await fetch(`http://127.0.0.1:8000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      if (isRegistering) {
        setIsRegistering(false);
        setError("Account registered successfully. Please login.");
      } else {
        localStorage.setItem("flowcore_token", data.token);
        localStorage.setItem("flowcore_email", data.email);
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-cyber-grid bg-repeat opacity-20 pointer-events-none"></div>
      
      {/* Login Box */}
      <div className="relative max-w-md w-full bg-cardBg/90 border border-gray-800 rounded-xl p-8 shadow-2xl flex flex-col gap-6">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyanAccent to-purpleAccent rounded-xl blur opacity-25"></div>
        
        <div className="relative flex flex-col gap-2 text-center items-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyanAccent via-purpleAccent to-pinkAccent p-0.5 animate-pulse">
            <div className="w-full h-full bg-bgDark rounded-lg flex items-center justify-center">
              <Terminal className="w-6 h-6 text-cyanAccent" />
            </div>
          </div>
          <h2 className="font-space font-bold text-2xl text-white tracking-wider mt-2">
            FLOW<span className="text-cyanAccent glow-text">CORE</span>
          </h2>
          <p className="text-xs text-mutedGray font-mono">
            {isRegistering ? "Register your cognitive license" : "Authenticate Terminal Session"}
          </p>
        </div>

        {error && (
          <div className="relative border border-pinkAccent/35 rounded bg-pinkAccent/10 px-4 py-2 text-xs text-pinkAccent font-mono text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative flex flex-col gap-4 text-sm font-space">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-mutedGray flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-bgDark border border-gray-800 rounded p-3 text-white outline-none focus:border-cyanAccent transition font-mono text-xs"
              placeholder="developer@flowcore.dev"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-mutedGray flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" /> Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-bgDark border border-gray-800 rounded p-3 text-white outline-none focus:border-cyanAccent transition font-mono text-xs"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded bg-cyanAccent text-bgDark font-bold font-space hover:bg-white hover:shadow-lg hover:shadow-cyanAccent/15 transition duration-300 mt-2 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-pulse">PROCESSING TELEMETRIES...</span>
            ) : (
              <>
                {isRegistering ? <Zap className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                {isRegistering ? "Create Developer Account" : "Access Terminal HUD"}
              </>
            )}
          </button>
        </form>

        <div className="relative text-center border-t border-gray-850 pt-4">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError("");
            }}
            className="text-xs text-mutedGray hover:text-cyanAccent transition font-mono"
          >
            {isRegistering
              ? "Already licensed? Access HUD here"
              : "Register new developer workspace license"}
          </button>
        </div>
      </div>
    </div>
  );
}
