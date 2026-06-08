"use client";

import React, { useState } from "react";
import { Settings, Sliders, KeyRound, Terminal, Copy } from "lucide-react";

export default function SettingsPage() {
  const [confidence, setConfidence] = useState(35);
  const [model, setModel] = useState("claude-3-haiku");
  const [apiKey, setApiKey] = useState("");
  const [syncEnabled, setSyncEnabled] = useState(false);

  const copyHookCommand = () => {
    navigator.clipboard.writeText(". .\\ns.ps1");
    alert("PowerShell hook command copied!");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="border-b border-gray-850 pb-4">
        <h1 className="font-space font-bold text-2xl text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-cyanAccent" /> User Settings
        </h1>
        <p className="text-sm text-mutedGray">Configure Next-Command autocompletion thresholds and cognitive integrations</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Engine Configs */}
        <div className="flex flex-col gap-6">
          {/* Autocomplete config */}
          <div className="bg-cardBg border border-gray-800 p-5 rounded-xl flex flex-col gap-4">
            <h3 className="font-space font-bold text-white text-sm flex items-center gap-2 border-b border-gray-850 pb-2">
              <Sliders className="w-4.5 h-4.5 text-cyanAccent" /> Prediction Thresholds
            </h3>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs font-mono text-mutedGray">
                <span>Autocomplete Confidence Limit:</span>
                <span className="text-cyanAccent font-bold">{confidence}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                value={confidence}
                onChange={(e) => setConfidence(parseInt(e.target.value))}
                className="w-full accent-cyanAccent h-1 bg-gray-800 rounded-lg cursor-pointer"
              />
              <p className="text-[10px] text-gray-500 leading-normal">
                Ghost suggestions will only render in the xterm terminal if the ML similarity confidence score exceeds this limit.
              </p>
            </div>
          </div>

          {/* AI Settings */}
          <div className="bg-cardBg border border-gray-800 p-5 rounded-xl flex flex-col gap-4">
            <h3 className="font-space font-bold text-white text-sm flex items-center gap-2 border-b border-gray-850 pb-2">
              <KeyRound className="w-4.5 h-4.5 text-purpleAccent" /> AI Engine Configuration
            </h3>
            <div className="flex flex-col gap-4 text-sm">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-mutedGray">LLM Model Provider</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="bg-bgDark border border-gray-800 rounded p-2.5 outline-none focus:border-cyanAccent text-white font-space"
                >
                  <option value="claude-3-haiku">Anthropic Claude 3 Haiku (Fast)</option>
                  <option value="claude-3-sonnet">Anthropic Claude 3.5 Sonnet (Thorough)</option>
                  <option value="gpt-4o">OpenAI GPT-4o</option>
                  <option value="local-fallback">Local Rule-Based Classifier (Zero Network)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-mutedGray">API Authentication Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste sk-ant-... key here"
                  className="bg-bgDark border border-gray-800 rounded p-2.5 outline-none focus:border-cyanAccent text-white font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-gray-850">
                <span className="text-mutedGray">Cross-Machine Sync:</span>
                <button
                  onClick={() => setSyncEnabled(!syncEnabled)}
                  className={`px-3 py-1 rounded border transition ${
                    syncEnabled ? "bg-cyanAccent/10 border-cyanAccent text-cyanAccent" : "bg-gray-900 border-gray-750 text-gray-500"
                  }`}
                >
                  {syncEnabled ? "ENABLED" : "DISABLED"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Hook Integrator Instructions */}
        <div className="bg-cardBg border border-gray-800 p-5 rounded-xl flex flex-col gap-4">
          <h3 className="font-space font-bold text-white text-sm flex items-center gap-2 border-b border-gray-850 pb-2">
            <Terminal className="w-4.5 h-4.5 text-cyanAccent animate-pulse" /> Local Terminal setup
          </h3>
          
          <div className="flex flex-col gap-4 font-mono text-xs text-mutedGray leading-relaxed">
            <div className="flex flex-col gap-1">
              <span className="text-cyanAccent font-bold">1. VERIFY DAEMON IS RUNNING</span>
              <p>Ensure Python is running the local backend gateway at http://localhost:8000</p>
            </div>
            
            <div className="flex flex-col gap-2">
              <span className="text-cyanAccent font-bold">2. REGISTER WINDOWS POWERSHELL HOOK</span>
              <p>Run the following command in PowerShell to register history handlers & log terminal exit codes:</p>
              
              <div className="relative bg-bgDark border border-gray-850 p-3 rounded text-greenAccent flex items-center justify-between group">
                <code>. .\ns.ps1</code>
                <button onClick={copyHookCommand} className="text-mutedGray hover:text-white p-1">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1 pt-2 border-t border-gray-850">
              <span className="text-cyanAccent font-bold">3. AUTO-LOAD ON STARTUP (OPTIONAL)</span>
              <p>To register FlowCore automatically whenever you launch a PowerShell shell, add the hook command to your PowerShell Profile. Open your profile editor:</p>
              <div className="bg-bgDark border border-gray-850 p-2.5 rounded text-white text-[11px]">
                <code>notepad $PROFILE</code>
              </div>
              <p className="mt-1">Append the path to your <code className="text-gray-300">ns.ps1</code> script at the end of the profile file.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
