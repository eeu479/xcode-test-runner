import { useEffect, useMemo, useRef, useState } from "react";
import type { OutputLine } from "../../stores/executionStore";

interface LiveOutputTerminalProps {
  lines: OutputLine[];
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function LiveOutputTerminal({ lines }: LiveOutputTerminalProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const tailLines = useMemo(() => lines.slice(-1000), [lines]);

  useEffect(() => {
    if (!autoScroll) {
      return;
    }
    const el = containerRef.current;
    if (!el) {
      return;
    }
    el.scrollTop = el.scrollHeight;
  }, [tailLines, autoScroll]);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
          Live Output
        </span>
        <label
          className="flex items-center gap-2"
          style={{ fontSize: 12, color: "var(--text-secondary)" }}
        >
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(event) => setAutoScroll(event.target.checked)}
          />
          Auto-scroll
        </label>
      </div>

      <div
        ref={containerRef}
        className="selectable code"
        style={{
          maxHeight: 260,
          overflow: "auto",
          border: "1px solid var(--border-color)",
          borderRadius: 8,
          padding: 10,
          fontSize: 12,
          backgroundColor: "var(--surface-2)",
        }}
      >
        {tailLines.length === 0 ? (
          <div style={{ color: "var(--text-secondary)" }}>
            Waiting for output...
          </div>
        ) : (
          tailLines.map((line, index) => (
            <div key={`${line.timestamp}-${index}`} className="whitespace-pre">
              <span style={{ color: "var(--text-secondary)", marginRight: 8 }}>
                {formatTime(line.timestamp)}
              </span>
              <span
                style={{
                  color:
                    line.kind === "stderr"
                      ? "var(--danger)"
                      : line.kind === "system"
                        ? "var(--accent)"
                        : "var(--text-primary)",
                }}
              >
                {line.text}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
