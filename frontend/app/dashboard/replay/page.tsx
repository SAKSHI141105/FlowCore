"use client";

import React, { useState, useEffect, useRef } from "react";
import { History, Play, Pause, FastForward, Clock } from "lucide-react";

interface SessionInfo {
  id: string;
  started_at: string;
  ended_at: string | null;
  command_count: number;
}

interface CommandLog {
  command: string;
  exit_code: number;
  duration_ms: number;
  created_at: string;
}

export default function ReplayPage() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [recording, setRecording] = useState<CommandLog[]>([]);
  const [playIndex, setPlayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(true);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSessions = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/sessions");
      if (res.ok) setSessions(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const loadSessionReplay = async (id: string) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
    setPlayIndex(0);
    setSelectedSessionId(id);

    try {
      const res = await fetch(`http://localhost:8000/api/sessions/${id}/replay`);
      if (res.ok) {
        const data = await res.json();
        setRecording(data.recording || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Playback timer loop
  useEffect(() => {
    if (isPlaying && recording.length > 0) {
      const delay = 1500 / speed;
      timerRef.current = setInterval(() => {
        setPlayIndex((prev) => {
          if (prev >= recording.length - 1) {
            setIsPlaying(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return prev;
          }
          return prev + 1;
        });
      }, delay);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, recording, speed]);

  const togglePlayback = () => {
    if (playIndex >= recording.length) {
      setPlayIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const scrubTimeline = (val: number) => {
    setPlayIndex(val);
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center font-mono text-cyanAccent">
        <span className="animate-pulse">PARSING RECORDED PTY SESSIONS...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <h1 className="font-space font-bold text-2xl text-white flex items-center gap-2">
          <History className="w-6 h-6 text-cyanAccent" /> Session Replay Player
        </h1>
        <p className="text-sm text-mutedGray">Replay past development workflows and command executions key-by-key</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Sessions Directory */}
        <div className="lg:col-span-4 bg-cardBg border border-gray-800 rounded-xl overflow-hidden flex flex-col max-h-[500px]">
          <div className="bg-gray-900 px-4 py-3 border-b border-gray-800 text-xs font-mono text-mutedGray font-bold tracking-wider">
            RECORDED SESSIONS LIST
          </div>
          <div className="flex-grow overflow-y-auto divide-y divide-gray-850">
            {sessions.length > 0 ? (
              sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => loadSessionReplay(s.id)}
                  className={`p-4 flex flex-col gap-1.5 cursor-pointer transition ${
                    selectedSessionId === s.id ? "bg-gray-800/60 border-l-2 border-cyanAccent" : "hover:bg-gray-800/35"
                  }`}
                >
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-cyanAccent font-bold">Session: {s.id.slice(0, 8)}...</span>
                    <span className="text-gray-500 text-[10px]">{s.started_at.slice(0, 10)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-mutedGray mt-1 font-mono">
                    <span>Commands: {s.command_count}</span>
                    <span>Started: {s.started_at.slice(11, 16)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="p-6 text-xs text-mutedGray italic text-center">No terminal sessions recorded yet.</p>
            )}
          </div>
        </div>

        {/* Right Side: Timeline Player */}
        <div className="lg:col-span-8 bg-bgDark border border-gray-800 rounded-xl overflow-hidden flex flex-col min-h-[400px]">
          <div className="bg-cardBg border-b border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
            <span className="text-xs text-mutedGray font-mono font-bold">
              {selectedSessionId
                ? `Replaying: Session ${selectedSessionId.slice(0, 8)}...`
                : "Select a recorded session to load player"}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-850 text-white font-mono uppercase">
              Simulated PTY Console
            </span>
          </div>

          {/* Replay Console View */}
          <div className="flex-grow p-5 bg-bgDark font-mono text-sm min-h-[280px] flex flex-col gap-3 overflow-y-auto max-h-[350px]">
            {selectedSessionId ? (
              recording.length > 0 ? (
                recording.slice(0, playIndex).map((step, idx) => (
                  <div key={idx} className="flex flex-col gap-1 border-b border-gray-900 pb-2">
                    <p className="text-white">
                      PS C:\FlowCore&gt; <span className="text-greenAccent">{step.command}</span>
                    </p>
                    <div className="flex items-center gap-4 text-[10px] text-gray-500">
                      <span>
                        Status:{" "}
                        <span className={step.exit_code === 0 ? "text-greenAccent" : "text-pinkAccent"}>
                          {step.exit_code === 0 ? "Success" : `Failed (${step.exit_code})`}
                        </span>
                      </span>
                      <span>Duration: {step.duration_ms}ms</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> {step.created_at.slice(11, 19)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-mutedGray italic">This session has no commands logged.</p>
              )
            ) : (
              <p className="text-xs text-mutedGray italic text-center my-auto">Replayer is ready. Select a session to load history timeline.</p>
            )}
          </div>

          {/* Scrubber and Actions Panel */}
          {selectedSessionId && recording.length > 0 && (
            <div className="bg-cardBg border-t border-gray-850 p-5 flex flex-col gap-4 shrink-0">
              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlayback}
                  className="w-10 h-10 rounded-full bg-cyanAccent text-bgDark flex items-center justify-center hover:scale-105 transition duration-200 shrink-0"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current" />
                  )}
                </button>

                {/* Timeline Slider */}
                <div className="flex-grow">
                  <input
                    type="range"
                    min="0"
                    max={recording.length}
                    value={playIndex}
                    onChange={(e) => scrubTimeline(parseInt(e.target.value))}
                    className="w-full accent-cyanAccent h-1 bg-gray-800 rounded-lg cursor-pointer"
                  />
                </div>
                <span className="text-xs font-mono text-mutedGray shrink-0">
                  {playIndex} / {recording.length} Cmds
                </span>
              </div>

              {/* Speed Controller */}
              <div className="flex justify-between items-center border-t border-gray-850 pt-3">
                <div className="flex gap-1">
                  {[1, 2, 4].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`px-3 py-1 rounded text-xs font-mono border border-gray-700 transition ${
                        speed === s ? "bg-gray-800 text-white font-bold" : "bg-gray-900 text-mutedGray"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                  <FastForward className="w-3.5 h-3.5" /> Speed Multiplier controls playback velocity
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
