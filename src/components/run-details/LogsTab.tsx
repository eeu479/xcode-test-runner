import { useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import SearchInput from "../common/SearchInput";

interface LogsTabProps {
  log: string;
}

export default function LogsTab({ log }: LogsTabProps) {
  const [search, setSearch] = useState("");
  const parentRef = useRef<HTMLDivElement>(null);

  const allLines = log.split("\n");
  const lines = search
    ? allLines.filter((line) => line.toLowerCase().includes(search.toLowerCase()))
    : allLines;

  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 20,
    overscan: 30,
  });

  return (
    <div className="h-full flex flex-col">
      <div className="run-logs-toolbar">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search logs..."
        />
      </div>

      <div
        ref={parentRef}
        className="flex-1 overflow-auto selectable code"
        style={{ fontSize: 12 }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: `${virtualizer.getTotalSize()}px`,
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => (
            <div
              key={virtualRow.index}
              className="run-log-line"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                color: lines[virtualRow.index]?.startsWith("[stderr]")
                  ? "var(--danger)"
                  : "var(--text-primary)",
              }}
            >
              <span
                className="inline-block w-12 text-right mr-3 muted"
                style={{ fontSize: 11 }}
              >
                {virtualRow.index + 1}
              </span>
              {lines[virtualRow.index]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
