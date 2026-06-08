"use client";

import React, { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

interface TerminalEmbedProps {
  onGhostChange: (text: string) => void;
  onPredictionsChange: (preds: any[]) => void;
  onErrorToast: (errData: any) => void;
  clearTrigger: number;
}

export default function TerminalEmbed({
  onGhostChange,
  onPredictionsChange,
  onErrorToast,
  clearTrigger
}: TerminalEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const ghostTextRef = useRef<string>("");

  useEffect(() => {
    if (!containerRef.current) return;

    // Create terminal instance
    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#0A0E1A',
        foreground: '#E5E7EB',
        cursor: '#00F5FF',
        selectionBackground: 'rgba(0, 245, 255, 0.3)',
        black: '#000000',
        red: '#FF3CAC',
        green: '#00FF9D',
        yellow: '#FFD700',
        blue: '#7B2FFF',
        magenta: '#FF3CAC',
        cyan: '#00F5FF',
        white: '#E5E7EB'
      },
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 13,
      lineHeight: 1.2
    });

    termRef.current = term;
    term.open(containerRef.current);

    // Load Fit Addon
    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;
    term.loadAddon(fitAddon);
    
    // Fit size after a minor layout render delay
    setTimeout(() => {
      if (fitAddonRef.current) fitAddonRef.current.fit();
    }, 100);

    // Window resize handler
    const handleResize = () => {
      if (fitAddonRef.current) fitAddonRef.current.fit();
    };
    window.addEventListener("resize", handleResize);

    // WebSocket connection setup
    const connectWS = () => {
      const socket = new WebSocket("ws://localhost:8000/ws/terminal");
      wsRef.current = socket;

      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        
        if (msg.type === "stdout" || msg.type === "stderr") {
          term.write(msg.text);
        } else if (msg.type === "ghost") {
          ghostTextRef.current = msg.prediction;
          onGhostChange(msg.prediction);
        } else if (msg.type === "predictions") {
          onPredictionsChange(msg.predictions);
        } else if (msg.type === "error_toast") {
          onErrorToast(msg);
        }
      };

      socket.onclose = () => {
        term.write("\r\n\x1b[31mConnection lost. Retrying to connect...\x1b[0m\r\n");
        setTimeout(connectWS, 5000);
      };
    };

    connectWS();

    // Listen to keyboard strokes
    term.onKey((e) => {
      const key = e.key;
      const socket = wsRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;

      // Handle Tab or Right-Arrow accepting autocompletions
      if ((key === "\x1b[C" || key === "\t") && ghostTextRef.current) {
        // Find current line string from cursor coordinates
        const activeLine = term.buffer.active.getLine(term.buffer.active.cursorY + term.buffer.active.viewportY);
        const lineContent = activeLine ? activeLine.translateToString().split(">")[1] || "" : "";
        
        socket.send(JSON.stringify({
          "type": "autocomplete_accept",
          "command": lineContent.trim() + ghostTextRef.current
        }));
        
        ghostTextRef.current = "";
        onGhostChange("");
        e.domEvent.preventDefault();
        return;
      }

      socket.send(JSON.stringify({
        "type": "key",
        "key": key
      }));
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      if (wsRef.current) wsRef.current.close();
      term.dispose();
    };
  }, []);

  // Trigger terminal clear when clear button clicked
  useEffect(() => {
    if (clearTrigger > 0 && termRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      termRef.current.clear();
      wsRef.current.send(JSON.stringify({
        "type": "key",
        "key": "\r"
      }));
    }
  }, [clearTrigger]);

  return <div ref={containerRef} className="w-full h-full min-h-[380px] bg-bgDark" />;
}
