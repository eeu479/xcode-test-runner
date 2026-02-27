interface StatusTileProps {
  label: string;
  value: string | number;
  color?: string;
}

export default function StatusTile({ label, value, color }: StatusTileProps) {
  return (
    <div className="card">
      <div className="section-title" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color ?? "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}
