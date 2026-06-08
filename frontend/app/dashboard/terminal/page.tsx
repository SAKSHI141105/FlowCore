"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Terminal, RefreshCw, GitPullRequest, Combine, Activity, AlertCircle, X, Check } from "lucide-react";

// Dynamically import terminal embed to avoid server-side render issues
const TerminalEmbed = dynamic(
  () => import("../../../components/terminal-embed"),
  { ssr: false }
);

interface Prediction {
  command: string;
  confidence: number;
}

interface PatternSuggestion {
  steps: string[];
  count: number;
  suggested_name: string;
}

export default function TerminalPage() {
  const [ghostText, setGhostText] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [patterns, setPatterns] = useState<PatternSuggestion[]>([]);
  const [errorToast, setErrorToast] = useState<any>(null);
  const [clearCount, setClearCount] = useState(0);

  // Fetch workflow patterns from SQLite API
  const fetchPatterns = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/workflows");
      if (res.ok) {
        const data = await res.ok ? await res.json() : null;
        if (data) setPatterns(data.suggested_patterns || []);
      }
    } catch (err) {
      console.error("Error reading pattern suggestions:", err);
    }
  };

  useEffect(() => {
    fetchPatterns();
    const interval = setInterval(fetchPatterns, 15000);
    return () => clearInterval(interval);
  }, []);

  const saveSuggestedPattern = async (name: string, steps: string[]) => {
    try {
      await fetch("http://localhost:8000/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, steps }),
      });
      fetchPatterns();
    } catch (err) {
      console.error(err);
    }
  };

  const executeCommandInShell = (cmd: string) => {
    // We can simulate execution by typing it, or just write it via websocket connection.
    // Our TerminalEmbed component listens to websocket accept events.
    // To feed the command, we trigger a custom global event or connect it.
    // For local mock demonstration, we can alert the instructions or let them copy.
    alert(`To execute this recommendation, type or paste in terminal:\n\n${cmd}`);
  };

  return (
    <div className="flex-grow flex flex-col gap-6 relative">
      {/* Page header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div>
          <h1 className="font-space font-bold text-2xl text-white">Terminal Workspace</h1>
          <p className="text-sm text-mutedGray">Interactive shell integration with predictive ghost autocomplete</p>
        </div>
        <button
          onClick={() => setClearCount(c => c + 1)}
          className="p-2 bg-gray-800 hover:bg-gray-700 text-mutedGray hover:text-white rounded border border-gray-700 transition"
          title="Reset Console Session"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Main Terminal HUD Layout */}
      <div className="grid lg:grid-cols-12 gap-6 items-stretch flex-grow">
        {/* Terminal console panel */}
        <div className="lg:col-span-8 flex flex-col bg-bgDark border border-gray-800 rounded-xl overflow-hidden min-h-[450px]">
          <div className="bg-cardBg border-b border-gray-800 px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs text-mutedGray font-mono flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyanAccent" /> Active PowerShell Console
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-greenAccent/10 text-greenAccent border border-greenAccent/20 font-mono">
              Vector Autocomplete Ready
            </span>
          </div>

          {/* Dynamic xterm mount */}
          <div className="flex-grow p-4 bg-bgDark relative overflow-hidden">
            <TerminalEmbed
              onGhostChange={setGhostText}
              onPredictionsChange={setPredictions}
              onErrorToast={setErrorToast}
              clearTrigger={clearCount}
            />
          </div>

          {/* Autocomplete Helper Bar */}
          <div className="bg-cardBg/90 border-t border-gray-850 px-4 py-2 text-xs font-mono text-mutedGray flex justify-between items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyanAccent animate-pulse"></span>
              <span>Next Prediction: </span>
              <span className="text-cyanAccent font-bold">{ghostText || "None (type to trigger)"}</span>
            </div>
            <div className="text-[10px] text-gray-500">
              Press <span className="px-1 py-0.5 rounded bg-gray-800 border border-gray-700 text-white font-bold">Tab</span> or <span className="px-1 py-0.5 rounded bg-gray-800 border border-gray-700 text-white font-bold">&rarr;</span> to accept
            </div>
          </div>
        </div>

        {/* Suggestion sidebar panels */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Autofill prediction lists */}
          <div className="bg-cardBg border border-gray-800 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-850 pb-2">
              <h3 className="font-space font-bold text-sm text-white flex items-center gap-2">
                <GitPullRequest className="w-4 h-4 text-cyanAccent" /> Auto-Predict Panel
              </h3>
              <span className="text-[10px] text-mutedGray font-mono">Top 5</span>
            </div>
            <div className="flex flex-col gap-2 font-mono text-sm max-h-[200px] overflow-y-auto">
              {predictions.length > 0 ? (
                predictions.map((p, idx) => (
                  <div
                    key={idx}
                    onClick={() => executeCommandInShell(p.command)}
                    className="flex justify-between items-center bg-bgDark border border-gray-850 p-2.5 rounded hover:border-cyanAccent cursor-pointer transition"
                  >
                    <span className="text-xs text-white truncate max-w-[200px]">{p.command}</span>
                    <span className="text-[10px] text-cyanAccent px-1.5 py-0.5 rounded bg-cyanAccent/10 font-bold">
                      {p.confidence}%
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-mutedGray italic">No active predictions. Run commands in the terminal to train model.</p>
              )}
            </div>
          </div>

          {/* Behavior Mining Patterns */}
          <div className="bg-cardBg border border-gray-800 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-gray-850 pb-2">
              <Combine className="w-4 h-4 text-purpleAccent" />
              <h3 className="font-space font-bold text-sm text-white">Workflow Mining</h3>
            </div>
            <div className="flex flex-col gap-3">
              {patterns.length > 0 ? (
                patterns.map((pat, idx) => (
                  <div key={idx} className="border border-purpleAccent/20 rounded bg-purpleAccent/5 p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs text-purpleAccent font-bold font-space">
                      <span>REPEATING PATTERN FOUND</span>
                      <span>Run {pat.count}x</span>
                    </div>
                    <p className="text-xs font-mono text-mutedGray">{pat.steps.join(" → ")}</p>
                    <button
                      onClick={() => saveSuggestedPattern(pat.suggested_name, pat.steps)}
                      className="px-2.5 py-1 bg-purpleAccent text-white rounded text-[10px] font-bold self-end hover:bg-opacity-80 transition"
                    >
                      Save Workflow
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-mutedGray italic">No repeat sequences found yet. Monitoring loops...</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Error Toast Notification */}
      {errorToast && (
        <div className="fixed bottom-6 right-6 bg-cardBg border-l-4 border-pinkAccent shadow-2xl p-4 rounded max-w-sm w-full z-50 flex flex-col gap-2 transition duration-300">
          <div className="flex items-center justify-between border-b border-gray-850 pb-1.5">
            <span className="text-xs font-bold text-pinkAccent flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" /> COMPILER/RUNTIME ERROR LOGGED
            </span>
            <button onClick={() => setErrorToast(null)} className="text-mutedGray hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-mutedGray font-mono truncate">{errorToast.stderr}</p>
          
          <div className="bg-bgDark p-2.5 rounded border border-cyanAccent/15 flex flex-col gap-1 mt-1">
            <span className="text-[10px] text-cyanAccent font-bold uppercase tracking-wider">Suggested Fix:</span>
            <code className="text-xs text-greenAccent font-mono">{errorToast.fix_suggestion}</code>
          </div>

          <div className="flex justify-end gap-2 mt-1">
            <button
              onClick={() => {
                executeCommandInShell(errorToast.fix_suggestion.replace("Run:", "").trim());
                setErrorToast(null);
              }}
              className="px-3 py-1 bg-cyanAccent text-bgDark text-[11px] font-bold rounded"
            >
              Execute Fix
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
