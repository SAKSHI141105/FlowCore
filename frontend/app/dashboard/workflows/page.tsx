"use client";

import React, { useState, useEffect } from "react";
import { Zap, Plus, Trash2, ArrowRight, Play, RefreshCw } from "lucide-react";

interface Workflow {
  id: string;
  name: string;
  steps: string[];
  trigger_count: number;
  created_at: string;
  last_used_at: string | null;
}

interface PatternSuggestion {
  steps: string[];
  count: number;
  suggested_name: string;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [suggestions, setSuggestions] = useState<PatternSuggestion[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [newWorkflowSteps, setNewWorkflowSteps] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/workflows");
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data.saved_workflows || []);
        setSuggestions(data.suggested_patterns || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveWorkflow = async () => {
    if (!newWorkflowName || !newWorkflowSteps) return;
    const steps = newWorkflowSteps
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s);

    try {
      const res = await fetch("http://localhost:8000/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWorkflowName, steps }),
      });
      if (res.ok) {
        setNewWorkflowName("");
        setNewWorkflowSteps("");
        setShowModal(false);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteWorkflow = async (id: string) => {
    if (!confirm("Delete this workflow sequence?")) return;
    try {
      const res = await fetch(`http://localhost:8000/api/workflows/${id}`, {
        method: "DELETE",
      });
      if (res.ok) loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const triggerWorkflow = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/workflows/trigger/${id}`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Triggered Workflow: ${data.workflow.name}\nExecuting steps:\n${data.workflow.steps.join("\n")}`);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveSuggested = async (name: string, steps: string[]) => {
    try {
      await fetch("http://localhost:8000/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, steps }),
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center font-mono text-purpleAccent">
        <span className="animate-pulse">PARSING CLI PATTERNS...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Title */}
      <div className="flex items-center justify-between border-b border-gray-850 pb-4">
        <div>
          <h1 className="font-space font-bold text-2xl text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-cyanAccent" /> Workflow Intelligence
          </h1>
          <p className="text-sm text-mutedGray">Assemble, execute, and export command sequences</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded bg-cyanAccent text-bgDark text-sm font-space font-bold hover:bg-white transition duration-200 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Create Custom
        </button>
      </div>

      {/* Grid of Workflows */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflows.map((w) => (
          <div
            key={w.id}
            className="bg-cardBg border border-gray-800 p-5 rounded-xl flex flex-col justify-between gap-4 hover:border-purpleAccent/35 transition"
          >
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="font-space font-bold text-white text-lg">{w.name}</span>
                <span className="text-[10px] text-purpleAccent px-2 py-0.5 rounded bg-purpleAccent/10 border border-purpleAccent/25 font-mono">
                  Runs: {w.trigger_count}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {w.steps.map((step, idx) => (
                  <React.Fragment key={idx}>
                    <code className="bg-bgDark px-2 py-1 rounded text-xs text-greenAccent border border-gray-850 font-mono">
                      {step}
                    </code>
                    {idx < w.steps.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />}
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-850 pt-3">
              <button
                onClick={() => deleteWorkflow(w.id)}
                className="p-2 bg-pinkAccent/10 text-pinkAccent border border-pinkAccent/20 hover:bg-pinkAccent/25 rounded transition"
                title="Delete Workflow"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => triggerWorkflow(w.id)}
                className="px-3 py-1.5 bg-purpleAccent text-white font-space font-bold rounded hover:bg-opacity-80 transition flex items-center gap-1.5 text-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Execute Sequence
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Repeating patterns block */}
      <div className="mt-8 border-t border-gray-800 pt-6">
        <h3 className="font-space font-bold text-lg text-white mb-4 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-purpleAccent animate-spin-slow" /> Mined Sequence Suggestions
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {suggestions.length > 0 ? (
            suggestions.map((p, idx) => (
              <div
                key={idx}
                className="border border-gray-800 bg-cardBg/50 p-4 rounded-lg flex flex-col justify-between gap-3 hover:border-cyanAccent/20 transition"
              >
                <div>
                  <div className="flex justify-between items-center text-xs font-bold text-purpleAccent font-space mb-1">
                    <span>REPETITION CAPTURED</span>
                    <span>Repeated {p.count}x</span>
                  </div>
                  <code className="text-xs text-gray-400 font-mono block truncate">
                    {p.steps.join(" → ")}
                  </code>
                </div>
                <button
                  onClick={() => saveSuggested(p.suggested_name, p.steps)}
                  className="px-2.5 py-1 bg-cyanAccent/10 border border-cyanAccent/30 hover:bg-cyanAccent/20 text-cyanAccent rounded text-[10px] font-bold self-end transition"
                >
                  Approve & Save
                </button>
              </div>
            ))
          ) : (
            <p className="text-xs text-mutedGray italic">No repeat loops detected. Continue working in terminal.</p>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-bgDark/90 z-50 flex items-center justify-center p-4">
          <div className="bg-cardBg border border-gray-800 rounded-xl max-w-md w-full p-6 relative flex flex-col gap-4">
            <h3 className="font-space text-lg font-bold text-white">Create Custom Workflow</h3>
            <div className="flex flex-col gap-4 text-sm">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-mutedGray">Workflow Name</label>
                <input
                  type="text"
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                  className="bg-bgDark border border-gray-800 rounded p-2.5 outline-none focus:border-cyanAccent text-white"
                  placeholder="e.g. Git Release Flow"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-mutedGray">Steps (One command per line)</label>
                <textarea
                  value={newWorkflowSteps}
                  onChange={(e) => setNewWorkflowSteps(e.target.value)}
                  className="bg-bgDark border border-gray-800 rounded p-2.5 h-32 outline-none focus:border-cyanAccent text-white font-mono text-xs"
                  placeholder={"git pull\nnpm run test\ngit commit -m 'release'\ngit push"}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded border border-gray-700 bg-gray-800 hover:bg-gray-700 text-white font-space text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={saveWorkflow}
                  className="flex-1 py-2 rounded bg-cyanAccent text-bgDark font-space font-bold hover:bg-white transition duration-200 text-sm"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
