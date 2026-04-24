import { useEffect, useRef } from "react";

function formatTime(timestamp) {
  if (!timestamp) {
    return "--:--:--";
  }

  return new Intl.DateTimeFormat("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

export default function EventLog({ events }) {
  const feedRef = useRef(null);
  const visibleEvents = events.slice(-60);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [visibleEvents.length]);

  return (
    <section className="panel event-log-panel">
      <div className="panel-heading">
        <span>Live Event Stream</span>
        <span className="panel-count">{visibleEvents.length}/60</span>
      </div>
      <div className="event-feed" ref={feedRef}>
        {visibleEvents.length === 0 ? (
          <div className="empty-state">Waiting for attacker telemetry...</div>
        ) : (
          visibleEvents.map((event, index) => (
            <div className="event-line" key={`${event.timestamp}-${event.type}-${index}`}>
              <span className="event-time">[{formatTime(event.timestamp)}]</span>
              <span className={`severity-badge severity-${event.severity}`}>
                {event.severity}
              </span>
              <span className="event-message">{event.message}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
