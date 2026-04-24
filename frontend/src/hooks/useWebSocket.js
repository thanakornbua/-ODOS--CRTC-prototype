import { useEffect, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws";

export function useWebSocket() {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const [networkGraph, setNetworkGraph] = useState({ nodes: [], links: [] });
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function fetchHoneynet() {
      try {
        const response = await fetch(`${API_BASE}/api/honeynet`);
        if (!response.ok) {
          throw new Error(`Honeynet request failed with ${response.status}`);
        }
        const data = await response.json();
        if (active) {
          setNetworkGraph(data);
          setError(null);
        }
      } catch (fetchError) {
        if (active) {
          setError(fetchError.message);
        }
      }
    }

    function connect() {
      if (!active) {
        return;
      }

      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        if (!active) {
          return;
        }
        setConnected(true);
        setError(null);
        fetchHoneynet();
      };

      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data);
          setEvents((currentEvents) => [...currentEvents, event].slice(-100));
        } catch {
          setError("Received malformed simulation event");
        }
      };

      socket.onerror = () => {
        setError("WebSocket connection error");
      };

      socket.onclose = () => {
        if (!active) {
          return;
        }
        setConnected(false);
        reconnectTimerRef.current = window.setTimeout(connect, 3000);
      };
    }

    fetchHoneynet();
    connect();

    return () => {
      active = false;
      window.clearTimeout(reconnectTimerRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  return { events, connected, networkGraph, error };
}
