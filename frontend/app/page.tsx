"use client";

import Link from "next/link";
import { Terminal, Zap, ShieldAlert, Brain, Combine } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="flex flex-col flex-grow bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Terminal className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-space font-bold text-xl tracking-wider text-white">FLOW<span className="text-blue-500">CORE</span></span>
            <span className="text-xs block text-slate-400 font-mono -mt-1">AI Cognitive Layer v1.0</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="px-4 py-1.5 rounded bg-blue-600/10 border border-blue-500/30 text-blue-400 text-xs font-mono hover:bg-blue-600/20 transition duration-200">
            Enter Dashboard
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-6 flex flex-col gap-16 py-12">
        {/* Hero Section */}
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-7 flex flex-col gap-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs w-fit font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Next-Gen Cognitive Terminal Shell
            </div>
            <h1 className="font-space font-bold text-5xl md:text-6xl text-white leading-tight">
              The terminal that <br/>
              <span className="text-blue-500">thinks before you type.</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-lg">
              FlowCore operates above your PowerShell, Bash, or Zsh shell to capture telemetries, discover repetitive workflows, predict next commands with AI, and recover from runtime errors instantly using a local Vector database.
            </p>
            <div className="flex flex-wrap gap-4 mt-2">
              <Link href="/dashboard" className="px-6 py-3 rounded bg-blue-600 text-white font-space font-bold hover:bg-blue-700 transition duration-200 text-center">
                Launch Terminal HUD
              </Link>
              <Link href="/dashboard/settings" className="px-6 py-3 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-space transition duration-200">
                Configure Local Hook
              </Link>
            </div>
          </motion.div>

          {/* Cognitive Console mockup (replacing Spline scene loader) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="lg:col-span-5 h-[400px] bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col gap-3 font-mono text-xs text-slate-300"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-850">
              <div class="flex gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-red-500/70"></span>
                <span class="w-2.5 h-2.5 rounded-full bg-yellow-500/70"></span>
                <span class="w-2.5 h-2.5 rounded-full bg-green-500/70"></span>
              </div>
              <span className="text-[10px] text-slate-500">flowcore_cognitive_core.exe</span>
            </div>
            <div className="flex-grow flex flex-col gap-3 justify-center">
              <p className="text-blue-400"># Cognitive layer initializing...</p>
              <p className="text-slate-500">[<span className="text-emerald-500">✓</span>] Markov Chain Predictor &nbsp;&nbsp;&nbsp; <span className="text-emerald-500">94%</span></p>
              <p className="text-slate-500">[<span className="text-emerald-500">✓</span>] DBSCAN Pattern Miner &nbsp;&nbsp;&nbsp;&nbsp; <span className="text-emerald-500">LIVE</span></p>
              <p className="text-slate-500">[<span className="text-emerald-500">✓</span>] Vector Error Indexer &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span className="text-emerald-500">128 entries</span></p>
              <p className="text-slate-500">[<span className="text-emerald-500">✓</span>] WebSocket Terminal Proxy &nbsp; <span className="text-emerald-500">:8000</span></p>
              <div className="mt-4 p-4 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  SYSTEM READY — ALL MODULES ONLINE
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">PowerShell interceptor bound to port 8000. Source ns.ps1 to activate command loop recording.</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-slate-800 border border-slate-800 p-6 rounded-xl flex flex-col gap-3 hover:border-slate-700 transition duration-200">
            <div className="w-10 h-10 rounded bg-blue-500/10 flex items-center justify-center text-blue-500 mb-2">
              <Combine className="w-5 h-5" />
            </div>
            <h3 className="font-space text-lg font-bold text-white">Workflow Intelligence</h3>
            <p className="text-sm text-slate-400">Autodetects 3+ repeat sequences using a sliding window. Packages sequences into triggered workflows synced with SQLite.</p>
          </div>
          <div className="bg-slate-800 border border-slate-800 p-6 rounded-xl flex flex-col gap-3 hover:border-slate-700 transition duration-200">
            <div className="w-10 h-10 rounded bg-blue-500/10 flex items-center justify-center text-blue-500 mb-2">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="font-space text-lg font-bold text-white">Predictive Autosuggestion</h3>
            <p className="text-sm text-slate-400">Uses historical command weights to forecast next commands. Surfaces Fish-style ghost text and interactive suggestion boxes.</p>
          </div>
          <div className="bg-slate-800 border border-slate-800 p-6 rounded-xl flex flex-col gap-3 hover:border-slate-700 transition duration-200">
            <div className="w-10 h-10 rounded bg-blue-500/10 flex items-center justify-center text-blue-500 mb-2">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="font-space text-lg font-bold text-white">Intelligent Error Recovery</h3>
            <p className="text-sm text-slate-400">Non-zero exit codes trigger similarity searches in the error vector database to present solutions instantly.</p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-850 bg-slate-900 px-6 py-6 text-center text-xs text-slate-500 font-mono mt-auto">
        &copy; 2026 FlowCore Dev. Build the terminal that thinks.
      </footer>
    </div>
  );
}
