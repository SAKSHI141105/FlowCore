"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Terminal, BarChart2, Zap, Settings, ShieldAlert, History, User } from "lucide-react";
import React, { useState, useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isConnected, setIsConnected] = useState(true);

  // Monitor connection to daemon server
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/commands?limit=1");
        setIsConnected(res.ok);
      } catch (err) {
        setIsConnected(false);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { href: "/dashboard", label: "Analytics Overview", icon: BarChart2 },
    { href: "/dashboard/terminal", label: "Terminal HUD", icon: Terminal },
    { href: "/dashboard/workflows", label: "Workflow Manager", icon: Zap },
    { href: "/dashboard/errors", label: "Error Memory", icon: ShieldAlert },
    { href: "/dashboard/replay", label: "Session Replay", icon: History },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex flex-col md:flex-row flex-grow min-h-screen">
      {/* Side Navigation Bar */}
      <aside className="w-full md:w-64 bg-cardBg/90 border-r border-gray-800 flex flex-col justify-between py-6 px-4 shrink-0">
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyanAccent via-purpleAccent to-pinkAccent p-0.5 animate-pulse">
              <div className="w-full h-full bg-bgDark rounded-md flex items-center justify-center">
                <Terminal className="w-4.5 h-4.5 text-cyanAccent" />
              </div>
            </div>
            <div>
              <span className="font-space font-bold text-lg tracking-wider text-white">NEURO<span className="text-cyanAccent glow-text">SHELL</span></span>
              <span className="text-[10px] block text-mutedGray font-mono -mt-1">Active OS Layer</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded font-space text-sm transition duration-200 ${
                    isActive
                      ? "bg-cyanAccent/10 border-l-2 border-cyanAccent text-cyanAccent"
                      : "text-mutedGray hover:bg-gray-800/50 hover:text-white"
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 ${isActive ? "text-cyanAccent" : "text-mutedGray"}`} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer info & Daemon status */}
        <div className="flex flex-col gap-4 px-2 pt-6 border-t border-gray-850">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-mutedGray">Daemon Daemon:</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-greenAccent animate-ping" : "bg-pinkAccent"}`}></span>
              <span className={isConnected ? "text-greenAccent" : "text-pinkAccent"}>
                {isConnected ? "CONNECTED" : "OFFLINE"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-xs text-white border border-gray-700">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-xs font-bold text-white">Developer</span>
              <span className="text-[10px] text-gray-500 font-mono">Local Host</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Dashboard Pages Content */}
      <main className="flex-grow flex flex-col p-4 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
