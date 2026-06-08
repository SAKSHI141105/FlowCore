"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, Search, MessageSquare, CheckCircle, HelpCircle, ArrowRight } from "lucide-react";

interface ErrorEvent {
  id: string;
  command_id: string | null;
  command: string | null;
  stderr: string;
  error_type: string;
  fix_applied: string | null;
  created_at: string;
}

interface FixResponse {
  error_type: string;
  fix_applied: string;
  confidence: number;
  source: string;
}

export default function ErrorsPage() {
  const [errors, setErrors] = useState<ErrorEvent[]>([]);
  const [selectedError, setSelectedError] = useState<ErrorEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [customStderr, setCustomStderr] = useState("");
  const [resolvedFix, setResolvedFix] = useState<FixResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchErrors = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/errors");
      if (res.ok) setErrors(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();
  }, []);

  const selectErrorEvent = (err: ErrorEvent) => {
    setSelectedError(err);
    setCustomStderr(err.stderr);
    if (err.fix_applied) {
      setResolvedFix({
        error_type: err.error_type || "Runtime Error",
        fix_applied: err.fix_applied,
        confidence: 100,
        source: "Memory Store"
      });
    } else {
      setResolvedFix(null);
    }
  };

  const resolveError = async () => {
    if (!customStderr) return;
    try {
      const res = await fetch("http://localhost:8000/api/errors/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stderr: customStderr }),
      });
      if (res.ok) setResolvedFix(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const submitFeedback = async (isPositive: boolean) => {
    if (!customStderr || !resolvedFix) return;
    let finalFix = resolvedFix.fix_applied;

    if (!isPositive) {
      const correctSolution = prompt("Enter the correct solution/command to run:");
      if (!correctSolution) return;
      finalFix = correctSolution;
    }

    try {
      const res = await fetch("http://localhost:8000/api/errors/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedError?.id,
          stderr: customStderr,
          error_type: resolvedFix.error_type,
          fix_applied: finalFix,
        }),
      });
      if (res.ok) {
        alert("Solution recorded inside cognitive memory!");
        fetchErrors();
        setResolvedFix(null);
        setSelectedError(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter errors list by search query
  const filteredErrors = errors.filter((e) => {
    const term = searchQuery.toLowerCase();
    return (
      (e.command && e.command.toLowerCase().includes(term)) ||
      (e.error_type && e.error_type.toLowerCase().includes(term)) ||
      e.stderr.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center font-mono text-pinkAccent">
        <span className="animate-pulse">LOADING COGNITIVE RESOLVERS...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="font-space font-bold text-2xl text-white flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-pinkAccent" /> Error Intelligence
        </h1>
        <p className="text-sm text-mutedGray">Vectorized DB matching execution failures to AI solutions</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Captured Failures */}
        <div className="lg:col-span-4 bg-cardBg border border-gray-800 rounded-xl overflow-hidden flex flex-col max-h-[550px]">
          <div className="bg-gray-900 px-4 py-3 border-b border-gray-800 flex items-center gap-2 shrink-0">
            <Search className="w-3.5 h-3.5 text-mutedGray" />
            <input
              type="text"
              placeholder="Search stderr or command..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-white placeholder-gray-500 w-full"
            />
          </div>
          <div className="flex-grow overflow-y-auto divide-y divide-gray-850">
            {filteredErrors.length > 0 ? (
              filteredErrors.map((e) => (
                <div
                  key={e.id}
                  onClick={() => selectErrorEvent(e)}
                  className={`p-4 flex flex-col gap-1.5 cursor-pointer transition ${
                    selectedError?.id === e.id ? "bg-gray-800/60 border-l-2 border-pinkAccent" : "hover:bg-gray-800/35"
                  }`}
                >
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-pinkAccent font-bold">{e.error_type || "Exit Failure"}</span>
                    <span className="text-gray-500 text-[10px]">{e.created_at.slice(11, 16)}</span>
                  </div>
                  <code className="text-xs text-white truncate font-mono font-bold">
                    {e.command || "Shell Input"}
                  </code>
                  <p className="text-[10px] text-mutedGray truncate font-mono">{e.stderr}</p>
                </div>
              ))
            ) : (
              <p className="p-6 text-xs text-mutedGray italic text-center">No matching failures found.</p>
            )}
          </div>
        </div>

        {/* Right Side: Resolve Sandbox */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-cardBg border border-gray-800 rounded-xl p-5 flex flex-col gap-4">
            <h3 className="font-space font-bold text-sm text-white border-b border-gray-850 pb-2 flex items-center justify-between">
              <span>Cognitive Solver Sandbox</span>
              <span className="text-[10px] font-mono text-cyanAccent uppercase">Interactive</span>
            </h3>
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-mutedGray font-mono">STDERR STREAM OUTPUT</label>
                <textarea
                  value={customStderr}
                  onChange={(e) => setCustomStderr(e.target.value)}
                  className="w-full h-28 bg-bgDark border border-gray-850 rounded p-3 text-xs font-mono text-pinkAccent outline-none focus:border-pinkAccent/50"
                  placeholder="Select an error from the left or paste stdout console output here..."
                />
              </div>

              <button
                onClick={resolveError}
                className="px-4 py-2.5 rounded bg-purpleAccent text-white text-sm font-space hover:bg-opacity-80 transition flex items-center justify-center gap-1.5"
              >
                <HelpCircle className="w-4 h-4" /> Run Semantic Search
              </button>

              {/* Resolved AI Card */}
              {resolvedFix && (
                <div className="border border-cyanAccent/20 rounded-lg bg-cyanAccent/5 p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center border-b border-cyanAccent/10 pb-2">
                    <span className="text-xs text-cyanAccent font-bold font-space">
                      {resolvedFix.error_type.toUpperCase()}
                    </span>
                    <span className="text-[10px] font-mono text-mutedGray">
                      Confidence: {resolvedFix.confidence}% ({resolvedFix.source})
                    </span>
                  </div>
                  <div className="text-xs font-mono bg-bgDark border border-gray-850 p-3 rounded text-greenAccent">
                    {resolvedFix.fix_applied}
                  </div>
                  <div className="flex justify-end gap-2 text-[11px] font-space">
                    <button
                      onClick={() => submitFeedback(false)}
                      className="px-2.5 py-1 rounded bg-pinkAccent/15 border border-pinkAccent/30 text-pinkAccent hover:bg-pinkAccent/20"
                    >
                      Incorrect Solution
                    </button>
                    <button
                      onClick={() => submitFeedback(true)}
                      className="px-2.5 py-1 rounded bg-greenAccent/15 border border-greenAccent/30 text-greenAccent hover:bg-greenAccent/20 flex items-center gap-1"
                    >
                      Apply & Confirm Fix
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
