"use client";

import React, { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ShieldAlert, Activity, Command, Zap } from "lucide-react";

interface AnalyticsSummary {
  total_commands: number;
  success_rate: number;
  efficiency_score: number;
  avg_duration_ms: number;
  most_active_cwd: string;
  workflows_triggered: number;
  most_used_commands: { command: string; count: number }[];
  recorded_errors_count: number;
}

interface VelocityData {
  date: string;
  commands: number;
}

interface HeatmapCell {
  day: string;
  hour: string;
  count: number;
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [velocity, setVelocity] = useState<VelocityData[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapCell[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, velocityRes, heatmapRes] = await Promise.all([
          fetch("http://localhost:8000/api/analytics/summary"),
          fetch("http://localhost:8000/api/analytics/velocity"),
          fetch("http://localhost:8000/api/analytics/heatmap")
        ]);
        
        if (summaryRes.ok) setSummary(await summaryRes.json());
        if (velocityRes.ok) setVelocity(await velocityRes.json());
        if (heatmapRes.ok) setHeatmap(await heatmapRes.json());
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center font-mono text-cyanAccent">
        <span className="animate-pulse">LOADING COGNITIVE METRICS...</span>
      </div>
    );
  }

  // Fallback mocks if server returns empty/offline
  const activeSummary = summary || {
    total_commands: 124,
    success_rate: 94.2,
    efficiency_score: 87,
    avg_duration_ms: 382,
    most_active_cwd: "C:\\Users\\shubh\\Desktop\\Neuro-Shell",
    workflows_triggered: 5,
    most_used_commands: [
      { command: "git status", count: 25 },
      { command: "python run_demo.py", count: 18 },
      { command: "npm run dev", count: 12 },
      { command: "dir", count: 10 },
      { command: "git add .", count: 8 },
    ],
    recorded_errors_count: 7
  };

  const activeVelocity = velocity.length > 0 ? velocity : [
    { date: "06-01", commands: 15 },
    { date: "06-02", commands: 22 },
    { date: "06-03", commands: 18 },
    { date: "06-04", commands: 32 },
    { date: "06-05", commands: 12 },
    { date: "06-06", commands: 42 },
    { date: "06-07", commands: 28 },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Page Title */}
      <div>
        <h1 className="font-space font-bold text-2xl text-white">Productivity Dashboard</h1>
        <p className="text-sm text-mutedGray">Real-time statistics derived from local command executions</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-cardBg border border-gray-800 p-5 rounded-xl flex flex-col gap-2">
          <span className="text-[10px] text-mutedGray font-space uppercase tracking-wider">Efficiency Score</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold font-space ${
              activeSummary.efficiency_score > 80 ? "text-greenAccent" : "text-orangeAccent"
            }`}>
              {activeSummary.efficiency_score}%
            </span>
            <span className="text-[9px] text-greenAccent font-mono font-bold">+2.4%</span>
          </div>
        </div>

        <div className="bg-cardBg border border-gray-800 p-5 rounded-xl flex flex-col gap-2">
          <span className="text-[10px] text-mutedGray font-space uppercase tracking-wider">Commands Executed</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-space text-white">
              {activeSummary.total_commands}
            </span>
          </div>
        </div>

        <div className="bg-cardBg border border-gray-800 p-5 rounded-xl flex flex-col gap-2">
          <span className="text-[10px] text-mutedGray font-space uppercase tracking-wider">Workflows Package Triggers</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-space text-purpleAccent">
              {activeSummary.workflows_triggered}
            </span>
          </div>
        </div>

        <div className="bg-cardBg border border-gray-800 p-5 rounded-xl flex flex-col gap-2">
          <span className="text-[10px] text-mutedGray font-space uppercase tracking-wider">Avg Latency Time</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-space text-cyanAccent">
              {activeSummary.avg_duration_ms}ms
            </span>
          </div>
        </div>
      </div>

      {/* Charts block */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Command Velocity Chart */}
        <div className="lg:col-span-8 bg-cardBg border border-gray-800 p-5 rounded-xl flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
            <Activity className="w-4 h-4 text-cyanAccent" />
            <h3 className="font-space font-bold text-sm text-white">Daily Shell Activity</h3>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeVelocity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="date" stroke="#9CA3AF" style={{ fontSize: 11, fontFamily: 'monospace' }} />
                <YAxis stroke="#9CA3AF" style={{ fontSize: 11, fontFamily: 'monospace' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#fff' }} 
                  labelStyle={{ fontFamily: 'monospace', color: '#00F5FF' }}
                />
                <Line type="monotone" dataKey="commands" stroke="#00F5FF" strokeWidth={2} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Most Used Commands */}
        <div className="lg:col-span-4 bg-cardBg border border-gray-800 p-5 rounded-xl flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-b-gray-800 pb-2">
            <Command className="w-4 h-4 text-purpleAccent" />
            <h3 className="font-space font-bold text-sm text-white">Top CLI Inputs</h3>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeSummary.most_used_commands}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="command" stroke="#9CA3AF" style={{ fontSize: 10, fontFamily: 'monospace' }} tickFormatter={(val) => val.split(' ')[0]} />
                <YAxis stroke="#9CA3AF" style={{ fontSize: 11, fontFamily: 'monospace' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#fff' }}
                  labelStyle={{ fontFamily: 'monospace', color: '#7B2FFF' }}
                />
                <Bar dataKey="count" fill="#7B2FFF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Heatmap density section */}
      <div className="bg-cardBg border border-gray-800 p-5 rounded-xl flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
          <Zap className="w-4 h-4 text-cyanAccent" />
          <h3 className="font-space font-bold text-sm text-white">Activity Density (Hourly Heatmap)</h3>
        </div>
        <div className="grid grid-cols-24 gap-1 overflow-x-auto min-w-[600px] py-2">
          {heatmap.length > 0 ? (
            heatmap.map((cell, idx) => {
              let bgClass = "bg-gray-900";
              if (cell.count > 15) bgClass = "bg-cyanAccent";
              else if (cell.count > 8) bgClass = "bg-cyanAccent/70";
              else if (cell.count > 3) bgClass = "bg-cyanAccent/30";
              else if (cell.count > 0) bgClass = "bg-cyanAccent/10";

              return (
                <div
                  key={idx}
                  className={`${bgClass} h-6 rounded-sm cursor-pointer border border-bgDark hover:border-white transition-all`}
                  title={`${cell.day} at ${cell.hour}: ${cell.count} commands`}
                />
              );
            })
          ) : (
            Array.from({ length: 168 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-cyanAccent/10 h-6 rounded-sm border border-bgDark hover:border-white transition-all"
                title="Mock Density Cell"
              />
            ))
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-mutedGray font-mono">
          <span>Low Density</span>
          <div className="flex gap-1">
            <span className="w-3 h-3 bg-gray-900 rounded"></span>
            <span className="w-3 h-3 bg-cyanAccent/10 rounded"></span>
            <span className="w-3 h-3 bg-cyanAccent/30 rounded"></span>
            <span className="w-3 h-3 bg-cyanAccent/70 rounded"></span>
            <span className="w-3 h-3 bg-cyanAccent rounded"></span>
          </div>
          <span>High Density</span>
        </div>
      </div>
    </div>
  );
}
