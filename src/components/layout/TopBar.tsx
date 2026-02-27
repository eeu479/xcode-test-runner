interface TopBarProps {
  title: string;
  children?: React.ReactNode;
}

export default function TopBar({ title, children }: TopBarProps) {
  return (
    <header className="topbar">
      <div data-tauri-drag-region className="flex-1 min-w-0">
        <h1 className="topbar-title">{title}</h1>
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </header>
  );
}
