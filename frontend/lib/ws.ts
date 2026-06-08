import { useEffect, useRef, useState, useCallback } from "react";

interface WSMessage {
  type: "stdout" | "stderr" | "ghost" | "predictions" | "error_toast";
  text?: string;
  prediction?: string;
  predictions?: any[];
  stderr?: string;
  error_type?: string;
  fix_suggestion?: string;
  confidence?: number;
}

export function useTerminalWebSocket(url: string = "ws://localhost:8000/ws/terminal") {
  const [isConnected, setIsConnected] = useState(false);
  const [ghost, setGhost] = useState("");
  const [predictions, setPredictions] = useState<any[]>([]);
  const [errorToast, setErrorToast] = useState<any | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const onDataCallback = useRef<((data: string) => void) | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current) wsRef.current.close();

    const socket = new WebSocket(url);
    wsRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data);

      switch (msg.type) {
        case "stdout":
        case "stderr":
          if (msg.text && onDataCallback.current) {
            onDataCallback.current(msg.text);
          }
          break;
        case "ghost":
          setGhost(msg.prediction || "");
          break;
        case "predictions":
          setPredictions(msg.predictions || []);
          break;
        case "error_toast":
          setErrorToast(msg);
          break;
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      // Automatic reconnection attempt in 5s
      setTimeout(connect, 5000);
    };
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const registerDataHandler = useCallback((handler: (data: string) => void) => {
    onDataCallback.current = handler;
  }, []);

  const sendKey = useCallback((key: string) => {
    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "key", key }));
    }
  }, []);

  const acceptAutocomplete = useCallback((command: string) => {
    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "autocomplete_accept", command }));
      setGhost("");
    }
  }, []);

  return {
    isConnected,
    ghost,
    predictions,
    errorToast,
    setErrorToast,
    registerDataHandler,
    sendKey,
    acceptAutocomplete,
  };
}
